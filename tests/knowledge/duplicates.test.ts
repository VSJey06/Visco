import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  canonicalizeEndpoints,
  findDuplicateConcepts,
  findDuplicateRelationships,
  mergeConceptGroup,
  mergeRelationshipGroup,
  relationshipKey,
} from '../../src/lib/knowledge/duplicates.ts'
import {
  createUnverifiedClaim,
  markClaimVerified,
} from '../../src/lib/knowledge/evidence.ts'
import type {
  ExtractedConcept,
  ExtractedRelationship,
} from '../../src/types/knowledge.ts'

function concept(overrides: Partial<ExtractedConcept>): ExtractedConcept {
  return {
    id: 'cell-membrane',
    canonicalTitle: 'Cell membrane',
    aliases: [],
    kind: 'main_concept',
    tier: 'core',
    definition: null,
    attributes: [],
    evidence: [
      {
        pageNumber: 1,
        blockId: 'page-1-block-2',
        quote: 'The cell membrane controls which substances enter the cell.',
        matchStatus: 'matched',
      },
    ],
    basis: 'direct',
    confidence: 0.8,
    mentionCount: 1,
    chunkIds: ['chunk-1'],
    verification: createUnverifiedClaim(),
    ...overrides,
  }
}

function relationship(
  overrides: Partial<ExtractedRelationship>,
): ExtractedRelationship {
  return {
    id: 'rel-1',
    sourceId: 'cell-membrane',
    targetId: 'diffusion',
    kind: 'CAUSES',
    label: 'causes',
    statement: '',
    evidence: [],
    basis: 'direct',
    inference: null,
    confidence: 0.7,
    chunkIds: ['chunk-1'],
    verification: createUnverifiedClaim(),
    review: 'suggested',
    ...overrides,
  }
}

describe('concept duplicates', () => {
  it('groups concepts by their normalised title', () => {
    const groups = findDuplicateConcepts([
      concept({ id: 'a', canonicalTitle: 'The cell membrane' }),
      concept({ id: 'b', canonicalTitle: 'Cell membrane' }),
      concept({ id: 'c', canonicalTitle: 'Diffusion' }),
    ])

    assert.equal(groups.length, 1)
    assert.equal(groups[0].concepts.length, 2)
    assert.deepEqual(groups[0].titles, ['The cell membrane', 'Cell membrane'])
  })

  it('merges evidence, aliases, mentions, and the strongest definition', () => {
    const merged = mergeConceptGroup([
      concept({
        id: 'a',
        canonicalTitle: 'The cell membrane',
        definition: 'A boundary that controls what enters a cell.',
        tier: 'major',
        mentionCount: 2,
        aliases: ['plasma membrane'],
        chunkIds: ['chunk-1'],
      }),
      concept({
        id: 'b',
        canonicalTitle: 'Cell membrane',
        definition: null,
        tier: 'core',
        confidence: 0.9,
        mentionCount: 1,
        chunkIds: ['chunk-2'],
        evidence: [
          {
            pageNumber: 2,
            blockId: 'page-2-block-2',
            quote: 'Active transport requires energy.',
            matchStatus: 'matched',
          },
        ],
      }),
    ])

    assert.equal(merged.tier, 'core')
    assert.equal(merged.definition, 'A boundary that controls what enters a cell.')
    assert.equal(merged.mentionCount, 3)
    assert.equal(merged.evidence.length, 2)
    assert.deepEqual(merged.chunkIds.sort(), ['chunk-1', 'chunk-2'])
    assert.ok(merged.aliases.includes('plasma membrane'))
    assert.ok(merged.aliases.includes('The cell membrane'))
  })
  it('does not inherit verification from only one duplicate', () => {
    const merged = mergeConceptGroup([
      concept({ id: 'a', verification: markClaimVerified('reviewed') }),
      concept({ id: 'b', verification: createUnverifiedClaim() }),
    ])

    assert.equal(merged.verification.status, 'not-verified')
    assert.equal(merged.verification.method, 'none')
  })

  it('retains verification when every duplicate was reviewed', () => {
    const merged = mergeConceptGroup([
      concept({ id: 'a', verification: markClaimVerified('reviewed') }),
      concept({ id: 'b', verification: markClaimVerified('reviewed') }),
    ])

    assert.equal(merged.verification.status, 'verified')
    assert.equal(merged.verification.method, 'manual-review')
  })
})

