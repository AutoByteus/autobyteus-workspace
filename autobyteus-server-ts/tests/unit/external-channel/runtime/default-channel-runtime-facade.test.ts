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
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-1",
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamBinding = (): ChannelBinding => ({
  ...createAgentBinding(),
  targetType: "TEAM",
  agentDefinitionId: null,
  launchPreset: null,
  agentRunId: null,
  teamRunId: "team-1",
  targetNodeName: "support-node",
});

describe("DefaultChannelRuntimeFacade", () => {
  it("dispatches to agent run through the runtime launcher and ingress service", async () => {
    const resolveOrStartAgentRun = vi.fn().mockResolvedValue("agent-1");
    const sendTurn = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      runtimeKind: "codex_app_server",
      turnId: "turn-1",
    });
    const publishExternalUserMessage = vi.fn();
    const bindAcceptedExternalTurn = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: { resolveOrStartAgentRun },
      runtimeCommandIngressService: { sendTurn },
      liveMessagePublisher: { publishExternalUserMessage },
      externalTurnBridge: { bindAcceptedExternalTurn },
      agentTeamRunManager: {
        getTeamRun: vi.fn(),
      },
    });

    const result = await facade.dispatchToBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(result.teamRunId).toBeNull();
    expect(result.dispatchedAt).toBeInstanceOf(Date);
    expect(resolveOrStartAgentRun).toHaveBeenCalledOnce();
    expect(sendTurn).toHaveBeenCalledOnce();
    expect(bindAcceptedExternalTurn).toHaveBeenCalledWith({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      turnId: "turn-1",
      envelope: createEnvelope(),
    });
    expect(publishExternalUserMessage).toHaveBeenCalledWith({
      runId: "agent-1",
      envelope: createEnvelope(),
    });
    expect(sendTurn.mock.calls[0]?.[0]).toMatchObject({
      runId: "agent-1",
      mode: "agent",
    });
  });

  it("dispatches to team run and passes target node", async () => {
    const postMessage = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: {
        resolveOrStartAgentRun: vi.fn(),
      },
      runtimeCommandIngressService: {
        sendTurn: vi.fn(),
      },
      liveMessagePublisher: {
        publishExternalUserMessage: vi.fn(),
      },
      externalTurnBridge: {
        bindAcceptedExternalTurn: vi.fn().mockResolvedValue(undefined),
      },
      agentTeamRunManager: {
        getTeamRun: vi.fn().mockReturnValue({
          postMessage,
        }),
      },
    });

    const result = await facade.dispatchToBinding(createTeamBinding(), createEnvelope());

    expect(result.agentRunId).toBeNull();
    expect(result.teamRunId).toBe("team-1");
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "hello",
      }),
      "support-node",
    );
  });

  it("maps inbound attachments to context files", async () => {
    const sendTurn = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      runtimeKind: "codex_app_server",
      turnId: "turn-attachment",
    });
    const publishExternalUserMessage = vi.fn();
    const bindAcceptedExternalTurn = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      runtimeCommandIngressService: {
        sendTurn,
      },
      liveMessagePublisher: {
        publishExternalUserMessage,
      },
      externalTurnBridge: {
        bindAcceptedExternalTurn,
      },
      agentTeamRunManager: {
        getTeamRun: vi.fn(),
      },
    });

    await facade.dispatchToBinding(createAgentBinding(), createEnvelopeWithAttachments());

    const sentTurn = sendTurn.mock.calls[0]?.[0];
    expect(sentTurn?.message?.contextFiles).toHaveLength(2);
    expect(sentTurn?.message?.contextFiles?.[0]?.toDict()).toMatchObject({
      file_type: "audio",
      file_name: "voice.wav",
    });
    expect(sentTurn?.message?.contextFiles?.[1]?.toDict()).toMatchObject({
      file_type: "image",
      file_name: "image.jpg",
    });
    expect(bindAcceptedExternalTurn).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
  });

  it("throws when agent runtime rejects external dispatch", async () => {
    const publishExternalUserMessage = vi.fn();
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      runtimeCommandIngressService: {
        sendTurn: vi.fn().mockResolvedValue({
          accepted: false,
          code: "RUN_SESSION_NOT_FOUND",
          message: "Run session 'agent-1' is not active.",
          runtimeKind: "codex_app_server",
        }),
      },
      liveMessagePublisher: {
        publishExternalUserMessage,
      },
      externalTurnBridge: {
        bindAcceptedExternalTurn: vi.fn().mockResolvedValue(undefined),
      },
      agentTeamRunManager: {
        getTeamRun: vi.fn(),
      },
    });

    await expect(
      facade.dispatchToBinding(createAgentBinding(), createEnvelope()),
    ).rejects.toThrow("Run session 'agent-1' is not active.");
    expect(publishExternalUserMessage).not.toHaveBeenCalled();
  });

  it("continues agent dispatch when live external-user publish fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sendTurn = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      runtimeKind: "codex_app_server",
      turnId: "turn-2",
    });
    const publishExternalUserMessage = vi.fn(() => {
      throw new Error("socket write failed");
    });
    const bindAcceptedExternalTurn = vi.fn().mockResolvedValue(undefined);
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      runtimeCommandIngressService: {
        sendTurn,
      },
      liveMessagePublisher: {
        publishExternalUserMessage,
      },
      externalTurnBridge: {
        bindAcceptedExternalTurn,
      },
      agentTeamRunManager: {
        getTeamRun: vi.fn(),
      },
    });

    const result = await facade.dispatchToBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(sendTurn).toHaveBeenCalledOnce();
    expect(bindAcceptedExternalTurn).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("continues agent dispatch when accepted-turn binding fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sendTurn = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      runtimeKind: "codex_app_server",
      turnId: "turn-3",
    });
    const publishExternalUserMessage = vi.fn();
    const bindAcceptedExternalTurn = vi.fn().mockRejectedValue(
      new Error("bind failed"),
    );
    const facade = new DefaultChannelRuntimeFacade({
      runtimeLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      runtimeCommandIngressService: {
        sendTurn,
      },
      liveMessagePublisher: {
        publishExternalUserMessage,
      },
      externalTurnBridge: {
        bindAcceptedExternalTurn,
      },
      agentTeamRunManager: {
        getTeamRun: vi.fn(),
      },
    });

    const result = await facade.dispatchToBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(bindAcceptedExternalTurn).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
