import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  getAgentToolMcpSessionRegistry,
  resetAgentToolMcpSessionRegistryForTests,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { resetAgentToolMcpSessionServiceForTests } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";

const createConfig = (runtimeKind: RuntimeKind = RuntimeKind.CODEX_APP_SERVER) =>
  new AgentRunConfig({
    runtimeKind,
    agentDefinitionId: "agent-def-1",
    llmModelIdentifier:
      runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "claude-sonnet-4-5" : "gpt-5.3-codex",
    autoExecuteTools: false,
    workspaceId: "workspace-1",
    llmConfig: null,
    skillAccessMode: null,
  });

const createBackend = (input: {
  runId: string;
  runtimeKind?: RuntimeKind;
  platformAgentRunId?: string | null;
  terminateMakesInactive?: boolean;
}) => {
  let active = true;
  const runtimeKind = input.runtimeKind ?? RuntimeKind.CODEX_APP_SERVER;
  const config = createConfig(runtimeKind);
  const backend = {
    runId: input.runId,
    runtimeKind,
    getContext: () => new AgentRunContext({ runId: input.runId, config, runtimeContext: null }),
    getPlatformAgentRunId: () => input.platformAgentRunId ?? null,
    isActive: () => active,
    getLifecycleSnapshot: () => ({
      availability: active ? "active" as const : "inactive" as const,
      phase: active ? "running" as const : "terminated" as const,
      currentTurn: { kind: "NONE" as const },
    }),
    subscribeToSourceEventBatches: () => () => undefined,
    postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn(async () => {
      if (input.terminateMakesInactive !== false) active = false;
      return { accepted: true };
    }),
  };
  return backend;
};

const createManager = (input: {
  autoByteusBackendFactory?: unknown;
  codexBackendFactory?: unknown;
  claudeBackendFactory?: unknown;
  runFileChangeService?: unknown;
  publishedArtifactRelayService?: unknown;
  memoryRecorder?: unknown;
}) => new AgentRunManager({
  ...input,
  runFileChangeService: (input.runFileChangeService ?? {
    attachToRun: vi.fn(() => vi.fn()),
  }) as never,
  publishedArtifactRelayService: (input.publishedArtifactRelayService ?? {
    attachToRun: vi.fn(() => vi.fn()),
  }) as never,
  memoryRecorder: (input.memoryRecorder ?? {
    attachToRun: vi.fn(() => vi.fn()),
    onUserMessageForwarded: vi.fn(),
  }) as never,
});

