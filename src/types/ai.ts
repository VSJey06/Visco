export type AiMessageRole = 'system' | 'user'

export type AiMessage = {
  role: AiMessageRole
  content: string
}

export type AiRequest = {
  system: string
  user: string
  jsonSchema: object | null
  maxOutputTokens: number
  temperature: number
  signal?: AbortSignal
}

export type AiUsage = {
  inputTokens: number
  outputTokens: number
}

export type AiFinishReason =
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'error'
  | 'cancelled'

export type AiResponse = {
  text: string
  model: string
  usage: AiUsage
  finishReason: AiFinishReason
}

export interface AiProvider {
  readonly id: string
  readonly label: string
  readonly requiresApiKey: boolean
  complete(request: AiRequest): Promise<AiResponse>
}

export type CredentialStorage = 'session-memory'

export interface AiCredentialStore {
  readonly storage: CredentialStorage
  set(providerId: string, apiKey: string): void
  use<T>(providerId: string, consumer: (apiKey: string) => T): T | null
  has(providerId: string): boolean
  clear(providerId?: string): void
}
