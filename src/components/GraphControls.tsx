import type { DisclosureLevel } from '../types/graph'
import { DISCLOSURE_LABELS } from '../lib/disclosure'

type GraphControlsProps = {
  zoom: number
  level: DisclosureLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

function GraphControls({
  zoom,
  level,
  onZoomIn,
  onZoomOut,
  onFit,
}: GraphControlsProps) {
  return (
    <div className="graph-controls" role="group" aria-label="Graph view controls">
      <span className="graph-controls__readout">
        <span className="graph-controls__level">{DISCLOSURE_LABELS[level]}</span>
        <span className="graph-controls__zoom">{Math.round(zoom * 100)}%</span>
      </span>
      <button
        type="button"
        className="graph-controls__button"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={onZoomOut}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        className="graph-controls__button"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={onZoomIn}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        className="graph-controls__button"
        aria-label="Fit graph to screen"
        title="Fit to screen"
        onClick={onFit}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
        </svg>
      </button>
    </div>
  )
}

export default GraphControls
