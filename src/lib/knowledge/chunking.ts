import type {
  DocumentChapter,
  DocumentPage,
  DocumentTextBlock,
  ExtractedDocument,
} from '../../types/document.ts'
import type {
  ChunkingConfig,
  KnowledgeAnchor,
  KnowledgeChunk,
} from '../../types/knowledge.ts'

export type ChunkingResult = {
  chunks: KnowledgeChunk[]
  skippedPageNumbers: number[]
  blockCount: number
  estimatedTokens: number
}

type ChunkUnit = {
  anchorId: string
  blockId: string
  pageNumber: number
  text: string
  estimatedTokens: number
  part: number
  partCount: number
  chapterId: string | null
}

export function estimateTokens(
  text: string,
  charactersPerToken: number,
): number {
  if (charactersPerToken <= 0) {
    return 0
  }

  return Math.ceil(text.length / charactersPerToken)
}

function splitLine(
  line: string,
  config: ChunkingConfig,
): string[] {
  const lineTokens = estimateTokens(line, config.charactersPerToken)

  if (lineTokens <= config.maxTokens) {
    return [line]
  }

  const limit = Math.max(1, config.maxTokens * config.charactersPerToken)
  const fragments: string[] = []
  let current = ''

  for (const word of line.split(/\s+/).filter(Boolean)) {
    if (word.length > limit) {
      if (current) {
        fragments.push(current)
        current = ''
      }

      for (let offset = 0; offset < word.length; offset += limit) {
        fragments.push(word.slice(offset, offset + limit))
      }

      continue
    }

    const candidate = current ? `${current} ${word}` : word

    if (current && candidate.length > limit) {
      fragments.push(current)
      current = word
      continue
    }

    current = candidate
  }

  if (current) {
    fragments.push(current)
  }

  return fragments
}

function splitBlock(
  block: DocumentTextBlock,
  config: ChunkingConfig,
): ChunkUnit[] {
  const blockTokens = estimateTokens(block.text, config.charactersPerToken)

  if (blockTokens <= config.maxTokens) {
    return [
      {
        anchorId: block.id,
        blockId: block.id,
        pageNumber: block.pageNumber,
        text: block.text,
        estimatedTokens: blockTokens,
        part: 1,
        partCount: 1,
        chapterId: null,
      },
    ]
  }

  const parts: string[][] = []
  let currentLines: string[] = []

  for (const line of block.lines.length > 0 ? block.lines : [block.text]) {
    for (const fragment of splitLine(line, config)) {
      const candidate = currentLines.length > 0
        ? `${currentLines.join('\n')}\n${fragment}`
        : fragment

      if (
        currentLines.length > 0 &&
        estimateTokens(candidate, config.charactersPerToken) > config.maxTokens
      ) {
        parts.push(currentLines)
        currentLines = [fragment]
        continue
      }

      currentLines.push(fragment)
    }
  }

  if (currentLines.length > 0) {
    parts.push(currentLines)
  }

  return parts.map((part, index) => {
    const text = part.join('\n')

    return {
      anchorId: `${block.id}#${index + 1}`,
      blockId: block.id,
      pageNumber: block.pageNumber,
      text,
      estimatedTokens: estimateTokens(text, config.charactersPerToken),
      part: index + 1,
      partCount: parts.length,
      chapterId: null,
    }
  })
}

function overlapUnits(
  units: ChunkUnit[],
  tokenBudget: number,
): ChunkUnit[] {
  if (tokenBudget <= 0) {
    return []
  }

  const carry: ChunkUnit[] = []
  let tokens = 0

  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index]

    if (tokens + unit.estimatedTokens > tokenBudget) {
      break
    }

    carry.unshift(unit)
    tokens += unit.estimatedTokens
  }

  return carry
}

function renderChunkText(units: ChunkUnit[]): string {
  return units
    .map(
      (unit) =>
        `[${unit.anchorId} | p.${unit.pageNumber}]\n${unit.text}`,
    )
    .join('\n\n')
}

