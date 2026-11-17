import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist'
import type {
  DocumentChapter,
  DocumentHeading,
  DocumentHeadingEntry,
  DocumentHeadingKind,
  DocumentMetadata,
  DocumentPage,
  DocumentTextBlock,
  ExtractedDocument,
  ExtractionProgress,
} from '../types/document'

export const OCR_TEXT_THRESHOLD = 40

export type PdfExtractionErrorCode =
  | 'not-pdf'
  | 'empty-pdf'
  | 'password-protected'
  | 'invalid-pdf'
  | 'page-failed'
  | 'extraction-failed'

export class PdfExtractionError extends Error {
  readonly code: PdfExtractionErrorCode

  constructor(code: PdfExtractionErrorCode, message: string) {
    super(message)
    this.name = 'PdfExtractionError'
    this.code = code
  }
}

export class PdfExtractionCancelledError extends Error {
  constructor() {
    super('PDF extraction was cancelled.')
    this.name = 'PdfExtractionCancelledError'
  }
}

export type ExtractPdfOptions = {
  signal?: AbortSignal
  onProgress?: (progress: ExtractionProgress) => void
}

type PdfJsModule = typeof import('pdfjs-dist')
type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>
type TextItem = Extract<TextContent['items'][number], { str: string }>

type PositionedItem = {
  str: string
  x: number
  y: number
  width: number
  fontSize: number
  fontName: string
  fontFamily: string | null
  isBold: boolean
  hasEol: boolean
}

type ExtractedLine = {
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string | null
  isBold: boolean
  isUppercase: boolean
  spaceBefore: number
  spaceAfter: number
}

type PageDraft = {
  pageNumber: number
  width: number
  height: number
  text: string
  lines: ExtractedLine[]
  characterCount: number
}

type BlockDraft = {
  lines: ExtractedLine[]
  text: string
  fontSize: number
  fontFamily: string | null
  isBold: boolean
  isUppercase: boolean
  spaceBefore: number
  spaceAfter: number
}

const EMPTY_METADATA: DocumentMetadata = {
  title: null,
  author: null,
  subject: null,
  keywords: null,
  creator: null,
  producer: null,
  creationDate: null,
  modificationDate: null,
}

let pdfJsPromise: Promise<PdfJsModule> | null = null

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((pdfJs) => {
      pdfJs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfJs
    })
  }

  return pdfJsPromise
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PdfExtractionCancelledError()
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function readNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function countNonWhitespace(text: string): number {
  return text.replace(/\s/g, '').length
}

function isBoldFont(fontName: string, fontFamily: string | null): boolean {
  return /bold|black|heavy|semibold|demi/i.test(
    `${fontName} ${fontFamily ?? ''}`,
  )
}

function isUppercaseText(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, '')
  return letters.length >= 3 && letters === letters.toUpperCase()
}

function textItemToPositioned(
  item: TextItem,
  content: TextContent,
): PositionedItem {
  const transform = item.transform as unknown[]
  const x = readNumber(transform[4])
  const y = readNumber(transform[5])
  const scaleY = Math.hypot(
    readNumber(transform[2]),
    readNumber(transform[3]),
  )
  const fontSize = Math.max(1, Math.abs(item.height), scaleY)
  const fontFamily = content.styles[item.fontName]?.fontFamily ?? null

  return {
    str: item.str,
    x,
    y,
    width: Math.abs(item.width),
    fontSize,
    fontName: item.fontName,
    fontFamily,
    isBold: isBoldFont(item.fontName, fontFamily),
    hasEol: item.hasEOL === true,
  }
}

