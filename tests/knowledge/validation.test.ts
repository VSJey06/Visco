import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { chunkDocument } from '../../src/lib/knowledge/chunking.ts'
import { resolveExtractionConfig } from '../../src/lib/knowledge/config.ts'
import { extractJsonPayload } from '../../src/lib/knowledge/parsing.ts'
import {
  validateChunkPayload,
  validateGraph,
} from '../../src/lib/knowledge/validation.ts'
import { mergeChunkResults } from '../../src/lib/knowledge/merge.ts'
import { reviewRelationship } from '../../src/lib/knowledge/review.ts'
import { isValidConceptId } from '../../src/lib/knowledge/identifiers.ts'
import { createTestDocument } from './fixtures.ts'

const config = resolveExtractionConfig()
const document = createTestDocument()
const chunk = chunkDocument(document, config.chunking).chunks[0]

const validPayload = {
  concepts: [
    {
      id: 'cell-membrane',
      title: 'Cell membrane',
      kind: 'main_concept',
      confidence: 0.9,
      definition: 'A boundary that controls what enters a cell.',
      evidence: [
        {
          pageNumber: 1,
          blockId: 'page-1-block-2',
          quote:
            'The cell membrane controls which substances enter the cell.',
        },
      ],
    },
    {
      id: 'diffusion',
      title: 'Diffusion',
      kind: 'main_concept',
      confidence: 0.8,
      evidence: [
        {
          pageNumber: 1,
          blockId: 'page-1-block-3',
          quote:
            'Diffusion is the movement of particles from high to low concentration.',
        },
      ],
    },
  ],
  relationships: [
    {
      sourceId: 'cell-membrane',
      targetId: 'diffusion',
      kind: 'CAUSES',
      confidence: 0.7,
      basis: 'direct',
      statement: 'The membrane allows diffusion to happen.',
      evidence: [
        {
          pageNumber: 1,
          blockId: 'page-1-block-2',
          quote:
            'The cell membrane controls which substances enter the cell.',
        },
      ],
    },
  ],
}

function validate(payload: unknown) {
  return validateChunkPayload({
    payload,
    chunk,
    document,
    config,
  })
}

