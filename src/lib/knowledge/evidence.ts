import type {
  DocumentTextBlock,
  ExtractedDocument,
} from '../../types/document.ts'
import type {
  ClaimVerification,
  EvidenceRef,
  EvidenceReference,
  KnowledgeAnchor,
} from '../../types/knowledge.ts'

export type EvidenceMatchReason =
  | 'matched'
  | 'page-out-of-range'
  | 'page-mismatch'
  | 'block-not-found'
  | 'block-not-allowed'
  | 'quote-missing'
  | 'quote-not-found'

export type EvidenceMatchResult =
  | {
      ref: EvidenceRef
      status: 'matched'
      reason: 'matched'
    }
  | {
      ref: EvidenceReference & { matchStatus: 'unmatched' }
      status: 'unmatched'
      reason: Exclude<EvidenceMatchReason, 'matched'>
    }

export type EvidenceSource = {
  pageCount: number
  allowedAnchorIds: ReadonlySet<string> | null
  getBlock(blockId: string): DocumentTextBlock | null
  resolveAnchorId(anchorId: string): {
    blockId: string
    pageNumber: number
  } | null
  resolveAnchorText(anchorId: string): string | null
}

export function baseBlockId(anchorId: string): string {
  const separator = anchorId.indexOf('#')

  return separator === -1 ? anchorId : anchorId.slice(0, separator)
}

export function createEvidenceSource(
  document: ExtractedDocument,
  anchors: readonly KnowledgeAnchor[] = [],
): EvidenceSource {
  const blocks = new Map<string, DocumentTextBlock>()
  const anchorTexts = new Map<string, string>()

  for (const page of document.pages) {
    for (const block of page.blocks) {
      blocks.set(block.id, block)
    }
  }

  for (const anchor of anchors) {
    anchorTexts.set(anchor.anchorId, anchor.text)
  }

  return {
    pageCount: document.pages.length,
    allowedAnchorIds:
      anchors.length > 0 ? new Set(anchors.map((anchor) => anchor.anchorId)) : null,
    getBlock(blockId: string) {
      return blocks.get(blockId) ?? null
    },
    resolveAnchorId(anchorId: string) {
      const blockId = baseBlockId(anchorId)
      const block = blocks.get(blockId)

      if (!block) {
        return null
      }

      return { blockId, pageNumber: block.pageNumber }
    },
    resolveAnchorText(anchorId: string) {
      const anchorText = anchorTexts.get(anchorId)

      if (anchorText !== undefined) {
        return anchorText
      }

      if (anchorId.includes('#')) {
        return null
      }

      return blocks.get(anchorId)?.text ?? null
    },
  }
}

export function normalizeEvidenceText(value: string): string {
  return value
    .replace(/\p{Cf}/gu, '')
    .replace(/[\p{Pi}\p{Pf}]/gu, '')
    .replace(/["']/g, '')
    .replace(/\p{Pd}/gu, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function matchQuote(quote: string, blockText: string): boolean {
  const normalizedQuote = normalizeEvidenceText(quote)

  if (!normalizedQuote) {
    return false
  }

  return normalizeEvidenceText(blockText).includes(normalizedQuote)
}

export function matchEvidenceRef(
  ref: EvidenceReference,
  source: EvidenceSource,
  allowedAnchorIds?: ReadonlySet<string>,
): EvidenceMatchResult {
  const reject = (
    reason: Exclude<EvidenceMatchReason, 'matched'>,
  ): EvidenceMatchResult => ({
    ref: { ...ref, matchStatus: 'unmatched' },
    status: 'unmatched',
    reason,
  })

  if (
    !Number.isInteger(ref.pageNumber) ||
    ref.pageNumber < 1 ||
    ref.pageNumber > source.pageCount
  ) {
    return reject('page-out-of-range')
  }

  if (!ref.blockId) {
    return reject('block-not-found')
  }

  const permittedAnchorIds = allowedAnchorIds ?? source.allowedAnchorIds

  if (permittedAnchorIds && !permittedAnchorIds.has(ref.blockId)) {
    return reject('block-not-allowed')
  }

  const blockId = baseBlockId(ref.blockId)
  const block = source.getBlock(blockId)

  if (!block) {
    return reject('block-not-found')
  }

  if (block.pageNumber !== ref.pageNumber) {
    return reject('page-mismatch')
  }

  const anchorText = source.resolveAnchorText(ref.blockId)

  if (anchorText === null) {
    return reject('block-not-found')
  }

  if (!ref.quote || !ref.quote.trim()) {
    return reject('quote-missing')
  }

  if (!matchQuote(ref.quote, anchorText)) {
    return reject('quote-not-found')
  }

  return {
    ref: {
      pageNumber: ref.pageNumber,
      blockId: ref.blockId,
      quote: ref.quote,
      matchStatus: 'matched',
    },
    status: 'matched',
    reason: 'matched',
  }
}

export function matchEvidenceRefs(
  refs: EvidenceReference[],
  source: EvidenceSource,
  allowedAnchorIds?: ReadonlySet<string>,
): EvidenceMatchResult[] {
  return refs.map((ref) =>
    matchEvidenceRef(ref, source, allowedAnchorIds),
  )
}

export function hasMatchedEvidence(
  refs: ReadonlyArray<{ matchStatus: string }>,
): boolean {
  return refs.some((ref) => ref.matchStatus === 'matched')
}

export function createUnverifiedClaim(): ClaimVerification {
  return {
    status: 'not-verified',
    method: 'none',
    detail: null,
  }
}

export function markClaimVerified(
  detail: string | null = null,
): ClaimVerification {
  return {
    status: 'verified',
    method: 'manual-review',
    detail,
  }
}

export function markClaimRejected(
  detail: string | null = null,
): ClaimVerification {
  return {
    status: 'rejected',
    method: 'manual-review',
    detail,
  }
}
