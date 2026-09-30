import { describe, expect, it } from 'vitest';
import {
  applyThinkingToggle,
  detectThinkingProvider,
  getThinkingControlState,
  getThinkingParamKeys,
  getThinkingToggleOwnedParamKeys,
} from '~/utils/llmThinkingConfigAdapter';

const codexEffortOnlySchema = {
  reasoning_effort: {
    type: 'string',
    enum: ['low', 'medium', 'high', 'xhigh'],
    default: 'medium',
  },
};

const deepSeekSchema = {
  reasoning_effort: {
    type: 'string',
    enum: ['high', 'max'],
    default: 'high',
  },
  thinking_type: {
    type: 'string',
    enum: ['enabled', 'disabled'],
    default: 'enabled',
  },
};

describe('llmThinkingConfigAdapter', () => {
  it('shows Codex effort-only reasoning defaults as enabled but non-disable-capable', () => {
    expect(detectThinkingProvider(codexEffortOnlySchema)).toBe('openai');
    expect(getThinkingControlState(codexEffortOnlySchema, null).enabled).toBe(true);
    expect(getThinkingControlState(codexEffortOnlySchema, null)).toMatchObject({
      supported: true,
      enabled: true,
      canEnable: true,
      canDisable: false,
      toggleOwnedKeys: [],
    });
    expect(applyThinkingToggle(codexEffortOnlySchema, false, null)).toBeNull();
    expect(applyThinkingToggle(codexEffortOnlySchema, false, { reasoning_effort: 'high' })).toEqual({
      reasoning_effort: 'high',
    });
  });

  it('shows AutoByteus OpenAI Responses none defaults as disabled and emits only advertised values', () => {
    const openAiResponsesSchema = {
      reasoning_effort: {
        type: 'string',
        enum: ['none', 'low', 'medium', 'high', 'xhigh'],
        default: 'none',
      },
      reasoning_summary: {
        type: 'string',
        enum: ['none', 'auto', 'concise', 'detailed'],
        default: 'none',
      },
    };

    expect(detectThinkingProvider(openAiResponsesSchema)).toBe('openai');
    expect(getThinkingControlState(openAiResponsesSchema, null)).toMatchObject({
      supported: true,
      enabled: false,
      canEnable: true,
      canDisable: true,
    });
    expect(applyThinkingToggle(openAiResponsesSchema, true, null)).toEqual({
      reasoning_summary: 'auto',
    });
    expect(applyThinkingToggle(openAiResponsesSchema, false, { reasoning_effort: 'high' })).toEqual({
      reasoning_effort: 'none',
      reasoning_summary: 'none',
    });
  });

  it('uses thinking_enabled as the gate before generic reasoning_effort', () => {
    const claudeAgentSdkSchema = {
      thinking_enabled: {
        type: 'boolean',
        default: false,
      },
      reasoning_effort: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    };

    expect(detectThinkingProvider(claudeAgentSdkSchema)).toBe('claude');
    expect(getThinkingParamKeys(claudeAgentSdkSchema)).toEqual(['thinking_enabled', 'reasoning_effort']);
    expect(getThinkingToggleOwnedParamKeys(claudeAgentSdkSchema)).toEqual(['thinking_enabled']);
    expect(getThinkingControlState(claudeAgentSdkSchema, null)).toMatchObject({
      supported: true,
      enabled: false,
      canEnable: true,
      canDisable: true,
    });
  });

  it('uses DeepSeek thinking_type semantics and schema default effort', () => {
    expect(detectThinkingProvider(deepSeekSchema)).toBe('typed');
    expect(getThinkingControlState(deepSeekSchema, null)).toMatchObject({
      supported: true,
      enabled: true,
      canEnable: true,
      canDisable: true,
      toggleOwnedKeys: ['thinking_type'],
    });
    expect(getThinkingParamKeys(deepSeekSchema)).toEqual(['thinking_type', 'reasoning_effort']);
    expect(applyThinkingToggle(deepSeekSchema, true, {})).toEqual({
      thinking_type: 'enabled',
      reasoning_effort: 'high',
    });
    expect(applyThinkingToggle(deepSeekSchema, false, {
      thinking_type: 'enabled',
      reasoning_effort: 'max',
    })).toEqual({
      thinking_type: 'disabled',
    });
  });

  it('covers Gemini API/RPA and GLM effective defaults', () => {
    const geminiApiSchema = {
      thinking_level: { type: 'string', enum: ['minimal', 'low', 'medium', 'high'], default: 'minimal' },
      include_thoughts: { type: 'boolean', default: false },
    };
    const geminiRpaSchema = {
      thinking_level: { type: 'string', enum: ['minimal', 'low', 'medium', 'high'], default: 'medium' },
    };
    const glmSchema = {
      reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'max' },
      thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'enabled' },
    };

    expect(getThinkingControlState(geminiApiSchema, null).enabled).toBe(false);
    expect(getThinkingControlState(geminiRpaSchema, null).enabled).toBe(true);
    expect(applyThinkingToggle(geminiRpaSchema, false, null)).toEqual({
      thinking_level: 'minimal',
    });
    expect(getThinkingControlState(glmSchema, null).enabled).toBe(true);
    expect(getThinkingToggleOwnedParamKeys(glmSchema)).toEqual(['thinking_type']);
    expect(applyThinkingToggle(glmSchema, false, {
      thinking_type: 'enabled',
      reasoning_effort: 'max',
    })).toEqual({
      thinking_type: 'disabled',
    });
    expect(applyThinkingToggle(glmSchema, true, { thinking_type: 'disabled' })).toEqual({
      thinking_type: 'enabled',
      reasoning_effort: 'max',
    });
  });

  it('does not infer thinking support from schema-less or unrelated schemas', () => {
    expect(getThinkingControlState(null, null)).toMatchObject({
      supported: false,
      enabled: false,
    });
    expect(getThinkingControlState({
      service_tier: { type: 'string', enum: ['fast'] },
    }, null)).toMatchObject({
      supported: false,
      enabled: false,
    });
  });
});