describe('chunk validation', () => {
  it('accepts a payload whose quotes are found in the source', () => {
    const result = validate(validPayload)

    assert.equal(result.concepts.length, 2)
    assert.equal(result.relationships.length, 1)
    assert.deepEqual(
      result.issues.filter((entry) => entry.severity === 'error'),
      [],
    )
    assert.equal(
      result.concepts[0].evidence[0].matchStatus,
      'matched',
    )
  })

  it('reports malformed json', () => {
    const parsed = extractJsonPayload('{"concepts": [')

    assert.equal(parsed.ok, false)

    if (!parsed.ok) {
      assert.equal(parsed.issue.code, 'invalid-json')
    }

    const result = validate(undefined)

    assert.equal(result.concepts.length, 0)
    assert.equal(result.issues[0].code, 'schema-mismatch')
  })

  it('drops a concept that cites a page outside the document', () => {
    const result = validate({
      concepts: [
        {
          id: 'invented-concept',
          title: 'Invented concept',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: [
            {
              pageNumber: 99,
              blockId: 'page-99-block-1',
              quote: 'A sentence that is not in the document.',
            },
          ],
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'page-out-of-range'),
    )
    assert.ok(
      result.issues.some((entry) => entry.code === 'missing-page-reference'),
    )
  })

  it('removes a fabricated reference while retaining valid evidence', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-2',
              quote:
                'The cell membrane controls which substances enter the cell.',
            },
            {
              pageNumber: 99,
              blockId: 'page-99-block-1',
              quote: 'A fabricated page reference.',
            },
          ],
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(result.concepts[0].evidence.length, 1)
    assert.equal(result.concepts[0].evidence[0].pageNumber, 1)
    assert.ok(
      result.issues.some((entry) => entry.code === 'page-out-of-range'),
    )
  })

  it('drops a concept whose quote is absent from the source text', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-2',
              quote: 'The cell membrane stores energy for the cell.',
            },
          ],
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'quote-not-found'),
    )
  })

  it('drops a relationship whose quote is absent from the source text', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-2',
              quote: 'A quote that does not occur in the block.',
            },
          ],
        },
      ],
    })

    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'quote-not-found'),
    )
  })

  it('keeps a concept that cites a block inside its chunk', () => {
    const result = validate({
      concepts: [
        {
          id: 'osmosis',
          title: 'Osmosis',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: [
            {
              pageNumber: 2,
              blockId: 'page-2-block-3',
              quote: 'Osmosis is the diffusion of water across a membrane.',
            },
          ],
        },
      ],
      relationships: [],
    })

    const allowed = new Set(chunk.anchors.map((anchor) => anchor.anchorId))

    assert.ok(allowed.has('page-2-block-3'))
    assert.equal(result.concepts.length, 1)
  })

  it('drops a relationship whose endpoint does not resolve', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          targetId: 'not-a-concept',
        },
      ],
    })

    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'missing-endpoint'),
    )
  })

  it('drops a relationship that points at itself', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          targetId: 'cell-membrane',
        },
      ],
    })

    assert.equal(result.relationships.length, 0)
    assert.ok(result.issues.some((entry) => entry.code === 'self-loop'))
  })

  it('regenerates an invalid concept id', () => {
    const result = validate({
      concepts: [
        {
          id: 'Not A Valid Id',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(isValidConceptId(result.concepts[0].id), true)
    assert.equal(result.concepts[0].id, 'cell-membrane')
    assert.ok(
      result.issues.some((entry) => entry.code === 'invalid-concept-id'),
    )
  })

  it('reports and regenerates an empty concept id', () => {
    const result = validate({
      concepts: [
        {
          id: '',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(result.concepts[0].id, 'cell-membrane')
    assert.ok(
      result.issues.some((entry) => entry.code === 'invalid-concept-id'),
    )
  })

  it('drops a relationship kind outside the vocabulary', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          kind: 'INVENTS',
        },
      ],
    })

    assert.equal(result.concepts.length, 2)
    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some(
        (entry) => entry.code === 'unsupported-relationship',
      ),
    )
  })

  it('drops an invalid relationship basis', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          basis: 'co-occurrence',
        },
      ],
    })

    assert.equal(result.concepts.length, 2)
    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'schema-mismatch'),
    )
  })

  it('drops an inferred relationship without a rationale', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          basis: 'inferred',
        },
      ],
    })

    assert.equal(result.concepts.length, 2)
    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some(
        (entry) => entry.code === 'schema-mismatch',
      ),
    )
  })

  it('drops an inference based only on co-occurrence', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          basis: 'inferred',
          inference: {
            kind: 'shared-participant',
            rationale: 'Both are discussed in the same passage.',
          },
        },
      ],
    })

    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some(
        (entry) => entry.code === 'unsupported-relationship',
      ),
    )
  })

  it('keeps an explicitly grounded inferred relationship as a suggestion', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          basis: 'inferred',
          inference: {
            kind: 'explicit-cross-reference',
            rationale: 'The passage explicitly refers from the membrane to diffusion.',
          },
        },
      ],
    })

    assert.equal(result.relationships.length, 1)
    assert.equal(result.relationships[0].review, 'suggested')
    assert.equal(result.relationships[0].basis, 'inferred')
    assert.equal(
      result.relationships[0].inference?.kind,
      'explicit-cross-reference',
    )
  })

  it('drops an inferred relationship whose grounding is fabricated', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [
        {
          ...validPayload.relationships[0],
          basis: 'inferred',
          inference: {
            kind: 'explicit-cross-reference',
            rationale: 'The passage explicitly points to the target.',
          },
          evidence: [
            {
              pageNumber: 99,
              blockId: 'page-99-block-1',
              quote: 'A fabricated quote.',
            },
          ],
        },
      ],
    })

    assert.equal(result.relationships.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'page-out-of-range'),
    )
  })

  it('does not auto-accept a direct relationship from a matching quote', () => {
    const result = validate(validPayload)

    assert.equal(result.relationships[0].review, 'suggested')
    assert.equal(result.relationships[0].basis, 'direct')
    assert.equal(result.relationships[0].verification.status, 'not-verified')
  })

  it('does not create a relationship from co-occurrence', () => {
    const result = validate({
      concepts: validPayload.concepts,
      relationships: [],
    })

    assert.equal(result.relationships.length, 0)
  })

  it('leaves claim verification open even when a quote matched', () => {
    const result = validate(validPayload)

    assert.equal(result.concepts[0].verification.status, 'not-verified')
    assert.equal(result.concepts[0].verification.method, 'none')
    assert.equal(result.relationships[0].verification.status, 'not-verified')
  })

  it('rejects a missing or out-of-range confidence', () => {
    const broken = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 'high',
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(broken.concepts.length, 0)
    assert.ok(
      broken.issues.some((entry) => entry.code === 'invalid-confidence'),
    )

    const outOfRange = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 4,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(outOfRange.concepts.length, 0)
    assert.ok(
      outOfRange.issues.some((entry) => entry.code === 'invalid-confidence'),
    )
  })

  it('drops a concept below the confidence threshold', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.2,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 0)
    assert.ok(
      result.issues.some(
        (entry) => entry.code === 'confidence-below-threshold',
      ),
    )
  })

  it('drops a concept kind outside the vocabulary', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'vibe',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'unknown-concept-kind'),
    )
  })

  it('retains valid siblings when one item has an invalid schema', () => {
    const result = validate({
      concepts: [
        validPayload.concepts[0],
        {
          id: 'invalid-kind',
          title: 'Invalid kind',
          kind: 'vibe',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(result.concepts[0].canonicalTitle, 'Cell membrane')
    assert.ok(
      result.issues.some((entry) => entry.code === 'unknown-concept-kind'),
    )
  })

  it('reports the specific reason an attribute reference is rejected', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
          attributes: [
            {
              kind: 'fact',
              text: 'A fabricated attribute.',
              confidence: 0.9,
              evidence: [
                {
                  pageNumber: 99,
                  blockId: 'page-99-block-1',
                  quote: 'A fabricated quote.',
                },
              ],
            },
          ],
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(result.concepts[0].attributes.length, 0)
    assert.ok(
      result.issues.some((entry) => entry.code === 'page-out-of-range'),
    )
  })

  it('drops schema-invalid items without dropping valid siblings', () => {
    const result = validate({
      concepts: [
        validPayload.concepts[0],
        validPayload.concepts[1],
        {
          title: 'Missing id',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
        {
          id: 'extra-field',
          title: 'Extra field',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
          invented: true,
        },
      ],
      relationships: [
        validPayload.relationships[0],
        {
          ...validPayload.relationships[0],
          statement: 42,
        },
        {
          ...validPayload.relationships[0],
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-2',
            },
          ],
        },
      ],
    })

    assert.equal(result.concepts.length, 2)
    assert.equal(result.concepts[0].canonicalTitle, 'Cell membrane')
    assert.equal(result.concepts[1].canonicalTitle, 'Diffusion')
    assert.equal(result.relationships.length, 1)
    assert.equal(result.relationships[0].statement, validPayload.relationships[0].statement)
  })

  it('reports an attribute below the confidence threshold', () => {
    const result = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
          attributes: [
            {
              kind: 'fact',
              text: 'A low-confidence attribute.',
              confidence: 0.2,
              evidence: validPayload.concepts[0].evidence,
            },
          ],
        },
      ],
      relationships: [],
    })

    assert.equal(result.concepts.length, 1)
    assert.equal(result.concepts[0].attributes.length, 0)
    assert.ok(
      result.issues.some(
        (entry) => entry.code === 'confidence-below-threshold',
      ),
    )
  })

  it('enforces configured payload limits', () => {
    const limited = validateChunkPayload({
      payload: validPayload,
      chunk,
      document,
      config: resolveExtractionConfig({ maxConceptsPerChunk: 1 }),
    })

    assert.equal(limited.concepts.length, 0)
    assert.equal(limited.relationships.length, 0)
    assert.ok(
      limited.issues.some((entry) => entry.code === 'schema-mismatch'),
    )
  })
})

