import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import cytoscape, {
  type Core,
  type ElementDefinition,
  type StylesheetJson,
} from 'cytoscape'
import type {
  DisclosureLevel,
  KnowledgeEdge,
  KnowledgeNode,
  NodeTier,
} from '../types/graph'
import {
  DISCLOSURE_THRESHOLDS,
  getDisclosureLevel,
  showsSupportingLabels,
} from '../lib/disclosure'
import CurvedEdgeLabels from './CurvedEdgeLabels'

export type ViewportInsets = {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export type GraphHandle = {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  revealEdge: (edgeId: string, insets?: ViewportInsets) => void
}

type KnowledgeGraphProps = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
  onClearSelection: () => void
  onViewportChange: (zoom: number, level: DisclosureLevel) => void
}

const nodeLabelMetrics: Record<
  NodeTier,
  { baseSize: number; minScreenSize: number; maxWidth: number }
> = {
  core: { baseSize: 16, minScreenSize: 11, maxWidth: 160 },
  major: { baseSize: 13, minScreenSize: 10, maxWidth: 160 },
  supporting: { baseSize: 10.5, minScreenSize: 10, maxWidth: 160 },
}

function applyBaseLabelMetrics(cy: Core) {
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const tier = node.data('tier') as NodeTier
      const metrics = nodeLabelMetrics[tier]

      node.style({
        'font-size': metrics.baseSize,
        'text-max-width': `${metrics.maxWidth}px`,
      })
    })
  })
}

const graphStyles: StylesheetJson = [
  {
    selector: 'node',
    style: {
      width: 20,
      height: 20,
      'background-color': '#162235',
      'border-width': 1.2,
      'border-color': '#7590ad',
      'border-opacity': 0.72,
      label: 'data(label)',
      color: '#c9d7e7',
      'font-family':
        'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      'font-size': 11,
      'font-weight': 500,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'text-wrap': 'wrap',
      'text-max-width': '160px',
      'text-opacity': 0,
      'text-background-color': '#060c16',
      'text-background-opacity': 0.74,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'overlay-opacity': 0,
      'underlay-color': '#7fe0c3',
      'underlay-opacity': 0,
      'underlay-padding': 10,
      'underlay-shape': 'ellipse',
      'transition-property':
        'opacity, border-color, background-color, line-color',
      'transition-duration': 160,
      'z-index': 10,
    },
  },
  {
    selector: 'node.tier-core',
    style: {
      width: 56,
      height: 56,
      'background-color': '#123027',
      'border-width': 1.8,
      'border-color': '#7fe0c3',
      'border-opacity': 0.92,
      'font-size': 16,
      'font-weight': 600,
      color: '#eef8f3',
      'underlay-opacity': 0.08,
      'underlay-padding': 16,
    },
  },
  {
    selector: 'node.tier-major',
    style: {
      width: 40,
      height: 40,
      'background-color': '#152235',
      'border-width': 1.4,
      'border-color': '#7d9bb7',
      'font-size': 13,
      color: '#d9e5f1',
      'underlay-opacity': 0.05,
    },
  },
  {
    selector: 'node.tier-supporting',
    style: {
      width: 20,
      height: 20,
      'background-color': '#182331',
      'border-width': 1,
      'border-color': '#5d718a',
      'font-size': 10.5,
      color: '#b9c8d8',
      'underlay-padding': 6,
    },
  },
  {
    selector: 'node.is-overview-minor',
    style: {
      opacity: 0.38,
    },
  },
  {
    selector: 'node.is-label-visible, node.is-focus-label',
    style: {
      'text-opacity': 1,
    },
  },
  {
    selector: 'node.is-selected',
    style: {
      'background-color': '#21352f',
      'border-width': 2.4,
      'border-color': '#f2c98a',
      'border-opacity': 1,
      'underlay-color': '#f2c98a',
      'underlay-opacity': 0.18,
      'underlay-padding': 15,
      color: '#fff6e6',
      opacity: 1,
      'z-index': 30,
    },
  },
  {
    selector: 'node.is-neighbor',
    style: {
      'border-width': 1.8,
      'border-color': '#9cebcf',
      'underlay-color': '#9cebcf',
      'underlay-opacity': 0.08,
      opacity: 1,
    },
  },
  {
    selector: 'node.is-endpoint',
    style: {
      'background-color': '#2a2922',
      'border-width': 2,
      'border-color': '#f2c98a',
      'underlay-color': '#f2c98a',
      'underlay-opacity': 0.14,
      opacity: 1,
      'z-index': 32,
    },
  },
  {
    selector: 'node.is-dimmed',
    style: {
      opacity: 0.16,
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'unbundled-bezier',
      'control-point-distances': 'data(curve)',
      'control-point-weights': 0.5,
      'edge-distances': 'node-position',
      width: 1.2,
      'line-color': '#5f819e',
      'line-opacity': 0.42,
      'line-cap': 'round',
      'source-arrow-shape': 'none',
      'target-arrow-shape': 'none',
      'overlay-opacity': 0,
      'underlay-color': '#7fe0c3',
      'underlay-opacity': 0,
      'underlay-padding': 7,
      'transition-property': 'line-color, line-opacity, width, opacity',
      'transition-duration': 160,
      'z-index': 1,
    },
  },
  {
    selector: 'edge.is-incident',
    style: {
      width: 1.8,
      'line-color': '#7fe0c3',
      'line-opacity': 0.9,
      'underlay-opacity': 0.06,
    },
  },
  {
    selector: 'edge.is-selected',
    style: {
      width: 2.3,
      'line-color': '#f2c98a',
      'line-opacity': 1,
      'underlay-color': '#f2c98a',
      'underlay-opacity': 0.16,
      'underlay-padding': 8,
      'z-index': 30,
    },
  },
  {
    selector: 'edge.is-dimmed',
    style: {
      opacity: 0.12,
    },
  },
]