function buildLines(content: TextContent): ExtractedLine[] {
  const groups: PositionedItem[][] = []
  let current: PositionedItem[] = []

  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) {
      continue
    }

    const positioned = textItemToPositioned(item, content)
    const previous = current[current.length - 1]

    if (previous) {
      const fontSize = Math.min(previous.fontSize, positioned.fontSize)
      const baselineTolerance = Math.max(2, fontSize * 0.4)
      const sameBaseline =
        Math.abs(positioned.y - previous.y) <= baselineTolerance
      const previousEnd =
        previous.x + Math.max(previous.width, fontSize * 0.3)
      const gap = positioned.x - previousEnd
      const gapTolerance = Math.max(12, fontSize * 1.5)
      const startsNewLine =
        previous.hasEol ||
        !sameBaseline ||
        gap > gapTolerance ||
        positioned.x < previous.x - baselineTolerance

      if (startsNewLine) {
        groups.push(current)
        current = []
      }
    }

    current.push(positioned)
  }

  if (current.length > 0) {
    groups.push(current)
  }

  const lines: ExtractedLine[] = []

  for (const group of groups) {
    const items = [...group].sort((a, b) => a.x - b.x)

    let text = ''
    let previousEnd: number | null = null
    let previous: PositionedItem | null = null

    for (const item of items) {
      if (previous && previousEnd !== null) {
        const gap = item.x - previousEnd
        const threshold =
          Math.max(0.6, Math.min(item.fontSize, previous.fontSize) * 0.18)

        if (
          gap > threshold &&
          !/\s$/.test(text) &&
          !/^\s/.test(item.str)
        ) {
          text += ' '
        }
      }

      text += item.str
      previousEnd = item.x + item.width
      previous = item
    }

    const normalized = normalizeText(text)

    if (!normalized) {
      continue
    }

    const dominant = items.reduce((best, item) =>
      item.str.trim().length > best.str.trim().length ? item : best,
    )
    const lineText = normalized
    const line: ExtractedLine = {
      text: lineText,
      x: items[0]?.x ?? 0,
      y: items[0]?.y ?? 0,
      fontSize: dominant.fontSize,
      fontFamily: dominant.fontFamily,
      isBold: items.some((item) => item.isBold) && dominant.isBold,
      isUppercase: isUppercaseText(lineText),
      spaceBefore: 0,
      spaceAfter: 0,
    }

    lines.push(line)
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const previous = lines[index - 1]
    const next = lines[index + 1]

    if (previous) {
      const normalGap =
        Math.max(previous.fontSize, line.fontSize) * 1.2
      line.spaceBefore = Math.max(0, previous.y - line.y - normalGap)
    }

    if (next) {
      const normalGap = Math.max(line.fontSize, next.fontSize) * 1.2
      line.spaceAfter = Math.max(0, line.y - next.y - normalGap)
    }
  }

  return lines
}

function estimateBodyFontSize(pages: PageDraft[]): number {
  const weights = new Map<number, number>()

  for (const page of pages) {
    for (const line of page.lines) {
      const size = Math.round(line.fontSize * 2) / 2
      weights.set(size, (weights.get(size) ?? 0) + line.text.length)
    }
  }

  let bodyFontSize = 0
  let highestWeight = -1

  for (const [size, weight] of weights) {
    if (weight > highestWeight) {
      bodyFontSize = size
      highestWeight = weight
    }
  }

  return bodyFontSize || 11
}

function lineStartsBlock(
  line: ExtractedLine,
  previous: ExtractedLine | undefined,
  currentFontSize: number,
  bodyFontSize: number,
): boolean {
  if (!previous) {
    return true
  }

  const paragraphGap = line.spaceBefore > Math.max(2, bodyFontSize * 0.42)
  const fontChanged =
    Math.abs(line.fontSize - currentFontSize) >
    Math.max(1, bodyFontSize * 0.14)
  const upwardJump = line.y > previous.y + Math.max(2, bodyFontSize * 0.5)
  const formattingChanged =
    line.isBold !== previous.isBold ||
    line.isUppercase !== previous.isUppercase

  return paragraphGap || fontChanged || upwardJump || formattingChanged
}

