import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_EXTRACTION_CONFIG,
  resolveExtractionConfig,
} from '../../src/lib/knowledge/config.ts'

describe('extraction configuration', () => {
  it('returns an immutable configuration without mutating defaults', () => {
    const config = resolveExtractionConfig()

    assert.equal(config.chunking.targetTokens, 1600)
    assert.equal(Object.isFrozen(config), true)
    assert.equal(Object.isFrozen(config.chunking), true)
    assert.equal(Object.isFrozen(config.thresholds), true)
    assert.equal(DEFAULT_EXTRACTION_CONFIG.chunking.targetTokens, 1600)
  })

  it('applies valid overrides', () => {
    const config = resolveExtractionConfig({
      chunking: { targetTokens: 100, maxTokens: 200, overlapTokens: 20 },
      thresholds: { directConcept: 0.7 },
      maxConceptsPerChunk: 5,
      maxRelationshipsPerChunk: 10,
      knownConceptDigestLimit: 3,
    })

    assert.equal(config.chunking.targetTokens, 100)
    assert.equal(config.chunking.maxTokens, 200)
    assert.equal(config.thresholds.directConcept, 0.7)
    assert.equal(config.maxConceptsPerChunk, 5)
    assert.equal(config.maxRelationshipsPerChunk, 10)
    assert.equal(config.knownConceptDigestLimit, 3)
  })

  it('rejects invalid numeric configuration', () => {
    assert.throws(
      () => resolveExtractionConfig({ chunking: { targetTokens: 0 } }),
      RangeError,
    )
    assert.throws(
      () =>
        resolveExtractionConfig({
          chunking: { targetTokens: 100, maxTokens: 50 },
        }),
      RangeError,
    )
    assert.throws(
      () => resolveExtractionConfig({ thresholds: { directConcept: 2 } }),
      RangeError,
    )
    assert.throws(
      () => resolveExtractionConfig({ maxConceptsPerChunk: 0 }),
      RangeError,
    )
  })
})
