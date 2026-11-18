import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createUnverifiedClaim } from '../../src/lib/knowledge/evidence.ts'
import { reviewRelationship } from '../../src/lib/knowledge/review.ts'
import type { ExtractedRelationship } from '../../src/types/knowledge.ts'

function relationship(): ExtractedRelationship {
  return {
    id: 'rel-1',
    sourceId: 'cell-membrane',
    targetId: 'diffusion',
    kind: 'ASSOCIATED_WITH',
    label: 'related to',
    statement: '',
    evidence: [
      {
        pageNumber: 1,
        blockId: 'page-1-block-2',
        quote: 'The cell membrane controls which substances enter the cell.',
        matchStatus: 'matched',
      },
    ],
    basis: 'inferred',
    inference: {
      kind: 'explicit-cross-reference',
      rationale: 'The passage explicitly points to the target.',
    },
    confidence: 0.7,
    chunkIds: ['chunk-1'],
    verification: createUnverifiedClaim(),
    review: 'suggested',
  }
}

describe('relationship review', () => {
  it('accepts a suggestion only through an explicit semantic review', () => {
    const reviewed = reviewRelationship(relationship(), 'accept', {
      reviewer: 'reviewer',
      reviewedAt: '2026-11-18T00:00:00.000Z',
      detail: 'The source entails the relationship.',
    })

    assert.equal(reviewed.review, 'accepted')
    assert.equal(reviewed.verification.status, 'verified')
    assert.equal(reviewed.verification.method, 'manual-review')
    assert.equal(reviewed.basis, 'inferred')
  })

  it('rejects a suggestion through an explicit review', () => {
    const reviewed = reviewRelationship(relationship(), 'reject', {
      reviewer: 'reviewer',
      reviewedAt: '2026-11-18T00:00:00.000Z',
      detail: null,
    })

    assert.equal(reviewed.review, 'rejected')
    assert.equal(reviewed.verification.status, 'rejected')
  })

  it('requires reviewer metadata', () => {
    assert.throws(
      () =>
        reviewRelationship(relationship(), 'accept', {
          reviewer: '',
          reviewedAt: '2026-11-18T00:00:00.000Z',
          detail: null,
        }),
      TypeError,
    )
  })
})
