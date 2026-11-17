export type NodeTier = 'core' | 'major' | 'supporting'

export type DisclosureLevel = 'overview' | 'concepts' | 'relations' | 'detail'

export type GraphPosition = {
  x: number
  y: number
}

export type KnowledgeNode = {
  id: string
  title: string
  type: string
  tier: NodeTier
  definition: string
  keyPoints: string[]
  sourcePage: string
  position: GraphPosition
}

export type KnowledgeEdge = {
  id: string
  source: string
  target: string
  relationship: string
  label: string
  explanation: string
  supportingPoints: string[]
  curve: number
}