describe('getDefaultThinkingConfig (D-18: default thinking written explicitly)', () => {
  it('writes each thinking key at its schema default, following the toggle rules', async () => {
    const { getDefaultThinkingConfig } = await import('../llmThinkingConfigAdapter')
    expect(getDefaultThinkingConfig({ reasoning_effort: { type: 'string', enum: ['low', 'medium'], default: 'medium' } }))
      .toEqual({ reasoning_effort: 'medium' })
    expect(getDefaultThinkingConfig({ thinking_enabled: { type: 'boolean', default: false }, thinking_budget_tokens: { type: 'integer', default: 1024 } }))
      .toEqual({ thinking_enabled: false })
    expect(getDefaultThinkingConfig({ thinking_enabled: { type: 'boolean', default: true }, thinking_budget_tokens: { type: 'integer', default: 1024 } }))
      .toEqual({ thinking_enabled: true, thinking_budget_tokens: 1024 })
    expect(getDefaultThinkingConfig({ thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'disabled' }, reasoning_effort: { type: 'string', enum: ['low', 'high'], default: 'high' } }))
      .toEqual({ thinking_type: 'disabled' })
    expect(getDefaultThinkingConfig({ temperature: { type: 'number', default: 1 } })).toEqual({})
  })
})

describe('thinking-dependent settings (chat-composer-polish REQ-001, REQ-008)', () => {
  const claudeSdkSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
  };
  const anthropicBudgetSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    thinking_budget_tokens: { type: 'integer', default: 1024, minimum: 1024 },
  };
  const anthropicAdaptiveSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    thinking_display: { type: 'string', enum: ['summarized', 'omitted'], default: 'summarized' },
  };
  const deepSeekV4Schema = {
    thinking_type: { type: 'string', enum: ['enabled', 'disabled'], default: 'enabled' },
    reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'high' },
  };
  const glmSchema = {
    thinking_type: { type: 'string', enum: ['enabled'], default: 'enabled' },
    reasoning_effort: { type: 'string', enum: ['high', 'max'], default: 'high' },
  };
  const openAiSchema = {
    reasoning_effort: { type: 'string', enum: ['none', 'low', 'medium', 'high'], default: 'none' },
    reasoning_summary: { type: 'string', enum: ['none', 'auto'], default: 'none' },
  };
  const geminiSchema = {
    thinking_level: { type: 'string', enum: ['minimal', 'low', 'medium'], default: 'minimal' },
    include_thoughts: { type: 'boolean', default: false },
  };

  it('lists dependent keys only for schemas whose switch can both enable and disable', async () => {
    const { getThinkingDependentParamKeys, hasThinkingSwitch } = await import('../llmThinkingConfigAdapter');
    expect(getThinkingDependentParamKeys(claudeSdkSchema)).toEqual(['reasoning_effort']);
    expect(getThinkingDependentParamKeys(anthropicBudgetSchema)).toEqual(['thinking_budget_tokens']);
    expect(getThinkingDependentParamKeys(anthropicAdaptiveSchema)).toEqual(['thinking_display']);
    expect(getThinkingDependentParamKeys(deepSeekV4Schema)).toEqual(['reasoning_effort']);
    expect(getThinkingDependentParamKeys(glmSchema)).toEqual([]);
    expect(getThinkingDependentParamKeys(openAiSchema)).toEqual([]);
    expect(getThinkingDependentParamKeys(geminiSchema)).toEqual([]);
    expect(getThinkingDependentParamKeys(null)).toEqual([]);
    expect([claudeSdkSchema, deepSeekV4Schema, glmSchema, openAiSchema, geminiSchema].map(hasThinkingSwitch))
      .toEqual([true, true, false, false, false]);
  });

  it('turns thinking on when a dependent value is chosen, keeping the chosen value', async () => {
    const { applyThinkingParamChoice } = await import('../llmThinkingConfigAdapter');
    expect(applyThinkingParamChoice(claudeSdkSchema, null, 'reasoning_effort', 'high'))
      .toEqual({ reasoning_effort: 'high', thinking_enabled: true });
    // Re-choosing the stored effort while off still turns thinking on.
    expect(applyThinkingParamChoice(claudeSdkSchema, { thinking_enabled: false, reasoning_effort: 'medium' }, 'reasoning_effort', 'medium'))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'medium' });
    expect(applyThinkingParamChoice(anthropicBudgetSchema, { thinking_enabled: false }, 'thinking_budget_tokens', 4096))
      .toEqual({ thinking_enabled: true, thinking_budget_tokens: 4096 });
    expect(applyThinkingParamChoice(deepSeekV4Schema, { thinking_type: 'disabled' }, 'reasoning_effort', 'max'))
      .toEqual({ thinking_type: 'enabled', reasoning_effort: 'max' });
    // Non-dependent keys are written as is.
    expect(applyThinkingParamChoice(openAiSchema, null, 'reasoning_effort', 'high')).toEqual({ reasoning_effort: 'high' });
    expect(applyThinkingParamChoice(geminiSchema, null, 'thinking_level', 'low')).toEqual({ thinking_level: 'low' });
    expect(applyThinkingParamChoice(glmSchema, null, 'reasoning_effort', 'max')).toEqual({ reasoning_effort: 'max' });
  });

  it('auto-enables form edits of a dependent value only while thinking is off', async () => {
    const { applyThinkingDependentEdit } = await import('../llmThinkingConfigAdapter');
    expect(applyThinkingDependentEdit(claudeSdkSchema, { thinking_enabled: false }, { thinking_enabled: false, reasoning_effort: 'high' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'high' });
    expect(applyThinkingDependentEdit(claudeSdkSchema, null, { reasoning_effort: 'low' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'low' });
    expect(applyThinkingDependentEdit(anthropicBudgetSchema, null, { thinking_budget_tokens: 4096 }))
      .toEqual({ thinking_enabled: true, thinking_budget_tokens: 4096 });
    expect(applyThinkingDependentEdit(deepSeekV4Schema, { thinking_type: 'disabled' }, { thinking_type: 'disabled', reasoning_effort: 'max' }))
      .toEqual({ thinking_type: 'enabled', reasoning_effort: 'max' });
    // Already on: unchanged.
    expect(applyThinkingDependentEdit(claudeSdkSchema, { thinking_enabled: true }, { thinking_enabled: true, reasoning_effort: 'max' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'max' });
    // Clearing a dependent value or editing an unrelated key while off: unchanged.
    expect(applyThinkingDependentEdit(claudeSdkSchema, { reasoning_effort: 'high' }, null)).toBeNull();
    expect(applyThinkingDependentEdit(
      { ...claudeSdkSchema, temperature: { type: 'number', default: 1 } },
      { thinking_enabled: false, reasoning_effort: 'high' },
      { thinking_enabled: false, reasoning_effort: 'high', temperature: 0.5 },
    )).toEqual({ thinking_enabled: false, reasoning_effort: 'high', temperature: 0.5 });
    // Families without a switch: pass-through.
    expect(applyThinkingDependentEdit(openAiSchema, null, { reasoning_effort: 'high' })).toEqual({ reasoning_effort: 'high' });
    expect(applyThinkingDependentEdit(geminiSchema, null, { thinking_level: 'low' })).toEqual({ thinking_level: 'low' });
    expect(applyThinkingDependentEdit(glmSchema, null, { reasoning_effort: 'max' })).toEqual({ reasoning_effort: 'max' });
  });
});
