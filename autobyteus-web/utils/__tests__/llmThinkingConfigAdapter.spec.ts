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
