import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeDocumentFingerprint,
  computeExtractedDocumentFingerprint,
  createConceptId,
  createDocumentId,
  createExtractionRunId,
  createRelationshipId,
  hashText,
  isValidConceptId,
  isValidRelationshipId,
  normalizeTitle,
  slugify,
  titleKey,
} from '../../src/lib/knowledge/identifiers.ts'
import { createTestDocument } from './fixtures.ts'

describe('identifiers', () => {
  it('slugifies titles into id-safe names', () => {
    assert.equal(slugify('Cell Membrane'), 'cell-membrane')
    assert.equal(slugify('  Transport & Energy  '), 'transport-energy')
    assert.equal(slugify('Café Naïve'), 'cafe-naive')
  })

  it('normalises titles for duplicate detection', () => {
    assert.equal(normalizeTitle('The Cell, Membrane!'), 'the cell membrane')
    assert.equal(titleKey('The Cell Membrane'), 'cell membrane')
    assert.equal(titleKey('A cell membrane'), 'cell membrane')
    assert.equal(titleKey('Cell membrane'), 'cell membrane')
  })

  it('creates deterministic concept ids', () => {
    assert.equal(createConceptId('Cell Membrane'), 'cell-membrane')
    assert.equal(createConceptId('Cell Membrane', 2), 'cell-membrane-2')
    assert.equal(
      createConceptId('Cell Membrane'),
      createConceptId('Cell Membrane'),
    )
  })

  it('rejects ids that break the grammar', () => {
    assert.equal(isValidConceptId('cell-membrane'), true)
    assert.equal(isValidConceptId('Cell Membrane'), false)
    assert.equal(isValidConceptId('-cell'), false)
    assert.equal(isValidConceptId(''), false)
    assert.equal(isValidConceptId('cell membrane'), false)
    assert.equal(isValidConceptId('a'.repeat(65)), false)
  })

  it('creates deterministic relationship ids', () => {
    const id = createRelationshipId('CAUSES', 'diffusion', 'osmosis')

    assert.equal(isValidRelationshipId(id), true)
    assert.equal(id, createRelationshipId('CAUSES', 'diffusion', 'osmosis'))
    assert.notEqual(
      id,
      createRelationshipId('CAUSES', 'diffusion', 'active-transport'),
    )
  })
})

describe('document fingerprint', () => {
  it('uses a known SHA-256 digest', async () => {
    assert.equal(
      await hashText('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('is content based and not affected by file metadata', async () => {
    const document = createTestDocument()
    const pages = document.pages.slice(0, 2)
    const first = {
      ...document,
      fileName: 'first.pdf',
      fileSize: 100,
      pages,
    }
    const second = {
      ...document,
      fileName: 'second.pdf',
      fileSize: 999,
      pages: [
        pages[0],
        {
          ...pages[1],
          pageNumber: 3,
          blocks: pages[1].blocks.slice(0, 1),
        },
        {
          ...pages[1],
          pageNumber: 4,
          blocks: pages[1].blocks.slice(1),
        },
      ],
    }
    const firstFingerprint =
      await computeExtractedDocumentFingerprint(first)
    const secondFingerprint =
      await computeExtractedDocumentFingerprint(second)

    assert.equal(firstFingerprint.digest, secondFingerprint.digest)
    assert.equal(firstFingerprint.algorithm, 'SHA-256')
    assert.equal(firstFingerprint.digest.length, 64)
  })

  it('changes when extracted content changes despite identical metadata', async () => {
    const document = createTestDocument()
    const first = await computeExtractedDocumentFingerprint(document)
    const second = await computeExtractedDocumentFingerprint({
      ...document,
      pages: document.pages.map((page, pageIndex) =>
        pageIndex === 0
          ? {
              ...page,
              blocks: page.blocks.map((block, blockIndex) =>
                blockIndex === 1
                  ? { ...block, text: `${block.text} Changed.` }
                  : block,
              ),
            }
          : page,
      ),
    })

    assert.notEqual(first.digest, second.digest)
  })

  it('derives stable document and unique run identifiers', async () => {
    const fingerprint = await computeDocumentFingerprint({
      content: 'content',
    })
    const documentId = createDocumentId(fingerprint)
    const firstRunId = createExtractionRunId(
      fingerprint,
      '2026-11-17T10:00:00.000Z',
      'run-a',
    )
    const secondRunId = createExtractionRunId(
      fingerprint,
      '2026-11-17T10:00:00.000Z',
      'run-b',
    )

    assert.equal(documentId, createDocumentId(fingerprint))
    assert.match(documentId, /^doc-[0-9a-f]{32}$/)
    assert.match(firstRunId, /^run-[0-9a-f]{16}-/)
    assert.notEqual(firstRunId, secondRunId)
  })
})
