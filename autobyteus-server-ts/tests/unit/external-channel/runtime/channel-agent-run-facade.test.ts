import { describe, expect, it, vi } from "vitest";
import { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { AgentRunCommandCoordinator } from "../../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelAgentRunFacade } from "../../../../src/external-channel/runtime/channel-agent-run-facade.js";
import { ChannelDispatchLockRegistry } from "../../../../src/external-channel/runtime/channel-dispatch-lock-registry.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";

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
  targetMemberRouteKey: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createActiveRun = (options: {
  runId?: string;
  runtimeKind?: string;
  active?: boolean;
  dispatchUserInput?: ReturnType<typeof vi.fn>;
  subscribeToEvents?: ReturnType<typeof vi.fn>;
}) => {
  const runId = options.runId ?? "agent-1";
  let sourceListener: ((events: readonly unknown[]) => void | Promise<void>) | null = null;
  const dispatchUserInput = options.dispatchUserInput ?? vi.fn().mockResolvedValue({
    forwarded: true,
    turnId: "turn-1",
  });
  const backendDispatch = vi.fn(async (input) => {
    const result = await dispatchUserInput(input);
    if (result.forwarded && result.turnId) {
      queueMicrotask(() => {
        void sourceListener?.([{
          eventType: AgentRunEventType.TURN_STARTED,
          runId,
          payload: { turn_id: result.turnId },
          statusHint: "ACTIVE",
        }]);
      });
    }
    return result;
  });
  return new AgentRun({
    context: { runId: options.runId ?? "agent-1", config: { runtimeKind: options.runtimeKind ?? "codex_app_server" }, runtimeContext: null } as any,
    backend: {
      runId: options.runId ?? "agent-1",
      runtimeKind: options.runtimeKind ?? "codex_app_server",
      inputCapabilities: {
        activeTurnAppend: options.runtimeKind === "codex_app_server" ? "supported" : "unsupported",
      },
      isActive: () => options.active ?? true,
      getContext: () => ({ runId: options.runId ?? "agent-1", config: { runtimeKind: options.runtimeKind ?? "codex_app_server" }, runtimeContext: null }) as any,
      getPlatformAgentRunId: () => options.runId ?? "agent-1",
      getLifecycleSnapshot: () => ({
        availability: "active" as const,
        phase: "idle" as const,
        currentTurn: { kind: "NONE" as const },
      }),
      subscribeToSourceEventBatches: (listener: (events: readonly unknown[]) => void | Promise<void>) => {
        sourceListener = listener;
        const unsubscribe = (options.subscribeToEvents ?? vi.fn().mockReturnValue(() => undefined))(
          (event: unknown) => listener([event]),
        );
        return () => {
          sourceListener = null;
          unsubscribe();
        };
      },
      dispatchUserInput: backendDispatch,
      approveToolInvocation: vi.fn(),
      interrupt: vi.fn(),
      terminate: vi.fn(),
    },
  });
};

const buildFacade = (options: {
  activeRun: AgentRun;
  resolveOrStartAgentRun?: ReturnType<typeof vi.fn>;
  publishExternalUserMessage?: ReturnType<typeof vi.fn>;
}) => {
  const registry = new AgentRunCommandRegistry();
  const overlayStore = new AgentRunCommandStatusOverlayStore();
  const recordRunActivity = vi.fn().mockResolvedValue(undefined);
  const agentRunService = {
    getAgentRun: vi.fn().mockReturnValue(options.activeRun),
    getRunMetadata: vi.fn(),
    restoreAgentRun: vi.fn(),
    activatePreparedRun: vi.fn(),
    recordRunActivity,
  };
  const projectionService = new AgentRunStatusProjectionService({
    agentRunManager: {
      getActiveRun: vi.fn().mockReturnValue(options.activeRun),
    } as any,
    metadataService: {
      readMetadata: vi.fn().mockResolvedValue(null),
    } as any,
    overlayStore,
    commandRegistry: registry,
  });
  const commandCoordinator = new AgentRunCommandCoordinator({
    agentRunService: agentRunService as any,
    registry,
    overlayStore,
    projectionService,
    broadcaster: { publishToRun: vi.fn() } as any,
  });
  const resolveOrStartAgentRun = options.resolveOrStartAgentRun ?? vi.fn().mockResolvedValue("agent-1");
  const publishExternalUserMessage = options.publishExternalUserMessage ?? vi.fn();
  const facade = new ChannelAgentRunFacade({
    runLauncher: { resolveOrStartAgentRun },
    commandCoordinator,
    agentLiveMessagePublisher: { publishExternalUserMessage },
    dispatchLockRegistry: new ChannelDispatchLockRegistry(),
  });
  return {
    facade,
    resolveOrStartAgentRun,
    publishExternalUserMessage,
    recordRunActivity,
    agentRunService,
  };
};

describe("ChannelAgentRunFacade", () => {
  it("dispatches to agent run through the run launcher and command coordinator", async () => {
    const dispatchUserInput = vi.fn().mockResolvedValue({
      forwarded: true,
      turnId: "turn-1",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      dispatchUserInput,
    });
    const { facade, resolveOrStartAgentRun, publishExternalUserMessage, recordRunActivity } = buildFacade({ activeRun });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.dispatchTargetType).toBe("AGENT");
    expect(result.agentRunId).toBe("agent-1");
    expect(result.turnId).toBe("turn-1");
    expect(resolveOrStartAgentRun).toHaveBeenCalledWith(createAgentBinding());
    expect(dispatchUserInput).toHaveBeenCalledOnce();
    expect(recordRunActivity).toHaveBeenCalledWith(
      activeRun,
      {
        summary: "hello",
      },
    );
    expect(recordRunActivity.mock.calls[0]?.[1]).not.toHaveProperty("lastKnownStatus");
    expect(publishExternalUserMessage).toHaveBeenCalledWith({
      runId: "agent-1",
      envelope: createEnvelope(),
    });
    expect(dispatchUserInput.mock.calls[0]?.[0]).toMatchObject({
      kind: "start_turn",
      message: expect.objectContaining({
        content: "hello",
        metadata: expect.objectContaining({
          message_id: expect.stringMatching(/^external_/),
          dedupe_key: expect.stringMatching(/^external_channel:/),
        }),
      }),
    });
  });

  it("maps inbound attachments to context files through the coordinator send path", async () => {
    const dispatchUserInput = vi.fn().mockResolvedValue({
      forwarded: true,
      turnId: "turn-1",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      dispatchUserInput,
    });
    const { facade, publishExternalUserMessage, recordRunActivity } = buildFacade({ activeRun });

    const result = await facade.dispatchToAgentBinding(
      createAgentBinding(),
      createEnvelopeWithAttachments(),
    );

    const message = dispatchUserInput.mock.calls[0]?.[0]?.message;
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
    expect(recordRunActivity).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
  });

  it("subscribes for authoritative turn capture before posting the external message", async () => {
    const subscribeToEvents = vi.fn().mockReturnValue(() => undefined);
    const dispatchUserInput = vi.fn().mockResolvedValue({
      forwarded: true,
      turnId: "turn-1",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      dispatchUserInput,
      subscribeToEvents,
    });
    const { facade } = buildFacade({ activeRun });

    await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(subscribeToEvents).toHaveBeenCalled();
    expect(subscribeToEvents.mock.invocationCallOrder[0]).toBeLessThan(
      dispatchUserInput.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("throws when the AgentRun admission boundary rejects an inactive runtime", async () => {
    const publishExternalUserMessage = vi.fn();
    const dispatchUserInput = vi.fn();
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      active: false,
      dispatchUserInput,
    });
    const { facade } = buildFacade({ activeRun, publishExternalUserMessage });

    await expect(
      facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope()),
    ).rejects.toThrow("AgentRun is not accepting input.");
    expect(dispatchUserInput).not.toHaveBeenCalled();
    expect(publishExternalUserMessage).not.toHaveBeenCalled();
  });

  it("continues agent dispatch when live external-user publish fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const dispatchUserInput = vi.fn().mockResolvedValue({
      forwarded: true,
      turnId: "turn-1",
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      dispatchUserInput,
    });
    const publishExternalUserMessage = vi.fn(() => {
      throw new Error("socket write failed");
    });
    const { facade } = buildFacade({ activeRun, publishExternalUserMessage });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(dispatchUserInput).toHaveBeenCalledOnce();
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("waits for the authoritative turn-start event when the runtime omits turn metadata", async () => {
    let runtimeListener: ((event: unknown) => void) | null = null;
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "codex_app_server",
      subscribeToEvents: vi.fn().mockImplementation((listener) => {
        runtimeListener = listener;
        return () => {
          runtimeListener = null;
        };
      }),
      dispatchUserInput: vi.fn().mockImplementation(async () => {
        queueMicrotask(() => {
          runtimeListener?.({
            eventType: AgentRunEventType.TURN_STARTED,
            runId: "agent-1",
            payload: {
              turn_id: "turn-captured",
            },
            statusHint: "ACTIVE",
          });
        });
        return {
          forwarded: true,
          turnId: null,
        };
      }),
    });
    const { facade, publishExternalUserMessage } = buildFacade({ activeRun });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(result.turnId).toBe("turn-captured");
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
  });

  it("captures the first turn signal through the dispatch-scoped listener when the backend response has no turn id", async () => {
    let runtimeListener: ((event: unknown) => void) | null = null;
    const subscribeToEvents = vi.fn().mockImplementation((listener) => {
      runtimeListener = listener;
      return () => {
        runtimeListener = null;
      };
    });
    const dispatchUserInput = vi.fn().mockImplementation(async () => {
      queueMicrotask(() => {
        runtimeListener?.({
          eventType: AgentRunEventType.TURN_STARTED,
          runId: "agent-1",
          payload: {
            turn_id: "turn-42",
          },
          statusHint: "ACTIVE",
        });
      });
      return {
        forwarded: true,
        turnId: null,
      };
    });
    const activeRun = createActiveRun({
      runId: "agent-1",
      runtimeKind: "autobyteus",
      dispatchUserInput,
      subscribeToEvents,
    });
    const { facade } = buildFacade({ activeRun });

    const result = await facade.dispatchToAgentBinding(createAgentBinding(), createEnvelope());

    expect(result.turnId).toBe("turn-42");
    expect(subscribeToEvents).toHaveBeenCalled();
  });
});
