import type { ExternalChannelProvider } from './provider.js';
import type { ExternalChannelTransport } from './channel-transport.js';

export type ChannelRoutingKey = string;

export type ChannelRoutingKeyInput = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId?: string | null;
};

export function createChannelRoutingKey(input: ChannelRoutingKeyInput): ChannelRoutingKey {
  const normalizedThreadId = normalizeThreadId(input.threadId);
  return `${input.provider}:${input.transport}:${input.accountId}:${input.peerId}:${normalizedThreadId}`;
}

function normalizeThreadId(threadId: string | null | undefined): string {
  if (threadId === null || threadId === undefined || threadId.trim().length === 0) {
    return 'direct';
  }
  return threadId.trim();
}

