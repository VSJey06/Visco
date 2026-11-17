import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

type PdfUploadProps = {
  onFileSelected: (file: File) => void
}

const ACCEPTED_TYPES = '.pdf,application/pdf'

function PdfUpload({ onFileSelected }: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return
    }

    onFileSelected(file)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return
    }

    setIsDragging(false)
  }

  return (
    <section className="pdf-upload" aria-labelledby="pdf-upload-title">
      <div
        className={`pdf-upload__dropzone${
          isDragging ? ' pdf-upload__dropzone--active' : ''
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setIsDragging(true)
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="pdf-upload__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
            <path d="M8.5 13h7" />
            <path d="M8.5 16h5" />
          </svg>
        </span>
        <p className="pdf-upload__eyebrow">Document workspace</p>
        <h2 id="pdf-upload-title">Bring a PDF into focus</h2>
        <p className="pdf-upload__description">
          Upload a textbook chapter, lecture notes, or study guide. Visco
          extracts the text and detects a reading outline without sending
          your file anywhere.
        </p>
        <button
          type="button"
          className="pdf-upload__button"
          onClick={openPicker}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
            <path d="M5 14v5h14v-5" />
          </svg>
          Choose PDF
        </button>
        <p className="pdf-upload__hint">or drop a PDF anywhere in this panel</p>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          tabIndex={-1}
        />
      </div>
      <p className="pdf-upload__privacy">
        <span aria-hidden="true">●</span>
        Files stay in your browser. Nothing is uploaded.
      </p>
    </section>
  )
}

export default PdfUpload
