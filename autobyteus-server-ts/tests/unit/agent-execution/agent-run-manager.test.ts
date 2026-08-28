import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunResourceManager } from "../../../src/agent-execution/services/agent-run-resource-manager.js";
import { AgentRunActivationRegistry } from "../../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import type { AgentToolMcpRunSessionDeactivator } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  createRecordingAgentToolMcpRunSessionDeactivator,
} from "../../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";

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
  terminationResults?: readonly AgentOperationResult[];
}) => {
  let active = true;
  let terminationIndex = 0;
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
      const result = input.terminationResults?.[terminationIndex++] ?? { accepted: true };
      if (result.accepted && input.terminateMakesInactive !== false) active = false;
      return result;
    }),
    setActive: (value: boolean) => { active = value; },
  };
  return backend;
};

const unavailableBackendFactory: AgentRunBackendFactory = Object.freeze({
  createBackend: () => Promise.reject(new Error("Backend factory is outside this test scenario.")),
  restoreBackend: () => Promise.reject(new Error("Backend factory is outside this test scenario.")),
});

const createManagerFixture = (input: {
  autoByteusBackendFactory?: AgentRunBackendFactory;
  codexBackendFactory?: AgentRunBackendFactory;
  claudeBackendFactory?: AgentRunBackendFactory;
  runFileChangeService?: unknown;
  publishedArtifactRelayService?: unknown;
  memoryRecorder?: unknown;
  agentToolMcpRunSessionDeactivator?: AgentToolMcpRunSessionDeactivator;
}) => {
  const runSessions = input.agentToolMcpRunSessionDeactivator
    ?? createRecordingAgentToolMcpRunSessionDeactivator().deactivator;
  const runFileChangeService = (input.runFileChangeService ?? {
    attachToRun: vi.fn(() => vi.fn()),
  }) as never;
  const publishedArtifactRelayService = (input.publishedArtifactRelayService ?? {
    attachToRun: vi.fn(() => vi.fn()),
  }) as never;
  const memoryRecorder = (input.memoryRecorder ?? {
    attachToRun: vi.fn(() => vi.fn()),
    onUserMessageForwarded: vi.fn(),
  }) as never;
  const activationRegistry = new AgentRunActivationRegistry(
    new AgentRunResourceManager({
      runSessions,
      runFileChangeService,
      publishedArtifactRelayService,
      memoryRecorder,
    }),
  );
  const autoByteusBackendFactory = input.autoByteusBackendFactory ?? unavailableBackendFactory;
  const codexBackendFactory = input.codexBackendFactory ?? unavailableBackendFactory;
  const claudeBackendFactory = input.claudeBackendFactory ?? unavailableBackendFactory;
  return {
    activationRegistry,
    manager: new AgentRunManager({
      autoByteusBackendFactory,
      codexBackendFactory,
      claudeBackendFactory,
      activationRegistry,
      memoryRecorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: runSessions,
    }),
  };
};

const createManager = (input: Parameters<typeof createManagerFixture>[0]) =>
  createManagerFixture(input).manager;

