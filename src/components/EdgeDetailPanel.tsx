import { useEffect, useRef } from 'react'
import type { KnowledgeEdge, KnowledgeNode } from '../types/graph'

type EdgeDetailPanelProps = {
  edge: KnowledgeEdge
  source: KnowledgeNode
  target: KnowledgeNode
  onClose: () => void
}

function EdgeDetailPanel({
  edge,
  source,
  target,
  onClose,
}: EdgeDetailPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <aside
      className="detail-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="edge-detail-title"
    >
      <div className="detail-panel__grabber" aria-hidden="true" />
      <button
        ref={closeRef}
        type="button"
        className="detail-panel__close"
        aria-label="Close connection details"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <p className="detail-panel__eyebrow">Connection · {edge.relationship}</p>
      <h2 id="edge-detail-title" className="detail-panel__title">
        {source.title}
        <span className="detail-panel__arrow" aria-hidden="true">
          {' '}
          →{' '}
        </span>
        {target.title}
      </h2>
      <p className="detail-panel__relation">“{edge.label}”</p>
      <p className="detail-panel__body">{edge.explanation}</p>

      <section className="detail-panel__section">
        <h3>Supporting points</h3>
        <ul className="detail-panel__list">
          {edge.supportingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <footer className="detail-panel__footer">
        <span>Relationship</span>
        <span>{edge.relationship}</span>
      </footer>
    </aside>
  )
}

export default EdgeDetailPanel
