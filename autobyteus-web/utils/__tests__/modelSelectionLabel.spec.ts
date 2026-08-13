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

  it('uses trimmed friendly labels for live Qwen rows while retaining their identifiers as input', () => {
    const models = [
      {
        modelIdentifier: 'qwen:deepseek-v4-pro',
        name: '  DeepSeek V4 Pro (Qwen)  ',
        providerType: 'QWEN',
      },
      {
        modelIdentifier: 'qwen:deepseek-v4-flash-0731',
        name: 'DeepSeek V4 Flash 0731 (Qwen)',
        providerType: 'QWEN',
      },
      {
        modelIdentifier: 'qwen:glm-5.2',
        name: 'GLM-5.2 (Qwen)',
        providerType: 'QWEN',
      },
    ]

    expect(models.map(model => getModelSelectionOptionLabel(model, 'autobyteus'))).toEqual([
      'DeepSeek V4 Pro (Qwen)',
      'DeepSeek V4 Flash 0731 (Qwen)',
      'GLM-5.2 (Qwen)',
    ])
    expect(getModelSelectionSelectedLabel('Qwen', models[0]!, 'autobyteus'))
      .toBe('Qwen / DeepSeek V4 Pro (Qwen)')
    expect(models.map(model => model.modelIdentifier)).toEqual([
      'qwen:deepseek-v4-pro',
      'qwen:deepseek-v4-flash-0731',
      'qwen:glm-5.2',
    ])
  })

  it('falls back to the exact Qwen identifier when a live row has no nonblank name', () => {
    const model = {
      modelIdentifier: 'qwen:deepseek-v4-pro',
      name: '   ',
      providerType: 'QWEN',
    }

    expect(getModelSelectionOptionLabel(model, 'autobyteus')).toBe('qwen:deepseek-v4-pro')
  })
})
