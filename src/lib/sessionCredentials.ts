import type { AiCredentialStore } from '../types/ai.ts'

export function createSessionCredentialStore(): AiCredentialStore {
  const credentials = new Map<string, string>()

  return Object.freeze({
    storage: 'session-memory' as const,
    set(providerId: string, apiKey: string): void {
      if (!providerId.trim()) {
        throw new TypeError('A provider id is required.')
      }

      if (!apiKey) {
        throw new TypeError('An API key is required.')
      }

      credentials.set(providerId, apiKey)
    },
    use<T>(providerId: string, consumer: (apiKey: string) => T): T | null {
      const apiKey = credentials.get(providerId)

      if (apiKey === undefined) {
        return null
      }

      return consumer(apiKey)
    },
    has(providerId: string): boolean {
      return credentials.has(providerId)
    },
    clear(providerId?: string): void {
      if (providerId === undefined) {
        credentials.clear()
        return
      }

      credentials.delete(providerId)
    },
  })
}
