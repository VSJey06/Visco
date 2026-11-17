import type { Core } from 'cytoscape'
import type { DisclosureLevel, KnowledgeEdge, NodeTier } from '../types/graph'
import { showsEdgeLabels } from './disclosure'

type Point = {
  x: number
  y: number
}

type ScreenRect = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type EdgeLabelGeometry = {
  edgeId: string
  pathId: string
  path: string
  label: string
  source: string
  target: string
  sourceTier: NodeTier
  targetTier: NodeTier
  from: Point
  control: Point
  to: Point
  midpoint: Point
  orientation: number
  length: number
  labelWidth: number
}

export type EdgeLabelVisibilityOptions = {
  zoom: number
  level: DisclosureLevel
  selectedNodeId: string | null
  selectedEdgeId: string | null
}

const LABEL_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const LABEL_TRACKING_EM = 0.015
const LENGTH_SAMPLES = 18
const MAX_LABEL_TILT = (58 * Math.PI) / 180
const MIN_LABEL_BREATHING_ROOM = 18
const LABEL_GAP = 4
const NODE_GAP = 3

const TIER_PRIORITY: Record<NodeTier, number> = {
  core: 30,
  major: 20,
  supporting: 10,
}

const widthCache = new Map<string, number>()
let measureContext: CanvasRenderingContext2D | null | undefined

function getLabelFontSize(level: DisclosureLevel): number {
  return level === 'detail' ? 12 : 11
}

function measureLabelWidth(text: string, fontSize: number): number {
  const cacheKey = `${fontSize}:${text}`
  const cached = widthCache.get(cacheKey)

  if (cached !== undefined) {
    return cached
  }

  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined'
        ? null
        : document.createElement('canvas').getContext('2d')
  }

  let width: number

  if (measureContext) {
    measureContext.font = `500 ${fontSize}px ${LABEL_FONT_FAMILY}`
    width = measureContext.measureText(text).width
  } else {
    width = text.length * fontSize * 0.58
  }

  width += text.length * fontSize * LABEL_TRACKING_EM
  widthCache.set(cacheKey, width)

  return width
}

function quadraticPoint(
  from: Point,
  control: Point,
  to: Point,
  t: number,
): Point {
  const inverse = 1 - t

  return {
    x:
      inverse * inverse * from.x +
      2 * inverse * t * control.x +
      t * t * to.x,
    y:
      inverse * inverse * from.y +
      2 * inverse * t * control.y +
      t * t * to.y,
  }
}

function quadraticTangentAngle(
  from: Point,
  control: Point,
  to: Point,
  t: number,
): number {
  const inverse = 1 - t
  const dx =
    2 * inverse * (control.x - from.x) + 2 * t * (to.x - control.x)
  const dy =
    2 * inverse * (control.y - from.y) + 2 * t * (to.y - control.y)

  return Math.atan2(dy, dx)
}

function quadraticLength(
  from: Point,
  control: Point,
  to: Point,
): number {
  let length = 0
  let previous = from

  for (let step = 1; step <= LENGTH_SAMPLES; step += 1) {
    const next = quadraticPoint(from, control, to, step / LENGTH_SAMPLES)

    length += Math.hypot(next.x - previous.x, next.y - previous.y)
    previous = next
  }

  return length
}

function normalizeAngle(angle: number): number {
  let normalized = angle

  while (normalized > Math.PI) {
    normalized -= Math.PI * 2
  }

  while (normalized < -Math.PI) {
    normalized += Math.PI * 2
  }

  return normalized
}

function maxLabelTilt(label: EdgeLabelGeometry, zoom: number): number {
  if (label.length < 1 || zoom <= 0) {
    return Math.PI / 2
  }

  const halfSpan = Math.min(
    0.46,
    Math.max(0, label.labelWidth / zoom / 2 / label.length),
  )
  let maximum = 0

  for (let step = 0; step <= 4; step += 1) {
    const t = 0.5 - halfSpan + ((2 * halfSpan) / 4) * step
    const angle = Math.abs(
      normalizeAngle(
        quadraticTangentAngle(label.from, label.control, label.to, t),
      ),
    )

    maximum = Math.max(maximum, angle)
  }

  return maximum
}

function screenLabelRect(
  label: EdgeLabelGeometry,
  zoom: number,
  pan: Point,
  fontSize: number,
): ScreenRect {
  const centerX = label.midpoint.x * zoom + pan.x
  const centerY = label.midpoint.y * zoom + pan.y
  const width = label.labelWidth + 6
  const height = fontSize + 7
  const cosine = Math.abs(Math.cos(label.orientation))
  const sine = Math.abs(Math.sin(label.orientation))
  const halfWidth = (width * cosine + height * sine) / 2
  const halfHeight = (width * sine + height * cosine) / 2

  return {
    x1: centerX - halfWidth - LABEL_GAP / 2,
    y1: centerY - halfHeight - LABEL_GAP / 2,
    x2: centerX + halfWidth + LABEL_GAP / 2,
    y2: centerY + halfHeight + LABEL_GAP / 2,
  }
}

