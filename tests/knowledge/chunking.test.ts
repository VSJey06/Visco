import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { chunkDocument, estimateTokens } from '../../src/lib/knowledge/chunking.ts'
import type { ChunkingConfig } from '../../src/types/knowledge.ts'
import {
  createLongWordDocument,
  createOversizedDocument,
  createSamePageChapterDocument,
  createSplitBlockDocument,
  createTestDocument,
  createTwoChapterDocument,
} from './fixtures.ts'

const config: ChunkingConfig = {
  targetTokens: 20,
  maxTokens: 40,
  overlapTokens: 10,
  charactersPerToken: 4,
}

describe('chunking', () => {
  it('estimates tokens from character length', () => {
    assert.equal(estimateTokens('abcd', 4), 1)
    assert.equal(estimateTokens('abcde', 4), 2)
    assert.equal(estimateTokens('anything', 0), 0)
  })

  it('skips pages that need OCR', () => {
    const result = chunkDocument(createTestDocument(), config)

    assert.deepEqual(result.skippedPageNumbers, [3])
    assert.equal(
      result.chunks.some((chunk) => chunk.text.includes('Scanned page')),
      false,
    )
  })

  it('keeps anchors inside the page range of their chunk', () => {
    const result = chunkDocument(createTestDocument(), config)

    assert.ok(result.chunks.length > 0)

    for (const chunk of result.chunks) {
      assert.ok(chunk.anchors.length > 0)

      for (const anchor of chunk.anchors) {
        assert.ok(anchor.pageNumber >= chunk.pageStart)
        assert.ok(anchor.pageNumber <= chunk.pageEnd)
        assert.ok(chunk.text.includes(anchor.anchorId))
      }
    }
  })

  it('never crosses a chapter boundary', () => {
    const result = chunkDocument(createTwoChapterDocument(), config)

    assert.ok(result.chunks.length >= 2)

    for (const chunk of result.chunks) {
      const pages = new Set(chunk.anchors.map((anchor) => anchor.pageNumber))

      if (chunk.chapterId === 'page-1-block-1') {
        assert.deepEqual(Array.from(pages), [1])
      }

      if (chunk.chapterId === 'page-2-block-1') {
        assert.deepEqual(Array.from(pages), [2])
      }
    }
  })

  it('separates chapters that begin on the same page', () => {
    const result = chunkDocument(createSamePageChapterDocument(), config)
    const first = result.chunks.find(
      (chunk) => chunk.chapterId === 'page-1-block-1',
    )
    const second = result.chunks.find(
      (chunk) => chunk.chapterId === 'page-1-block-3',
    )

    assert.ok(first)
    assert.ok(second)
    assert.ok(first.text.includes('The first chapter has body text.'))
    assert.equal(first.text.includes('The second chapter has body text.'), false)
    assert.ok(second.text.includes('The second chapter has body text.'))
    assert.equal(second.text.includes('The first chapter has body text.'), false)
  })

  it('carries a limited overlap into the next chunk of the same chapter', () => {
    const result = chunkDocument(createTestDocument(), {
      ...config,
      targetTokens: 20,
      maxTokens: 40,
      overlapTokens: 10,
    })

    assert.ok(result.chunks.length >= 2)

    const first = result.chunks[0]
    const second = result.chunks[1]
    const shared = first.blockIds.filter((blockId) =>
      second.blockIds.includes(blockId),
    )

    assert.ok(shared.length <= 1)
  })

  it('splits a block that exceeds the token budget into parts', () => {
    const result = chunkDocument(createOversizedDocument(), {
      ...config,
      targetTokens: 40,
      maxTokens: 40,
      overlapTokens: 0,
    })

    const anchors = result.chunks.flatMap((chunk) => chunk.anchors)

    assert.ok(anchors.length > 1)
    assert.ok(anchors.every((anchor) => anchor.blockId === 'page-1-block-1'))
    assert.ok(anchors.some((anchor) => anchor.anchorId.includes('#')))
    assert.ok(
      anchors.every((anchor) => anchor.part >= 1 && anchor.part <= anchor.partCount),
    )
  })

  it('splits an unbroken oversized word within the token budget', () => {
    const result = chunkDocument(createLongWordDocument(), {
      ...config,
      targetTokens: 10,
      maxTokens: 10,
      overlapTokens: 0,
    })

    assert.ok(result.chunks.length > 1)
    assert.ok(
      result.chunks.every((chunk) => chunk.estimatedTokens <= 10),
    )
  })

  it('counts separators when estimating split-part tokens', () => {
    const result = chunkDocument(createSplitBlockDocument(), {
      ...config,
      targetTokens: 10,
      maxTokens: 10,
      overlapTokens: 0,
    })

    assert.ok(result.chunks.length > 1)
    assert.ok(
      result.chunks.every((chunk) => chunk.estimatedTokens <= 10),
    )
  })

  it('reports the chapter and section a chunk belongs to', () => {
    const result = chunkDocument(createTestDocument(), {
      ...config,
      targetTokens: 400,
      maxTokens: 400,
    })

    assert.equal(result.chunks.length, 1)
    assert.equal(result.chunks[0].chapterId, 'page-1-block-1')
    assert.equal(result.chunks[0].chapterTitle, 'Chapter 1 Cell Biology')
    assert.deepEqual(result.chunks[0].sectionIds, ['page-2-block-1'])
  })
})
