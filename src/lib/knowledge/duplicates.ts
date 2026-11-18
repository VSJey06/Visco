import type { NodeTier } from '../../types/graph.ts'
import type {
  ConceptAttribute,
  EvidenceRef,
  ExtractedConcept,
  ExtractedRelationship,
  RelationshipKind,
} from '../../types/knowledge.ts'
import { createUnverifiedClaim } from './evidence.ts'
import { createRelationshipId, titleKey } from './identifiers.ts'
import { isSymmetricRelationship } from './taxonomy.ts'

export type DuplicateConceptGroup = {
  key: string
  id: string
  titles: string[]
  concepts: ExtractedConcept[]
}

export type DuplicateRelationshipGroup = {
  key: string
  id: string
  kind: RelationshipKind
  sourceId: string
  targetId: string
  relationships: ExtractedRelationship[]
}

const TIER_RANK: Record<string, number> = {
  core: 3,
  major: 2,
  supporting: 1,
}

function tierRank(tier: string): number {
  return TIER_RANK[tier] ?? 0
}

function evidenceKey(ref: EvidenceRef): string {
  return `${ref.pageNumber}|${ref.blockId ?? ''}|${ref.quote ?? ''}`
}

function mergeEvidence(groups: EvidenceRef[][]): EvidenceRef[] {
  const seen = new Set<string>()
  const merged: EvidenceRef[] = []

  for (const group of groups) {
    for (const ref of group) {
      const key = evidenceKey(ref)

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      merged.push(ref)
    }
  }

  return merged
}

function mergeAttributes(groups: ConceptAttribute[][]): ConceptAttribute[] {
  const seen = new Set<string>()
  const merged: ConceptAttribute[] = []

  for (const group of groups) {
    for (const attribute of group) {
      const key = `${attribute.kind}|${attribute.text}`

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      merged.push(attribute)
    }
  }

  return merged
}

export function findDuplicateConcepts(
  concepts: ExtractedConcept[],
): DuplicateConceptGroup[] {
  const groups = new Map<string, ExtractedConcept[]>()

  for (const concept of concepts) {
    const key = titleKey(concept.canonicalTitle)

    if (!key) {
      continue
    }

    const group = groups.get(key) ?? []
    group.push(concept)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      id: group[0].id,
      titles: Array.from(
        new Set(group.map((concept) => concept.canonicalTitle)),
      ),
      concepts: group,
    }))
}

export function mergeConceptGroup(
  group: ExtractedConcept[],
): ExtractedConcept {
  const primary = [...group].sort(
    (left, right) => right.confidence - left.confidence,
  )[0]
  const aliases = new Set<string>()
  const chunkIds = new Set<string>()
  const allVerified = group.every(
    (concept) =>
      concept.verification.status === 'verified' &&
      concept.verification.method === 'manual-review',
  )
  const evidence = mergeEvidence(group.map((concept) => concept.evidence))
  const attributes = mergeAttributes(
    group.map((concept) => concept.attributes),
  )
  let mentionCount = 0
  let definition: string | null = primary.definition
  let tier: NodeTier = primary.tier

  for (const concept of group) {
    for (const alias of concept.aliases) {
      aliases.add(alias)
    }

    for (const chunkId of concept.chunkIds) {
      chunkIds.add(chunkId)
    }

    mentionCount += concept.mentionCount

    if (!definition && concept.definition) {
      definition = concept.definition
    }

    if (tierRank(concept.tier) > tierRank(tier)) {
      tier = concept.tier
    }
  }

  for (const concept of group) {
    if (concept.canonicalTitle !== primary.canonicalTitle) {
      aliases.add(concept.canonicalTitle)
    }
  }

  return {
    ...primary,
    aliases: Array.from(aliases),
    tier,
    definition,
    attributes,
    evidence,
    mentionCount,
    chunkIds: Array.from(chunkIds),
    verification: allVerified
      ? primary.verification
      : createUnverifiedClaim(),
  }
}

export function canonicalizeEndpoints(
  kind: RelationshipKind,
  sourceId: string,
  targetId: string,
): { sourceId: string; targetId: string } {
  if (isSymmetricRelationship(kind) && targetId < sourceId) {
    return { sourceId: targetId, targetId: sourceId }
  }

  return { sourceId, targetId }
}

export function relationshipKey(
  kind: RelationshipKind,
  sourceId: string,
  targetId: string,
): string {
  const canonical = canonicalizeEndpoints(kind, sourceId, targetId)

  return `${kind}|${canonical.sourceId}|${canonical.targetId}`
}

export function findDuplicateRelationships(
  relationships: ExtractedRelationship[],
): DuplicateRelationshipGroup[] {
  const groups = new Map<string, ExtractedRelationship[]>()

  for (const relationship of relationships) {
    const key = relationshipKey(
      relationship.kind,
      relationship.sourceId,
      relationship.targetId,
    )
    const group = groups.get(key) ?? []
    group.push(relationship)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const canonical = canonicalizeEndpoints(
        group[0].kind,
        group[0].sourceId,
        group[0].targetId,
      )

      return {
        key,
        id: group[0].id,
        kind: group[0].kind,
        sourceId: canonical.sourceId,
        targetId: canonical.targetId,
        relationships: group,
      }
    })
}

export function mergeRelationshipGroup(
  group: ExtractedRelationship[],
): ExtractedRelationship {
  const sorted = [...group].sort(
    (left, right) => right.confidence - left.confidence,
  )
  const direct = sorted.filter(
    (relationship) => relationship.basis === 'direct',
  )
  const primary = direct[0] ?? sorted[0]
  const chunkIds = new Set<string>()
  const evidence = mergeEvidence(
    group.map((relationship) => relationship.evidence),
  )

  for (const relationship of group) {
    for (const chunkId of relationship.chunkIds) {
      chunkIds.add(chunkId)
    }
  }

  const allReviewed = group.every(
    (relationship) =>
      relationship.review === 'accepted' &&
      relationship.verification.status === 'verified' &&
      relationship.verification.method === 'manual-review',
  )
  const review = allReviewed ? 'accepted' : 'suggested'
  const endpoints = canonicalizeEndpoints(
    primary.kind,
    primary.sourceId,
    primary.targetId,
  )

  return {
    ...primary,
    id: createRelationshipId(
      primary.kind,
      endpoints.sourceId,
      endpoints.targetId,
    ),
    sourceId: endpoints.sourceId,
    targetId: endpoints.targetId,
    basis: primary.basis,
    inference: primary.inference,
    evidence,
    chunkIds: Array.from(chunkIds),
    verification:
      review === 'accepted'
        ? primary.verification
        : createUnverifiedClaim(),
    review,
  }
}
