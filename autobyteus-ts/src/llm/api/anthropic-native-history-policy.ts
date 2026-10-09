import type { ProviderNativeAssistantTurn } from '../provider-native/provider-native-assistant-turn.js';
import type { ProviderNativeHistoryPolicy } from '../provider-native/provider-native-history-policy.js';
import {
  assertAnthropicTurnMatchesToolCalls,
  isAnthropicThinkingBlock,
  parseAnthropicAssistantTurn,
  withoutThinkingBlocks,
} from './anthropic-native-assistant-turn.js';

/** Anthropic: `thinking` and `redacted_thinking` blocks are bound to the request prefix. */
export const anthropicNativeHistoryPolicy: ProviderNativeHistoryPolicy = {
  provider: 'anthropic',
  parseTurn: (value: unknown): ProviderNativeAssistantTurn => parseAnthropicAssistantTurn(value),
  assertTurnMatchesToolCalls: (turn, calls) => assertAnthropicTurnMatchesToolCalls(parseAnthropicAssistantTurn(turn), calls),
  hasPrefixBoundReasoning: (turn) => parseAnthropicAssistantTurn(turn).blocks.some(isAnthropicThinkingBlock),
  withoutPrefixBoundReasoning: (turn) => withoutThinkingBlocks(parseAnthropicAssistantTurn(turn)),
};
