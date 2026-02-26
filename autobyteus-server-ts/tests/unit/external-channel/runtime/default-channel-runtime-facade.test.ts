import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { DefaultChannelRuntimeFacade } from "../../../../src/external-channel/runtime/default-channel-runtime-facade.js";

const createEnvelope = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-08T00:00:00.000Z",
  metadata: { source: "test" },
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
});

const createEnvelopeWithAttachments = () => ({
  ...createEnvelope(),
  attachments: [
    {
      kind: "audio",
      url: "data:audio/wav;base64,ZmFrZQ==",
      mimeType: "audio/wav",
      fileName: "voice.wav",
      sizeBytes: 4,
      metadata: { ptt: true },
    },
    {
      kind: "image",
      url: "https://example.com/image.jpg",
      mimeType: "image/jpeg",
      fileName: "image.jpg",
      sizeBytes: 42,
      metadata: { source: "wa" },
    },
  ],
});

const createAgentBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "AGENT",
  agentRunId: "agent-1",
  teamRunId: null,
  targetMemberName: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamBinding = (): ChannelBinding => ({
  ...createAgentBinding(),
  targetType: "TEAM",
  agentRunId: null,
  teamRunId: "team-1",
  targetMemberName: "support-node",
});

describe("DefaultChannelRuntimeFacade", () => {
  it("dispatches to agent run with external source metadata", async () => {
    const postUserMessage = vi.fn().mockResolvedValue(undefined);
    const dispatchUserMessage = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: vi.fn().mockReturnValue({
          postUserMessage,
        }),
      },
      teamCommandIngressService: {
        dispatchUserMessage,
      },
    });

    const result = await facade.dispatchToBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(result.teamRunId).toBeNull();
    expect(result.dispatchedAt).toBeInstanceOf(Date);
    expect(postUserMessage).toHaveBeenCalledOnce();
    const sentMessage = postUserMessage.mock.calls[0][0];
    expect(sentMessage.content).toBe("hello");
    expect(sentMessage.metadata.externalSource).toMatchObject({
      source: "external-channel",
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      externalMessageId: "msg-1",
    });
  });

  it("dispatches to team run and passes target node", async () => {
    const dispatchUserMessage = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: vi.fn(),
      },
      teamCommandIngressService: {
        dispatchUserMessage,
      },
    });

    const result = await facade.dispatchToBinding(createTeamBinding(), createEnvelope());

    expect(result.agentRunId).toBeNull();
    expect(result.teamRunId).toBe("team-1");
    expect(dispatchUserMessage).toHaveBeenCalledWith({
      teamId: "team-1",
      targetMemberName: "support-node",
      userMessage: expect.objectContaining({
        content: "hello",
      }),
    });
  });

  it("maps inbound attachments to context files", async () => {
    const postUserMessage = vi.fn().mockResolvedValue(undefined);
    const dispatchUserMessage = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: vi.fn().mockReturnValue({
          postUserMessage,
        }),
      },
      teamCommandIngressService: {
        dispatchUserMessage,
      },
    });

    await facade.dispatchToBinding(createAgentBinding(), createEnvelopeWithAttachments());

    expect(postUserMessage).toHaveBeenCalledOnce();
    const sentMessage = postUserMessage.mock.calls[0][0];
    expect(sentMessage.contextFiles).toHaveLength(2);
    expect(sentMessage.contextFiles?.[0]?.toDict()).toMatchObject({
      file_type: "audio",
      file_name: "voice.wav",
    });
    expect(sentMessage.contextFiles?.[1]?.toDict()).toMatchObject({
      file_type: "image",
      file_name: "image.jpg",
    });
  });

  it("throws when agent binding has no agentRunId", async () => {
    const binding = createAgentBinding();
    binding.agentRunId = null;
    const facade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: vi.fn(),
      },
      teamCommandIngressService: {
        dispatchUserMessage: vi.fn(),
      },
    });

    await expect(
      facade.dispatchToBinding(binding, createEnvelope()),
    ).rejects.toThrow("binding.agentRunId must be a non-empty string.");
  });

  it("propagates team ingress dispatch errors", async () => {
    const dispatchUserMessage = vi.fn().mockRejectedValue(new Error("Team run missing"));
    const facade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: vi.fn(),
      },
      teamCommandIngressService: {
        dispatchUserMessage,
      },
    });

    await expect(
      facade.dispatchToBinding(createTeamBinding(), createEnvelope()),
    ).rejects.toThrow("Team run missing");
  });
});
