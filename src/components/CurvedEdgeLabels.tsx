import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Core } from 'cytoscape'
import type { DisclosureLevel, KnowledgeEdge } from '../types/graph'
import { showsEdgeLabels } from '../lib/disclosure'
import {
  buildEdgeLabelGeometry,
  resolveVisibleEdgeLabels,
} from '../lib/edgeLabels'

type CurvedEdgeLabelsProps = {
  cy: Core
  edges: KnowledgeEdge[]
  level: DisclosureLevel
  selectedNodeId: string | null
  selectedEdgeId: string | null
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) {
    return false
  }

  for (const value of a) {
    if (!b.has(value)) {
      return false
    }
  }

  return true
}

function CurvedEdgeLabels({
  cy,
  edges,
  level,
  selectedNodeId,
  selectedEdgeId,
}: CurvedEdgeLabelsProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const [hiddenEdgeIds, setHiddenEdgeIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )

  const labels = useMemo(() => {
    if (!showsEdgeLabels(level)) {
      return []
    }

    return buildEdgeLabelGeometry(cy, edges, level)
  }, [cy, edges, level])

  useLayoutEffect(() => {
    const svg = svgRef.current
    const group = groupRef.current

    if (!svg || !group) {
      return
    }

    let frame = 0

    const applyViewport = () => {
      frame = 0
      const pan = cy.pan()
      const zoom = cy.zoom()

      group.setAttribute(
        'transform',
        `translate(${pan.x} ${pan.y}) scale(${zoom})`,
      )
      svg.style.setProperty('--label-scale', String(1 / zoom))
    }

    const scheduleViewport = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(applyViewport)
      }
    }

    applyViewport()
    cy.on('viewport resize', scheduleViewport)

    return () => {
      cy.off('viewport resize', scheduleViewport)
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [cy])

  useLayoutEffect(() => {
    let frame = 0
    let lastZoom = Number.NaN

    const updateVisibility = () => {
      frame = 0
      const zoom = cy.zoom()

      if (Math.abs(zoom - lastZoom) < 0.0005) {
        return
      }

      lastZoom = zoom

      const nextHidden = resolveVisibleEdgeLabels(cy, labels, {
        zoom,
        level,
        selectedNodeId,
        selectedEdgeId,
      })

      setHiddenEdgeIds((previous) =>
        setsEqual(previous, nextHidden) ? previous : nextHidden,
      )
    }

    const scheduleVisibility = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(updateVisibility)
      }
    }

    scheduleVisibility()
    cy.on('viewport resize', scheduleVisibility)

    return () => {
      cy.off('viewport resize', scheduleVisibility)
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [cy, labels, level, selectedNodeId, selectedEdgeId])

  const visibleLabels = labels.filter(
    (label) => !hiddenEdgeIds.has(label.edgeId),
  )

  return (
    <svg
      ref={svgRef}
      className="edge-label-layer"
      aria-hidden="true"
      focusable="false"
    >
      <g ref={groupRef}>
        <defs>
          {visibleLabels.map((label) => (
            <path key={label.pathId} id={label.pathId} d={label.path} />
          ))}
        </defs>
        {visibleLabels.map((label) => {
          const isSelected = label.edgeId === selectedEdgeId
          const isRelated =
            selectedNodeId !== null &&
            (label.source === selectedNodeId || label.target === selectedNodeId)
          const isDimmed =
            (selectedNodeId !== null || selectedEdgeId !== null) &&
            !isSelected &&
            !isRelated
          const classes = ['edge-label']

          if (level === 'detail') {
            classes.push('edge-label--detail')
          }

          if (isSelected) {
            classes.push('edge-label--selected')
          } else if (isRelated) {
            classes.push('edge-label--related')
          }

          if (isDimmed) {
            classes.push('edge-label--dimmed')
          }

          return (
            <text
              key={label.edgeId}
              className={classes.join(' ')}
              data-edge-id={label.edgeId}
            >
              <textPath
                href={`#${label.pathId}`}
                startOffset="50%"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label.label}
              </textPath>
            </text>
          )
        })}
      </g>
    </svg>
  )
}

export default memo(CurvedEdgeLabels)