function fitViewport(cy: Core, animate: boolean) {
  const shortSide = Math.min(cy.width(), cy.height())
  const padding = Math.max(32, Math.min(64, shortSide * 0.09))

  if (animate) {
    cy.animate({
      fit: { eles: cy.elements(), padding },
      duration: 240,
      easing: 'ease-out',
    })
    return
  }

  cy.fit(cy.elements(), padding)
}

const VIEWPORT_PADDING = 18
const VIEWPORT_INNER_GAP = 6
const VIEWPORT_ANIMATION_MS = 240

function preserveDisclosureFloor(
  currentZoom: number,
  nextZoom: number,
): number {
  const thresholds = [
    DISCLOSURE_THRESHOLDS.relations,
    DISCLOSURE_THRESHOLDS.concepts,
  ]

  for (const threshold of thresholds) {
    if (
      currentZoom >= threshold &&
      nextZoom < threshold &&
      nextZoom >= threshold - 0.05
    ) {
      return threshold
    }
  }

  return nextZoom
}

function revealEdgeEndpoints(
  cy: Core,
  edgeId: string,
  insets: ViewportInsets,
) {
  const edge = cy.getElementById(edgeId)

  if (edge.length === 0 || !edge.isEdge()) {
    return
  }

  const source = edge.source()
  const target = edge.target()

  if (source.length === 0 || target.length === 0) {
    return
  }

  const sourceBox = source.boundingBox({
    includeLabels: false,
    includeOverlays: false,
    includeUnderlays: false,
  })
  const targetBox = target.boundingBox({
    includeLabels: false,
    includeOverlays: false,
    includeUnderlays: false,
  })
  const bounds = {
    x1: Math.min(sourceBox.x1, targetBox.x1),
    y1: Math.min(sourceBox.y1, targetBox.y1),
    x2: Math.max(sourceBox.x2, targetBox.x2),
    y2: Math.max(sourceBox.y2, targetBox.y2),
  }
  const width = cy.width()
  const height = cy.height()
  const left = Math.max(0, VIEWPORT_PADDING + (insets.left ?? 0))
  const top = Math.max(0, VIEWPORT_PADDING + (insets.top ?? 0))
  const right = Math.max(
    left + 96,
    width - VIEWPORT_PADDING - (insets.right ?? 0),
  )
  const bottom = Math.max(
    top + 96,
    height - VIEWPORT_PADDING - (insets.bottom ?? 0),
  )
  const availableWidth = right - left
  const availableHeight = bottom - top
  const boundsWidth = Math.max(1, bounds.x2 - bounds.x1)
  const boundsHeight = Math.max(1, bounds.y2 - bounds.y1)
  const currentZoom = cy.zoom()
  const currentPan = cy.pan()
  const fitWidth = Math.max(48, availableWidth - VIEWPORT_INNER_GAP * 2)
  const fitHeight = Math.max(48, availableHeight - VIEWPORT_INNER_GAP * 2)
  let nextZoom = currentZoom

  if (
    boundsWidth * currentZoom > fitWidth ||
    boundsHeight * currentZoom > fitHeight
  ) {
    nextZoom = Math.max(
      cy.minZoom(),
      Math.min(
        currentZoom,
        fitWidth / boundsWidth,
        fitHeight / boundsHeight,
      ),
    )
  }

  nextZoom = preserveDisclosureFloor(currentZoom, nextZoom)

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (nextZoom < currentZoom - 0.002) {
    const nextPan = {
      x: (left + right) / 2 - ((bounds.x1 + bounds.x2) / 2) * nextZoom,
      y: (top + bottom) / 2 - ((bounds.y1 + bounds.y2) / 2) * nextZoom,
    }

    if (reducedMotion) {
      cy.viewport({ zoom: nextZoom, pan: nextPan })
    } else {
      cy.animate({
        zoom: nextZoom,
        pan: nextPan,
        duration: VIEWPORT_ANIMATION_MS,
        easing: 'ease-out',
      })
    }

    return
  }

  const renderedX1 = bounds.x1 * currentZoom + currentPan.x
  const renderedX2 = bounds.x2 * currentZoom + currentPan.x
  const renderedY1 = bounds.y1 * currentZoom + currentPan.y
  const renderedY2 = bounds.y2 * currentZoom + currentPan.y
  let shiftX = 0
  let shiftY = 0

  if (renderedX1 < left) {
    shiftX = left - renderedX1
  } else if (renderedX2 > right) {
    shiftX = right - renderedX2
  }

  if (renderedY1 < top) {
    shiftY = top - renderedY1
  } else if (renderedY2 > bottom) {
    shiftY = bottom - renderedY2
  }

  if (Math.abs(shiftX) < 0.5 && Math.abs(shiftY) < 0.5) {
    return
  }

  const nextPan = {
    x: currentPan.x + shiftX,
    y: currentPan.y + shiftY,
  }

  if (reducedMotion) {
    cy.pan(nextPan)
  } else {
    cy.animate({
      pan: nextPan,
      duration: 200,
      easing: 'ease-out',
    })
  }
}

