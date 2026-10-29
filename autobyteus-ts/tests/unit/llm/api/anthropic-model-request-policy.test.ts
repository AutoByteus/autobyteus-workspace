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

/** Every catalog row must have its request policy pinned here. */
const expectedCatalogPolicies: Record<string, AnthropicModelRequestPolicy> = {
  'claude-fable-5-1': adaptive('omit'),
  'claude-fable-5': adaptive('omit'),
  'claude-opus-5': adaptive('omit'),
  'claude-opus-5-5': { thinkingMode: 'adaptive_required', rejectsForcedToolChoice: true },
  'claude-sonnet-5-5': adaptive('between_tools', true),
  'claude-sonnet-5': adaptive('disabled'),
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

  it('fails for a model value outside the catalog', () => {
    expect(() => resolveAnthropicModelRequestPolicy('claude-sonnet-4-6'))
      .toThrow('Anthropic model claude-sonnet-4-6 is not in the AutoByteus Anthropic catalog.');
  });
});