describe("AgentRunManager candidate lifecycle", () => {
  beforeEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
  });

  afterEach(() => {
    resetAgentToolMcpSessionServiceForTests();
    resetAgentToolMcpSessionRegistryForTests();
    vi.restoreAllMocks();
  });

  it("keeps a new run private until synchronous candidate publication", async () => {
    const backend = createBackend({
      runId: "run-codex",
      platformAgentRunId: "thread-codex",
    });
    const codexBackendFactory = {
      createBackend: vi.fn(async () => backend),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({ codexBackendFactory });
    const config = createConfig();

    const candidate = await manager.prepareNewAgentRun({ runId: "run-codex", config });

    expect(candidate).toMatchObject({
      runId: "run-codex",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-codex",
    });
    expect(manager.getActiveRun("run-codex")).toBeNull();
    expect(codexBackendFactory.createBackend).toHaveBeenCalledWith(config, "run-codex");

    const published = candidate.commitPublication();
    expect(manager.getActiveRun("run-codex")).toBe(published);
    expect(published.runId).toBe("run-codex");
  });

  it("claims the run id before the first backend await and rejects overlapping preparation", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const codexBackendFactory = {
      createBackend: vi.fn(async () => {
        await gate;
        return createBackend({ runId: "run-overlap" });
      }),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({ codexBackendFactory });
    const config = createConfig();

    const first = manager.prepareNewAgentRun({ runId: "run-overlap", config });
    await expect(manager.prepareNewAgentRun({ runId: "run-overlap", config }))
      .rejects.toMatchObject({ code: "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT" });
    expect(codexBackendFactory.createBackend).toHaveBeenCalledOnce();

    release();
    const candidate = await first;
    expect(manager.getActiveRun("run-overlap")).toBeNull();
    await expect(candidate.abort()).resolves.toEqual({ kind: "aborted" });
  });

  it("allows retry only after candidate abort confirms inactivity", async () => {
    const codexBackendFactory = {
      createBackend: vi.fn(async () => createBackend({ runId: "run-retry" })),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({ codexBackendFactory });
    const config = createConfig();

    const first = await manager.prepareNewAgentRun({ runId: "run-retry", config });
    const [abortOne, abortTwo] = await Promise.all([first.abort(), first.abort()]);
    expect(abortOne).toEqual({ kind: "aborted" });
    expect(abortTwo).toEqual({ kind: "aborted" });

    const retry = await manager.prepareNewAgentRun({ runId: "run-retry", config });
    expect(codexBackendFactory.createBackend).toHaveBeenCalledTimes(2);
    await retry.abort();
  });

  it("quarantines an uncertain candidate cleanup and rejects same-process replacement", async () => {
    const codexBackendFactory = {
      createBackend: vi.fn(async () => createBackend({
        runId: "run-quarantine",
        terminateMakesInactive: false,
      })),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({ codexBackendFactory });
    const config = createConfig();

    const candidate = await manager.prepareNewAgentRun({ runId: "run-quarantine", config });
    await expect(candidate.abort()).resolves.toMatchObject({ kind: "quarantined" });
    await expect(manager.prepareNewAgentRun({ runId: "run-quarantine", config }))
      .rejects.toMatchObject({ code: "AGENT_RUN_ACTIVATION_CLEANUP_FAILED" });
    expect(codexBackendFactory.createBackend).toHaveBeenCalledOnce();
  });

  it.each([
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "22222222-2222-4222-8222-222222222222"],
  ] as const)("strictly restores %s from the exact provider identity", async (runtimeKind, platformAgentRunId) => {
    const backend = createBackend({
      runId: `run-${runtimeKind}`,
      runtimeKind,
      platformAgentRunId,
    });
    const factory = {
      createBackend: vi.fn(),
      restoreBackend: vi.fn(async () => backend),
    };
    const manager = createManager(runtimeKind === RuntimeKind.CODEX_APP_SERVER
      ? { codexBackendFactory: factory }
      : { claudeBackendFactory: factory });
    const config = createConfig(runtimeKind);

    const candidate = await manager.prepareRestoreAgentRunFromPlatformState({
      runId: `run-${runtimeKind}`,
      config,
      platformAgentRunId,
    });

    expect(candidate.platformAgentRunId).toBe(platformAgentRunId);
    expect(manager.getActiveRun(candidate.runId)).toBeNull();
    expect(factory.restoreBackend).toHaveBeenCalledWith(expect.objectContaining({
      runId: candidate.runId,
      config,
    }));
    candidate.commitPublication();
    expect(manager.getActiveRun(candidate.runId)?.getPlatformAgentRunId()).toBe(platformAgentRunId);
  });

  it("aborts a mismatched platform restore privately and leaves confirmed cleanup retryable", async () => {
    const firstBackend = createBackend({
      runId: "run-mismatch",
      platformAgentRunId: "thread-wrong",
    });
    const exactBackend = createBackend({
      runId: "run-mismatch",
      platformAgentRunId: "thread-expected",
    });
    const codexBackendFactory = {
      createBackend: vi.fn(),
      restoreBackend: vi.fn()
        .mockResolvedValueOnce(firstBackend)
        .mockResolvedValueOnce(exactBackend),
    };
    const manager = createManager({ codexBackendFactory });
    const input = {
      runId: "run-mismatch",
      config: createConfig(),
      platformAgentRunId: "thread-expected",
    };

    await expect(manager.prepareRestoreAgentRunFromPlatformState(input))
      .rejects.toThrow("The persisted provider conversation could not be restored.");
    expect(manager.getActiveRun("run-mismatch")).toBeNull();
    expect(firstBackend.terminate).toHaveBeenCalledOnce();

    const retry = await manager.prepareRestoreAgentRunFromPlatformState(input);
    expect(retry.platformAgentRunId).toBe("thread-expected");
    await retry.abort();
  });

  it("rolls back already-attached sidecars when a later attachment fails", async () => {
    const detachRunFiles = vi.fn();
    const failure = new Error("artifact attachment failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const backend = createBackend({ runId: "run-attach-failure" });
    const codexBackendFactory = {
      createBackend: vi.fn(async () => backend),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({
      codexBackendFactory,
      runFileChangeService: { attachToRun: vi.fn(() => detachRunFiles) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => { throw failure; }) },
    });

    const rejected = await manager.prepareNewAgentRun({
      runId: "run-attach-failure",
      config: createConfig(),
    }).catch((error: unknown) => error as Error & { cause?: AggregateError });
    expect(rejected).toMatchObject({
      message: "Failed to prepare agent run 'run-attach-failure'.",
    });
    expect(rejected.cause).toMatchObject({
      name: "AgentRunResourceAttachmentError",
      message: "Failed to attach resources for agent run 'run-attach-failure'.",
    });
    expect(rejected.cause?.errors).toEqual([failure]);

    expect(errorSpy).toHaveBeenCalledWith(
      `Unexpected failure while preparing agent run 'run-attach-failure' for runtime '${RuntimeKind.CODEX_APP_SERVER}'.`,
      rejected.cause,
    );
    expect(detachRunFiles).toHaveBeenCalledOnce();
    expect(backend.terminate).toHaveBeenCalledOnce();
    expect(manager.getActiveRun("run-attach-failure")).toBeNull();
  });

  it("rejects another candidate after publication without replacing the active run", async () => {
    const codexBackendFactory = {
      createBackend: vi.fn(async () => createBackend({ runId: "run-active" })),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({ codexBackendFactory });
    const config = createConfig();
    const candidate = await manager.prepareNewAgentRun({ runId: "run-active", config });
    const published = candidate.commitPublication();

    await expect(manager.prepareNewAgentRun({ runId: "run-active", config }))
      .rejects.toMatchObject({ code: "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT" });
    expect(codexBackendFactory.createBackend).toHaveBeenCalledOnce();
    expect(manager.getActiveRun("run-active")).toBe(published);
  });

  it("detaches sidecars and revokes only matching MCP sessions after accepted termination", async () => {
    const detachRunFiles = vi.fn();
    const detachArtifacts = vi.fn();
    const detachMemory = vi.fn();
    const codexBackendFactory = {
      createBackend: vi.fn(async () => createBackend({ runId: "run-with-mcp" })),
      restoreBackend: vi.fn(),
    };
    const manager = createManager({
      codexBackendFactory,
      runFileChangeService: { attachToRun: vi.fn(() => detachRunFiles) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => detachArtifacts) },
      memoryRecorder: {
        attachToRun: vi.fn(() => detachMemory),
        onUserMessageForwarded: vi.fn(),
      },
    });
    const registry = getAgentToolMcpSessionRegistry();
    const matching = registry.createSession({
      owner: { runId: "run-with-mcp" },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "run-with-mcp",
        senderName: "agent",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
      runtimeExposure: buildRuntimeAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const nonMatching = registry.createSession({
      owner: { runId: "other-run" },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "other-run",
        senderName: "other",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
      runtimeExposure: buildRuntimeAgentToolExposure([]),
      enabledTools: [],
      toolRoutes: {},
    });
    const candidate = await manager.prepareNewAgentRun({
      runId: "run-with-mcp",
      config: createConfig(),
    });
    candidate.commitPublication();

    await expect(manager.terminateAgentRun("run-with-mcp")).resolves.toBe(true);

    expect(detachRunFiles).toHaveBeenCalledOnce();
    expect(detachArtifacts).toHaveBeenCalledOnce();
    expect(detachMemory).toHaveBeenCalledOnce();
    expect(registry.resolveSession({
      sessionId: matching.session.sessionId,
      bearerToken: matching.capabilityToken,
    })).toMatchObject({ ok: false, reason: "revoked" });
    expect(registry.resolveSession({
      sessionId: nonMatching.session.sessionId,
      bearerToken: nonMatching.capabilityToken,
    }).ok).toBe(true);
  });
});
