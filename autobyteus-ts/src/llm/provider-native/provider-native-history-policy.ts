import type { ToolCallSpec } from '../utils/messages.js';
import type { ProviderNativeAssistantTurn } from './provider-native-assistant-turn.js';

/**
 * What one provider's native assistant turn means for history handling. Implemented by
 * each provider that returns native turns, next to its adapter in `llm/api/`.
 */
export interface ProviderNativeHistoryPolicy {
  /** The `provider` tag of the turns this policy owns. */
  readonly provider: string;
  /** Validates a stored or returned value and returns the normalized turn; throws when invalid. */
  parseTurn(value: unknown): ProviderNativeAssistantTurn;
  /** Throws when the turn's tool calls differ from the executable tool calls. */
  assertTurnMatchesToolCalls(turn: ProviderNativeAssistantTurn, calls: readonly ToolCallSpec[]): void;
  /** Whether the turn holds reasoning the provider binds to the request prefix it was produced under. */
  hasPrefixBoundReasoning(turn: ProviderNativeAssistantTurn): boolean;
  /** The turn without its prefix-bound reasoning. */
  withoutPrefixBoundReasoning(turn: ProviderNativeAssistantTurn): ProviderNativeAssistantTurn;
}
