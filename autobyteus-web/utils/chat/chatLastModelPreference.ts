/**
 * The one runtime + model remembered on this device for New chat (REQ-019, DEC-011).
 */
export interface ChatLastModel {
  runtimeKind: string
  llmModelIdentifier: string
}

export const CHAT_LAST_MODEL_STORAGE_KEY = 'autobyteus.chat.lastModel'

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const readChatLastModel = (): ChatLastModel | null => {
  const raw = storage()?.getItem(CHAT_LAST_MODEL_STORAGE_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<ChatLastModel>
    return typeof value.runtimeKind === 'string' && value.runtimeKind
      && typeof value.llmModelIdentifier === 'string' && value.llmModelIdentifier
      ? { runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier }
      : null
  } catch {
    return null
  }
}

export const writeChatLastModel = (value: ChatLastModel): void => {
  try {
    storage()?.setItem(CHAT_LAST_MODEL_STORAGE_KEY, JSON.stringify({
      runtimeKind: value.runtimeKind,
      llmModelIdentifier: value.llmModelIdentifier,
    }))
  } catch {
    // Storage may be unavailable (private mode); the default chain still applies.
  }
}
