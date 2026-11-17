import { useEffect, useRef } from 'react'
import type { KnowledgeNode } from '../types/graph'

type NodeDetailPanelProps = {
  node: KnowledgeNode
  onClose: () => void
}

function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <aside
      className="detail-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="node-detail-title"
    >
      <div className="detail-panel__grabber" aria-hidden="true" />
      <button
        ref={closeRef}
        type="button"
        className="detail-panel__close"
        aria-label="Close concept details"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <p className="detail-panel__eyebrow">{node.type}</p>
      <h2 id="node-detail-title" className="detail-panel__title">
        {node.title}
      </h2>
      <p className="detail-panel__body">{node.definition}</p>

      <section className="detail-panel__section">
        <h3>Key points</h3>
        <ul className="detail-panel__list">
          {node.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <footer className="detail-panel__footer">
        <span>Source page (placeholder)</span>
        <span>{node.sourcePage}</span>
      </footer>
    </aside>
  )
}

export default NodeDetailPanel