describe('merging and graph validation', () => {
  it('merges duplicate concepts and remaps relationship endpoints', () => {
    const first = validate({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.9,
          evidence: validPayload.concepts[0].evidence,
        },
      ],
      relationships: [],
    })
    const second = validate({
      concepts: [
        {
          id: 'cell-membrane-copy',
          title: 'The cell membrane',
          kind: 'main_concept',
          confidence: 0.7,
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-3',
              quote:
                'Diffusion is the movement of particles from high to low concentration.',
            },
          ],
        },
        {
          id: 'diffusion',
          title: 'Diffusion',
          kind: 'main_concept',
          confidence: 0.8,
          evidence: [
            {
              pageNumber: 1,
              blockId: 'page-1-block-3',
              quote:
                'Diffusion is the movement of particles from high to low concentration.',
            },
          ],
        },
      ],
      relationships: [
        {
          sourceId: 'cell-membrane-copy',
          targetId: 'diffusion',
          kind: 'ASSOCIATED_WITH',
          confidence: 0.7,
          basis: 'direct',
          evidence: validPayload.relationships[0].evidence,
        },
      ],
    })

    const merged = mergeChunkResults(
      [
        {
          chunkId: 'chunk-1',
          chapterId: 'page-1-block-1',
          concepts: first.concepts,
          relationships: [],
        },
        {
          chunkId: 'chunk-2',
          chapterId: 'page-1-block-1',
          concepts: second.concepts,
          relationships: second.relationships,
        },
      ],
      config,
    )

    assert.equal(merged.concepts.length, 2)
    assert.equal(
      merged.concepts.find((concept) => concept.id === 'cell-membrane')
        ?.evidence.length,
      2,
    )
    assert.equal(merged.duplicateConceptCount, 1)
    assert.equal(merged.relationships.length, 1)
    assert.equal(merged.relationships[0].sourceId, 'cell-membrane')
    assert.equal(merged.conceptIdMap['the-cell-membrane'], 'cell-membrane')
  })

  it('reports duplicate relationships', () => {
    const result = validate(validPayload)

    const graphIssues = validateGraph({
      concepts: result.concepts,
      relationships: [
        ...result.relationships,
        { ...result.relationships[0], id: 'duplicate-relationship' },
      ],
      config,
    })

    assert.ok(
      graphIssues.some((entry) => entry.code === 'duplicate-relationship'),
    )
  })

  it('reports a relationship whose endpoint is missing from the graph', () => {
    const result = validate(validPayload)

    const graphIssues = validateGraph({
      concepts: result.concepts,
      relationships: [
        {
          ...result.relationships[0],
          id: 'dangling',
          targetId: 'not-a-concept',
        },
      ],
      config,
    })

    assert.ok(
      graphIssues.some((entry) => entry.code === 'missing-endpoint'),
    )
  })

  it('reports a part of cycle after explicit review', () => {
    const result = validate(validPayload)
    const reviewed = [
      {
        ...result.relationships[0],
        id: 'part-a',
        kind: 'PART_OF' as const,
        sourceId: 'cell-membrane',
        targetId: 'diffusion',
      },
      {
        ...result.relationships[0],
        id: 'part-b',
        kind: 'PART_OF' as const,
        sourceId: 'diffusion',
        targetId: 'cell-membrane',
      },
    ].map((relationship) =>
      reviewRelationship(relationship, 'accept', {
        reviewer: 'tester',
        reviewedAt: '2026-11-18T00:00:00.000Z',
        detail: null,
      }),
    )

    const graphIssues = validateGraph({
      concepts: result.concepts,
      relationships: reviewed,
      config,
    })

    assert.ok(
      graphIssues.some((entry) => entry.code === 'relationship-cycle'),
    )
  })

  it('does not treat suggestions as graph edges', () => {
    const result = validate(validPayload)
    const suggestedCycle = [
      {
        ...result.relationships[0],
        id: 'part-a',
        kind: 'PART_OF' as const,
        sourceId: 'cell-membrane',
        targetId: 'diffusion',
      },
      {
        ...result.relationships[0],
        id: 'part-b',
        kind: 'PART_OF' as const,
        sourceId: 'diffusion',
        targetId: 'cell-membrane',
      },
    ]
    const graphIssues = validateGraph({
      concepts: result.concepts,
      relationships: suggestedCycle,
      config,
    })

    assert.equal(
      graphIssues.some((entry) => entry.code === 'relationship-cycle'),
      false,
    )
    assert.ok(
      graphIssues.some((entry) => entry.code === 'orphan-concept'),
    )
  })

  it('requires semantic verification before accepting a relationship', () => {
    const result = validate(validPayload)
    const graphIssues = validateGraph({
      concepts: result.concepts,
      relationships: [
        {
          ...result.relationships[0],
          review: 'accepted',
        },
      ],
      config,
    })

    assert.ok(
      graphIssues.some((entry) => entry.code === 'invalid-review-state'),
    )
  })
})
