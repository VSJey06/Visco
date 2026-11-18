import type { ExtractedDocument } from '../../types/document.ts'
import type {
  ConceptAttribute,
  ConceptAttributeKind,
  EvidenceRef,
  EvidenceReference,
  ExtractedConcept,
  ExtractedRelationship,
  InferenceKind,
  KnowledgeChunk,
  KnowledgeExtractionConfig,
  ValidationCode,
  ValidationIssue,
} from '../../types/knowledge.ts'
import {
  createUnverifiedClaim,
  createEvidenceSource,
  hasMatchedEvidence,
  matchEvidenceRefs,
} from './evidence.ts'
import type { EvidenceMatchReason, EvidenceMatchResult } from './evidence.ts'
import {
  canonicalizeEndpoints,
  findDuplicateConcepts,
  findDuplicateRelationships,
} from './duplicates.ts'
import {
  createConceptId,
  createRelationshipId,
  isValidConceptId,
  isValidRelationshipId,
  titleKey,
} from './identifiers.ts'
import { isPlainObject, validatePayloadSchema } from './parsing.ts'
import {
  assignConceptTier,
  isConceptKind,
  isRelationshipKind,
  relationshipLabel,
} from './taxonomy.ts'

const ATTRIBUTE_KINDS: readonly ConceptAttributeKind[] = [
  'definition',
  'fact',
  'condition',
  'example',
]

const INFERENCE_KINDS: readonly InferenceKind[] = ['explicit-cross-reference']

export type ChunkValidationInput = {
  payload: unknown
  chunk: KnowledgeChunk
  document: ExtractedDocument
  config: KnowledgeExtractionConfig
  knownConceptIds?: string[]
}

export type ChunkValidationResult = {
  concepts: ExtractedConcept[]
  relationships: ExtractedRelationship[]
  issues: ValidationIssue[]
}

export type GraphValidationInput = {
  concepts: ExtractedConcept[]
  relationships: ExtractedRelationship[]
  config: KnowledgeExtractionConfig
}

type RawAttribute = {
  kind: string
  text: string
  confidence: number
  evidence: EvidenceReference[]
}

type RawConcept = {
  id: string | null
  title: string
  aliases: string[]
  kind: string
  definition: string | null
  confidence: number
  evidence: EvidenceReference[]
  attributes: RawAttribute[]
}

type RawRelationship = {
  sourceId: string
  targetId: string
  kind: string
  statement: string
  confidence: number
  basis: 'direct' | 'inferred' | null
  inferenceKind: string | null
  inferenceRationale: string
  evidence: EvidenceReference[]
}

function readRawEvidence(value: unknown): EvidenceReference[] {
  if (!Array.isArray(value)) {
    return []
  }

  const entries: EvidenceReference[] = []

  for (const entry of value) {
    if (!isPlainObject(entry)) {
      continue
    }

    entries.push({
      pageNumber:
        typeof entry.pageNumber === 'number' ? entry.pageNumber : Number.NaN,
      blockId: typeof entry.blockId === 'string' ? entry.blockId : null,
      quote: typeof entry.quote === 'string' ? entry.quote : null,
      matchStatus: 'unchecked',
    })
  }

  return entries
}

function readRawConcept(value: unknown): RawConcept | null {
  if (!isPlainObject(value)) {
    return null
  }

  const aliases = Array.isArray(value.aliases)
    ? value.aliases.filter(
        (alias): alias is string =>
          typeof alias === 'string' && alias.trim().length > 0,
      )
    : []
  const attributes: RawAttribute[] = []

  if (Array.isArray(value.attributes)) {
    for (const attribute of value.attributes) {
      if (!isPlainObject(attribute)) {
        continue
      }

      attributes.push({
        kind: typeof attribute.kind === 'string' ? attribute.kind : '',
        text: typeof attribute.text === 'string' ? attribute.text : '',
        confidence:
          typeof attribute.confidence === 'number'
            ? attribute.confidence
            : Number.NaN,
        evidence: readRawEvidence(attribute.evidence),
      })
    }
  }

  return {
    id: typeof value.id === 'string' ? value.id : null,
    title: typeof value.title === 'string' ? value.title : '',
    aliases,
    kind: typeof value.kind === 'string' ? value.kind : '',
    definition:
      typeof value.definition === 'string' && value.definition.trim()
        ? value.definition.trim()
        : null,
    confidence:
      typeof value.confidence === 'number' ? value.confidence : Number.NaN,
    evidence: readRawEvidence(value.evidence),
    attributes,
  }
}

