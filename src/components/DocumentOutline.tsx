import type {
  DocumentHeadingEntry,
  ExtractedDocument,
} from '../types/document'
import { formatPageRange } from '../lib/documentFormat'

type DocumentOutlineProps = {
  document: ExtractedDocument
  currentPage: number
  onNavigate: (pageNumber: number) => void
}

type OutlineEntryProps = {
  entry: DocumentHeadingEntry
  variant: 'chapter' | 'section'
  currentPage: number
  onNavigate: (pageNumber: number) => void
}

function OutlineEntry({
  entry,
  variant,
  currentPage,
  onNavigate,
}: OutlineEntryProps) {
  const isCurrent =
    currentPage >= entry.pageNumber && currentPage <= entry.pageEnd

  return (
    <button
      type="button"
      className={`outline-entry outline-entry--${variant}${
        isCurrent ? ' outline-entry--current' : ''
      }`}
      onClick={() => onNavigate(entry.pageNumber)}
      aria-current={isCurrent ? 'page' : undefined}
    >
      <span className="outline-entry__main">
        <span className="outline-entry__kind">
          {variant === 'chapter' ? 'Chapter' : 'Section'}
        </span>
        <span className="outline-entry__title">{entry.title}</span>
      </span>
      <span className="outline-entry__meta">
        <span>{formatPageRange(entry.pageNumber, entry.pageEnd)}</span>
        <span className="detected-badge">Detected</span>
      </span>
    </button>
  )
}

function DocumentOutline({
  document,
  currentPage,
  onNavigate,
}: DocumentOutlineProps) {
  const nestedIds = new Set(
    document.chapters.flatMap((chapter) =>
      chapter.sections.map((section) => section.id),
    ),
  )
  const standaloneSections = document.sections.filter(
    (section) => !nestedIds.has(section.id),
  )
  const hasOutline =
    document.chapters.length > 0 || document.sections.length > 0

  return (
    <aside
      className="document-outline"
      aria-labelledby="document-outline-title"
    >
      <div className="document-outline__header">
        <p className="section-eyebrow">Reading map</p>
        <h2 id="document-outline-title">Detected structure</h2>
        <p className="document-outline__note">
          Built from the PDF text and formatting. These headings are
          detected automatically, not confirmed.
        </p>
      </div>

      {hasOutline ? (
        <div className="document-outline__entries">
          {document.chapters.map((chapter) => (
            <div className="outline-group" key={chapter.id}>
              <OutlineEntry
                entry={chapter}
                variant="chapter"
                currentPage={currentPage}
                onNavigate={onNavigate}
              />
              {chapter.sections.length > 0 ? (
                <div className="outline-group__sections">
                  {chapter.sections.map((section) => (
                    <OutlineEntry
                      key={section.id}
                      entry={section}
                      variant="section"
                      currentPage={currentPage}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {standaloneSections.length > 0 ? (
            <div className="outline-group">
              <p className="outline-group__label">Sections</p>
              {standaloneSections.map((section) => (
                <OutlineEntry
                  key={section.id}
                  entry={section}
                  variant="section"
                  currentPage={currentPage}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="document-outline__empty">
          <p>No chapter or section headings were detected.</p>
          <p>
            The text is still available page by page. No structure has
            been invented.
          </p>
        </div>
      )}
    </aside>
  )
}

export default DocumentOutline