describe('relationship duplicates', () => {
  it('treats symmetric relationships as the same pair', () => {
    const groups = findDuplicateRelationships([
      relationship({
        id: 'a',
        kind: 'ASSOCIATED_WITH',
        sourceId: 'a-concept',
        targetId: 'b-concept',
      }),
      relationship({
        id: 'b',
        kind: 'ASSOCIATED_WITH',
        sourceId: 'b-concept',
        targetId: 'a-concept',
      }),
    ])

    assert.equal(groups.length, 1)
    assert.equal(groups[0].relationships.length, 2)
  })

  it('keeps directed relationships in their own order', () => {
    const groups = findDuplicateRelationships([
      relationship({
        id: 'a',
        kind: 'CAUSES',
        sourceId: 'a-concept',
        targetId: 'b-concept',
      }),
      relationship({
        id: 'b',
        kind: 'CAUSES',
        sourceId: 'b-concept',
        targetId: 'a-concept',
      }),
    ])

    assert.equal(groups.length, 0)
  })

  it('canonicalises symmetric endpoints', () => {
    assert.deepEqual(
      canonicalizeEndpoints('ASSOCIATED_WITH', 'b', 'a'),
      { sourceId: 'a', targetId: 'b' },
    )
    assert.deepEqual(canonicalizeEndpoints('CAUSES', 'b', 'a'), {
      sourceId: 'b',
      targetId: 'a',
    })
    assert.equal(
      relationshipKey('ASSOCIATED_WITH', 'b', 'a'),
      relationshipKey('ASSOCIATED_WITH', 'a', 'b'),
    )
  })

  it('keeps a merged relationship a suggestion when any member was one', () => {
    const merged = mergeRelationshipGroup([
      relationship({ id: 'a', review: 'accepted' }),
      relationship({ id: 'b', review: 'suggested', basis: 'inferred' }),
    ])

    assert.equal(merged.review, 'suggested')
    assert.equal(merged.evidence.length, 0)
  })

  it('prefers a direct candidate over an inferred duplicate', () => {
    const merged = mergeRelationshipGroup([
      relationship({
        id: 'direct',
        basis: 'direct',
        confidence: 0.6,
        statement: 'Direct statement',
      }),
      relationship({
        id: 'inferred',
        basis: 'inferred',
        confidence: 0.9,
        statement: 'Inferred statement',
        inference: {
          kind: 'explicit-cross-reference',
          rationale: 'An explicit cross-reference.',
        },
      }),
    ])

    assert.equal(merged.basis, 'direct')
    assert.equal(merged.statement, 'Direct statement')
    assert.equal(merged.review, 'suggested')
    assert.equal(merged.verification.status, 'not-verified')
  })

  it('retains explicit review when every duplicate was reviewed', () => {
    const reviewed = markClaimVerified('reviewed')
    const merged = mergeRelationshipGroup([
      relationship({
        id: 'direct',
        basis: 'direct',
        review: 'accepted',
        verification: reviewed,
      }),
      relationship({
        id: 'inferred',
        basis: 'inferred',
        review: 'accepted',
        verification: reviewed,
        inference: {
          kind: 'explicit-cross-reference',
          rationale: 'An explicit cross-reference.',
        },
      }),
    ])

    assert.equal(merged.review, 'accepted')
    assert.equal(merged.verification.status, 'verified')
    assert.equal(merged.verification.method, 'manual-review')
  })
})
