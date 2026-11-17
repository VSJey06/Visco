import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DisclosureLevel,
  KnowledgeEdge,
  KnowledgeNode,
} from '../types/graph'
import KnowledgeGraph, {
  type GraphHandle,
  type ViewportInsets,
} from './KnowledgeGraph'
import GraphControls from './GraphControls'
import NodeDetailPanel from './NodeDetailPanel'
import EdgeDetailPanel from './EdgeDetailPanel'

type GraphWorkspaceProps = {
  subject: string
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

function GraphWorkspace({ subject, nodes, edges }: GraphWorkspaceProps) {
  const graphRef = useRef<GraphHandle>(null)
  const stageRef = useRef<HTMLElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<{
    zoom: number
    level: DisclosureLevel
  }>({
    zoom: 1,
    level: 'overview',
  })

  const handleSelectNode = useCallback((id: string) => {
    setSelectedEdgeId(null)
    setSelectedNodeId(id)
  }, [])

  const handleSelectEdge = useCallback((id: string) => {
    setSelectedNodeId(null)
    setSelectedEdgeId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [])

  const handleViewportChange = useCallback(
    (zoom: number, level: DisclosureLevel) => {
      setViewport({ zoom, level })
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClearSelection])

  useEffect(() => {
    if (!selectedEdgeId) {
      return
    }

    let frame = window.requestAnimationFrame(() => {
      frame = 0
      const stage = stageRef.current

      if (!stage) {
        return
      }

      const panel = stage.querySelector<HTMLElement>('.detail-panel')
      const insets: ViewportInsets = {}

      if (panel) {
        if (window.matchMedia('(min-width: 56rem)').matches) {
          const stageRect = stage.getBoundingClientRect()
          const panelRect = panel.getBoundingClientRect()

          insets.right = Math.max(0, stageRect.right - panelRect.left)
        } else {
          insets.bottom = panel.offsetHeight
        }
      }

      graphRef.current?.revealEdge(selectedEdgeId, insets)
    })

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [selectedEdgeId])

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge =
    edges.find((edge) => edge.id === selectedEdgeId) ?? null
  const edgeSource = selectedEdge
    ? (nodes.find((node) => node.id === selectedEdge.source) ?? null)
    : null
  const edgeTarget = selectedEdge
    ? (nodes.find((node) => node.id === selectedEdge.target) ?? null)
    : null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__identity">
          <h1 className="brand">
            visco<span aria-hidden="true">.</span>
          </h1>
          <p className="app-header__subject">{subject}</p>
        </div>
        <p className="app-header__counts">
          {nodes.length} concepts · {edges.length} links
        </p>
        <p className="app-header__hint">
          Drag to pan · scroll or pinch to zoom
        </p>
      </header>

      <main
        ref={stageRef}
        className="graph-stage"
        aria-label="Knowledge graph workspace"
      >
        <p className="sr-only">
          Interactive knowledge graph with {nodes.length} concepts and{' '}
          {edges.length} links. Drag empty space to pan. Pinch or scroll to
          zoom. Select a concept or connection to read its details.
        </p>

        <KnowledgeGraph
          ref={graphRef}
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onClearSelection={handleClearSelection}
          onViewportChange={handleViewportChange}
        />

        <GraphControls
          zoom={viewport.zoom}
          level={viewport.level}
          onZoomIn={() => graphRef.current?.zoomIn()}
          onZoomOut={() => graphRef.current?.zoomOut()}
          onFit={() => graphRef.current?.fit()}
        />

        {selectedNode ? (
          <NodeDetailPanel
            key={selectedNode.id}
            node={selectedNode}
            onClose={handleClearSelection}
          />
        ) : null}

        {selectedEdge && edgeSource && edgeTarget ? (
          <EdgeDetailPanel
            key={selectedEdge.id}
            edge={selectedEdge}
            source={edgeSource}
            target={edgeTarget}
            onClose={handleClearSelection}
          />
        ) : null}

        <p className="sr-only" role="status">
          {selectedNode
            ? `Selected concept: ${selectedNode.title}.`
            : selectedEdge
              ? `Selected connection: ${edgeSource?.title} to ${edgeTarget?.title}.`
              : ''}
        </p>
      </main>
    </div>
  )
}

export default GraphWorkspace
