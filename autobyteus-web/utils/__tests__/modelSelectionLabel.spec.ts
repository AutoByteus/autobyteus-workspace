import { describe, expect, it } from 'vitest'
import {
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
  shouldUseModelIdentifierLabel,
} from '../modelSelectionLabel'

describe('modelSelectionLabel', () => {
  it('keeps AutoByteus built-in labels on model identifiers', () => {
    const model = {
      modelIdentifier: 'openai/gpt-oss-20b',
      name: 'GPT OSS 20B',
      providerType: 'LMSTUDIO',
    }

    expect(shouldUseModelIdentifierLabel('autobyteus')).toBe(true)
    expect(getModelSelectionOptionLabel(model, 'autobyteus')).toBe('openai/gpt-oss-20b')
    expect(getModelSelectionSelectedLabel('LM Studio', model, 'autobyteus')).toBe('LM Studio / openai/gpt-oss-20b')
  })

  it('uses friendly labels for custom OpenAI-compatible providers even on AutoByteus runtime', () => {
    const model = {
      modelIdentifier: 'openai-compatible:provider_gateway:model-a',
      name: 'Model A',
      providerType: 'OPENAI_COMPATIBLE',
    }

    expect(getModelSelectionOptionLabel(model, 'autobyteus')).toBe('Model A')
    expect(getModelSelectionSelectedLabel('Internal Gateway', model, 'autobyteus')).toBe('Internal Gateway / Model A')
  })
})