function readRawRelationship(value: unknown): RawRelationship | null {
  if (!isPlainObject(value)) {
    return null
  }

  const inference = isPlainObject(value.inference) ? value.inference : null

  return {
    sourceId: typeof value.sourceId === 'string' ? value.sourceId : '',
    targetId: typeof value.targetId === 'string' ? value.targetId : '',
    kind: typeof value.kind === 'string' ? value.kind : '',
    statement:
      typeof value.statement === 'string' ? value.statement.trim() : '',
    confidence:
      typeof value.confidence === 'number' ? value.confidence : Number.NaN,
    basis:
      value.basis === 'direct' || value.basis === 'inferred'
        ? value.basis
        : null,
    inferenceKind:
      inference && typeof inference.kind === 'string' ? inference.kind : null,
    inferenceRationale:
      inference && typeof inference.rationale === 'string'
        ? inference.rationale.trim()
        : '',
    evidence: readRawEvidence(value.evidence),
  }
}

function issue(
  code: ValidationCode,
  severity: 'error' | 'warning',
  subjectKind: 'payload' | 'chunk' | 'concept' | 'relationship',
  subjectId: string,
  message: string,
): ValidationIssue {
  return { code, severity, subjectKind, subjectId, message }
}

function evidenceIssueCode(
  reason: EvidenceMatchReason,
): ValidationCode {
  switch (reason) {
    case 'page-out-of-range':
      return 'page-out-of-range'
    case 'page-mismatch':
      return 'page-mismatch'
    case 'block-not-found':
      return 'block-not-found'
    case 'block-not-allowed':
      return 'block-not-allowed'
    case 'quote-missing':
      return 'quote-missing'
    default:
      return 'quote-not-found'
  }
}

function matchedEvidence(matches: EvidenceMatchResult[]): EvidenceRef[] {
  const refs: EvidenceRef[] = []

  for (const match of matches) {
    if (match.status === 'matched') {
      refs.push(match.ref)
    }
  }

  return refs
}

function normalizeConfidence(
  value: number,
  subjectKind: 'concept' | 'relationship',
  subjectId: string,
  issues: ValidationIssue[],
): number | null {
  if (!Number.isFinite(value)) {
    issues.push(
      issue(
        'invalid-confidence',
        'error',
        subjectKind,
        subjectId,
        'Confidence must be a finite number.',
      ),
    )
    return null
  }

  if (value < 0 || value > 1) {
    issues.push(
      issue(
        'invalid-confidence',
        'error',
        subjectKind,
        subjectId,
        `Confidence ${value} must be between 0 and 1.`,
      ),
    )
    return null
  }

  return value
}

