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
    // Claude: effort is written with thinking off too (it applies either way).
    expect(getDefaultThinkingConfig({
      thinking_enabled: { type: 'boolean', default: false },
      thinking_display: { type: 'string', enum: ['omitted', 'summarized'], default: 'summarized' },
      reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' },
    })).toEqual({ thinking_enabled: false, thinking_display: 'summarized', reasoning_effort: 'high' })
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
  const anthropicSwitchSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    thinking_display: { type: 'string', enum: ['omitted', 'summarized'], default: 'summarized' },
    reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' },
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
    const { getThinkingDependentParamKeys, getIndependentThinkingParamKeys, hasThinkingSwitch } = await import('../llmThinkingConfigAdapter');
    // Claude effort applies with thinking on and off: independent, never dependent (AC-005).
    expect(getThinkingDependentParamKeys(claudeSdkSchema)).toEqual([]);
    expect(getIndependentThinkingParamKeys(claudeSdkSchema)).toEqual(['reasoning_effort']);
    expect(getThinkingDependentParamKeys(anthropicSwitchSchema)).toEqual(['thinking_display']);
    expect(getIndependentThinkingParamKeys(anthropicSwitchSchema)).toEqual(['reasoning_effort']);
    expect(getThinkingDependentParamKeys(anthropicAdaptiveSchema)).toEqual(['thinking_display']);
    expect([deepSeekV4Schema, glmSchema, openAiSchema, geminiSchema, null].map(getIndependentThinkingParamKeys))
      .toEqual([[], [], [], [], []]);
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
    expect(applyThinkingParamChoice(anthropicAdaptiveSchema, { thinking_enabled: false }, 'thinking_display', 'omitted'))
      .toEqual({ thinking_enabled: true, thinking_display: 'omitted' });
    expect(applyThinkingParamChoice(deepSeekV4Schema, { thinking_type: 'disabled' }, 'reasoning_effort', 'max'))
      .toEqual({ thinking_type: 'enabled', reasoning_effort: 'max' });
    // Non-dependent keys are written as is.
    expect(applyThinkingParamChoice(openAiSchema, null, 'reasoning_effort', 'high')).toEqual({ reasoning_effort: 'high' });
    expect(applyThinkingParamChoice(geminiSchema, null, 'thinking_level', 'low')).toEqual({ thinking_level: 'low' });
    expect(applyThinkingParamChoice(glmSchema, null, 'reasoning_effort', 'max')).toEqual({ reasoning_effort: 'max' });
  });

  it('auto-enables form edits of a dependent value only while thinking is off', async () => {
    const { applyThinkingDependentEdit } = await import('../llmThinkingConfigAdapter');
    expect(applyThinkingDependentEdit(anthropicAdaptiveSchema, null, { thinking_display: 'omitted' }))
      .toEqual({ thinking_enabled: true, thinking_display: 'omitted' });
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

describe('Claude effort and the thinking switch (claude-anthropic-effort-control REQ-004, REQ-005, AC-005)', () => {
  const claudeSdkSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
  };
  const anthropicSwitchSchema = {
    thinking_enabled: { type: 'boolean', default: false },
    thinking_display: { type: 'string', enum: ['omitted', 'summarized'], default: 'summarized' },
    reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' },
  };

  it('keeps thinking off when low, medium or high is chosen, and turns it on for xhigh or max', async () => {
    const { applyThinkingParamChoice } = await import('../llmThinkingConfigAdapter');
    for (const schema of [claudeSdkSchema, anthropicSwitchSchema]) {
      for (const effort of ['low', 'medium', 'high']) {
        expect(applyThinkingParamChoice(schema, { thinking_enabled: false }, 'reasoning_effort', effort))
          .toEqual({ thinking_enabled: false, reasoning_effort: effort });
        expect(applyThinkingParamChoice(schema, null, 'reasoning_effort', effort)).toEqual({ reasoning_effort: effort });
      }
      for (const effort of ['xhigh', 'max']) {
        expect(applyThinkingParamChoice(schema, { thinking_enabled: false }, 'reasoning_effort', effort))
          .toEqual({ thinking_enabled: true, reasoning_effort: effort });
        expect(applyThinkingParamChoice(schema, null, 'reasoning_effort', effort))
          .toEqual({ thinking_enabled: true, reasoning_effort: effort });
      }
    }
    // With thinking on, any level keeps thinking on.
    expect(applyThinkingParamChoice(claudeSdkSchema, { thinking_enabled: true, reasoning_effort: 'max' }, 'reasoning_effort', 'low'))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'low' });
  });

  it('turning thinking off with xhigh or max sets high, and keeps low/medium/high (and on/off) otherwise', () => {
    for (const effort of ['xhigh', 'max']) {
      expect(applyThinkingToggle(anthropicSwitchSchema, false, { thinking_enabled: true, reasoning_effort: effort }))
        .toEqual({ thinking_enabled: false, reasoning_effort: 'high' });
    }
    for (const effort of ['low', 'medium', 'high']) {
      expect(applyThinkingToggle(anthropicSwitchSchema, false, { thinking_enabled: true, reasoning_effort: effort }))
        .toEqual({ thinking_enabled: false, reasoning_effort: effort });
      expect(applyThinkingToggle(anthropicSwitchSchema, true, { thinking_enabled: false, reasoning_effort: effort }))
        .toEqual({ thinking_enabled: true, reasoning_effort: effort });
    }
    // Unset effort: the schema default (high/medium) needs no fallback, so nothing is written.
    expect(applyThinkingToggle(claudeSdkSchema, false, { thinking_enabled: true })).toEqual({ thinking_enabled: false });
  });

  it('applies the same rule to form edits', async () => {
    const { applyThinkingDependentEdit } = await import('../llmThinkingConfigAdapter');
    expect(applyThinkingDependentEdit(anthropicSwitchSchema, { thinking_enabled: false }, { thinking_enabled: false, reasoning_effort: 'low' }))
      .toEqual({ thinking_enabled: false, reasoning_effort: 'low' });
    expect(applyThinkingDependentEdit(anthropicSwitchSchema, { thinking_enabled: false }, { thinking_enabled: false, reasoning_effort: 'max' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'max' });
    expect(applyThinkingDependentEdit(claudeSdkSchema, null, { reasoning_effort: 'xhigh' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'xhigh' });
    expect(applyThinkingDependentEdit(claudeSdkSchema, { thinking_enabled: true }, { thinking_enabled: true, reasoning_effort: 'max' }))
      .toEqual({ thinking_enabled: true, reasoning_effort: 'max' });
  });
});
