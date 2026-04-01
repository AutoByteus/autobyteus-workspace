import { describe, expect, it, vi } from "vitest";
import { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelAgentRunFacade } from "../../../../src/external-channel/runtime/channel-agent-run-facade.js";

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
  teamDefinitionId: null,
  teamLaunchPreset: null,
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createActiveRun = (options: {
  runId?: string;
  runtimeKind?: string;
  postUserMessage?: ReturnType<typeof vi.fn>;
}) =>
  new AgentRun({
    backend: {
      runId: options.runId ?? "agent-1",
      runtimeKind: options.runtimeKind ?? "codex_app_server",
      isActive: () => true,
      getRuntimeReference: () => null,
      getStatus: () => "ACTIVE",
      postUserMessage:
        options.postUserMessage ??
        vi.fn().mockResolvedValue({
          accepted: true,
          code: null,
          message: null,
          turnId: "turn-1",
        }),
      approveToolInvocation: vi.fn(),
      interrupt: vi.fn(),
      terminate: vi.fn(),
    },
  });

describe("ChannelAgentRunFacade", () => {
  it("dispatches to agent run through the run launcher and live AgentRun", async () => {
    const resolveOrStartAgentRun = vi.fn().mockResolvedValue("agent-1");
    const postUserMessage = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      turnId: "turn-1",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      postUserMessage,
    });
    const publishExternalUserMessage = vi.fn();
    const recordRunActivity = vi.fn().mockResolvedValue(undefined);
    const facade = new ChannelAgentRunFacade({
      runLauncher: { resolveOrStartAgentRun },
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        recordRunActivity,
      },
      agentLiveMessagePublisher: { publishExternalUserMessage },
    });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.dispatchTargetType).toBe("AGENT");
    expect(result.agentRunId).toBe("agent-1");
    expect(result.turnId).toBe("turn-1");
    expect(resolveOrStartAgentRun).toHaveBeenCalledWith(createAgentBinding());
    expect(postUserMessage).toHaveBeenCalledOnce();
    expect(recordRunActivity).toHaveBeenCalledWith(
      activeRun,
      expect.objectContaining({
        summary: "hello",
        lastKnownStatus: "ACTIVE",
      }),
    );
    expect(publishExternalUserMessage).toHaveBeenCalledWith({
      runId: "agent-1",
      envelope: createEnvelope(),
    });
    expect(postUserMessage.mock.calls[0]?.[0]).toMatchObject({
      content: "hello",
    });
  });

  it("maps inbound attachments to context files", async () => {
    const postUserMessage = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      turnId: "turn-attachment",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      postUserMessage,
    });
    const publishExternalUserMessage = vi.fn();
    const recordRunActivity = vi.fn().mockResolvedValue(undefined);
    const facade = new ChannelAgentRunFacade({
      runLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        recordRunActivity,
      },
      agentLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    const result = await facade.dispatchToAgentBinding(
      createAgentBinding(),
      createEnvelopeWithAttachments(),
    );

    const message = postUserMessage.mock.calls[0]?.[0];
    expect(message?.contextFiles).toHaveLength(2);
    expect(message?.contextFiles?.[0]?.toDict()).toMatchObject({
      file_type: "audio",
      file_name: "voice.wav",
    });
    expect(message?.contextFiles?.[1]?.toDict()).toMatchObject({
      file_type: "image",
      file_name: "image.jpg",
    });
    expect(result.dispatchTargetType).toBe("AGENT");
    expect(result.turnId).toBe("turn-attachment");
    expect(recordRunActivity).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
  });

  it("throws when agent runtime rejects external dispatch", async () => {
    const publishExternalUserMessage = vi.fn();
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      postUserMessage: vi.fn().mockResolvedValue({
        accepted: false,
        code: "RUN_SESSION_NOT_FOUND",
        message: "Run session 'agent-1' is not active.",
      }),
    });
    const facade = new ChannelAgentRunFacade({
      runLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        recordRunActivity: vi.fn(),
      },
      agentLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    await expect(
      facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope()),
    ).rejects.toThrow("Run session 'agent-1' is not active.");
    expect(publishExternalUserMessage).not.toHaveBeenCalled();
  });

  it("continues agent dispatch when live external-user publish fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postUserMessage = vi.fn().mockResolvedValue({
      accepted: true,
      code: null,
      message: null,
      turnId: "turn-2",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      postUserMessage,
    });
    const publishExternalUserMessage = vi.fn(() => {
      throw new Error("socket write failed");
    });
    const facade = new ChannelAgentRunFacade({
      runLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        recordRunActivity: vi.fn().mockResolvedValue(undefined),
      },
      agentLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(result.turnId).toBe("turn-2");
    expect(postUserMessage).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("returns a null turnId when the runtime accepts without exposing one", async () => {
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      postUserMessage: vi.fn().mockResolvedValue({
        accepted: true,
        code: null,
        message: null,
        turnId: null,
      }),
    });
    const publishExternalUserMessage = vi.fn();
    const facade = new ChannelAgentRunFacade({
      runLauncher: {
        resolveOrStartAgentRun: vi.fn().mockResolvedValue("agent-1"),
      },
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        recordRunActivity: vi.fn().mockResolvedValue(undefined),
      },
      agentLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(result.turnId).toBeNull();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
  });
});
