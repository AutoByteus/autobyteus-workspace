import { describe, expect, it } from 'vitest';
import {
  applyThinkingToggle,
  detectThinkingProvider,
  getThinkingParamKeys,
  getThinkingToggleOwnedParamKeys,
  getThinkingToggleState,
} from '~/utils/llmThinkingConfigAdapter';

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
  it('keeps OpenAI reasoning classified separately from DeepSeek', () => {
    const openAiSchema = {
      reasoning_effort: {
        type: 'string',
        enum: ['none', 'low', 'medium', 'high', 'xhigh'],
        default: 'none',
      },
      reasoning_summary: {
        type: 'string',
        enum: ['auto', 'concise', 'detailed', 'none'],
        default: 'auto',
      },
    };

    expect(detectThinkingProvider(openAiSchema)).toBe('openai');
    expect(getThinkingParamKeys(openAiSchema)).toEqual(['reasoning_effort', 'reasoning_summary']);
    expect(getThinkingToggleOwnedParamKeys(openAiSchema)).toEqual([]);
    expect(applyThinkingToggle(openAiSchema, false, { reasoning_effort: 'high' })).toEqual({
      reasoning_effort: 'none',
      reasoning_summary: 'none',
    });
  });

  it('detects DeepSeek before OpenAI when thinking_type and reasoning_effort are both present', () => {
    expect(detectThinkingProvider(deepSeekSchema)).toBe('deepseek');
    expect(getThinkingParamKeys(deepSeekSchema)).toEqual(['thinking_type', 'reasoning_effort']);
    expect(getThinkingToggleOwnedParamKeys(deepSeekSchema)).toEqual(['thinking_type']);
  });

  it('keeps GLM classified by its existing thinking_type-only shape', () => {
    const glmSchema = {
      thinking_type: {
        type: 'string',
        enum: ['enabled', 'disabled'],
        default: 'enabled',
      },
    };

    expect(detectThinkingProvider(glmSchema)).toBe('glm');
    expect(getThinkingParamKeys(glmSchema)).toEqual(['thinking_type']);
    expect(getThinkingToggleOwnedParamKeys(glmSchema)).toEqual([]);
    expect(applyThinkingToggle(glmSchema, false, { thinking_type: 'enabled' })).toEqual({
      thinking_type: 'disabled',
    });
  });

  it('uses DeepSeek thinking_type semantics for toggle state', () => {
    expect(getThinkingToggleState(deepSeekSchema, null)).toBe(true);
    expect(getThinkingToggleState(deepSeekSchema, { thinking_type: 'enabled' })).toBe(true);
    expect(getThinkingToggleState(deepSeekSchema, { thinking_type: 'disabled' })).toBe(false);
  });

  it('enables DeepSeek with a valid default effort and disables without OpenAI-style none effort', () => {
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
});