function buildBlocks(
  lines: ExtractedLine[],
  bodyFontSize: number,
): BlockDraft[] {
  const blocks: BlockDraft[] = []
  let currentLines: ExtractedLine[] = []
  let currentFontSize = lines[0]?.fontSize ?? bodyFontSize

  const flush = () => {
    if (currentLines.length === 0) {
      return
    }

    const totalWeight = currentLines.reduce(
      (sum, line) => sum + Math.max(1, line.text.length),
      0,
    )
    const weightedFontSize =
      currentLines.reduce(
        (sum, line) =>
          sum + line.fontSize * Math.max(1, line.text.length),
        0,
      ) / totalWeight
    const boldWeight = currentLines.reduce(
      (sum, line) =>
        sum + (line.isBold ? Math.max(1, line.text.length) : 0),
      0,
    )
    const uppercaseWeight = currentLines.reduce(
      (sum, line) =>
        sum + (line.isUppercase ? Math.max(1, line.text.length) : 0),
      0,
    )
    const dominantLine = currentLines.reduce((best, line) =>
      line.text.length > best.text.length ? line : best,
    )

    blocks.push({
      lines: currentLines,
      text: currentLines.map((line) => line.text).join('\n'),
      fontSize: weightedFontSize,
      fontFamily: dominantLine.fontFamily,
      isBold: boldWeight / totalWeight >= 0.5,
      isUppercase: uppercaseWeight / totalWeight >= 0.5,
      spaceBefore: currentLines[0]?.spaceBefore ?? 0,
      spaceAfter:
        currentLines[currentLines.length - 1]?.spaceAfter ?? 0,
    })

    currentLines = []
  }

  for (const line of lines) {
    const previous = currentLines[currentLines.length - 1]

    if (
      currentLines.length > 0 &&
      lineStartsBlock(line, previous, currentFontSize, bodyFontSize)
    ) {
      flush()
      currentFontSize = line.fontSize
    }

    if (currentLines.length === 0) {
      currentFontSize = line.fontSize
    }

    currentLines.push(line)
  }

  flush()
  return blocks
}

function detectHeading(
  block: BlockDraft,
  bodyFontSize: number,
): DocumentHeading | null {
  const title = normalizeText(block.text.replace(/\n/g, ' '))

  if (!title || block.lines.length > 3) {
    return null
  }

  const ratio = block.fontSize / bodyFontSize
  const chapterPattern =
    /^(chapter|part|book|volume|unit)\s+(?:\d{1,3}|[ivxlcdm]{1,6}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i
  const appendixPattern = /^appendix\s+[a-z0-9]+\b/i
  const sectionPattern =
    /^(section|lesson)\s+(?:\d+(?:\.\d+)*|[ivxlcdm]{1,6})\b/i
  const hierarchicalNumber = /^\d+(?:\.\d+){1,3}[.)]?\s+\S/.test(title)
  const topLevelNumber = /^\d{1,2}[.)]\s+[A-Z]/.test(title)
  const romanNumber = /^[IVXLCDM]{1,6}[.)]\s+\S/.test(title)
  const isNamedHeading =
    chapterPattern.test(title) ||
    appendixPattern.test(title) ||
    sectionPattern.test(title)

  let score = 0

  if (ratio >= 1.55) {
    score += 4
  } else if (ratio >= 1.3) {
    score += 3
  } else if (ratio >= 1.14) {
    score += 2
  } else if (ratio >= 1.05) {
    score += 1
  }

  if (block.isBold) {
    score += 2
  }

  if (block.isUppercase) {
    score += 2
  }

  if (chapterPattern.test(title) || appendixPattern.test(title)) {
    score += 5
  } else if (sectionPattern.test(title)) {
    score += 4
  } else if (hierarchicalNumber) {
    score += 4
  } else if (topLevelNumber) {
    score += 3
  } else if (romanNumber) {
    score += 3
  }

  if (title.length <= 60) {
    score += 1
  }

  if (block.spaceBefore > Math.max(2, bodyFontSize * 0.35)) {
    score += 1
  }

  if (block.spaceAfter > Math.max(2, bodyFontSize * 0.35)) {
    score += 1
  }

  if (block.lines.length > 2) {
    score -= 1
  }

  if (title.length > 90) {
    score -= 4
  } else if (title.length > 65) {
    score -= 1
  }

  if (/[.!;]$/.test(title)) {
    score -= 3
  } else if (/[,:]$/.test(title)) {
    score -= 1
  }

  if (/[.!?]\s+[A-Z]/.test(title)) {
    score -= 4
  }

  if (/^[a-z]/.test(title)) {
    score -= 2
  }

  if (title.split(/\s+/).length > 14) {
    score -= 2
  }

  if (
    ratio < 1.05 &&
    !block.isBold &&
    !block.isUppercase &&
    !isNamedHeading
  ) {
    score -= 1
  }

  if (score < 5) {
    return null
  }

  let kind: DocumentHeadingKind = 'section'

  if (
    chapterPattern.test(title) ||
    appendixPattern.test(title) ||
    topLevelNumber ||
    romanNumber
  ) {
    kind = 'chapter'
  }

  return {
    kind,
    level: kind === 'chapter' ? 1 : 2,
  }
}

