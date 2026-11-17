export type DocumentMetadata = {
  title: string | null
  author: string | null
  subject: string | null
  keywords: string | null
  creator: string | null
  producer: string | null
  creationDate: string | null
  modificationDate: string | null
}

export type DocumentHeadingKind = 'chapter' | 'section'

export type DocumentStructureStatus = 'detected' | 'confirmed'

export type DocumentHeading = {
  kind: DocumentHeadingKind
  level: number
}

export type DocumentTextBlock = {
  id: string
  pageNumber: number
  text: string
  lines: string[]
  fontSize: number
  fontFamily: string | null
  isBold: boolean
  isUppercase: boolean
  heading: DocumentHeading | null
}

export type DocumentPage = {
  pageNumber: number
  width: number
  height: number
  text: string
  blocks: DocumentTextBlock[]
  characterCount: number
  requiresOcr: boolean
}

export type DocumentHeadingEntry = {
  id: string
  title: string
  pageNumber: number
  pageEnd: number
  kind: DocumentHeadingKind
  level: number
  status: DocumentStructureStatus
}

export type DocumentChapter = DocumentHeadingEntry & {
  sections: DocumentHeadingEntry[]
}

export type ExtractedDocument = {
  fileName: string
  fileSize: number
  metadata: DocumentMetadata
  pages: DocumentPage[]
  chapters: DocumentChapter[]
  sections: DocumentHeadingEntry[]
  headingCount: number
  ocrPageNumbers: number[]
}

export type ExtractionStatus =
  | 'idle'
  | 'reading'
  | 'extracting'
  | 'structuring'
  | 'complete'
  | 'cancelled'
  | 'error'

export type ExtractionProgress = {
  status: ExtractionStatus
  currentPage: number
  totalPages: number
  percent: number
  message: string
}

export type PdfFileInfo = {
  name: string
  size: number
}
