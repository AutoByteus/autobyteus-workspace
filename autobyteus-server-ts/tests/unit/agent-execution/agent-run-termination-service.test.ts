import { describe, expect, it, vi } from "vitest";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AgentRunProvisioningService } from "../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { CodexThreadEventConverter } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

describe("AgentRunService termination", () => {
  const createSubject = (options: { metadata?: Record<string, unknown> | null } = {}) => {
    const agentRunManager = {
      getActiveRun: vi.fn(),
      terminateAgentRun: vi.fn().mockResolvedValue(true),
    };
    const metadataService = {
      readMetadata: vi.fn().mockResolvedValue(options.metadata ?? null),
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const historyCatalogService = {
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
      recordPreparedRun: vi.fn(),
      recordRunStarted: vi.fn(),
    };
    const lifecycleService = Object.create(
      StandaloneAgentRunLifecycleService.prototype,
    ) as StandaloneAgentRunLifecycleService;
    const provisioningService = Object.create(
      AgentRunProvisioningService.prototype,
    ) as AgentRunProvisioningService;

    const service = new AgentRunService("/tmp/agent-run-service-test", {
      agentRunManager: agentRunManager as never,
      metadataService: metadataService as never,
      historyCatalogService: historyCatalogService as never,
      provisioningService,
      lifecycleService,
    });

    return { service, mocks: { agentRunManager, metadataService, historyCatalogService } };
  };

  it("routes non-native runtime runs through the manager cleanup boundary", async () => {
    const { service, mocks } = createSubject();
    const directTerminate = vi.fn();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: directTerminate,
    });

    const result = await service.terminateAgentRun("run-1");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "runtime",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    expect(mocks.agentRunManager.getActiveRun).toHaveBeenCalledWith("run-1");
    expect(mocks.agentRunManager.terminateAgentRun).toHaveBeenCalledWith("run-1");
    expect(directTerminate).not.toHaveBeenCalled();
    expect(mocks.historyCatalogService.recordRunTerminated).toHaveBeenCalledWith({ runId: "run-1" });
  });

  it("routes autobyteus runtime runs through the manager cleanup boundary and records termination once", async () => {
    const { service, mocks } = createSubject();
    const directTerminate = vi.fn();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: directTerminate,
    });

    const result = await service.terminateAgentRun("run-2");

    expect(result).toEqual({
      success: true,
      message: "Agent run terminated successfully.",
      route: "native",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    expect(mocks.agentRunManager.terminateAgentRun).toHaveBeenCalledWith("run-2");
    expect(directTerminate).not.toHaveBeenCalled();
    expect(mocks.historyCatalogService.recordRunTerminated).toHaveBeenCalledTimes(1);
  });

  it("returns not found when no active AgentRun exists", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.getActiveRun.mockReturnValue(null);

    const result = await service.terminateAgentRun("missing-run");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: null,
    });
    expect(mocks.historyCatalogService.recordRunTerminated).not.toHaveBeenCalled();
    expect(mocks.agentRunManager.terminateAgentRun).not.toHaveBeenCalled();
  });

  it("skips metadata and history updates when manager termination is rejected", async () => {
    const { service, mocks } = createSubject();
    mocks.agentRunManager.terminateAgentRun.mockResolvedValue(false);
    const directTerminate = vi.fn();
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      getPlatformAgentRunId: vi.fn().mockReturnValue(null),
      terminate: directTerminate,
    });

    const result = await service.terminateAgentRun("run-3");

    expect(result).toEqual({
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    expect(mocks.agentRunManager.terminateAgentRun).toHaveBeenCalledWith("run-3");
    expect(directTerminate).not.toHaveBeenCalled();
    expect(mocks.historyCatalogService.recordRunTerminated).not.toHaveBeenCalled();
  });

  it("does not rewrite durable metadata and records catalog termination when metadata exists", async () => {
    const { service, mocks } = createSubject({
      metadata: {
        runId: "run-4",
        agentDefinitionId: "agent-1",
        workspaceRootPath: "/tmp/workspace",
        memoryDir: "/tmp/agent-run-service-test/agents/run-4",
        llmModelIdentifier: "gpt-test",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "thread-old",
        startedAt: "2026-05-17T00:05:00.000Z",
      },
    });
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      getPlatformAgentRunId: vi.fn().mockReturnValue("thread-new"),
      terminate: vi.fn(),
    });

    await service.terminateAgentRun("run-4");

    expect(mocks.metadataService.writeMetadata).not.toHaveBeenCalled();
    expect(mocks.historyCatalogService.recordRunTerminated).toHaveBeenCalledWith({ runId: "run-4" });
  });

  it("ignores a neutral reasoning end and retains the following terminal error message", async () => {
    const { service, mocks } = createSubject();
    let emitRunEvent: (event: unknown) => void = () => {
      throw new Error("Run lifecycle listener was not attached.");
    };
    mocks.agentRunManager.getActiveRun.mockReturnValue({
      runId: "run-codex-error",
      isActive: vi.fn().mockReturnValue(true),
      subscribeToEvents: vi.fn().mockImplementation((listener) => {
        emitRunEvent = listener;
        return vi.fn();
      }),
    });
    const observed = vi.fn();
    const stopObserving = await service.observeAgentRunLifecycle("run-codex-error", observed);
    const converter = new CodexThreadEventConverter("run-codex-error");
    converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-1",
        item: { type: "reasoning", id: "reason-1", summary: [{ text: "inspect" }] },
      },
    });
    const errorEvents = converter.convert({
      method: CodexThreadEventName.ERROR,
      params: { message: "provider exploded" },
    });
    const reasoningEnd = errorEvents[0]!;
    const actualError = errorEvents.find((event) => event.eventType === AgentRunEventType.ERROR)!;

    emitRunEvent(reasoningEnd);
    emitRunEvent({
      ...actualError,
      payload: {
        ...actualError.payload,
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-1",
      },
    });
    emitRunEvent({
      runId: "run-codex-error",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: { status: "error" },
      statusHint: "ERROR",
    });

    expect(reasoningEnd.statusHint).toBeNull();
    expect(observed).toHaveBeenNthCalledWith(1, expect.objectContaining({ phase: "ATTACHED" }));
    expect(observed).toHaveBeenNthCalledWith(2, expect.objectContaining({
      phase: "FAILED",
      errorMessage: "provider exploded",
    }));
    expect(observed).toHaveBeenCalledTimes(2);
    stopObserving?.();
  });
});
