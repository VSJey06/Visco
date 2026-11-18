import type {
  ChunkingConfig,
  ConfidenceThresholds,
  KnowledgeExtractionConfig,
} from '../../types/knowledge.ts'

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = Object.freeze({
  targetTokens: 1600,
  maxTokens: 2400,
  overlapTokens: 120,
  charactersPerToken: 4,
})

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds =
  Object.freeze({
    directConcept: 0.6,
    directRelationship: 0.6,
    inferredRelationship: 0.5,
    attribute: 0.55,
  })

export const DEFAULT_EXTRACTION_CONFIG: KnowledgeExtractionConfig =
  Object.freeze({
    chunking: DEFAULT_CHUNKING_CONFIG,
    thresholds: DEFAULT_CONFIDENCE_THRESHOLDS,
    maxConceptsPerChunk: 40,
    maxRelationshipsPerChunk: 60,
    knownConceptDigestLimit: 120,
  })

export type ExtractionConfigOverrides = {
  readonly chunking?: Partial<ChunkingConfig>
  readonly thresholds?: Partial<ConfidenceThresholds>
  readonly maxConceptsPerChunk?: number
  readonly maxRelationshipsPerChunk?: number
  readonly knownConceptDigestLimit?: number
}

function requireInteger(value: number, label: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`)
  }
}

function requireThreshold(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`)
  }
}

export function resolveExtractionConfig(
  overrides?: ExtractionConfigOverrides,
): KnowledgeExtractionConfig {
  const chunking: ChunkingConfig = Object.freeze({
    targetTokens:
      overrides?.chunking?.targetTokens ??
      DEFAULT_CHUNKING_CONFIG.targetTokens,
    maxTokens:
      overrides?.chunking?.maxTokens ?? DEFAULT_CHUNKING_CONFIG.maxTokens,
    overlapTokens:
      overrides?.chunking?.overlapTokens ??
      DEFAULT_CHUNKING_CONFIG.overlapTokens,
    charactersPerToken:
      overrides?.chunking?.charactersPerToken ??
      DEFAULT_CHUNKING_CONFIG.charactersPerToken,
  })
  const thresholds: ConfidenceThresholds = Object.freeze({
    directConcept:
      overrides?.thresholds?.directConcept ??
      DEFAULT_CONFIDENCE_THRESHOLDS.directConcept,
    directRelationship:
      overrides?.thresholds?.directRelationship ??
      DEFAULT_CONFIDENCE_THRESHOLDS.directRelationship,
    inferredRelationship:
      overrides?.thresholds?.inferredRelationship ??
      DEFAULT_CONFIDENCE_THRESHOLDS.inferredRelationship,
    attribute:
      overrides?.thresholds?.attribute ??
      DEFAULT_CONFIDENCE_THRESHOLDS.attribute,
  })
  const maxConceptsPerChunk =
    overrides?.maxConceptsPerChunk ??
    DEFAULT_EXTRACTION_CONFIG.maxConceptsPerChunk
  const maxRelationshipsPerChunk =
    overrides?.maxRelationshipsPerChunk ??
    DEFAULT_EXTRACTION_CONFIG.maxRelationshipsPerChunk
  const knownConceptDigestLimit =
    overrides?.knownConceptDigestLimit ??
    DEFAULT_EXTRACTION_CONFIG.knownConceptDigestLimit

  requireInteger(chunking.targetTokens, 'targetTokens', 1)
  requireInteger(chunking.maxTokens, 'maxTokens', 1)
  requireInteger(chunking.overlapTokens, 'overlapTokens', 0)
  requireInteger(chunking.charactersPerToken, 'charactersPerToken', 1)
  requireInteger(maxConceptsPerChunk, 'maxConceptsPerChunk', 1)
  requireInteger(maxRelationshipsPerChunk, 'maxRelationshipsPerChunk', 1)
  requireInteger(knownConceptDigestLimit, 'knownConceptDigestLimit', 0)

  if (chunking.maxTokens < chunking.targetTokens) {
    throw new RangeError('maxTokens must be at least targetTokens.')
  }

  if (chunking.overlapTokens >= chunking.maxTokens) {
    throw new RangeError('overlapTokens must be less than maxTokens.')
  }

  requireThreshold(thresholds.directConcept, 'directConcept')
  requireThreshold(thresholds.directRelationship, 'directRelationship')
  requireThreshold(thresholds.inferredRelationship, 'inferredRelationship')
  requireThreshold(thresholds.attribute, 'attribute')

  return Object.freeze({
    chunking,
    thresholds,
    maxConceptsPerChunk,
    maxRelationshipsPerChunk,
    knownConceptDigestLimit,
  })
}
