import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  ExtractedDocument,
  ExtractionProgress as ExtractionProgressState,
  PdfFileInfo,
} from '../types/document'
import {
  PdfExtractionCancelledError,
  PdfExtractionError,
  extractPdf,
  type PdfExtractionErrorCode,
} from '../lib/pdfExtractor'
import {
  formatFileSize,
  formatPageList,
  formatPdfDate,
  getDocumentTitle,
} from '../lib/documentFormat'
import PdfUpload from './PdfUpload'
import ExtractionProgress from './ExtractionProgress'
import DocumentOutline from './DocumentOutline'
import ExtractedTextViewer from './ExtractedTextViewer'
import './DocumentWorkspace.css'

type DocumentWorkspaceProps = {
  onClose: () => void
}

type WorkspaceStatus =
  | 'empty'
  | 'extracting'
  | 'ready'
  | 'cancelled'
  | 'error'

const INITIAL_PROGRESS: ExtractionProgressState = {
  status: 'idle',
  currentPage: 0,
  totalPages: 0,
  percent: 0,
  message: 'Choose a PDF to begin.',
}

const RETRYABLE_ERRORS = new Set<PdfExtractionErrorCode>([
  'page-failed',
  'extraction-failed',
])

function getErrorHeading(code: PdfExtractionErrorCode): string {
  switch (code) {
    case 'not-pdf':
      return 'That file is not a PDF'
    case 'empty-pdf':
      return 'That PDF is empty'
    case 'password-protected':
      return 'This PDF is locked'
    case 'invalid-pdf':
      return 'This PDF cannot be opened'
    case 'page-failed':
      return 'A page could not be read'
    default:
      return 'The PDF could not be extracted'
  }
}

function DocumentSummary({
  document,
}: {
  document: ExtractedDocument
}) {
  const title = getDocumentTitle(
    document.metadata.title,
    document.fileName,
  )
  const metadataRows: Array<[string, string | null]> = [
    ['Author', document.metadata.author],
    ['Subject', document.metadata.subject],
    ['Keywords', document.metadata.keywords],
    ['Created', formatPdfDate(document.metadata.creationDate)],
    ['Modified', formatPdfDate(document.metadata.modificationDate)],
    ['Creator', document.metadata.creator],
    ['Producer', document.metadata.producer],
    ['File', document.fileName],
  ]
  const availableRows = metadataRows.filter(
    (row): row is [string, string] => Boolean(row[1]),
  )
  const ocrPageCount = document.ocrPageNumbers.length

  return (
    <section
      className="document-summary"
      aria-labelledby="document-title"
    >
      <div className="document-summary__heading">
        <div>
          <p className="section-eyebrow">Document ready</p>
          <h2 id="document-title">{title}</h2>
          <p className="document-summary__byline">
            {document.metadata.author
              ? `By ${document.metadata.author}`
              : 'Extracted locally in your browser'}
          </p>
        </div>

        <dl className="document-summary__stats">
          <div>
            <dt>Pages</dt>
            <dd>{document.pages.length}</dd>
          </div>
          <div>
            <dt>Headings</dt>
            <dd>{document.headingCount}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatFileSize(document.fileSize)}</dd>
          </div>
        </dl>
      </div>

      {ocrPageCount > 0 ? (
        <div className="document-warning">
          <span className="document-warning__icon" aria-hidden="true">
            !
          </span>
          <div>
            <strong>
              {ocrPageCount === 1
                ? '1 page may require OCR'
                : `${ocrPageCount} pages may require OCR`}
            </strong>
            <p>
              These pages have little or no extractable text and may be
              scanned. OCR is not available in this version.
            </p>
            <p className="document-warning__pages">
              Pages: {formatPageList(document.ocrPageNumbers)}
            </p>
          </div>
        </div>
      ) : null}

      <details className="document-metadata">
        <summary>Metadata and file details</summary>
        <dl>
          {availableRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Page size</dt>
            <dd>
              {Math.round(document.pages[0]?.width ?? 0)} ×{' '}
              {Math.round(document.pages[0]?.height ?? 0)} pt
            </dd>
          </div>
        </dl>
      </details>
    </section>
  )
}

