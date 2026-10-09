import { Message, type MessageMetadata, type ToolCallSpec } from '../utils/messages.js';
import { anthropicNativeHistoryPolicy } from '../api/anthropic-native-history-policy.js';
import { PROVIDER_NATIVE_ASSISTANT_TURN_KEY, type ProviderNativeAssistantTurn } from './provider-native-assistant-turn.js';
import type { ProviderNativeHistoryPolicy } from './provider-native-history-policy.js';

/**
 * Provider-neutral entry point for memory and compaction code that handles stored
 * provider-native assistant turns. Each operation resolves the owning provider's policy
 * by the turn's `provider` tag and delegates; no provider rule lives here.
 */
const POLICIES: ReadonlyMap<string, ProviderNativeHistoryPolicy> = new Map(
  [anthropicNativeHistoryPolicy].map((policy) => [policy.provider, policy]),
);

const policyFor = (value: unknown): ProviderNativeHistoryPolicy => {
  const provider = value !== null && typeof value === 'object' && typeof (value as { provider?: unknown }).provider === 'string'
    ? (value as { provider: string }).provider
    : null;
  const policy = provider === null ? undefined : POLICIES.get(provider);
  if (!policy) {
    throw new Error(`Unsupported provider-native assistant turn (provider '${provider ?? 'missing'}').`);
  }
  return policy;
};

/** The validated native turn stored on `message`, or null when it has none. */
export const readProviderNativeTurn = (message: Message): ProviderNativeAssistantTurn | null => {
  const raw = message.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY];
  return raw === undefined ? null : policyFor(raw).parseTurn(raw);
};

/** Validates a returned native turn against the executable tool calls and returns the metadata to store. */
export const nativeTurnMetadata = (turn: unknown, calls: readonly ToolCallSpec[]): MessageMetadata => {
  const policy = policyFor(turn);
  const parsed = policy.parseTurn(turn);
  policy.assertTurnMatchesToolCalls(parsed, calls);
  return { [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: parsed };
};

export const messageHasPrefixBoundReasoning = (message: Message): boolean => {
  const turn = readProviderNativeTurn(message);
  return turn !== null && policyFor(turn).hasPrefixBoundReasoning(turn);
};

/** `message` with prefix-bound reasoning removed from its native turn (unchanged when it has none). */
export const messageWithoutPrefixBoundReasoning = (message: Message): Message => {
  const turn = readProviderNativeTurn(message);
  if (turn === null) return message;
  return new Message(message.role, {
    content: message.content,
    reasoning_content: message.reasoning_content,
    image_urls: message.image_urls,
    audio_urls: message.audio_urls,
    video_urls: message.video_urls,
    tool_payload: message.tool_payload,
    metadata: { ...message.metadata, [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: policyFor(turn).withoutPrefixBoundReasoning(turn) },
  });
};
