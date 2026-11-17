import type { ExtractionProgress as ExtractionProgressState } from '../types/document'
import { formatFileSize } from '../lib/documentFormat'

type ExtractionProgressProps = {
  fileName: string
  fileSize: number
  progress: ExtractionProgressState
  isCancelling: boolean
  onCancel: () => void
}

function ExtractionProgress({
  fileName,
  fileSize,
  progress,
  isCancelling,
  onCancel,
}: ExtractionProgressProps) {
  const pageLabel =
    progress.totalPages > 0
      ? `Page ${Math.max(1, progress.currentPage)} of ${
          progress.totalPages
        }`
      : 'Preparing document'

  return (
    <section
      className="extraction-card"
      aria-labelledby="extraction-title"
    >
      <div className="extraction-card__file">
        <span className="extraction-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
            <path d="M8.5 13h7" />
            <path d="M8.5 16h5" />
          </svg>
        </span>
        <div className="extraction-card__identity">
          <p className="extraction-card__eyebrow">Reading document</p>
          <h2 id="extraction-title" title={fileName}>
            {fileName}
          </h2>
          <p>{formatFileSize(fileSize)}</p>
        </div>
      </div>

      <div className="extraction-card__status">
        <div
          className="extraction-card__status-row"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{progress.message}</span>
          <span>{pageLabel}</span>
        </div>
        <div
          className="progress-bar"
          role="progressbar"
          aria-label="PDF extraction progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <span
            className="progress-bar__fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="extraction-card__footer">
          <p>{progress.percent}% complete</p>
          <button
            type="button"
            className="document-button document-button--quiet"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel extraction'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default ExtractionProgress
