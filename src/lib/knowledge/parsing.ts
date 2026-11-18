import type { ValidationIssue } from '../../types/knowledge.ts'
import { isConceptKind, isRelationshipKind } from './taxonomy.ts'

export type JsonExtractionResult =
  | { ok: true; value: unknown }
  | { ok: false; issue: ValidationIssue }

function stripCodeFence(text: string): string {
  const fence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text)

  return fence ? fence[1] : text
}

export function findJsonObject(text: string): string | null {
  const start = text.indexOf('{')

  if (start === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }

      if (character === '\\') {
        escaped = true
        continue
      }

      if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      continue
    }

    if (character === '{') {
      depth += 1
      continue
    }

    if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

export function extractJsonPayload(text: string): JsonExtractionResult {
  const candidate = findJsonObject(stripCodeFence(text))

  if (!candidate) {
    return {
      ok: false,
      issue: {
        code: 'invalid-json',
        severity: 'error',
        subjectKind: 'payload',
        subjectId: 'payload',
        message: 'The response did not contain a JSON object.',
      },
    }
  }

  try {
    return { ok: true, value: JSON.parse(candidate) }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unparseable JSON.'

    return {
      ok: false,
      issue: {
        code: 'invalid-json',
        severity: 'error',
        subjectKind: 'payload',
        subjectId: 'payload',
        message: `The response was not valid JSON: ${detail}`,
      },
    }
  }
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function schemaIssue(
  subjectId: string,
  message: string,
): ValidationIssue {
  return {
    code: 'schema-mismatch',
    severity: 'error',
    subjectKind: 'payload',
    subjectId,
    message,
  }
}

function validateAllowedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  subjectId: string,
  issues: ValidationIssue[],
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      issues.push(
        schemaIssue(subjectId, `${subjectId} contains the unsupported field "${key}".`),
      )
    }
  }
}

function validateRequiredKeys(
  record: Record<string, unknown>,
  requiredKeys: readonly string[],
  subjectId: string,
  issues: ValidationIssue[],
): void {
  for (const key of requiredKeys) {
    if (!hasOwn(record, key)) {
      issues.push(
        schemaIssue(subjectId, `${subjectId} must contain the field "${key}".`),
      )
    }
  }
}

function validateConfidence(
  value: unknown,
  subjectId: string,
  issues: ValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({
      code: 'invalid-confidence',
      severity: 'error',
      subjectKind: 'payload',
      subjectId,
      message: `${subjectId} must carry a finite confidence number.`,
    })
    return
  }

  if (value < 0 || value > 1) {
    issues.push({
      code: 'invalid-confidence',
      severity: 'error',
      subjectKind: 'payload',
      subjectId,
      message: `${subjectId} confidence must be between 0 and 1.`,
    })
  }
}

function validateEvidenceArray(
  evidence: unknown,
  subjectId: string,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(evidence)) {
    issues.push(schemaIssue(subjectId, `${subjectId} must be an evidence array.`))
    return
  }

  evidence.forEach((entry, index) => {
    const label = `${subjectId}[${index}]`

    if (!isPlainObject(entry)) {
      issues.push(schemaIssue(label, 'An evidence entry must be an object.'))
      return
    }

    validateAllowedKeys(entry, ['pageNumber', 'blockId', 'quote'], label, issues)
    validateRequiredKeys(entry, ['pageNumber', 'blockId', 'quote'], label, issues)

    if (
      typeof entry.pageNumber !== 'number' ||
      !Number.isInteger(entry.pageNumber) ||
      entry.pageNumber < 1
    ) {
      issues.push(
        schemaIssue(label, 'An evidence entry must carry a positive integer pageNumber.'),
      )
    }

    if (typeof entry.blockId !== 'string' || !entry.blockId.trim()) {
      issues.push(
        schemaIssue(label, 'An evidence entry must carry a non-empty blockId.'),
      )
    }

    if (typeof entry.quote !== 'string' || !entry.quote.trim()) {
      issues.push(
        schemaIssue(label, 'An evidence entry must carry a non-empty quote.'),
      )
    }
  })
}