function isItemScopedSchemaIssue(validationIssue: ValidationIssue): boolean {
  return /^(concepts|relationships)\[/.test(validationIssue.subjectId)
}

function schemaItemIndex(
  validationIssue: ValidationIssue,
): { kind: 'concept' | 'relationship'; index: number } | null {
  const match = /^(concepts|relationships)\[(\d+)\]/.exec(
    validationIssue.subjectId,
  )

  if (!match) {
    return null
  }

  return {
    kind: match[1] === 'concepts' ? 'concept' : 'relationship',
    index: Number(match[2]),
  }
}

export function validateChunkPayload(
  input: ChunkValidationInput,
): ChunkValidationResult {
  const issues: ValidationIssue[] = []
  const schemaIssues = validatePayloadSchema(input.payload)
  const fatalSchemaIssues = schemaIssues.filter(
    (validationIssue) => !isItemScopedSchemaIssue(validationIssue),
  )

  if (fatalSchemaIssues.length > 0) {
    return { concepts: [], relationships: [], issues: fatalSchemaIssues }
  }

  const itemSchemaIssues = schemaIssues.filter((validationIssue) =>
    isItemScopedSchemaIssue(validationIssue),
  )

  issues.push(...itemSchemaIssues)

  const invalidConceptIndices = new Set<number>()
  const invalidRelationshipIndices = new Set<number>()

  for (const validationIssue of itemSchemaIssues) {
    const item = schemaItemIndex(validationIssue)

    if (!item) {
      continue
    }

    if (item.kind === 'concept') {
      invalidConceptIndices.add(item.index)
    } else {
      invalidRelationshipIndices.add(item.index)
    }
  }

  const payload = isPlainObject(input.payload) ? input.payload : {}
  const rawConcepts = Array.isArray(payload.concepts)
    ? payload.concepts
        .map((concept, index) => ({
          concept: readRawConcept(concept),
          index,
        }))
        .filter(
          (entry): entry is { concept: RawConcept; index: number } =>
            entry.concept !== null,
        )
        .filter((entry) => !invalidConceptIndices.has(entry.index))
        .map((entry) => entry.concept)
    : []
  const rawRelationships = Array.isArray(payload.relationships)
    ? payload.relationships
        .map((relationship, index) => ({
          relationship: readRawRelationship(relationship),
          index,
        }))
        .filter(
          (
            entry,
          ): entry is { relationship: RawRelationship; index: number } =>
            entry.relationship !== null,
        )
        .filter((entry) => !invalidRelationshipIndices.has(entry.index))
        .map((entry) => entry.relationship)
    : []

  if (
    rawConcepts.length > input.config.maxConceptsPerChunk ||
    rawRelationships.length > input.config.maxRelationshipsPerChunk
  ) {
    issues.push(
      issue(
        'schema-mismatch',
        'error',
        'chunk',
        input.chunk.chunkId,
        'The payload exceeds the configured concept or relationship limit.',
      ),
    )
    return { concepts: [], relationships: [], issues }
  }

  if (rawConcepts.length === 0 && rawRelationships.length === 0) {
    issues.push(
      issue(
        'empty-payload',
        'warning',
        'chunk',
        input.chunk.chunkId,
        'The response contained no concepts and no relationships.',
      ),
    )
  }

  const source = createEvidenceSource(input.document, input.chunk.anchors)
  const knownIds = new Set(input.knownConceptIds ?? [])
  const concepts: ExtractedConcept[] = []
  const usedCanonicalIds = new Set<string>()
  const usedRawIds = new Set<string>()
  const rawIdToCanonicalId = new Map<string, string>()
  const titleOccurrences = new Map<string, number>()

  for (const raw of rawConcepts) {
    const title = raw.title.trim()

    if (!title) {
      continue
    }

    const subjectId = raw.id ?? title

    if (!isConceptKind(raw.kind)) {
      issues.push(
        issue(
          'unknown-concept-kind',
          'error',
          'concept',
          subjectId,
          `"${raw.kind}" is not a supported concept kind.`,
        ),
      )
      continue
    }

    const confidence = normalizeConfidence(
      raw.confidence,
      'concept',
      subjectId,
      issues,
    )

    if (confidence === null) {
      continue
    }

    if (confidence < input.config.thresholds.directConcept) {
      issues.push(
        issue(
          'confidence-below-threshold',
          'error',
          'concept',
          subjectId,
          `Confidence ${confidence} is below the concept threshold of ${input.config.thresholds.directConcept}.`,
        ),
      )
      continue
    }

    const matches = matchEvidenceRefs(raw.evidence, source)

    for (const match of matches) {
      if (match.status === 'matched') {
        continue
      }

      issues.push(
        issue(
          evidenceIssueCode(match.reason),
          'error',
          'concept',
          subjectId,
          `An evidence reference was rejected: ${match.reason}.`,
        ),
      )
    }

    const evidence = matchedEvidence(matches)

    if (evidence.length === 0) {
      issues.push(
        issue(
          'missing-page-reference',
          'error',
          'concept',
          subjectId,
          'The concept has no usable evidence reference.',
        ),
      )
      continue
    }

    const key = titleKey(title)
    let occurrence = (titleOccurrences.get(key) ?? 0) + 1
    titleOccurrences.set(key, occurrence)

    let id = createConceptId(title, occurrence)

    while (usedCanonicalIds.has(id)) {
      occurrence += 1
      titleOccurrences.set(key, occurrence)
      id = createConceptId(title, occurrence)
    }

    usedCanonicalIds.add(id)

    if (raw.id !== null) {
      if (!isValidConceptId(raw.id)) {
        issues.push(
          issue(
            'invalid-concept-id',
            'warning',
            'concept',
            subjectId,
            `The id "${raw.id}" is invalid and was regenerated as "${id}".`,
          ),
        )
      }

      if (usedRawIds.has(raw.id)) {
        issues.push(
          issue(
            'invalid-concept-id',
            'error',
            'concept',
            subjectId,
            `The id "${raw.id}" was used more than once.`,
          ),
        )
      } else {
        usedRawIds.add(raw.id)
        rawIdToCanonicalId.set(
          raw.id,
          knownIds.has(raw.id) ? raw.id : id,
        )
      }
    }

    const attributes: ConceptAttribute[] = []

    for (const attribute of raw.attributes) {
      if (!ATTRIBUTE_KINDS.includes(attribute.kind as ConceptAttributeKind)) {
        issues.push(
          issue(
            'unknown-concept-kind',
            'error',
            'concept',
            subjectId,
            `"${attribute.kind}" is not a supported attribute kind.`,
          ),
        )
        continue
      }

      if (!attribute.text.trim()) {
        continue
      }

      const attributeConfidence = normalizeConfidence(
        attribute.confidence,
        'concept',
        subjectId,
        issues,
      )

      if (attributeConfidence === null) {
        continue
      }

      if (attributeConfidence < input.config.thresholds.attribute) {
        issues.push(
          issue(
            'confidence-below-threshold',
            'warning',
            'concept',
            subjectId,
            `Attribute confidence ${attributeConfidence} is below the attribute threshold of ${input.config.thresholds.attribute}.`,
          ),
        )
        continue
      }

      const attributeMatches = matchEvidenceRefs(
        attribute.evidence,
        source,
      )

      for (const match of attributeMatches) {
        if (match.status === 'matched') {
          continue
        }

        issues.push(
          issue(
            evidenceIssueCode(match.reason),
            'error',
            'concept',
            subjectId,
            `An attribute evidence reference was rejected: ${match.reason}.`,
          ),
        )
      }

      const attributeEvidence = matchedEvidence(attributeMatches)

      if (attributeEvidence.length === 0) {
        issues.push(
          issue(
            'missing-page-reference',
            'warning',
            'concept',
            subjectId,
            'An attribute was dropped because it had no usable evidence.',
          ),
        )
        continue
      }

      attributes.push({
        kind: attribute.kind as ConceptAttributeKind,
        text: attribute.text.trim(),
        evidence: attributeEvidence,
        confidence: attributeConfidence,
      })
    }

    concepts.push({
      id,
      canonicalTitle: title,
      aliases: raw.aliases,
      kind: raw.kind,
      tier: assignConceptTier(raw.kind, 1, 1),
      definition: raw.definition,
      attributes,
      evidence,
      basis: 'direct',
      confidence,
      mentionCount: 1,
      chunkIds: [input.chunk.chunkId],
      verification: createUnverifiedClaim(),
    })
  }

  const resolveEndpoint = (endpointId: string): string | null => {
    const mapped = rawIdToCanonicalId.get(endpointId)

    if (mapped) {
      return mapped
    }

    if (knownIds.has(endpointId)) {
      return endpointId
    }

    return usedCanonicalIds.has(endpointId) ? endpointId : null
  }

  const relationships: ExtractedRelationship[] = []

  for (const raw of rawRelationships) {
    const subjectId = `${raw.sourceId}->${raw.targetId}`

    if (!isRelationshipKind(raw.kind)) {
      issues.push(
        issue(
          'unsupported-relationship',
          'error',
          'relationship',
          subjectId,
          `"${raw.kind}" is not a supported relationship kind.`,
        ),
      )
      continue
    }

    if (raw.basis === null) {
      issues.push(
        issue(
          'schema-mismatch',
          'error',
          'relationship',
          subjectId,
          'A relationship basis must be "direct" or "inferred".',
        ),
      )
      continue
    }

    if (!raw.sourceId || !raw.targetId) {
      issues.push(
        issue(
          'missing-endpoint',
          'error',
          'relationship',
          subjectId,
          'A relationship must name both endpoints.',
        ),
      )
      continue
    }

    const resolvedSourceId = resolveEndpoint(raw.sourceId)
    const resolvedTargetId = resolveEndpoint(raw.targetId)

    if (!resolvedSourceId || !resolvedTargetId) {
      issues.push(
        issue(
          'missing-endpoint',
          'error',
          'relationship',
          subjectId,
          'A relationship endpoint does not resolve to a known concept.',
        ),
      )
      continue
    }

    if (resolvedSourceId === resolvedTargetId) {
      issues.push(
        issue(
          'self-loop',
          'error',
          'relationship',
          subjectId,
          'A relationship cannot point at itself.',
        ),
      )
      continue
    }

    if (raw.basis === 'inferred') {
      const inferenceKind = raw.inferenceKind as InferenceKind | null

      if (
        !inferenceKind ||
        !INFERENCE_KINDS.includes(inferenceKind) ||
        !raw.inferenceRationale
      ) {
        issues.push(
          issue(
            'unsupported-relationship',
            'error',
            'relationship',
            subjectId,
            'An inferred relationship needs an explicit cross-reference and a rationale.',
          ),
        )
        continue
      }
    } else if (raw.inferenceKind !== null) {
      issues.push(
        issue(
          'unsupported-relationship',
          'error',
          'relationship',
          subjectId,
          'A direct relationship cannot carry inference metadata.',
        ),
      )
      continue
    }

    const confidence = normalizeConfidence(
      raw.confidence,
      'relationship',
      subjectId,
      issues,
    )

    if (confidence === null) {
      continue
    }

    const threshold =
      raw.basis === 'inferred'
        ? input.config.thresholds.inferredRelationship
        : input.config.thresholds.directRelationship

    if (confidence < threshold) {
      issues.push(
        issue(
          'confidence-below-threshold',
          'error',
          'relationship',
          subjectId,
          `Confidence ${confidence} is below the relationship threshold of ${threshold}.`,
        ),
      )
      continue
    }

    const matches = matchEvidenceRefs(raw.evidence, source)

    for (const match of matches) {
      if (match.status === 'matched') {
        continue
      }

      issues.push(
        issue(
          evidenceIssueCode(match.reason),
          'error',
          'relationship',
          subjectId,
          `An evidence reference was rejected: ${match.reason}.`,
        ),
      )
    }

    const evidence = matchedEvidence(matches)

    if (evidence.length === 0) {
      issues.push(
        issue(
          'missing-page-reference',
          'error',
          'relationship',
          subjectId,
          'A relationship needs at least one quote that matches the source.',
        ),
      )
      continue
    }

    const endpoints = canonicalizeEndpoints(
      raw.kind,
      resolvedSourceId,
      resolvedTargetId,
    )

    relationships.push({
      id: createRelationshipId(
        raw.kind,
        endpoints.sourceId,
        endpoints.targetId,
      ),
      sourceId: endpoints.sourceId,
      targetId: endpoints.targetId,
      kind: raw.kind,
      label: relationshipLabel(raw.kind),
      statement: raw.statement,
      evidence,
      basis: raw.basis,
      inference:
        raw.basis === 'inferred'
          ? {
              kind: raw.inferenceKind as InferenceKind,
              rationale: raw.inferenceRationale,
            }
          : null,
      confidence,
      chunkIds: [input.chunk.chunkId],
      verification: createUnverifiedClaim(),
      review: 'suggested',
    })
  }

  return { concepts, relationships, issues }
}

function isApprovedRelationship(relationship: ExtractedRelationship): boolean {
  return (
    relationship.review === 'accepted' &&
    relationship.verification.status === 'verified' &&
    relationship.verification.method === 'manual-review'
  )
}

export function validateGraph(
  input: GraphValidationInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const conceptIds = new Set(input.concepts.map((concept) => concept.id))
  const conceptIdCounts = new Map<string, number>()
  const relationshipIdCounts = new Map<string, number>()

  for (const concept of input.concepts) {
    conceptIdCounts.set(concept.id, (conceptIdCounts.get(concept.id) ?? 0) + 1)

    if (!isValidConceptId(concept.id)) {
      issues.push(
        issue(
          'invalid-concept-id',
          'error',
          'concept',
          concept.id,
          'The concept id does not match the id grammar.',
        ),
      )
    }
  }

  for (const relationship of input.relationships) {
    relationshipIdCounts.set(
      relationship.id,
      (relationshipIdCounts.get(relationship.id) ?? 0) + 1,
    )

    if (!isValidRelationshipId(relationship.id)) {
      issues.push(
        issue(
          'invalid-relationship-id',
          'error',
          'relationship',
          relationship.id,
          'The relationship id does not match the id grammar.',
        ),
      )
    }
  }

  for (const [conceptId, count] of conceptIdCounts) {
    if (count > 1) {
      issues.push(
        issue(
          'invalid-concept-id',
          'error',
          'concept',
          conceptId,
          'The concept id is used more than once.',
        ),
      )
    }
  }

  for (const [relationshipId, count] of relationshipIdCounts) {
    if (count > 1) {
      issues.push(
        issue(
          'invalid-relationship-id',
          'error',
          'relationship',
          relationshipId,
          'The relationship id is used more than once.',
        ),
      )
    }
  }

  for (const duplicate of findDuplicateConcepts(input.concepts)) {
    issues.push(
      issue(
        'duplicate-concept',
        'warning',
        'concept',
        duplicate.id,
        `The concepts "${duplicate.titles.join('", "')}" share the same title key.`,
      ),
    )
  }

  for (const duplicate of findDuplicateRelationships(input.relationships)) {
    issues.push(
      issue(
        'duplicate-relationship',
        'warning',
        'relationship',
        duplicate.id,
        'The same relationship was extracted more than once.',
      ),
    )
  }

  for (const relationship of input.relationships) {
    if (
      !conceptIds.has(relationship.sourceId) ||
      !conceptIds.has(relationship.targetId)
    ) {
      issues.push(
        issue(
          'missing-endpoint',
          'error',
          'relationship',
          relationship.id,
          'A relationship endpoint does not resolve to a concept.',
        ),
      )
    }

    if (relationship.sourceId === relationship.targetId) {
      issues.push(
        issue(
          'self-loop',
          'error',
          'relationship',
          relationship.id,
          'A relationship cannot point at itself.',
        ),
      )
    }

    if (!isRelationshipKind(relationship.kind)) {
      issues.push(
        issue(
          'unsupported-relationship',
          'error',
          'relationship',
          relationship.id,
          'The relationship kind is outside the supported vocabulary.',
        ),
      )
    }

    if (
      !Number.isFinite(relationship.confidence) ||
      relationship.confidence < 0 ||
      relationship.confidence > 1
    ) {
      issues.push(
        issue(
          'invalid-confidence',
          'error',
          'relationship',
          relationship.id,
          'Relationship confidence must be a finite number between 0 and 1.',
        ),
      )
    } else {
      const threshold =
        relationship.basis === 'inferred'
          ? input.config.thresholds.inferredRelationship
          : input.config.thresholds.directRelationship

      if (relationship.confidence < threshold) {
        issues.push(
          issue(
            'confidence-below-threshold',
            'error',
            'relationship',
            relationship.id,
            `Confidence ${relationship.confidence} is below the relationship threshold of ${threshold}.`,
          ),
        )
      }
    }

    if (!hasMatchedEvidence(relationship.evidence)) {
      issues.push(
        issue(
          'missing-page-reference',
          'error',
          'relationship',
          relationship.id,
          'The relationship has no matched evidence reference.',
        ),
      )
    }

    if (relationship.basis === 'inferred') {
      if (
        !relationship.inference ||
        relationship.inference.kind !== 'explicit-cross-reference' ||
        !relationship.inference.rationale.trim()
      ) {
        issues.push(
          issue(
            'unsupported-relationship',
            'error',
            'relationship',
            relationship.id,
            'An inferred relationship needs an explicit cross-reference and a rationale.',
          ),
        )
      }
    } else if (relationship.inference) {
      issues.push(
        issue(
          'unsupported-relationship',
          'error',
          'relationship',
          relationship.id,
          'A direct relationship cannot carry inference metadata.',
        ),
      )
    }

    if (
      relationship.review === 'accepted' &&
      (relationship.verification.status !== 'verified' ||
        relationship.verification.method !== 'manual-review')
    ) {
      issues.push(
        issue(
          'invalid-review-state',
          'error',
          'relationship',
          relationship.id,
          'An accepted relationship requires explicit semantic verification.',
        ),
      )
    }

    if (
      relationship.verification.status === 'verified' &&
      (relationship.review !== 'accepted' ||
        relationship.verification.method !== 'manual-review')
    ) {
      issues.push(
        issue(
          'invalid-review-state',
          'error',
          'relationship',
          relationship.id,
          'A verified relationship must be explicitly accepted.',
        ),
      )
    }
  }

  const approvedRelationships = input.relationships.filter(
    isApprovedRelationship,
  )

  for (const cycle of findPartOfCycles(approvedRelationships)) {
    issues.push(
      issue(
        'relationship-cycle',
        'error',
        'relationship',
        cycle,
        `The part-of chain ${cycle} contains a cycle.`,
      ),
    )
  }

  const connected = new Set<string>()

  for (const relationship of approvedRelationships) {
    connected.add(relationship.sourceId)
    connected.add(relationship.targetId)
  }

  for (const concept of input.concepts) {
    if (!connected.has(concept.id)) {
      issues.push(
        issue(
          'orphan-concept',
          'warning',
          'concept',
          concept.id,
          'The concept has no approved relationship to any other concept.',
        ),
      )
    }
  }

  return issues
}

export function findPartOfCycles(
  relationships: ExtractedRelationship[],
): string[] {
  const edges = new Map<string, string[]>()

  for (const relationship of relationships) {
    if (relationship.kind !== 'PART_OF') {
      continue
    }

    const targets = edges.get(relationship.sourceId) ?? []
    targets.push(relationship.targetId)
    edges.set(relationship.sourceId, targets)
  }

  const cycles: string[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const walk = (node: string, path: string[]) => {
    if (visiting.has(node)) {
      const start = path.indexOf(node)
      cycles.push([...path.slice(start), node].join(' -> '))
      return
    }

    if (visited.has(node)) {
      return
    }

    visiting.add(node)
    path.push(node)

    for (const next of edges.get(node) ?? []) {
      walk(next, path)
    }

    path.pop()
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of edges.keys()) {
    walk(node, [])
  }

  return cycles
}