function buildOutline(
  headings: Array<{
    id: string
    title: string
    pageNumber: number
    kind: DocumentHeadingKind
    level: number
  }>,
  totalPages: number,
): {
  chapters: DocumentChapter[]
  sections: DocumentHeadingEntry[]
} {
  const entries: DocumentHeadingEntry[] = headings.map(
    (heading, index) => {
      const next = headings
        .slice(index + 1)
        .find((candidate) => candidate.level <= heading.level)
      const pageEnd = next
        ? Math.max(heading.pageNumber, next.pageNumber - 1)
        : totalPages

      return {
        ...heading,
        pageEnd,
        status: 'detected',
      }
    },
  )
  const chapters: DocumentChapter[] = []
  const sections: DocumentHeadingEntry[] = []
  let currentChapter: DocumentChapter | null = null

  for (const entry of entries) {
    if (entry.kind === 'chapter') {
      currentChapter = { ...entry, sections: [] }
      chapters.push(currentChapter)
      continue
    }

    sections.push(entry)
    currentChapter?.sections.push(entry)
  }

  return { chapters, sections }
}

function readMetadataValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }

  if (Array.isArray(value)) {
    const combined = value
      .filter((part): part is string => typeof part === 'string')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ')

    return combined || null
  }

  return null
}

async function readMetadata(
  pdf: PDFDocumentProxy,
): Promise<DocumentMetadata> {
  try {
    const result = await pdf.getMetadata()
    const info = (result.info ?? {}) as Record<string, unknown>
    const documentInfo = result.metadata

    return {
      title:
        readMetadataValue(info.Title) ??
        readMetadataValue(documentInfo?.get('dc:title')),
      author:
        readMetadataValue(info.Author) ??
        readMetadataValue(documentInfo?.get('dc:creator')),
      subject:
        readMetadataValue(info.Subject) ??
        readMetadataValue(documentInfo?.get('dc:description')),
      keywords: readMetadataValue(info.Keywords),
      creator: readMetadataValue(info.Creator),
      producer: readMetadataValue(info.Producer),
      creationDate: readMetadataValue(info.CreationDate),
      modificationDate: readMetadataValue(info.ModDate),
    }
  } catch {
    return EMPTY_METADATA
  }
}

async function extractPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageDraft> {
  const page = await pdf.getPage(pageNumber)

  try {
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const lines = buildLines(content)
    const text = lines.map((line) => line.text).join('\n')

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      text,
      lines,
      characterCount: countNonWhitespace(text),
    }
  } finally {
    page.cleanup()
  }
}

function normalizePdfError(error: unknown): PdfExtractionError {
  if (error instanceof PdfExtractionError) {
    return error
  }

  const name = error instanceof Error ? error.name : ''

  if (name === 'PasswordException') {
    return new PdfExtractionError(
      'password-protected',
      'This PDF is password-protected. Unlock it and try again.',
    )
  }

  if (name === 'InvalidPDFException') {
    return new PdfExtractionError(
      'invalid-pdf',
      'This file is not a valid PDF or may be damaged.',
    )
  }

  if (name === 'MissingPDFException') {
    return new PdfExtractionError(
      'invalid-pdf',
      'The selected PDF could not be found or opened.',
    )
  }

  return new PdfExtractionError(
    'extraction-failed',
    'The PDF could not be read. It may be damaged or use an unsupported format.',
  )
}

