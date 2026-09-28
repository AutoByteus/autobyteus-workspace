import { beforeEach, describe, expect, it } from 'vitest'
import { CHAT_LAST_MODEL_STORAGE_KEY, readChatLastModel, writeChatLastModel } from '../chatLastModelPreference'
import { isAbsoluteFolderPath, truncateChatTitle } from '../chatDefaults'

describe('chatLastModelPreference', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips one runtime + model value', () => {
    expect(readChatLastModel()).toBeNull()
    writeChatLastModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5' })
    expect(readChatLastModel()).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5' })
  })

  it('ignores malformed stored values', () => {
    window.localStorage.setItem(CHAT_LAST_MODEL_STORAGE_KEY, '{"runtimeKind":1}')
    expect(readChatLastModel()).toBeNull()
    window.localStorage.setItem(CHAT_LAST_MODEL_STORAGE_KEY, 'not json')
    expect(readChatLastModel()).toBeNull()
  })
})

describe('chatDefaults', () => {
  it('truncates titles to 42 characters with an ellipsis', () => {
    expect(truncateChatTitle('Short title')).toBe('Short title')
    const long = 'Help me write a skill for weekly planning and review'
    expect(truncateChatTitle(long)).toHaveLength(42)
    expect(truncateChatTitle(long).endsWith('…')).toBe(true)
  })

  it('accepts only absolute folder paths', () => {
    expect(isAbsoluteFolderPath('/Users/me/project')).toBe(true)
    expect(isAbsoluteFolderPath('C:\\work')).toBe(true)
    expect(isAbsoluteFolderPath('relative/path')).toBe(false)
    expect(isAbsoluteFolderPath('~/project')).toBe(false)
  })
})