function validateAttributeArray(
  attributes: unknown,
  subjectId: string,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(attributes)) {
    issues.push(
      schemaIssue(subjectId, `${subjectId} must be an attribute array.`),
    )
    return
  }

  const attributeKinds = ['definition', 'fact', 'condition', 'example']

  attributes.forEach((attribute, index) => {
    const label = `${subjectId}[${index}]`

    if (!isPlainObject(attribute)) {
      issues.push(schemaIssue(label, 'An attribute must be an object.'))
      return
    }

    validateAllowedKeys(
      attribute,
      ['kind', 'text', 'confidence', 'evidence'],
      label,
      issues,
    )
    validateRequiredKeys(
      attribute,
      ['kind', 'text', 'confidence', 'evidence'],
      label,
      issues,
    )

    if (
      typeof attribute.kind !== 'string' ||
      !attributeKinds.includes(attribute.kind)
    ) {
      issues.push({
        code: 'unknown-concept-kind',
        severity: 'error',
        subjectKind: 'payload',
        subjectId: label,
        message: `"${String(attribute.kind)}" is not a supported attribute kind.`,
      })
    }

    if (typeof attribute.text !== 'string' || !attribute.text.trim()) {
      issues.push(
        schemaIssue(label, 'An attribute must carry a non-empty text.'),
      )
    }

    validateConfidence(attribute.confidence, label, issues)
    validateEvidenceArray(attribute.evidence, `${label}.evidence`, issues)
  })
}

function validateConcept(
  concept: Record<string, unknown>,
  subjectId: string,
  issues: ValidationIssue[],
): void {
  validateAllowedKeys(
    concept,
    ['id', 'title', 'kind', 'aliases', 'definition', 'confidence', 'evidence', 'attributes'],
    subjectId,
    issues,
  )
  validateRequiredKeys(
    concept,
    ['id', 'title', 'kind', 'confidence', 'evidence'],
    subjectId,
    issues,
  )

  if (typeof concept.id !== 'string') {
    issues.push(schemaIssue(subjectId, 'A concept id must be a string.'))
  }

  if (typeof concept.title !== 'string' || !concept.title.trim()) {
    issues.push(
      schemaIssue(subjectId, 'A concept must carry a non-empty title.'),
    )
  }

  if (typeof concept.kind !== 'string' || !concept.kind.trim()) {
    issues.push(schemaIssue(subjectId, 'A concept must carry a kind.'))
  } else if (!isConceptKind(concept.kind)) {
    issues.push({
      code: 'unknown-concept-kind',
      severity: 'error',
      subjectKind: 'payload',
      subjectId,
      message: `"${concept.kind}" is not a supported concept kind.`,
    })
  }

  if (concept.aliases !== undefined) {
    if (
      !Array.isArray(concept.aliases) ||
      concept.aliases.some((alias) => typeof alias !== 'string')
    ) {
      issues.push(
        schemaIssue(subjectId, 'Concept aliases must be an array of strings.'),
      )
    }
  }

  if (
    concept.definition !== undefined &&
    typeof concept.definition !== 'string'
  ) {
    issues.push(
      schemaIssue(subjectId, 'A concept definition must be a string.'),
    )
  }

  validateConfidence(concept.confidence, subjectId, issues)
  validateEvidenceArray(concept.evidence, `${subjectId}.evidence`, issues)

  if (concept.attributes !== undefined) {
    validateAttributeArray(concept.attributes, `${subjectId}.attributes`, issues)
  }
}

