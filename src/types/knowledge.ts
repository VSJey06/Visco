import type { NodeTier } from './graph.ts'

export type ConceptKind =
  | 'main_concept'
  | 'supporting_concept'
  | 'entity'
  | 'process'

export type RelationshipKind =
  | 'CAUSES'
  | 'ENABLES'
  | 'PART_OF'
  | 'DEPENDS_ON'
  | 'COMPARES'
  | 'EXAMPLE_OF'
  | 'SEQUENCE'
  | 'ASSOCIATED_WITH'

export type EvidenceBasis = 'direct' | 'inferred'

export type EvidenceMatchStatus = 'matched' | 'unmatched' | 'unchecked'

export type EvidenceReference = {
  pageNumber: number
  blockId: string | null
  quote: string | null
  matchStatus: EvidenceMatchStatus
}

export type EvidenceRef = {
  pageNumber: number
  blockId: string
  quote: string
  matchStatus: 'matched'
}

export type ClaimVerificationStatus = 'not-verified' | 'verified' | 'rejected'

export type ClaimVerificationMethod = 'manual-review' | 'none'

export type ClaimVerification = {
  status: ClaimVerificationStatus
  method: ClaimVerificationMethod
  detail: string | null
}

export type ConceptAttributeKind =
  | 'definition'
  | 'fact'
  | 'condition'
  | 'example'

export type ConceptAttribute = {
  kind: ConceptAttributeKind
  text: string
  evidence: EvidenceRef[]
  confidence: number
}

export type ExtractedConcept = {
  id: string
  canonicalTitle: string
  aliases: string[]
  kind: ConceptKind
  tier: NodeTier
  definition: string | null
  attributes: ConceptAttribute[]
  evidence: EvidenceRef[]
  basis: EvidenceBasis
  confidence: number
  mentionCount: number
  chunkIds: string[]
  verification: ClaimVerification
}

export type InferenceKind = 'explicit-cross-reference'

export type RelationshipInference = {
  kind: InferenceKind
  rationale: string
}

export type RelationshipReviewStatus = 'accepted' | 'suggested' | 'rejected'

export type RelationshipReview = {
  reviewer: string
  reviewedAt: string
  detail: string | null
}

export type ExtractedRelationship = {
  id: string
  sourceId: string
  targetId: string
  kind: RelationshipKind
  label: string
  statement: string
  evidence: EvidenceRef[]
  basis: EvidenceBasis
  inference: RelationshipInference | null
  confidence: number
  chunkIds: string[]
  verification: ClaimVerification
  review: RelationshipReviewStatus
}

export type KnowledgeAnchor = {
  anchorId: string
  pageNumber: number
  blockId: string
  part: number
  partCount: number
  text: string
}

export type KnowledgeChunk = {
  chunkId: string
  index: number
  chapterId: string | null
  chapterTitle: string | null
  sectionIds: string[]
  pageStart: number
  pageEnd: number
  blockIds: string[]
  anchors: KnowledgeAnchor[]
  text: string
  characterCount: number
  estimatedTokens: number
}

export type ChapterSummary = {
  chapterId: string
  title: string
  pageStart: number
  pageEnd: number
  summary: string
  conceptIds: string[]
}

export type KnowledgeDraftStats = {
  conceptCount: number
  relationshipCount: number
  suggestedRelationshipCount: number
  duplicateConceptCount: number
  duplicateRelationshipCount: number
  errorCount: number
  warningCount: number
}

export type KnowledgeGraphDraft = {
  documentId: string
  documentFingerprint: string
  extractionRunId: string
  createdAt: string
  concepts: ExtractedConcept[]
  relationships: ExtractedRelationship[]
  chapterSummaries: ChapterSummary[]
  stats: KnowledgeDraftStats
  issues: ValidationIssue[]
}

export type ValidationSeverity = 'error' | 'warning'

export type ValidationSubjectKind =
  | 'payload'
  | 'chunk'
  | 'concept'
  | 'relationship'

export type ValidationCode =
  | 'invalid-json'
  | 'schema-mismatch'
  | 'empty-payload'
  | 'unknown-concept-kind'
  | 'unsupported-relationship'
  | 'invalid-concept-id'
  | 'invalid-relationship-id'
  | 'page-out-of-range'
  | 'page-mismatch'
  | 'block-not-found'
  | 'block-not-allowed'
  | 'quote-not-found'
  | 'quote-missing'
  | 'missing-page-reference'
  | 'missing-endpoint'
  | 'self-loop'
  | 'invalid-confidence'
  | 'confidence-below-threshold'
  | 'invalid-review-state'
  | 'unverified-claim'
  | 'duplicate-concept'
  | 'duplicate-relationship'
  | 'relationship-cycle'
  | 'orphan-concept'

export type ValidationIssue = {
  code: ValidationCode
  severity: ValidationSeverity
  subjectKind: ValidationSubjectKind
  subjectId: string
  message: string
}

export type ChunkingConfig = {
  readonly targetTokens: number
  readonly maxTokens: number
  readonly overlapTokens: number
  readonly charactersPerToken: number
}

export type ConfidenceThresholds = {
  readonly directConcept: number
  readonly directRelationship: number
  readonly inferredRelationship: number
  readonly attribute: number
}

export type KnowledgeExtractionConfig = {
  readonly chunking: ChunkingConfig
  readonly thresholds: ConfidenceThresholds
  readonly maxConceptsPerChunk: number
  readonly maxRelationshipsPerChunk: number
  readonly knownConceptDigestLimit: number
}
