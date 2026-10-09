import { createHash } from 'node:crypto';
import type { Message } from '../llm/utils/messages.js';

export type LlmRequestPrefixInput = Readonly<{
  /** The working context's leading system run (see `leadingSystemMessages`). */
  leadingSystem: readonly Message[];
  /** The exact provider-formatted tool schemas sent with the request. */
  tools: ReadonlyArray<Record<string, unknown>>;
}>;

/**
 * Digest of the request prefix that prefix-bound provider reasoning is bound to: the
 * leading system run and the tool schemas. Plain `JSON.stringify` mirrors the provider
 * SDK's serialization, so any change to the sent bytes changes the digest.
 */
export const computeLlmRequestPrefixDigest = (input: LlmRequestPrefixInput): string =>
  createHash('sha256')
    .update(JSON.stringify({
      leadingSystem: input.leadingSystem.map((message) => message.content),
      tools: input.tools,
    }), 'utf8')
    .digest('hex');
