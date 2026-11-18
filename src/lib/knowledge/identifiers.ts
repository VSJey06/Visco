import type { ExtractedDocument } from '../../types/document.ts'

const CONCEPT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const RELATIONSHIP_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,95}$/

const LEADING_ARTICLES = new Set(['a', 'an', 'the'])

export type DocumentFingerprint = {
  algorithm: 'SHA-256'
  digest: string
  contentLength: number
}

export type DocumentFingerprintInput = {
  content: string
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug
}

export function normalizeTitle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function titleKey(value: string): string {
  const words = normalizeTitle(value).split(' ').filter(Boolean)

  while (words.length > 0 && LEADING_ARTICLES.has(words[0])) {
    words.shift()
  }

  return words.join(' ')
}

export function isValidConceptId(value: string): boolean {
  return CONCEPT_ID_PATTERN.test(value)
}

export function isValidRelationshipId(value: string): boolean {
  return RELATIONSHIP_ID_PATTERN.test(value)
}

export function createConceptId(title: string, occurrence = 1): string {
  const slug = slugify(title)
  const base = slug || `concept-${fnv1a(title)}`
  const suffix = occurrence > 1 ? `-${occurrence}` : ''
  const limit = 64 - suffix.length
  const trimmed = base.slice(0, limit).replace(/-+$/, '')

  return `${trimmed || `concept-${fnv1a(title)}`}${suffix}`
}

export function createRelationshipId(
  kind: string,
  sourceId: string,
  targetId: string,
): string {
  const kindSlug = slugify(kind) || 'relation'
  const digest = fnv1a64(`${kind}|${sourceId}|${targetId}`)
  const base = `rel-${kindSlug}-${digest}`

  return base.slice(0, 96).replace(/-+$/, '')
}

export function fnv1a(value: string): string {
  return fnv1aWithSeed(value, 0x811c9dc5)
}

function fnv1aWithSeed(value: string, seed: number): string {
  let hash = seed >>> 0

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

function fnv1a64(value: string): string {
  const forward = fnv1aWithSeed(value, 0x811c9dc5)
  const reverse = fnv1aWithSeed(
    Array.from(value).reverse().join(''),
    0x9e3779b9,
  )

  return `${forward}${reverse}`
}

async function digestBytes(bytes: Uint8Array): Promise<string> {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const view = new Uint8Array(hash)

  return Array.from(view, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashText(value: string): Promise<string> {
  return digestBytes(new TextEncoder().encode(value))
}

export async function hashBytes(
  value: ArrayBuffer | Uint8Array,
): Promise<string> {
  const bytes =
    value instanceof Uint8Array
      ? value
      : new Uint8Array(value)

  return digestBytes(bytes)
}

export async function computeDocumentFingerprint(
  input: DocumentFingerprintInput,
): Promise<DocumentFingerprint> {
  const digest = await hashText(input.content)

  return {
    algorithm: 'SHA-256',
    digest,
    contentLength: input.content.length,
  }
}

export function canonicalizeExtractedDocument(
  document: ExtractedDocument,
): string {
  return document.pages
    .flatMap((page) => page.blocks.map((block) => block.text))
    .join('\n')
}

export async function computeExtractedDocumentFingerprint(
  document: ExtractedDocument,
): Promise<DocumentFingerprint> {
  return computeDocumentFingerprint({
    content: canonicalizeExtractedDocument(document),
  })
}

export function createDocumentId(fingerprint: DocumentFingerprint): string {
  return `doc-${fingerprint.digest.slice(0, 32)}`
}

export function createExtractionRunId(
  fingerprint: DocumentFingerprint,
  startedAt: string,
  nonce: string = globalThis.crypto.randomUUID(),
): string {
  const timestamp = startedAt.replace(/[^0-9A-Za-z-]/g, '-')
  const runNonce = nonce.replace(/[^0-9A-Za-z-]/g, '-')

  return `run-${fingerprint.digest.slice(0, 16)}-${timestamp}-${runNonce}`
}