export async function extractPdf(
  file: File,
  { signal, onProgress }: ExtractPdfOptions = {},
): Promise<ExtractedDocument> {
  const isPdf =
    file.type === 'application/pdf' ||
    /\.pdf$/i.test(file.name)

  if (!isPdf) {
    throw new PdfExtractionError(
      'not-pdf',
      'Choose a PDF file. Other file types are not supported.',
    )
  }

  if (file.size === 0) {
    throw new PdfExtractionError(
      'empty-pdf',
      'This file is empty. Choose a different PDF.',
    )
  }

  throwIfAborted(signal)
  onProgress?.({
    status: 'reading',
    currentPage: 0,
    totalPages: 0,
    percent: 0,
    message: 'Reading the PDF…',
  })

  const pdfJs = await loadPdfJs()
  throwIfAborted(signal)

  const objectUrl = URL.createObjectURL(file)
  let loadingTask: PDFDocumentLoadingTask | null = null

  const handleAbort = () => {
    if (loadingTask) {
      void loadingTask.destroy().catch(() => undefined)
    }
  }

  signal?.addEventListener('abort', handleAbort, { once: true })

  try {
    loadingTask = pdfJs.getDocument({ url: objectUrl })
    const pdf = await loadingTask.promise
    throwIfAborted(signal)

    const totalPages = pdf.numPages

    if (totalPages === 0) {
      throw new PdfExtractionError(
        'invalid-pdf',
        'This PDF does not contain any readable pages.',
      )
    }

    const metadata = await readMetadata(pdf)
    const pages: PageDraft[] = []

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      throwIfAborted(signal)

      const pageStartPercent =
        4 + Math.round(((pageNumber - 1) / totalPages) * 86)

      onProgress?.({
        status: 'extracting',
        currentPage: pageNumber,
        totalPages,
        percent: pageStartPercent,
        message: `Extracting page ${pageNumber} of ${totalPages}…`,
      })

      try {
        pages.push(await extractPage(pdf, pageNumber))
      } catch (error) {
        if (signal?.aborted || error instanceof PdfExtractionCancelledError) {
          throw new PdfExtractionCancelledError()
        }

        throw new PdfExtractionError(
          'page-failed',
          `Page ${pageNumber} could not be read. The PDF may be damaged.`,
        )
      }

      const pageEndPercent =
        4 + Math.round((pageNumber / totalPages) * 86)

      onProgress?.({
        status: 'extracting',
        currentPage: pageNumber,
        totalPages,
        percent: pageEndPercent,
        message: `Extracted page ${pageNumber} of ${totalPages}`,
      })

      await yieldToBrowser()
      throwIfAborted(signal)
    }

    throwIfAborted(signal)
    onProgress?.({
      status: 'structuring',
      currentPage: totalPages,
      totalPages,
      percent: 93,
      message: 'Organizing pages and detected headings…',
    })

    await yieldToBrowser()
    throwIfAborted(signal)

    const bodyFontSize = estimateBodyFontSize(pages)
    const headingDrafts: Array<{
      id: string
      title: string
      pageNumber: number
      kind: DocumentHeadingKind
      level: number
    }> = []
    const extractedPages: DocumentPage[] = pages.map((page) => {
      const blockDrafts = buildBlocks(page.lines, bodyFontSize)
      const blocks: DocumentTextBlock[] = blockDrafts.map(
        (blockDraft, index) => {
          const id = `page-${page.pageNumber}-block-${index + 1}`
          const heading = detectHeading(blockDraft, bodyFontSize)

          if (heading) {
            headingDrafts.push({
              id,
              title: normalizeText(blockDraft.text.replace(/\n/g, ' ')),
              pageNumber: page.pageNumber,
              kind: heading.kind,
              level: heading.level,
            })
          }

          return {
            id,
            pageNumber: page.pageNumber,
            text: blockDraft.text,
            lines: blockDraft.lines.map((line) => line.text),
            fontSize: blockDraft.fontSize,
            fontFamily: blockDraft.fontFamily,
            isBold: blockDraft.isBold,
            isUppercase: blockDraft.isUppercase,
            heading,
          }
        },
      )

      return {
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        text: page.text,
        blocks,
        characterCount: page.characterCount,
        requiresOcr: page.characterCount < OCR_TEXT_THRESHOLD,
      }
    })

    throwIfAborted(signal)
    const { chapters, sections } = buildOutline(
      headingDrafts,
      totalPages,
    )
    const ocrPageNumbers = extractedPages
      .filter((page) => page.requiresOcr)
      .map((page) => page.pageNumber)

    onProgress?.({
      status: 'complete',
      currentPage: totalPages,
      totalPages,
      percent: 100,
      message: 'PDF extraction complete.',
    })

    return {
      fileName: file.name,
      fileSize: file.size,
      metadata,
      pages: extractedPages,
      chapters,
      sections,
      headingCount: headingDrafts.length,
      ocrPageNumbers,
    }
  } catch (error) {
    if (signal?.aborted || error instanceof PdfExtractionCancelledError) {
      throw new PdfExtractionCancelledError()
    }

    throw normalizePdfError(error)
  } finally {
    signal?.removeEventListener('abort', handleAbort)

    if (loadingTask) {
      await loadingTask.destroy().catch(() => undefined)
    }

    URL.revokeObjectURL(objectUrl)
  }
}
