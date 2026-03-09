import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { AgentLiveMessagePublisher } from "../../../../src/services/agent-streaming/agent-live-message-publisher.js";

describe("AgentLiveMessagePublisher", () => {
  it("publishes a typed external user-turn message with supported attachment context files", () => {
    const publishToRun = vi.fn().mockReturnValue(1);
    const publisher = new AgentLiveMessagePublisher({
      broadcaster: {
        publishToRun,
      } as any,
    });

    const delivered = publisher.publishExternalUserMessage({
      runId: "run-1",
      envelope: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "acct-1",
        peerId: "peer-1",
        peerType: ExternalPeerType.USER,
        threadId: null,
        externalMessageId: "msg-1",
        content: "voice note",
        attachments: [
          {
            kind: "audio",
            url: "https://example.com/voice.wav",
            mimeType: "audio/wav",
            fileName: "voice.wav",
            sizeBytes: 12,
            metadata: null,
          },
          {
            kind: "document",
            url: "https://example.com/file.bin",
            mimeType: "application/octet-stream",
            fileName: "file.bin",
            sizeBytes: 12,
            metadata: null,
          },
        ],
        receivedAt: "2026-03-09T12:00:00.000Z",
        metadata: null,
        routingKey: createChannelRoutingKey({
          provider: ExternalChannelProvider.TELEGRAM,
          transport: ExternalChannelTransport.BUSINESS_API,
          accountId: "acct-1",
          peerId: "peer-1",
          threadId: null,
        }),
      },
    });

    expect(delivered).toBe(1);
    expect(publishToRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        type: "EXTERNAL_USER_MESSAGE",
        payload: expect.objectContaining({
          content: "voice note",
          context_file_paths: [
            {
              path: "https://example.com/voice.wav",
              type: "Audio",
            },
          ],
        }),
      }),
    );
  });
});