describe("AgentRunManager candidate lifecycle", () => {
  beforeEach(() => undefined);

  afterEach(() => {
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

  it("rolls back already-attached run resources when a later attachment fails", async () => {
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

  it("deactivates exactly once when a post-activation backend identity mismatch fails before attachment", async () => {
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const backend = createBackend({ runId: "different-run" });
    const manager = createManager({
      codexBackendFactory: {
        createBackend: vi.fn(async () => backend),
        restoreBackend: vi.fn(),
      },
      agentToolMcpRunSessionDeactivator: recording.deactivator,
    });

    await expect(manager.prepareNewAgentRun({
      runId: "run-before-attachment",
      config: createConfig(),
    })).rejects.toThrow("different local run identity");

    expect(recording.getDeactivatedRunIds()).toEqual(["run-before-attachment"]);
    expect(backend.terminate).toHaveBeenCalledOnce();
  });

  it("quarantines attachment rollback when exact-run session deactivation fails", async () => {
    const primary = new Error("artifact attachment failed");
    const cleanup = new Error("attached session deactivation failed");
    const deactivator = {
      deactivateForRun: vi.fn(() => { throw cleanup; }),
    };
    const manager = createManager({
      codexBackendFactory: {
        createBackend: vi.fn(async () => createBackend({ runId: "run-attach-cleanup" })),
        restoreBackend: vi.fn(),
      },
      publishedArtifactRelayService: {
        attachToRun: vi.fn(() => { throw primary; }),
      },
      agentToolMcpRunSessionDeactivator: deactivator,
    });

    const error = await manager.prepareNewAgentRun({
      runId: "run-attach-cleanup",
      config: createConfig(),
    }).catch((caught: unknown) => caught as Error & { cause?: AggregateError });

    expect(error).toMatchObject({ code: "AGENT_RUN_ACTIVATION_CLEANUP_FAILED" });
    expect(error.cause?.errors).toEqual([
      expect.objectContaining({
        name: "AgentRunResourceAttachmentError",
        errors: [primary, cleanup],
      }),
      cleanup,
    ]);
    expect(deactivator.deactivateForRun).toHaveBeenCalledTimes(1);
  });

  it.each(["create", "restore"] as const)(
    "deactivates pre-attachment sessions after a post-activation %s failure",
    async (operation) => {
      const providerFailure = new Error(`${operation} failed after activation`);
      const recording = createRecordingAgentToolMcpRunSessionDeactivator();
      const codexBackendFactory = {
        createBackend: vi.fn(async () => { throw providerFailure; }),
        restoreBackend: vi.fn(async () => { throw providerFailure; }),
      };
      const manager = createManager({
        codexBackendFactory,
        agentToolMcpRunSessionDeactivator: recording.deactivator,
      });
      const promise = operation === "create"
        ? manager.prepareNewAgentRun({ runId: "run-post-activation", config: createConfig() })
        : manager.prepareRestoreAgentRun(new AgentRunContext({
            runId: "run-post-activation",
            config: createConfig(),
            runtimeContext: null,
          }));

      await expect(promise).rejects.toMatchObject({ cause: providerFailure });
      expect(recording.getDeactivatedRunIds()).toEqual(["run-post-activation"]);
    },
  );

  it("quarantines with primary then deactivation cleanup evidence", async () => {
    const primary = new Error("provider failed after activation");
    const cleanup = new Error("session deactivation failed");
    const deactivator = {
      deactivateForRun: vi.fn(() => { throw cleanup; }),
    };
    const manager = createManager({
      codexBackendFactory: {
        createBackend: vi.fn(async () => { throw primary; }),
        restoreBackend: vi.fn(),
      },
      agentToolMcpRunSessionDeactivator: deactivator,
    });

    const error = await manager.prepareNewAgentRun({
      runId: "run-cleanup-failure",
      config: createConfig(),
    }).catch((caught: unknown) => caught as Error & { cause?: AggregateError });
    expect(error).toMatchObject({ code: "AGENT_RUN_ACTIVATION_CLEANUP_FAILED" });
    expect(error.cause).toMatchObject({
      name: "AggregateError",
      errors: [primary, cleanup],
    });
    expect(deactivator.deactivateForRun).toHaveBeenCalledWith("run-cleanup-failure");
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

  it("detaches run resources and invokes exact-run MCP cleanup after accepted termination", async () => {
    const detachRunFiles = vi.fn();
    const detachArtifacts = vi.fn();
    const detachMemory = vi.fn();
    const codexBackendFactory = {
      createBackend: vi.fn(async () => createBackend({ runId: "run-with-mcp" })),
      restoreBackend: vi.fn(),
    };
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const manager = createManager({
      codexBackendFactory,
      runFileChangeService: { attachToRun: vi.fn(() => detachRunFiles) },
      publishedArtifactRelayService: { attachToRun: vi.fn(() => detachArtifacts) },
      memoryRecorder: {
        attachToRun: vi.fn(() => detachMemory),
        onUserMessageForwarded: vi.fn(),
      },
      agentToolMcpRunSessionDeactivator: recording.deactivator,
    });
    const candidate = await manager.prepareNewAgentRun({
      runId: "run-with-mcp",
      config: createConfig(),
    });
    candidate.commitPublication();

    const prepareTermination = vi.spyOn(manager, "prepareAgentRunTermination");

    await expect(manager.terminateAgentRun("run-with-mcp")).resolves.toBe(true);

    expect(detachRunFiles).toHaveBeenCalledOnce();
    expect(detachArtifacts).toHaveBeenCalledOnce();
    expect(detachMemory).toHaveBeenCalledOnce();
    expect(recording.getDeactivatedRunIds()).toEqual(["run-with-mcp"]);
    expect(prepareTermination).toHaveBeenCalledOnce();
  });
});

describe("AgentRunManager published-run termination", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const publish = async (input: {
    runId: string;
    backend?: ReturnType<typeof createBackend>;
    deactivator?: AgentToolMcpRunSessionDeactivator;
  }) => {
    const backend = input.backend ?? createBackend({ runId: input.runId });
    const fixture = createManagerFixture({
      codexBackendFactory: {
        createBackend: vi.fn(async () => backend),
        restoreBackend: vi.fn(),
      },
      agentToolMcpRunSessionDeactivator: input.deactivator,
    });
    const candidate = await fixture.manager.prepareNewAgentRun({
      runId: input.runId,
      config: createConfig(),
    });
    return { ...fixture, backend, run: candidate.commitPublication() };
  };

  it("cancels through the exact run without releasing it and permits a fresh preparation", async () => {
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const { manager, run, backend } = await publish({
      runId: "run-cancel",
      deactivator: recording.deactivator,
    });
    const prepared = await manager.prepareAgentRunTermination(run);

    prepared.cancel();

    expect(() => prepared.commit()).toThrow("was cancelled");
    await expect(run.postUserMessage(new AgentInputUserMessage("after cancellation")))
      .resolves.toMatchObject({ accepted: true });
    expect(manager.getActiveRun(run.runId)).toBe(run);
    expect(recording.getDeactivatedRunIds()).toEqual([]);
    expect(backend.terminate).not.toHaveBeenCalled();
    await expect(manager.terminateAgentRun(run.runId)).resolves.toBe(true);
  });

  it("retries only after a rejected finish and releases once after acceptance", async () => {
    const rejected = {
      accepted: false,
      code: "TERMINATION_REJECTED",
      message: "still busy",
    } as const;
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const backend = createBackend({
      runId: "run-retry-finish",
      terminationResults: [rejected, { accepted: true }],
    });
    const { manager, run } = await publish({
      runId: "run-retry-finish",
      backend,
      deactivator: recording.deactivator,
    });
    const committed = (await manager.prepareAgentRunTermination(run)).commit();

    await expect(committed.finish()).resolves.toEqual(rejected);
    expect(manager.getActiveRun(run.runId)).toBe(run);
    expect(recording.getDeactivatedRunIds()).toEqual([]);
    await expect(committed.finish()).resolves.toEqual({ accepted: true });

    expect(backend.terminate).toHaveBeenCalledTimes(2);
    expect(recording.getDeactivatedRunIds()).toEqual([run.runId]);
    expect(manager.getActiveRun(run.runId)).toBeNull();
  });

  it("coalesces one committed finish attempt and caches successful finalization", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const backend = createBackend({ runId: "run-coalesced" });
    backend.terminate.mockImplementation(async () => {
      await gate;
      backend.setActive(false);
      return { accepted: true };
    });
    const { manager, run } = await publish({
      runId: "run-coalesced",
      backend,
      deactivator: recording.deactivator,
    });
    const firstPreparation = manager.prepareAgentRunTermination(run);
    const secondPreparation = manager.prepareAgentRunTermination(run);
    expect(secondPreparation).toBe(firstPreparation);
    const firstPrepared = await firstPreparation;
    const secondPrepared = await secondPreparation;
    expect(secondPrepared).toBe(firstPrepared);
    const committed = firstPrepared.commit();
    expect(secondPrepared.commit()).toBe(committed);

    const first = committed.finish();
    const second = committed.finish();
    expect(second).toBe(first);
    release();
    await expect(first).resolves.toEqual({ accepted: true });
    expect(committed.finish()).toBe(first);
    expect(backend.terminate).toHaveBeenCalledOnce();
    expect(recording.getDeactivatedRunIds()).toEqual([run.runId]);
  });

  it("caches accepted-but-active failure without removing or retrying", async () => {
    const recording = createRecordingAgentToolMcpRunSessionDeactivator();
    const backend = createBackend({
      runId: "run-remained-active",
      terminateMakesInactive: false,
    });
    const { manager, run } = await publish({
      runId: "run-remained-active",
      backend,
      deactivator: recording.deactivator,
    });
    const committed = (await manager.prepareAgentRunTermination(run)).commit();

    const first = committed.finish();
    await expect(first).rejects.toThrow("accepted termination but remained active");
    expect(committed.finish()).toBe(first);
    await expect(committed.finish()).rejects.toThrow("accepted termination but remained active");
    expect(backend.terminate).toHaveBeenCalledOnce();
    expect(manager.getActiveRun(run.runId)).toBe(run);
    expect(recording.getDeactivatedRunIds()).toEqual([]);
  });

  it("caches cleanup failure after exact removal and never releases twice", async () => {
    const cleanup = new Error("session cleanup failed");
    const deactivateForRun = vi.fn(() => { throw cleanup; });
    const { manager, run, backend } = await publish({
      runId: "run-cleanup-terminal",
      deactivator: { deactivateForRun },
    });
    const committed = (await manager.prepareAgentRunTermination(run)).commit();

    const first = committed.finish();
    await expect(first).rejects.toMatchObject({
      name: "AgentRunRemovalCleanupError",
      errors: [cleanup],
    });
    expect(committed.finish()).toBe(first);
    await expect(committed.finish()).rejects.toBeInstanceOf(AggregateError);
    expect(backend.terminate).toHaveBeenCalledOnce();
    expect(deactivateForRun).toHaveBeenCalledOnce();
  });

  it.each(["not_found", "identity_mismatch"] as const)(
    "treats exact-current removal %s as terminal without resource cleanup",
    async (kind) => {
      const recording = createRecordingAgentToolMcpRunSessionDeactivator();
      const { manager, activationRegistry, run, backend } = await publish({
        runId: `run-${kind}`,
        deactivator: recording.deactivator,
      });
      const removal = kind === "not_found"
        ? { kind, runId: run.runId, reason: "explicit_termination" as const }
        : {
            kind,
            runId: run.runId,
            expectedRun: run,
            currentRun: { runId: run.runId } as never,
            reason: "explicit_termination" as const,
          };
      vi.spyOn(activationRegistry, "removeIfCurrent").mockReturnValue(removal);
      const committed = (await manager.prepareAgentRunTermination(run)).commit();

      const first = committed.finish();
      await expect(first).rejects.toThrow("is no longer the current published run");
      expect(committed.finish()).toBe(first);
      expect(backend.terminate).toHaveBeenCalledOnce();
      expect(recording.getDeactivatedRunIds()).toEqual([]);
    },
  );

  it("rejects a missing or different exact instance before lower-level preparation", async () => {
    const { manager, run } = await publish({ runId: "run-exact-instance" });
    const prepareTermination = vi.fn();
    const impostor = { runId: run.runId, prepareTermination };

    await expect(manager.prepareAgentRunTermination(impostor as never))
      .rejects.toThrow("is not the current published run");
    expect(prepareTermination).not.toHaveBeenCalled();

    await manager.terminateAgentRun(run.runId);
    await expect(manager.prepareAgentRunTermination(run))
      .rejects.toThrow("is not the current published run");
  });

  it("routes stop-all active runs through the managed prepared boundary", async () => {
    const { manager, run } = await publish({ runId: "run-stop-all" });
    const prepareTermination = vi.spyOn(manager, "prepareAgentRunTermination");

    await expect(manager.stopAllAgentRuns()).resolves.toBeUndefined();

    expect(prepareTermination).toHaveBeenCalledWith(run);
    expect(manager.listActiveRuns()).toEqual([]);
  });
});