function validateRelationship(
  relationship: Record<string, unknown>,
  subjectId: string,
  issues: ValidationIssue[],
): void {
  validateAllowedKeys(
    relationship,
    ['sourceId', 'targetId', 'kind', 'statement', 'confidence', 'basis', 'inference', 'evidence'],
    subjectId,
    issues,
  )
  validateRequiredKeys(
    relationship,
    ['sourceId', 'targetId', 'kind', 'confidence', 'basis', 'evidence'],
    subjectId,
    issues,
  )

  if (
    typeof relationship.sourceId !== 'string' ||
    !relationship.sourceId.trim()
  ) {
    issues.push(
      schemaIssue(subjectId, 'A relationship must carry a sourceId.'),
    )
  }

  if (
    typeof relationship.targetId !== 'string' ||
    !relationship.targetId.trim()
  ) {
    issues.push(
      schemaIssue(subjectId, 'A relationship must carry a targetId.'),
    )
  }

  if (typeof relationship.kind !== 'string' || !relationship.kind.trim()) {
    issues.push(schemaIssue(subjectId, 'A relationship must carry a kind.'))
  } else if (!isRelationshipKind(relationship.kind)) {
    issues.push({
      code: 'unsupported-relationship',
      severity: 'error',
      subjectKind: 'payload',
      subjectId,
      message: `"${relationship.kind}" is not a supported relationship kind.`,
    })
  }

  if (
    relationship.statement !== undefined &&
    typeof relationship.statement !== 'string'
  ) {
    issues.push(
      schemaIssue(subjectId, 'A relationship statement must be a string.'),
    )
  }

  validateConfidence(relationship.confidence, subjectId, issues)

  if (relationship.basis !== 'direct' && relationship.basis !== 'inferred') {
    issues.push(
      schemaIssue(subjectId, 'A relationship basis must be "direct" or "inferred".'),
    )
  }

  if (relationship.inference !== undefined && relationship.inference !== null) {
    if (!isPlainObject(relationship.inference)) {
      issues.push(
        schemaIssue(subjectId, 'A relationship inference must be an object or null.'),
      )
    } else {
      validateAllowedKeys(
        relationship.inference,
        ['kind', 'rationale'],
        `${subjectId}.inference`,
        issues,
      )
      validateRequiredKeys(
        relationship.inference,
        ['kind', 'rationale'],
        `${subjectId}.inference`,
        issues,
      )

      if (
        relationship.inference.kind !== 'explicit-cross-reference'
      ) {
        issues.push({
          code: 'unsupported-relationship',
          severity: 'error',
          subjectKind: 'payload',
          subjectId,
          message:
            'An inferred relationship must use the "explicit-cross-reference" inference kind.',
        })
      }

      if (
        typeof relationship.inference.rationale !== 'string' ||
        !relationship.inference.rationale.trim()
      ) {
        issues.push(
          schemaIssue(
            `${subjectId}.inference`,
            'An inferred relationship must carry a non-empty rationale.',
          ),
        )
      }
    }
  }

  if (
    relationship.basis === 'inferred' &&
    (!isPlainObject(relationship.inference) ||
      !hasOwn(relationship.inference, 'kind') ||
      !hasOwn(relationship.inference, 'rationale'))
  ) {
    issues.push(
      schemaIssue(
        subjectId,
        'An inferred relationship must carry an inference object.',
      ),
    )
  }

  validateEvidenceArray(
    relationship.evidence,
    `${subjectId}.evidence`,
    issues,
  )
}

export function validatePayloadSchema(
  value: unknown,
  subjectId = 'payload',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isPlainObject(value)) {
    issues.push(
      schemaIssue(subjectId, 'The payload must be a JSON object.'),
    )
    return issues
  }

  validateAllowedKeys(value, ['concepts', 'relationships'], subjectId, issues)
  validateRequiredKeys(value, ['concepts', 'relationships'], subjectId, issues)

  if (!Array.isArray(value.concepts)) {
    issues.push(
      schemaIssue(subjectId, 'The payload must contain a concepts array.'),
    )
  } else {
    value.concepts.forEach((concept, index) => {
      const label = `concepts[${index}]`

      if (!isPlainObject(concept)) {
        issues.push(schemaIssue(label, 'A concept must be an object.'))
        return
      }

      validateConcept(concept, label, issues)
    })
  }

  if (!Array.isArray(value.relationships)) {
    issues.push(
      schemaIssue(subjectId, 'The payload must contain a relationships array.'),
    )
  } else {
    value.relationships.forEach((relationship, index) => {
      const label = `relationships[${index}]`

      if (!isPlainObject(relationship)) {
        issues.push(
          schemaIssue(label, 'A relationship must be an object.'),
        )
        return
      }

      validateRelationship(relationship, label, issues)
    })
  }

  return issues
}
