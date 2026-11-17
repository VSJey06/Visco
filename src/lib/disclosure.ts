import type { DisclosureLevel } from '../types/graph'

export const DISCLOSURE_THRESHOLDS = {
  concepts: 0.65,
  relations: 1.25,
  detail: 2,
} as const

export const DISCLOSURE_LABELS: Record<DisclosureLevel, string> = {
  overview: 'Overview',
  concepts: 'Concepts',
  relations: 'Relations',
  detail: 'Detail',
}

export function getDisclosureLevel(zoom: number): DisclosureLevel {
  if (zoom < DISCLOSURE_THRESHOLDS.concepts) {
    return 'overview'
  }

  if (zoom < DISCLOSURE_THRESHOLDS.relations) {
    return 'concepts'
  }

  if (zoom < DISCLOSURE_THRESHOLDS.detail) {
    return 'relations'
  }

  return 'detail'
}

export function showsEdgeLabels(level: DisclosureLevel): boolean {
  return level === 'relations' || level === 'detail'
}

export function showsSupportingLabels(level: DisclosureLevel): boolean {
  return showsEdgeLabels(level)
}