function DocumentWorkspace({ onClose }: DocumentWorkspaceProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)
  const [status, setStatus] = useState<WorkspaceStatus>('empty')
  const [fileInfo, setFileInfo] = useState<PdfFileInfo | null>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [progress, setProgress] =
    useState<ExtractionProgressState>(INITIAL_PROGRESS)
  const [document, setDocument] = useState<ExtractedDocument | null>(
    null,
  )
  const [error, setError] = useState<PdfExtractionError | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    onClose()
  }, [onClose])

  const startExtraction = useCallback(async (file: File) => {
    runIdRef.current += 1
    const runId = runIdRef.current
    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller

    setActiveFile(file)
    setFileInfo({ name: file.name, size: file.size })
    setDocument(null)
    setError(null)
    setProgress(INITIAL_PROGRESS)
    setStatus('extracting')
    setIsCancelling(false)
    setCurrentPage(1)

    try {
      const result = await extractPdf(file, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (
            runIdRef.current === runId &&
            !controller.signal.aborted
          ) {
            setProgress(nextProgress)
          }
        },
      })

      if (
        runIdRef.current !== runId ||
        controller.signal.aborted
      ) {
        return
      }

      setDocument(result)
      setStatus('ready')
      setCurrentPage(1)
      setActiveFile(null)
    } catch (caught) {
      if (runIdRef.current !== runId) {
        return
      }

      if (
        caught instanceof PdfExtractionCancelledError ||
        controller.signal.aborted
      ) {
        setStatus('cancelled')
        setProgress((current) => ({
          ...current,
          status: 'cancelled',
          message: 'Extraction cancelled.',
        }))
        return
      }

      setError(
        caught instanceof PdfExtractionError
          ? caught
          : new PdfExtractionError(
              'extraction-failed',
              'The PDF could not be read. Choose another file.',
            ),
      )
      setStatus('error')
    } finally {
      if (runIdRef.current === runId) {
        abortRef.current = null
        setIsCancelling(false)
      }
    }
  }, [])

  const handleFileSelected = useCallback(
    (file: File) => {
      const isPdf =
        file.type === 'application/pdf' ||
        /\.pdf$/i.test(file.name)

      setFileInfo({ name: file.name, size: file.size })

      if (!isPdf) {
        runIdRef.current += 1
        abortRef.current?.abort()
        abortRef.current = null
        setActiveFile(null)
        setDocument(null)
        setProgress(INITIAL_PROGRESS)
        setError(
          new PdfExtractionError(
            'not-pdf',
            'Choose a PDF file. Other file types are not supported.',
          ),
        )
        setStatus('error')
        return
      }

      if (file.size === 0) {
        runIdRef.current += 1
        abortRef.current?.abort()
        abortRef.current = null
        setActiveFile(null)
        setDocument(null)
        setProgress(INITIAL_PROGRESS)
        setError(
          new PdfExtractionError(
            'empty-pdf',
            'This file is empty. Choose a different PDF.',
          ),
        )
        setStatus('error')
        return
      }

      void startExtraction(file)
    },
    [startExtraction],
  )

  const resetWorkspace = useCallback(() => {
    runIdRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('empty')
    setFileInfo(null)
    setActiveFile(null)
    setDocument(null)
    setProgress(INITIAL_PROGRESS)
    setError(null)
    setIsCancelling(false)
    setCurrentPage(1)
  }, [])

  const handleCancel = () => {
    if (!abortRef.current) {
      return
    }

    setIsCancelling(true)
    setProgress((current) => ({
      ...current,
      message: 'Cancelling extraction…',
    }))
    abortRef.current.abort()
  }

  const handlePageChange = (pageNumber: number) => {
    if (!document) {
      return
    }

    setCurrentPage(
      Math.min(document.pages.length, Math.max(1, pageNumber)),
    )
  }

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        handleClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const overlay = overlayRef.current

      if (!overlay) {
        return
      }

      const focusable = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.offsetParent !== null && element.tabIndex >= 0,
      )

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = globalThis.document.activeElement

      if (!overlay.contains(active)) {
        event.preventDefault()
        first.focus()
        return
      }

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleClose])

  useEffect(() => {
    return () => {
      runIdRef.current += 1
      abortRef.current?.abort()
    }
  }, [])

  const showFileActions = Boolean(fileInfo)
  const canRetry =
    Boolean(activeFile) &&
    error !== null &&
    RETRYABLE_ERRORS.has(error.code)

  return (
    <div
      ref={overlayRef}
      className="document-workspace"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-workspace-title"
    >
      <header className="document-workspace__header">
        <div className="document-workspace__identity">
          <span className="brand" aria-hidden="true">
            visco<span>.</span>
          </span>
          <h1 id="document-workspace-title">Document workspace</h1>
        </div>

        {fileInfo ? (
          <div
            className="document-workspace__file"
            title={fileInfo.name}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <span>{fileInfo.name}</span>
            <small>{formatFileSize(fileInfo.size)}</small>
          </div>
        ) : null}

        <div className="document-workspace__actions">
          {showFileActions ? (
            <button
              type="button"
              className="document-button document-button--quiet"
              onClick={resetWorkspace}
            >
              Remove PDF
            </button>
          ) : null}
          <button
            ref={closeButtonRef}
            type="button"
            className="document-workspace__close"
            onClick={handleClose}
            aria-label="Close document workspace"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12" />
              <path d="m18 6-12 12" />
            </svg>
          </button>
        </div>
      </header>

      <main
        className="document-workspace__body"
        aria-busy={status === 'extracting'}
      >
        {status === 'empty' ? (
          <PdfUpload onFileSelected={handleFileSelected} />
        ) : null}

        {status === 'extracting' && fileInfo ? (
          <ExtractionProgress
            fileName={fileInfo.name}
            fileSize={fileInfo.size}
            progress={progress}
            isCancelling={isCancelling}
            onCancel={handleCancel}
          />
        ) : null}

        {status === 'cancelled' && fileInfo ? (
          <section
            className="document-state-card"
            aria-labelledby="cancelled-title"
          >
            <span className="document-state-card__icon" aria-hidden="true">
              ×
            </span>
            <p className="section-eyebrow">Extraction stopped</p>
            <h2 id="cancelled-title">No changes were saved</h2>
            <p>
              Visco stopped reading {fileInfo.name}. You can try the same
              PDF again or choose a different one.
            </p>
            <dl className="document-state-card__file">
              <div>
                <dt>File</dt>
                <dd>{fileInfo.name}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatFileSize(fileInfo.size)}</dd>
              </div>
            </dl>
            <div className="document-state-card__actions">
              {activeFile ? (
                <button
                  type="button"
                  className="document-button document-button--primary"
                  onClick={() => {
                    void startExtraction(activeFile)
                  }}
                >
                  Try again
                </button>
              ) : null}
              <button
                type="button"
                className="document-button document-button--quiet"
                onClick={resetWorkspace}
              >
                Choose another PDF
              </button>
            </div>
          </section>
        ) : null}

        {status === 'error' && error ? (
          <section
            className="document-state-card document-state-card--error"
            aria-labelledby="error-title"
          >
            <span className="document-state-card__icon" aria-hidden="true">
              !
            </span>
            <p className="section-eyebrow">PDF extraction error</p>
            <h2 id="error-title">{getErrorHeading(error.code)}</h2>
            <p>{error.message}</p>
            {fileInfo ? (
              <dl className="document-state-card__file">
                <div>
                  <dt>File</dt>
                  <dd>{fileInfo.name}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{formatFileSize(fileInfo.size)}</dd>
                </div>
              </dl>
            ) : null}
            <div className="document-state-card__actions">
              {canRetry && activeFile ? (
                <button
                  type="button"
                  className="document-button document-button--primary"
                  onClick={() => {
                    void startExtraction(activeFile)
                  }}
                >
                  Try again
                </button>
              ) : null}
              <button
                type="button"
                className="document-button document-button--quiet"
                onClick={resetWorkspace}
              >
                Choose another PDF
              </button>
            </div>
          </section>
        ) : null}

        {status === 'ready' && document ? (
          <div className="document-content">
            <DocumentSummary document={document} />
            <div className="document-panes">
              <DocumentOutline
                document={document}
                currentPage={currentPage}
                onNavigate={handlePageChange}
              />
              <ExtractedTextViewer
                document={document}
                pageNumber={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default DocumentWorkspace
