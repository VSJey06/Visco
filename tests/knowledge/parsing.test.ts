import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  extractJsonPayload,
  findJsonObject,
  validatePayloadSchema,
} from '../../src/lib/knowledge/parsing.ts'

const validPayload = {
  concepts: [
    {
      id: 'cell-membrane',
      title: 'Cell membrane',
      kind: 'main_concept',
      confidence: 0.8,
      evidence: [
        {
          pageNumber: 1,
          blockId: 'page-1-block-2',
          quote: 'The cell membrane controls which substances enter the cell.',
        },
      ],
    },
  ],
  relationships: [
    {
      sourceId: 'cell-membrane',
      targetId: 'diffusion',
      kind: 'CAUSES',
      confidence: 0.7,
      basis: 'direct',
      evidence: [
        {
          pageNumber: 1,
          blockId: 'page-1-block-3',
          quote: 'Diffusion is the movement of particles.',
        },
      ],
    },
  ],
}

describe('json recovery', () => {
  it('parses a plain object', () => {
    const result = extractJsonPayload('{"concepts":[],"relationships":[]}')

    assert.equal(result.ok, true)
  })

  it('parses a fenced object', () => {
    const result = extractJsonPayload(
      '```json\n{"concepts":[],"relationships":[]}\n```',
    )

    assert.equal(result.ok, true)
  })

  it('parses an object surrounded by prose', () => {
    const result = extractJsonPayload(
      'Here is the result:\n{"concepts":[],"relationships":[]}\nHope that helps.',
    )

    assert.equal(result.ok, true)
  })

  it('reports malformed json', () => {
    const result = extractJsonPayload('{"concepts": [')

    assert.equal(result.ok, false)

    if (!result.ok) {
      assert.equal(result.issue.code, 'invalid-json')
      assert.equal(result.issue.severity, 'error')
    }
  })

  it('reports a response without an object', () => {
    const result = extractJsonPayload('I could not extract anything.')

    assert.equal(result.ok, false)

    if (!result.ok) {
      assert.equal(result.issue.code, 'invalid-json')
    }
  })

  it('does not stop at braces inside strings', () => {
    const found = findJsonObject('{"a":"} not the end"}')

    assert.equal(found, '{"a":"} not the end"}')
  })
})

describe('payload schema', () => {
  it('accepts a well formed payload', () => {
    assert.deepEqual(validatePayloadSchema(validPayload), [])
  })

  it('rejects a payload that is not an object', () => {
    const issues = validatePayloadSchema('not an object')

    assert.equal(issues.length, 1)
    assert.equal(issues[0].code, 'schema-mismatch')
  })

  it('rejects a missing concepts array', () => {
    const issues = validatePayloadSchema({ relationships: [] })

    assert.ok(issues.some((entry) => entry.code === 'schema-mismatch'))
    assert.ok(issues.some((entry) => /concepts/.test(entry.message)))
  })

  it('rejects a missing relationships array', () => {
    const issues = validatePayloadSchema({ concepts: [] })

    assert.ok(issues.some((entry) => entry.code === 'schema-mismatch'))
    assert.ok(issues.some((entry) => /relationships/.test(entry.message)))
  })

  it('rejects a concept without an id', () => {
    const issues = validatePayloadSchema({
      concepts: [
        {
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.8,
          evidence: [],
        },
      ],
      relationships: [],
    })

    assert.ok(issues.some((entry) => /id/.test(entry.message)))
  })

  it('rejects a concept without a title', () => {
    const issues = validatePayloadSchema({
      concepts: [
        {
          id: 'cell-membrane',
          kind: 'main_concept',
          confidence: 0.8,
          evidence: [],
        },
      ],
      relationships: [],
    })

    assert.ok(issues.some((entry) => /title/.test(entry.message)))
  })

  it('rejects a relationship without endpoints', () => {
    const issues = validatePayloadSchema({
      concepts: [],
      relationships: [
        {
          sourceId: 'a',
          kind: 'CAUSES',
          confidence: 0.7,
          basis: 'direct',
          evidence: [],
        },
      ],
    })

    assert.ok(issues.some((entry) => /targetId/.test(entry.message)))
  })

  it('rejects evidence without a page number', () => {
    const issues = validatePayloadSchema({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          confidence: 0.8,
          evidence: [{ blockId: 'page-1-block-2', quote: 'text' }],
        },
      ],
      relationships: [],
    })

    assert.ok(issues.some((entry) => /pageNumber/.test(entry.message)))
  })

  it('rejects an invalid relationship basis', () => {
    const issues = validatePayloadSchema({
      concepts: [],
      relationships: [
        {
          sourceId: 'a',
          targetId: 'b',
          kind: 'CAUSES',
          confidence: 0.7,
          basis: 'co-occurrence',
          evidence: [],
        },
      ],
    })

    assert.ok(issues.some((entry) => /basis/.test(entry.message)))
  })

  it('rejects invalid confidence, aliases, and unsupported fields', () => {
    const issues = validatePayloadSchema({
      concepts: [
        {
          id: 'cell-membrane',
          title: 'Cell membrane',
          kind: 'main_concept',
          aliases: 'membrane',
          confidence: 2,
          evidence: [],
          invented: true,
        },
      ],
      relationships: [],
    })

    assert.ok(issues.some((entry) => entry.code === 'invalid-confidence'))
    assert.ok(issues.some((entry) => /aliases/.test(entry.message)))
    assert.ok(issues.some((entry) => /invented/.test(entry.message)))
  })

  it('rejects an unsupported relationship kind', () => {
    const issues = validatePayloadSchema({
      concepts: [],
      relationships: [
        {
          sourceId: 'a',
          targetId: 'b',
          kind: 'INVENTS',
          confidence: 0.7,
          basis: 'direct',
          evidence: [],
        },
      ],
    })

    assert.ok(
      issues.some((entry) => entry.code === 'unsupported-relationship'),
    )
  })
})
