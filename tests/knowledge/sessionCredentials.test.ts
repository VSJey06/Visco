import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createSessionCredentialStore } from '../../src/lib/sessionCredentials.ts'

describe('session credential store', () => {
  it('keeps a key in memory and supports explicit clearing', () => {
    const store = createSessionCredentialStore()

    assert.equal(store.storage, 'session-memory')
    assert.equal(store.has('provider'), false)
    assert.equal(store.use('provider', (apiKey) => apiKey), null)

    store.set('provider', 'secret-api-key')

    assert.equal(store.has('provider'), true)
    assert.equal(
      store.use('provider', (apiKey) => apiKey),
      'secret-api-key',
    )

    store.clear('provider')

    assert.equal(store.has('provider'), false)
    assert.equal(store.use('provider', (apiKey) => apiKey), null)
  })

  it('does not serialize the stored key', () => {
    const store = createSessionCredentialStore()

    store.set('provider', 'secret-api-key')

    assert.equal(JSON.stringify(store).includes('secret-api-key'), false)
    assert.deepEqual(JSON.parse(JSON.stringify(store)), {
      storage: 'session-memory',
    })
  })

  it('clears every key when no provider is named', () => {
    const store = createSessionCredentialStore()

    store.set('one', 'secret-one')
    store.set('two', 'secret-two')
    store.clear()

    assert.equal(store.has('one'), false)
    assert.equal(store.has('two'), false)
  })
})
