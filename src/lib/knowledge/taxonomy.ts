import type { NodeTier } from '../../types/graph.ts'
import type {
  ConceptKind,
  RelationshipKind,
} from '../../types/knowledge.ts'

export const CONCEPT_KINDS: readonly ConceptKind[] = [
  'main_concept',
  'supporting_concept',
  'entity',
  'process',
]

export const NODE_WORTHY_CONCEPT_KINDS: readonly ConceptKind[] = [
  'main_concept',
  'supporting_concept',
  'entity',
  'process',
]

export type RelationshipDescriptor = {
  kind: RelationshipKind
  label: string
  description: string
  symmetric: boolean
}

export const RELATIONSHIP_DESCRIPTORS: readonly RelationshipDescriptor[] = [
  {
    kind: 'CAUSES',
    label: 'causes',
    description: 'The source directly produces the target.',
    symmetric: false,
  },
  {
    kind: 'ENABLES',
    label: 'enables',
    description: 'The source makes the target possible or easier.',
    symmetric: false,
  },
  {
    kind: 'PART_OF',
    label: 'part of',
    description: 'The source is a component or part of the target.',
    symmetric: false,
  },
  {
    kind: 'DEPENDS_ON',
    label: 'depends on',
    description: 'The source requires the target to work.',
    symmetric: false,
  },
  {
    kind: 'COMPARES',
    label: 'compared with',
    description: 'The source and target are compared with each other.',
    symmetric: true,
  },
  {
    kind: 'EXAMPLE_OF',
    label: 'example of',
    description: 'The source is a concrete instance of the target.',
    symmetric: false,
  },
  {
    kind: 'SEQUENCE',
    label: 'precedes',
    description: 'The source happens before the target.',
    symmetric: false,
  },
  {
    kind: 'ASSOCIATED_WITH',
    label: 'related to',
    description: 'The source and target are related without a stated mechanism.',
    symmetric: true,
  },
]

export const RELATIONSHIP_KINDS: readonly RelationshipKind[] =
  RELATIONSHIP_DESCRIPTORS.map((descriptor) => descriptor.kind)

export function isConceptKind(value: string): value is ConceptKind {
  return (CONCEPT_KINDS as string[]).includes(value)
}

export function isRelationshipKind(value: string): value is RelationshipKind {
  return (RELATIONSHIP_KINDS as string[]).includes(value)
}

export function isNodeWorthyConceptKind(kind: ConceptKind): boolean {
  return NODE_WORTHY_CONCEPT_KINDS.includes(kind)
}

export function isSymmetricRelationship(kind: RelationshipKind): boolean {
  const descriptor = RELATIONSHIP_DESCRIPTORS.find(
    (candidate) => candidate.kind === kind,
  )

  return descriptor?.symmetric ?? false
}

export function relationshipLabel(kind: RelationshipKind): string {
  const descriptor = RELATIONSHIP_DESCRIPTORS.find(
    (candidate) => candidate.kind === kind,
  )

  return descriptor?.label ?? 'related to'
}

export function relationshipDescription(kind: RelationshipKind): string {
  const descriptor = RELATIONSHIP_DESCRIPTORS.find(
    (candidate) => candidate.kind === kind,
  )

  return descriptor?.description ?? ''
}

export function assignConceptTier(
  kind: ConceptKind,
  mentionCount: number,
  chapterCount: number,
): NodeTier {
  if (kind === 'main_concept') {
    return 'core'
  }

  if (mentionCount >= 3 && chapterCount >= 2) {
    return 'core'
  }

  if (
    (kind === 'entity' || kind === 'process') &&
    chapterCount >= 2
  ) {
    return 'major'
  }

  return 'supporting'
}