const KnowledgeGraph = forwardRef<GraphHandle, KnowledgeGraphProps>(
  function KnowledgeGraph(
    {
      nodes,
      edges,
      selectedNodeId,
      selectedEdgeId,
      onSelectNode,
      onSelectEdge,
      onClearSelection,
      onViewportChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cyRef = useRef<Core | null>(null)
    const labelMetricsCache = useRef(-1)
    const [cy, setCy] = useState<Core | null>(null)
    const [level, setLevel] = useState<DisclosureLevel>('overview')
    const callbacksRef = useRef({
      onSelectNode,
      onSelectEdge,
      onClearSelection,
      onViewportChange,
    })

    useEffect(() => {
      callbacksRef.current = {
        onSelectNode,
        onSelectEdge,
        onClearSelection,
        onViewportChange,
      }
    }, [onSelectNode, onSelectEdge, onClearSelection, onViewportChange])

    const applyZoom = useCallback((factor: number) => {
      const instance = cyRef.current

      if (!instance) {
        return
      }

      const container = instance.container()

      if (!container) {
        return
      }

      const nextZoom = Math.min(
        instance.maxZoom(),
        Math.max(instance.minZoom(), instance.zoom() * factor),
      )

      instance.zoom({
        level: nextZoom,
        renderedPosition: {
          x: container.clientWidth / 2,
          y: container.clientHeight / 2,
        },
      })
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => applyZoom(1.28),
        zoomOut: () => applyZoom(1 / 1.28),
        fit: () => {
          const instance = cyRef.current

          if (instance) {
            labelMetricsCache.current = -1
            applyBaseLabelMetrics(instance)
            fitViewport(instance, true)
          }
        },
        revealEdge: (edgeId, insets = {}) => {
          const instance = cyRef.current

          if (instance) {
            revealEdgeEndpoints(instance, edgeId, insets)
          }
        },
      }),
      [applyZoom],
    )

    useEffect(() => {
      const container = containerRef.current

      if (!container) {
        return
      }

      const elements: ElementDefinition[] = [
        ...nodes.map((node) => ({
          group: 'nodes' as const,
          data: {
            id: node.id,
            label: node.title,
            title: node.title,
            nodeType: node.type,
            sourcePage: node.sourcePage,
            tier: node.tier,
          },
          position: node.position,
          classes: `tier-${node.tier}`,
        })),
        ...edges.map((edge) => ({
          group: 'edges' as const,
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            relationship: edge.relationship,
            curve: edge.curve,
          },
        })),
      ]

      const instance = cytoscape({
        container,
        elements,
        style: graphStyles,
        layout: { name: 'preset', fit: false, padding: 0 },
        minZoom: 0.32,
        maxZoom: 3.4,
        zoomingEnabled: true,
        userZoomingEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autoungrabify: true,
        autounselectify: true,
        motionBlur: false,
        hideEdgesOnViewport: false,
        textureOnViewport: false,
      })

      cyRef.current = instance

      let lastLevel: DisclosureLevel = 'overview'
      let lastPercent = -1

      const applyLabelMetrics = (zoom: number) => {
        if (Math.abs(zoom - labelMetricsCache.current) < 0.0001) {
          return
        }

        labelMetricsCache.current = zoom

        instance.batch(() => {
          instance.nodes().forEach((node) => {
            const tier = node.data('tier') as NodeTier
            const metrics = nodeLabelMetrics[tier]
            const scale = Math.max(
              1,
              metrics.minScreenSize / (metrics.baseSize * zoom),
            )

            node.style({
              'font-size': metrics.baseSize * scale,
              'text-max-width': `${metrics.maxWidth * scale}px`,
            })
          })
        })
      }

      const syncViewport = (force = false) => {
        const zoom = instance.zoom()
        const nextLevel = getDisclosureLevel(zoom)
        const percent = Math.round(zoom * 100)
        const levelChanged = nextLevel !== lastLevel

        applyLabelMetrics(zoom)

        if (levelChanged) {
          lastLevel = nextLevel
          setLevel(nextLevel)
        }

        if (force || levelChanged || percent !== lastPercent) {
          lastPercent = percent
          callbacksRef.current.onViewportChange(zoom, nextLevel)
        }
      }

      const fitWithBaseMetrics = () => {
        labelMetricsCache.current = -1
        applyBaseLabelMetrics(instance)
        fitViewport(instance, false)
        syncViewport(true)
      }

      instance.on('tap', 'node', (event) => {
        callbacksRef.current.onSelectNode(event.target.id())
      })

      instance.on('tap', 'edge', (event) => {
        callbacksRef.current.onSelectEdge(event.target.id())
      })

      instance.on('tap', (event) => {
        if (event.target === instance) {
          callbacksRef.current.onClearSelection()
        }
      })

      instance.on('mouseover', 'node, edge', () => {
        container.style.cursor = 'pointer'
      })

      instance.on('mouseout', 'node, edge', () => {
        container.style.cursor = 'grab'
      })

      instance.on('panstart', () => {
        container.style.cursor = 'grabbing'
      })

      instance.on('panend', () => {
        container.style.cursor = 'grab'
      })

      instance.on('viewport', () => syncViewport())

      let resizeFrame = 0

      const resizeObserver = new ResizeObserver(() => {
        if (resizeFrame !== 0) {
          return
        }

        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0
          instance.resize()

          if (getDisclosureLevel(instance.zoom()) === 'overview') {
            fitWithBaseMetrics()
          }
        })
      })
      resizeObserver.observe(container)

      setCy(instance)

      const frame = window.requestAnimationFrame(() => {
        instance.resize()
        fitWithBaseMetrics()
      })

      return () => {
        window.cancelAnimationFrame(frame)
        window.cancelAnimationFrame(resizeFrame)
        resizeObserver.disconnect()
        instance.destroy()
        cyRef.current = null
        setCy(null)
      }
    }, [nodes, edges])

    useEffect(() => {
      if (!cy) {
        return
      }

      const showSupporting = showsSupportingLabels(level)
      const showDetail = level === 'detail'

      cy.batch(() => {
        cy.nodes().forEach((node) => {
          const tier = node.data('tier') as NodeTier
          const title = String(node.data('title'))
          const nodeType = String(node.data('nodeType'))
          const sourcePage = String(node.data('sourcePage'))
          const visible =
            tier === 'core' || tier === 'major' || showSupporting
          const nextLabel = showDetail
            ? `${title}\n${nodeType} · ${sourcePage}`
            : title

          node.toggleClass('is-label-visible', visible)
          node.toggleClass(
            'is-overview-minor',
            level === 'overview' && tier === 'supporting',
          )

          if (node.data('label') !== nextLabel) {
            node.data('label', nextLabel)
          }
        })
      })
    }, [cy, level])

    useEffect(() => {
      if (!cy) {
        return
      }

      cy.batch(() => {
        cy.elements().removeClass(
          'is-selected is-neighbor is-incident is-endpoint is-dimmed is-focus-label',
        )

        if (selectedEdgeId) {
          const edge = cy.getElementById(selectedEdgeId)

          if (edge.length > 0) {
            const source = edge.source()
            const target = edge.target()

            edge.addClass('is-selected')
            source.addClass('is-endpoint is-focus-label')
            target.addClass('is-endpoint is-focus-label')
            cy.elements()
              .not(edge)
              .not(source)
              .not(target)
              .addClass('is-dimmed')
          }

          return
        }

        if (selectedNodeId) {
          const node = cy.getElementById(selectedNodeId)

          if (node.length > 0) {
            const neighborhood = node.closedNeighborhood()

            node.addClass('is-selected is-focus-label')
            neighborhood.nodes().not(node).addClass('is-neighbor is-focus-label')
            neighborhood.edges().addClass('is-incident')
            cy.elements().not(neighborhood).addClass('is-dimmed')
          }
        }
      })
    }, [cy, selectedNodeId, selectedEdgeId])

    return (
      <div className="knowledge-graph">
        <div
          ref={containerRef}
          className="knowledge-graph__canvas"
          aria-hidden="true"
        />
        {cy ? (
          <CurvedEdgeLabels
            cy={cy}
            edges={edges}
            level={level}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
          />
        ) : null}
      </div>
    )
  },
)

export default KnowledgeGraph
