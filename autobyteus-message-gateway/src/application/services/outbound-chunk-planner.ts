import type {
  ExternalOutboundChunk,
  ExternalOutboundEnvelope,
} from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";

export class OutboundChunkPlanner {
  planChunks(payload: ExternalOutboundEnvelope): ExternalOutboundChunk[] {
    if (payload.chunks.length > 0) {
      return payload.chunks;
    }

    if (payload.replyText.trim().length === 0) {
      throw new Error("INVALID_OUTBOUND_TEXT");
    }

    const maxLength = this.resolveChunkLimit(payload);
    const rawChunks = splitText(payload.replyText, maxLength);
    return rawChunks.map((text, index) => ({
      index,
      text,
    }));
  }

  private resolveChunkLimit(payload: ExternalOutboundEnvelope): number {
    if (
      payload.provider === ExternalChannelProvider.WHATSAPP &&
      payload.transport === ExternalChannelTransport.PERSONAL_SESSION
    ) {
      return 3500;
    }
    if (
      payload.provider === ExternalChannelProvider.WHATSAPP &&
      payload.transport === ExternalChannelTransport.BUSINESS_API
    ) {
      return 3500;
    }
    if (
      payload.provider === ExternalChannelProvider.WECHAT &&
      payload.transport === ExternalChannelTransport.PERSONAL_SESSION
    ) {
      return 1200;
    }
    if (
      payload.provider === ExternalChannelProvider.DISCORD &&
      payload.transport === ExternalChannelTransport.BUSINESS_API
    ) {
      return 2000;
    }
    return 1000;
  }
}

const splitText = (input: string, maxLength: number): string[] => {
  if (input.length <= maxLength) {
    return [input];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < input.length) {
    let end = Math.min(start + maxLength, input.length);
    if (end < input.length) {
      const breakAt = input.lastIndexOf(" ", end);
      if (breakAt > start) {
        end = breakAt;
      }
    }

    const text = input.slice(start, end).trim();
    if (text.length > 0) {
      chunks.push(text);
    }
    start = end;
    while (start < input.length && input[start] === " ") {
      start += 1;
    }
  }

  if (chunks.length === 0) {
    return [input];
  }
  return chunks;
};
