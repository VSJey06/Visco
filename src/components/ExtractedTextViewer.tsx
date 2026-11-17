import { useEffect, useRef, useState } from 'react'
import type { ExtractedDocument } from '../types/document'

type ExtractedTextViewerProps = {
  document: ExtractedDocument
  pageNumber: number
  onPageChange: (pageNumber: number) => void
}

type PageNumberFormProps = {
  pageNumber: number
  pageCount: number
  onPageChange: (pageNumber: number) => void
}

function PageNumberForm({
  pageNumber,
  pageCount,
  onPageChange,
}: PageNumberFormProps) {
  const [value, setValue] = useState(String(pageNumber))

  const commit = () => {
    const parsed = Number.parseInt(value, 10)

    if (!Number.isFinite(parsed)) {
      setValue(String(pageNumber))
      return
    }

    const nextPage = Math.min(pageCount, Math.max(1, parsed))
    setValue(String(nextPage))

    if (nextPage !== pageNumber) {
      onPageChange(nextPage)
    }
  }

  return (
    <form
      className="page-navigation__form"
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
    >
      <label htmlFor="page-number-input">Page</label>
      <input
        id="page-number-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={pageCount}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
      />
      <span>of {pageCount}</span>
    </form>
  )
}

function ExtractedTextViewer({
  document,
  pageNumber,
  onPageChange,
}: ExtractedTextViewerProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousPageRef = useRef(pageNumber)
  const pageCount = document.pages.length
  const page = document.pages[pageNumber - 1] ?? document.pages[0]

  useEffect(() => {
    const pageChanged = previousPageRef.current !== pageNumber
    previousPageRef.current = pageNumber
    scrollRef.current?.scrollTo({ top: 0 })

    if (
      pageChanged &&
      window.matchMedia('(max-width: 55.999rem)').matches
    ) {
      sectionRef.current?.scrollIntoView({ block: 'start' })
    }
  }, [pageNumber])

  if (!page) {
    return null
  }

  return (
    <section
      ref={sectionRef}
      className="text-viewer"
      aria-labelledby="extracted-text-title"
    >
      <div className="text-viewer__toolbar">
        <div>
          <p className="section-eyebrow">Extracted text</p>
          <h2 id="extracted-text-title">
            Page {page.pageNumber}{' '}
            <span className="text-viewer__page-total">
              of {pageCount}
            </span>
          </h2>
        </div>

        <div className="page-navigation">
          <button
            type="button"
            className="page-navigation__arrow"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14.5 5-7 7 7 7" />
            </svg>
          </button>

          <PageNumberForm
            key={pageNumber}
            pageNumber={pageNumber}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />

          <button
            type="button"
            className="page-navigation__arrow"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= pageCount}
            aria-label="Next page"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9.5 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="text-viewer__scroll"
        aria-label={`Extracted text for page ${page.pageNumber}`}
        tabIndex={0}
      >
        <article className="extracted-page">
          {page.requiresOcr ? (
            <div className="document-warning document-warning--inline">
              <span className="document-warning__icon" aria-hidden="true">
                !
              </span>
              <div>
                <strong>This page may need OCR.</strong>
                <p>
                  It has little or no extractable text, so it may be
                  scanned or image-based. OCR is not available in this
                  version.
                </p>
              </div>
            </div>
          ) : null}

          {page.blocks.length > 0 ? (
            page.blocks.map((block) => {
              if (block.heading) {
                const Heading =
                  block.heading.kind === 'chapter' ? 'h3' : 'h4'

                return (
                  <Heading
                    key={block.id}
                    className={`extracted-page__heading extracted-page__heading--${block.heading.kind}`}
                    data-page-number={block.pageNumber}
                    aria-label={block.text}
                  >
                    <span
                      className="extracted-page__heading-label"
                      aria-hidden="true"
                    >
                      Detected {block.heading.kind}
                    </span>
                    {block.text}
                  </Heading>
                )
              }

              return (
                <p
                  key={block.id}
                  className="extracted-page__block"
                  data-page-number={block.pageNumber}
                >
                  {block.text}
                </p>
              )
            })
          ) : (
            <div className="extracted-page__empty">
              <p>No extractable text was found on this page.</p>
              <p>
                The page may be blank, scanned, or drawn as an image.
              </p>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default ExtractedTextViewer