function rectsOverlap(a: ScreenRect, b: ScreenRect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1
}

function labelPriority(
  label: EdgeLabelGeometry,
  options: EdgeLabelVisibilityOptions,
): number {
  let priority =
    TIER_PRIORITY[label.sourceTier] + TIER_PRIORITY[label.targetTier]

  if (label.edgeId === options.selectedEdgeId) {
    priority += 1000
  } else if (
    options.selectedNodeId !== null &&
    (label.source === options.selectedNodeId ||
      label.target === options.selectedNodeId)
  ) {
    priority += 500
  }

  return priority
}

export function buildEdgeLabelGeometry(
  cy: Core,
  edges: KnowledgeEdge[],
  level: DisclosureLevel,
): EdgeLabelGeometry[] {
  const fontSize = getLabelFontSize(level)

  return edges.flatMap((edge) => {
    const cyEdge = cy.getElementById(edge.id)

    if (cyEdge.empty() || !cyEdge.isEdge()) {
      return []
    }

    const source = cyEdge.sourceEndpoint()
    const target = cyEdge.targetEndpoint()
    const controls = cyEdge.controlPoints()
    const control = controls?.[0] ?? {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    }
    const dx = target.x - source.x
    const dy = target.y - source.y
    const reverse = dx < 0 || (Math.abs(dx) < 1 && dy < 0)
    const from = reverse ? target : source
    const to = reverse ? source : target
    const sourceTier = String(
      cyEdge.source().data('tier') ?? 'supporting',
    ) as NodeTier
    const targetTier = String(
      cyEdge.target().data('tier') ?? 'supporting',
    ) as NodeTier

    return [
      {
        edgeId: edge.id,
        pathId: `edge-label-path-${edge.id}`,
        path: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
        label: edge.label,
        source: edge.source,
        target: edge.target,
        sourceTier,
        targetTier,
        from,
        control,
        to,
        midpoint: quadraticPoint(from, control, to, 0.5),
        orientation: quadraticTangentAngle(from, control, to, 0.5),
        length: quadraticLength(from, control, to),
        labelWidth: measureLabelWidth(edge.label, fontSize),
      },
    ]
  })
}

export function resolveVisibleEdgeLabels(
  cy: Core,
  labels: EdgeLabelGeometry[],
  options: EdgeLabelVisibilityOptions,
): Set<string> {
  const hidden = new Set<string>()

  if (labels.length === 0 || !showsEdgeLabels(options.level)) {
    return hidden
  }

  const zoom = options.zoom
  const fontSize = getLabelFontSize(options.level)
  const pan = cy.pan()
  const nodeRects = cy.nodes().map((node) => {
    const box = node.renderedBoundingBox({
      includeLabels: true,
      includeOverlays: false,
      includeUnderlays: false,
    })

    return {
      x1: box.x1 - NODE_GAP,
      y1: box.y1 - NODE_GAP,
      x2: box.x2 + NODE_GAP,
      y2: box.y2 + NODE_GAP,
    }
  })
  const ordered = labels
    .map((label) => ({
      label,
      priority: labelPriority(label, options),
    }))
    .sort(
      (a, b) =>
        b.priority - a.priority || a.label.edgeId.localeCompare(b.label.edgeId),
    )
  const placedRects: ScreenRect[] = []

  for (const { label } of ordered) {
    const isSelectedEdge = label.edgeId === options.selectedEdgeId

    if (label.length * zoom < label.labelWidth + MIN_LABEL_BREATHING_ROOM) {
      hidden.add(label.edgeId)
      continue
    }

    if (maxLabelTilt(label, zoom) > MAX_LABEL_TILT) {
      hidden.add(label.edgeId)
      continue
    }

    const rect = screenLabelRect(label, zoom, pan, fontSize)
    const overlapsPlacedLabel = placedRects.some((placed) =>
      rectsOverlap(rect, placed),
    )

    if (overlapsPlacedLabel) {
      hidden.add(label.edgeId)
      continue
    }

    const overlapsNode = nodeRects.some((nodeRect) =>
      rectsOverlap(rect, nodeRect),
    )

    if (overlapsNode && !isSelectedEdge) {
      hidden.add(label.edgeId)
      continue
    }

    placedRects.push(rect)
  }

  return hidden
}
