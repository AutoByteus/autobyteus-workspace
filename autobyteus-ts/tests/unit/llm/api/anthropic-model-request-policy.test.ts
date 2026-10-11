import { describe, expect, it } from 'vitest';
import {
  resolveAnthropicModelRequestPolicy,
  type AnthropicModelRequestPolicy,
  type AnthropicThinkingOffShape,
} from '../../../../src/llm/api/anthropic-model-request-policy.js';
import { anthropicSupportedModelDefinitions } from '../../../../src/llm/anthropic-supported-model-definitions.js';

const adaptive = (
  thinkingOffShape: AnthropicThinkingOffShape,
  rejectsForcedToolChoice = false,
): AnthropicModelRequestPolicy => ({ thinkingMode: 'adaptive', thinkingOffShape, rejectsForcedToolChoice });

const legacyBudget: AnthropicModelRequestPolicy = { thinkingMode: 'legacy_budget', rejectsForcedToolChoice: false };

/** Every catalog row must have its request policy pinned here. */
const expectedCatalogPolicies: Record<string, AnthropicModelRequestPolicy> = {
  'claude-fable-5-1': adaptive('omit'),
  'claude-fable-5': adaptive('omit'),
  'claude-opus-5': adaptive('omit'),
  'claude-opus-5-5': { thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true },
  'claude-opus-4-8': adaptive('omit'),
  'claude-opus-4-7': adaptive('omit'),
  'claude-sonnet-5-5': adaptive('between_tools', true),
  'claude-sonnet-5': adaptive('disabled'),
  'claude-sonnet-4-6': legacyBudget,
  'claude-haiku-5-5': adaptive('disabled'),
};

describe('resolveAnthropicModelRequestPolicy', () => {
  it('pins the request policy of every Anthropic catalog row', () => {
    expect(anthropicSupportedModelDefinitions.map(({ value }) => value).sort())
      .toEqual(Object.keys(expectedCatalogPolicies).sort());
    for (const { value } of anthropicSupportedModelDefinitions) {
      expect(resolveAnthropicModelRequestPolicy(value), value).toEqual(expectedCatalogPolicies[value]);
    }
  });
});
