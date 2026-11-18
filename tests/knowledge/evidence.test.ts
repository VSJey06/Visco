import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  baseBlockId,
  createEvidenceSource,
  createUnverifiedClaim,
  hasMatchedEvidence,
  markClaimRejected,
  markClaimVerified,
  matchEvidenceRef,
  matchQuote,
  normalizeEvidenceText,
} from '../../src/lib/knowledge/evidence.ts'
import type {
  EvidenceReference,
  EvidenceRef,
} from '../../src/types/knowledge.ts'
import { chunkDocument } from '../../src/lib/knowledge/chunking.ts'
import { resolveExtractionConfig } from '../../src/lib/knowledge/config.ts'
import {
  createSplitBlockDocument,
  createTestDocument,
} from './fixtures.ts'

const source = createEvidenceSource(createTestDocument())

function ref(overrides: Partial<EvidenceReference> = {}): EvidenceReference {
  return {
    pageNumber: 1,
    blockId: 'page-1-block-2',
    quote: 'The cell membrane controls which substances enter the cell.',
    matchStatus: 'unchecked',
    ...overrides,
  }
}

describe('evidence matching', () => {
  it('normalises whitespace, case, and punctuation', () => {
    assert.equal(
      normalizeEvidenceText('The  Cell,\nMembrane!'),
      'the cell, membrane!',
    )
  })

  it('finds a quote that was copied with different spacing', () => {
    assert.equal(
      matchQuote(
        'the cell membrane controls which substances enter the cell',
        'The cell membrane controls which substances enter the cell.',
      ),
      true,
    )
  })

  it('does not find a quote that is absent from the source', () => {
    assert.equal(
      matchQuote(
        'The cell membrane pumps sodium across the cell',
        'The cell membrane controls which substances enter the cell.',
      ),
      false,
    )
  })

  it('matches a reference against the cited block', () => {
    const result = matchEvidenceRef(ref(), source)

    assert.equal(result.status, 'matched')
    assert.equal(result.reason, 'matched')
    assert.equal(result.ref.matchStatus, 'matched')
  })

  it('rejects a page number outside the document', () => {
    const result = matchEvidenceRef(ref({ pageNumber: 99 }), source)

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'page-out-of-range')
  })

  it('rejects a block that does not exist', () => {
    const result = matchEvidenceRef(
      ref({ blockId: 'page-9-block-9' }),
      source,
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'block-not-found')
  })

  it('rejects a block outside the allowed anchors', () => {
    const result = matchEvidenceRef(
      ref({ pageNumber: 2, blockId: 'page-2-block-2', quote: 'Active transport' }),
      source,
      new Set(['page-1-block-2']),
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'block-not-allowed')
  })

  it('rejects an unknown part anchor', () => {
    const result = matchEvidenceRef(
      ref({ blockId: 'page-1-block-2#999' }),
      source,
      new Set(['page-1-block-2']),
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'block-not-allowed')
  })

  it('matches a quote only within the cited split anchor', () => {
    const document = createSplitBlockDocument()
    const chunk = chunkDocument(document, {
      ...resolveExtractionConfig().chunking,
      targetTokens: 10,
      maxTokens: 10,
      overlapTokens: 0,
    }).chunks[0]
    const splitSource = createEvidenceSource(document, chunk.anchors)
    const result = matchEvidenceRef(
      ref({
        blockId: chunk.anchors[0].anchorId,
        quote: 'bravo',
      }),
      splitSource,
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'quote-not-found')
  })

  it('rejects a reference whose page does not match the block', () => {
    const result = matchEvidenceRef(
      ref({ pageNumber: 2, quote: 'The cell membrane controls' }),
      source,
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'page-mismatch')
  })

  it('rejects a reference without a quote', () => {
    const result = matchEvidenceRef(ref({ quote: null }), source)

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'quote-missing')
  })

  it('rejects a quote that is not in the cited block', () => {
    const result = matchEvidenceRef(
      ref({ quote: 'The cell membrane stores energy for the cell.' }),
      source,
    )

    assert.equal(result.status, 'unmatched')
    assert.equal(result.reason, 'quote-not-found')
  })

  it('resolves part anchors back to their block', () => {
    assert.equal(baseBlockId('page-1-block-2#3'), 'page-1-block-2')
    assert.equal(baseBlockId('page-1-block-2'), 'page-1-block-2')
    assert.deepEqual(source.resolveAnchorId('page-1-block-2#1'), {
      blockId: 'page-1-block-2',
      pageNumber: 1,
    })
    assert.equal(source.resolveAnchorId('page-7-block-1'), null)
  })

  it('reports whether any reference was matched', () => {
    assert.equal(hasMatchedEvidence([]), false)
    assert.equal(
      hasMatchedEvidence([{ ...ref(), matchStatus: 'unmatched' }]),
      false,
    )
    const matched: EvidenceRef = {
      pageNumber: 1,
      blockId: 'page-1-block-2',
      quote: 'text',
      matchStatus: 'matched',
    }

    assert.equal(hasMatchedEvidence([matched]), true)
  })
})

describe('claim verification', () => {
  it('starts every claim as not verified', () => {
    assert.deepEqual(createUnverifiedClaim(), {
      status: 'not-verified',
      method: 'none',
      detail: null,
    })
  })

  it('only changes through an explicit review', () => {
    assert.deepEqual(markClaimVerified('checked by hand'), {
      status: 'verified',
      method: 'manual-review',
      detail: 'checked by hand',
    })
    assert.deepEqual(markClaimRejected('not supported'), {
      status: 'rejected',
      method: 'manual-review',
      detail: 'not supported',
    })
  })
})
