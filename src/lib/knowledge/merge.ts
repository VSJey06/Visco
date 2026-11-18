import type {
  ExtractedConcept,
  ExtractedRelationship,
  KnowledgeExtractionConfig,
  ValidationIssue,
} from '../../types/knowledge.ts'
import {
  canonicalizeEndpoints,
  findDuplicateConcepts,
  findDuplicateRelationships,
  mergeConceptGroup,
  mergeRelationshipGroup,
  relationshipKey,
} from './duplicates.ts'
import { createConceptId, titleKey } from './identifiers.ts'
import { assignConceptTier } from './taxonomy.ts'

export type ChunkExtractionResult = {
  chunkId: string
  chapterId: string | null
  concepts: ExtractedConcept[]
  relationships: ExtractedRelationship[]
}

export type MergeResult = {
  concepts: ExtractedConcept[]
  relationships: ExtractedRelationship[]
  issues: ValidationIssue[]
  duplicateConceptCount: number
  duplicateRelationshipCount: number
  conceptIdMap: Record<string, string>
}

function chapterCountFor(
  concept: ExtractedConcept,
  chunkChapters: Map<string, string | null>,
): number {
  const chapters = new Set<string>()

  for (const chunkId of concept.chunkIds) {
    const chapterId = chunkChapters.get(chunkId)

    if (chapterId) {
      chapters.add(chapterId)
    }
  }

  return chapters.size
}

function ensureUniqueIds(concepts: ExtractedConcept[]): {
  concepts: ExtractedConcept[]
  idMap: Map<string, string>
} {
  const used = new Set<string>()
  const titleOccurrences = new Map<string, number>()
  const idMap = new Map<string, string>()

  const unique = concepts.map((concept) => {
    if (!used.has(concept.id)) {
      used.add(concept.id)
      idMap.set(concept.id, concept.id)
      return concept
    }

    const key = titleKey(concept.canonicalTitle)
    let occurrence = (titleOccurrences.get(key) ?? 1) + 1
    titleOccurrences.set(key, occurrence)

    let id = createConceptId(concept.canonicalTitle, occurrence)

    while (used.has(id)) {
      occurrence += 1
      titleOccurrences.set(key, occurrence)
      id = createConceptId(concept.canonicalTitle, occurrence)
    }

    used.add(id)
    idMap.set(concept.id, id)

    return { ...concept, id }
  })

  return { concepts: unique, idMap }
}

function resolveMappedId(
  idMap: ReadonlyMap<string, string>,
  id: string,
): string {
  const visited = new Set<string>()
  let current = id

  while (idMap.has(current) && !visited.has(current)) {
    visited.add(current)
    current = idMap.get(current) as string
  }

  return current
}

export function mergeChunkResults(
  results: ChunkExtractionResult[],
  config: KnowledgeExtractionConfig,
): MergeResult {
  const issues: ValidationIssue[] = []
  const chunkChapters = new Map<string, string | null>()

  for (const result of results) {
    chunkChapters.set(result.chunkId, result.chapterId)
  }

  const allConcepts = results.flatMap((result) => result.concepts)
  const duplicateGroups = findDuplicateConcepts(allConcepts)
  const duplicateKeys = new Set(duplicateGroups.map((group) => group.key))
  const mergedConcepts: ExtractedConcept[] = []
  const duplicateIdMap = new Map<string, string>()

  for (const concept of allConcepts) {
    if (duplicateKeys.has(titleKey(concept.canonicalTitle))) {
      continue
    }

    mergedConcepts.push(concept)
  }

  for (const group of duplicateGroups) {
    const merged = mergeConceptGroup(group.concepts)

    mergedConcepts.push({
      ...merged,
      tier: assignConceptTier(
        merged.kind,
        merged.mentionCount,
        chapterCountFor(merged, chunkChapters),
      ),
    })

    for (const concept of group.concepts) {
      duplicateIdMap.set(concept.id, merged.id)
    }
  }

  const unique = ensureUniqueIds(mergedConcepts)
  const concepts = unique.concepts
  const idMap = new Map<string, string>(duplicateIdMap)

  for (const [oldId, newId] of unique.idMap) {
    idMap.set(oldId, newId)
  }

  const remappedRelationships = results
    .flatMap((result) => result.relationships)
    .map((relationship) => ({
      ...relationship,
      sourceId: resolveMappedId(idMap, relationship.sourceId),
      targetId: resolveMappedId(idMap, relationship.targetId),
    }))
  const relationshipGroups = findDuplicateRelationships(remappedRelationships)
  const relationshipKeys = new Set(
    relationshipGroups.map((group) => group.key),
  )
  const mergedRelationships: ExtractedRelationship[] = []

  for (const relationship of remappedRelationships) {
    if (
      relationshipKeys.has(
        relationshipKey(
          relationship.kind,
          relationship.sourceId,
          relationship.targetId,
        ),
      )
    ) {
      continue
    }

    mergedRelationships.push(relationship)
  }

  for (const group of relationshipGroups) {
    mergedRelationships.push(mergeRelationshipGroup(group.relationships))
  }

  const conceptIds = new Set(concepts.map((concept) => concept.id))
  const relationships: ExtractedRelationship[] = []

  for (const relationship of mergedRelationships) {
    if (
      !conceptIds.has(relationship.sourceId) ||
      !conceptIds.has(relationship.targetId)
    ) {
      issues.push({
        code: 'missing-endpoint',
        severity: 'error',
        subjectKind: 'relationship',
        subjectId: relationship.id,
        message:
          'A relationship endpoint does not resolve to a merged concept and was dropped.',
      })
      continue
    }

    const canonical = canonicalizeEndpoints(
      relationship.kind,
      relationship.sourceId,
      relationship.targetId,
    )

    relationships.push({
      ...relationship,
      sourceId: canonical.sourceId,
      targetId: canonical.targetId,
    })
  }

  const conceptsWithTiers = concepts.map((concept) => ({
    ...concept,
    tier: assignConceptTier(
      concept.kind,
      concept.mentionCount,
      chapterCountFor(concept, chunkChapters),
    ),
  }))

  for (const concept of conceptsWithTiers) {
    if (concept.confidence < config.thresholds.directConcept) {
      issues.push({
        code: 'confidence-below-threshold',
        severity: 'warning',
        subjectKind: 'concept',
        subjectId: concept.id,
        message: `Confidence ${concept.confidence} is below the concept threshold of ${config.thresholds.directConcept}.`,
      })
    }
  }

  return {
    concepts: conceptsWithTiers,
    relationships,
    issues,
    duplicateConceptCount: duplicateGroups.length,
    duplicateRelationshipCount: relationshipGroups.length,
    conceptIdMap: Object.fromEntries(idMap),
  }
}