function buildChunk(
  units: ChunkUnit[],
  index: number,
  sectionIdsFor: (pageStart: number, pageEnd: number) => string[],
): KnowledgeChunk {
  const pageNumbers = units.map((unit) => unit.pageNumber)
  const pageStart = Math.min(...pageNumbers)
  const pageEnd = Math.max(...pageNumbers)
  const text = renderChunkText(units)
  const chapterId = units[0]?.chapterId ?? null
  const blockIds: string[] = []

  for (const unit of units) {
    if (!blockIds.includes(unit.blockId)) {
      blockIds.push(unit.blockId)
    }
  }

  const anchors: KnowledgeAnchor[] = units.map((unit) => ({
    anchorId: unit.anchorId,
    pageNumber: unit.pageNumber,
    blockId: unit.blockId,
    part: unit.part,
    partCount: unit.partCount,
    text: unit.text,
  }))

  return {
    chunkId: `chunk-${index + 1}`,
    index,
    chapterId,
    chapterTitle: null,
    sectionIds: sectionIdsFor(pageStart, pageEnd),
    pageStart,
    pageEnd,
    blockIds,
    anchors,
    text,
    characterCount: text.length,
    estimatedTokens: units.reduce(
      (total, unit) => total + unit.estimatedTokens,
      0,
    ),
  }
}

function chapterForBlock(
  page: DocumentPage,
  blockIndex: number,
  chapters: readonly DocumentChapter[],
): DocumentChapter | null {
  const candidates = chapters.filter(
    (chapter) =>
      page.pageNumber >= chapter.pageNumber &&
      page.pageNumber <= chapter.pageEnd,
  )
  const positioned = candidates
    .map((chapter) => ({
      chapter,
      headingIndex: page.blocks.findIndex(
        (block) => block.id === chapter.id,
      ),
    }))
    .filter((entry) => entry.headingIndex >= 0)
  const preceding = positioned
    .filter((entry) => entry.headingIndex <= blockIndex)
    .sort((left, right) => right.headingIndex - left.headingIndex)

  if (preceding.length > 0) {
    return preceding[0].chapter
  }

  if (positioned.length > 0) {
    return null
  }

  const previous = candidates
    .filter((chapter) => chapter.pageNumber < page.pageNumber)
    .sort((left, right) => right.pageNumber - left.pageNumber)

  return previous[0] ?? null
}

export function chunkDocument(
  document: ExtractedDocument,
  config: ChunkingConfig,
): ChunkingResult {
  const skippedPageNumbers: number[] = []
  const units: ChunkUnit[] = []
  let blockCount = 0

  for (const page of document.pages) {
    if (page.requiresOcr) {
      skippedPageNumbers.push(page.pageNumber)
      continue
    }

    for (let blockIndex = 0; blockIndex < page.blocks.length; blockIndex += 1) {
      const block = page.blocks[blockIndex]

      if (!block.text.trim()) {
        continue
      }

      blockCount += 1
      const chapter = chapterForBlock(
        page,
        blockIndex,
        document.chapters,
      )

      for (const unit of splitBlock(block, config)) {
        units.push({ ...unit, chapterId: chapter?.id ?? null })
      }
    }
  }

  const sectionIdsFor = (pageStart: number, pageEnd: number) =>
    document.sections
      .filter(
        (section) =>
          section.pageNumber <= pageEnd && section.pageEnd >= pageStart,
      )
      .map((section) => section.id)

  const chunks: KnowledgeChunk[] = []
  let buffer: ChunkUnit[] = []
  let bufferTokens = 0

  const flush = () => {
    if (buffer.length === 0) {
      return
    }

    chunks.push(buildChunk(buffer, chunks.length, sectionIdsFor))
    buffer = []
    bufferTokens = 0
  }

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]
    const chapterChanged =
      buffer.length > 0 && buffer[0].chapterId !== unit.chapterId
    const reachedTarget =
      buffer.length > 0 && bufferTokens >= config.targetTokens
    const wouldOverflow =
      buffer.length > 0 &&
      bufferTokens + unit.estimatedTokens > config.maxTokens

    if (chapterChanged || reachedTarget || wouldOverflow) {
      const carry = chapterChanged
        ? []
        : overlapUnits(
            buffer,
            Math.min(
              config.overlapTokens,
              Math.max(0, config.maxTokens - unit.estimatedTokens),
            ),
          )

      flush()
      buffer = carry
      bufferTokens = carry.reduce(
        (total, carried) => total + carried.estimatedTokens,
        0,
      )
    }

    buffer.push(unit)
    bufferTokens += unit.estimatedTokens
  }

  flush()

  const chapterTitles = new Map(
    document.chapters.map((chapter) => [chapter.id, chapter.title]),
  )

  for (const chunk of chunks) {
    chunk.chapterTitle = chunk.chapterId
      ? chapterTitles.get(chunk.chapterId) ?? null
      : null
  }

  return {
    chunks,
    skippedPageNumbers,
    blockCount,
    estimatedTokens: chunks.reduce(
      (total, chunk) => total + chunk.estimatedTokens,
      0,
    ),
  }
}
