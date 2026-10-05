import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { StandaloneRunCommandPort } from "../../../src/agent-execution/services/standalone-run-ports.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));
const RUN_ID = "standalone-run-1";
/** The member context a run's root builds for its (collaboration-eligible) host. */
const HOST_CONTEXT = { identity: { agentRunId: RUN_ID }, teamScoped: false } as never;
const HOST = { memberExecutionContext: HOST_CONTEXT };
const CLAUDE_SESSION_ID = "22222222-2222-4222-8222-222222222222";

const metadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: RUN_ID,
  agentDefinitionId: "agent-1",
  workspaceRootPath: "/tmp/standalone-workspace",
  memoryDir: "/tmp/standalone-memory",
  llmModelIdentifier: "haiku",
  llmConfig: null,
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  platformAgentRunId: null,
  preparedAt: "2026-08-17T20:00:00.000Z",
  preparedExpiresAt: null,
  startedAt: null,
  applicationExecutionContext: null,
  ...overrides,
});

const candidate = (input: {
  runtimeKind?: RuntimeKind;
  platformAgentRunId?: string | null;
  run?: unknown;
  abortResult?: { kind: "aborted" } | { kind: "quarantined"; error: Error };
  order?: string[];
} = {}) => {
  const run = input.run ?? { runId: RUN_ID };
  return {
    runId: RUN_ID,
    runtimeKind: input.runtimeKind ?? RuntimeKind.CLAUDE_AGENT_SDK,
    platformAgentRunId: Object.prototype.hasOwnProperty.call(input, "platformAgentRunId")
      ? input.platformAgentRunId ?? null
      : CLAUDE_SESSION_ID,
    commitPublication: vi.fn(() => {
      input.order?.push("publish");
      return run;
    }),
    abort: vi.fn(async () => input.abortResult ?? { kind: "aborted" as const }),
  };
};

const harness = (input: {
  metadataStates: unknown[];
  preparedCandidate?: ReturnType<typeof candidate>;
  restoredCandidate?: ReturnType<typeof candidate>;
  recordRunStarted?: ReturnType<typeof vi.fn>;
  getCatalogRow?: ReturnType<typeof vi.fn>;
  commitRunModelConfig?: ReturnType<typeof vi.fn>;
  validateModelConfig?: ReturnType<typeof vi.fn>;
}) => {
  const states = [...input.metadataStates];
  const metadataService = {
    readMetadataState: vi.fn(async () => states.length > 1 ? states.shift() : states[0]),
  };
  const agentRunManager = testActivationManager({
    getActiveRun: vi.fn(() => null),
    newPreparation: vi.fn(async () => input.preparedCandidate),
    platformPreparation: vi.fn(async () => input.restoredCandidate),
    restorePreparation: vi.fn(async () => input.restoredCandidate),
  });
  const historyCatalogService = {
    recordRunStarted: input.recordRunStarted ?? vi.fn(async (target: AgentRunMetadata) => target),
    recordRunSummary: vi.fn(async () => undefined),
    getCatalogRow: input.getCatalogRow ?? vi.fn(async () => ({ archivedAt: null })),
    commitRunModelConfig: input.commitRunModelConfig ?? vi.fn(),
  };
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })),
  };
  const service = new StandaloneAgentRunLifecycleService("/unused", {
    metadataService: metadataService as never,
    agentRunManager: agentRunManager as never,
    historyCatalogService: historyCatalogService as never,
    workspaceManager: workspaceManager as never,
    modelSelectionValidator: {
      validate: input.validateModelConfig ?? vi.fn(async ({ selection }) => ({
        kind: "valid" as const,
        selection,
      })),
    },
  });
  return { service, metadataService, agentRunManager, historyCatalogService, workspaceManager };
};

const commandReadyRun = () => ({
  runId: RUN_ID,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  isActive: () => true,
  subscribeToEvents: vi.fn(() => () => undefined),
  postUserMessage: vi.fn(async (_message, options) => {
    options.lifecycleObserver({ kind: "admitted" });
    options.lifecycleObserver({
      kind: "forwarded",
      dispatchKind: "start_turn",
      turnId: "external-turn-1",
    });
    return { accepted: true, turnId: "external-turn-1" };
  }),
});

/** The eligible run's root, reduced to its host-command order: ready, bind, post. */
const rootCommandPort = (current: ReturnType<typeof harness>): StandaloneRunCommandPort => ({
  postUserMessage: async (input) => {
    const { run } = await current.service.activateHost(input.runId, HOST);
    input.onActiveRunReady?.(run);
    return { kind: "posted", run, post: await run.postUserMessage(input.message, input.postOptions) };
  },
});

const exactCommandCoordinator = (
  current: ReturnType<typeof harness>,
  standaloneRuns: StandaloneRunCommandPort = rootCommandPort(current),
): AgentRunCommandCoordinator => {
  const agentRunService = new AgentRunService("/unused", {
    agentRunManager: current.agentRunManager as never,
    metadataService: current.metadataService as never,
    historyCatalogService: current.historyCatalogService as never,
    workspaceManager: current.workspaceManager as never,
    provisioningService: {} as never,
    lifecycleService: current.service,
  });
  return new AgentRunCommandCoordinator({
    agentRunService,
    registry: new AgentRunCommandRegistry(),
    overlayStore: new AgentRunCommandStatusOverlayStore(),
    projectionService: {
      getRunStatusProjection: vi.fn(async () => ({
        statusPayload: { status: "running", agent_id: RUN_ID },
      })),
    } as never,
    broadcaster: { publishToRun: vi.fn(() => 1) } as never,
    standaloneRuns,
  });
};

describe("StandaloneAgentRunLifecycleService", () => {
  it.each(["omitted", null, undefined] as const)(
    "rejects a %s root-selected model validator",
    (value) => {
      const deps: Record<string, unknown> = {
        agentRunManager: {},
        metadataService: {},
        historyCatalogService: {},
        workspaceManager: {},
        tokenUsageReadiness: {},
        modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn() },
      };
      if (value === "omitted") delete deps.modelSelectionValidator;
      else deps.modelSelectionValidator = value;
      expect(() => Reflect.construct(
        StandaloneAgentRunLifecycleService,
        ["/unused", deps],
      )).toThrow("modelSelectionValidator is required.");
    },
  );

  it("rejects a pre-existing run before any provider candidate is constructed while history is degraded", async () => {
    configureTokenUsageMigrationReadiness({
      kind: "CURRENT_SCHEMA_DEGRADED",
      migrationStatus: "FAILED",
      logPath: "/tmp/token-migration.log",
    });
    try {
      const started = metadata({ platformAgentRunId: CLAUDE_SESSION_ID, startedAt: "2026-08-17T20:05:00.000Z" });
      const current = harness({ metadataStates: [{ kind: "present", metadata: started }] });
      await expect(current.service.activateHost(RUN_ID, HOST)).rejects.toMatchObject({
        code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED",
      });
      expect(current.agentRunManager.platformPreparation).not.toHaveBeenCalled();
      expect(current.workspaceManager.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    } finally {
      configureTokenUsageMigrationReadiness({ kind: "READY" });
    }
  });

  it("shares one prepared activation and durably records the provider UUID before publication", async () => {
    const order: string[] = [];
    const prepared = metadata();
    const run = { runId: RUN_ID };
    const preparedCandidate = candidate({ run, order });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const recordRunStarted = vi.fn(async (target: AgentRunMetadata) => {
      order.push("persist-start");
      await gate;
      order.push("persist-finish");
      return target;
    });
    const current = harness({
      metadataStates: [{ kind: "present", metadata: prepared }],
      preparedCandidate,
      recordRunStarted,
    });
    preparedCandidate.commitPublication.mockImplementation(() => {
      order.push("publish");
      current.agentRunManager.getActiveRun.mockReturnValue(run);
      return run;
    });

    const first = current.service.activateHost(RUN_ID, HOST).then((result) => result.run);
    const second = current.service.activateHost(RUN_ID, HOST).then((result) => result.run);
    await vi.waitFor(() => expect(recordRunStarted).toHaveBeenCalledOnce());
    expect(preparedCandidate.commitPublication).not.toHaveBeenCalled();
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([run, run]);
    expect(current.metadataService.readMetadataState).toHaveBeenCalledTimes(2);
    expect(current.agentRunManager.newPreparation).toHaveBeenCalledOnce();
    expect(current.agentRunManager.newPreparation).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ workspaceId: "workspace-1" }),
    });
    expect(recordRunStarted).toHaveBeenCalledWith(expect.objectContaining({
      runId: RUN_ID,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: CLAUDE_SESSION_ID,
      startedAt: expect.any(String),
    }));
    expect(order).toEqual(["persist-start", "persist-finish", "publish"]);
  });

  it("attaches the root-built host member context at config build and requires it for an eligible run (AR-003)", async () => {
    const order: string[] = [];
    const run = { runId: RUN_ID };
    const preparedCandidate = candidate({ run, order });
    const current = harness({ metadataStates: [{ kind: "present", metadata: metadata() }], preparedCandidate });

<<<<<<< HEAD
    await expect(current.service.activatePreparedRun(RUN_ID)).resolves.toBe(run);
    expect(current.agentRunManager.newPreparation).toHaveBeenCalledWith({
=======
    await expect(current.service.activateHost(RUN_ID, { memberExecutionContext: null }))
      .rejects.toThrow("is activated only by its standalone run root");
    expect(current.agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();

    await expect(current.service.activateHost(RUN_ID, HOST)).resolves.toMatchObject({ run });
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledWith({
>>>>>>> origin/personal
      runId: RUN_ID,
      config: expect.objectContaining({ memberExecutionContext: HOST_CONTEXT }),
    });
    expect(order).toEqual(["publish"]);
  });

  it("activates helpers and application-owned runs without a member context and refuses one", async () => {
    const run = { runId: RUN_ID };
    const helper = metadata({ launchPurpose: "server_helper" });
    const current = harness({ metadataStates: [{ kind: "present", metadata: helper }], preparedCandidate: candidate({ run }) });
    await expect(current.service.activateHost(RUN_ID, HOST)).rejects.toThrow("cannot host collaborators");
    await expect(current.service.activateHost(RUN_ID, { memberExecutionContext: null })).resolves.toMatchObject({ run });
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ memberExecutionContext: null }),
    });
  });

  it("stops a live host and records it terminated; a host that is not running is left as is", async () => {
    const current = harness({ metadataStates: [{ kind: "present", metadata: metadata() }] });
    Object.assign(current.agentRunManager, { terminateAgentRun: vi.fn(async () => true) });
    Object.assign(current.historyCatalogService, { recordRunTerminated: vi.fn(async () => undefined) });
    await expect(current.service.terminateHost(RUN_ID)).resolves.toEqual({ outcome: "not_active", runtimeKind: null });
    current.agentRunManager.getActiveRun.mockReturnValue({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK } as never);
    await expect(current.service.terminateHost(RUN_ID)).resolves.toEqual({ outcome: "terminated", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
    expect((current.historyCatalogService as unknown as { recordRunTerminated: ReturnType<typeof vi.fn> }).recordRunTerminated).toHaveBeenCalledOnce();
  });

  it("restores a started external run from only its exact durable provider identity", async () => {
    const started = metadata({ platformAgentRunId: CLAUDE_SESSION_ID, startedAt: "2026-08-17T20:05:00.000Z" });
    const restoredCandidate = candidate();
    const current = harness({
      metadataStates: [{ kind: "present", metadata: started }],
      restoredCandidate,
    });

    await expect(current.service.activateHost(RUN_ID, HOST)).resolves.toMatchObject({
      run: { runId: RUN_ID },
      metadata: { platformAgentRunId: CLAUDE_SESSION_ID },
    });
    expect(current.agentRunManager.platformPreparation).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }),
      platformAgentRunId: CLAUDE_SESSION_ID,
    });
    expect(current.agentRunManager.newPreparation).not.toHaveBeenCalled();
    expect(restoredCandidate.commitPublication).toHaveBeenCalledOnce();
  });

  it.each([null, RUN_ID])("fails closed for an invalid external provider identity %s", async (platformAgentRunId) => {
    const started = metadata({ platformAgentRunId, startedAt: "2026-08-17T20:05:00.000Z" });
    const current = harness({ metadataStates: [{ kind: "present", metadata: started }] });

    await expect(current.service.activateHost(RUN_ID, HOST)).rejects.toMatchObject({
      code: "PLATFORM_AGENT_RUN_BINDING_INVALID",
    });
    expect(current.agentRunManager.platformPreparation).not.toHaveBeenCalled();
    expect(current.agentRunManager.newPreparation).not.toHaveBeenCalled();
  });

  it("restores native local state through the generic path and clears a legacy self binding", async () => {
    const started = metadata({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "deepseek-v4-flash",
      platformAgentRunId: RUN_ID,
      startedAt: "2026-08-17T20:05:00.000Z",
    });
    const restoredCandidate = candidate({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
    });
    const current = harness({
      metadataStates: [{ kind: "present", metadata: started }],
      restoredCandidate,
    });

    await expect(current.service.activateHost(RUN_ID, HOST)).resolves.toMatchObject({
      metadata: { runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null },
    });
    expect(current.agentRunManager.restorePreparation).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
    );
    expect(current.agentRunManager.platformPreparation).not.toHaveBeenCalled();
    expect(current.historyCatalogService.recordRunStarted).toHaveBeenCalledWith(
      expect.objectContaining({ platformAgentRunId: null }),
    );
  });

  it("aborts a prepared candidate and permits retry only when unchanged prepared metadata is confirmed", async () => {
    const prepared = metadata();
    const firstCandidate = candidate();
    const secondCandidate = candidate();
    const recordRunStarted = vi.fn()
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async (target: AgentRunMetadata) => target);
    const current = harness({
      metadataStates: [
        { kind: "present", metadata: prepared },
        { kind: "present", metadata: prepared },
      ],
      preparedCandidate: firstCandidate,
      recordRunStarted,
    });
    current.agentRunManager.newPreparation
      .mockResolvedValueOnce(firstCandidate)
      .mockResolvedValueOnce(secondCandidate);

    await expect(current.service.activateHost(RUN_ID, HOST).then((result) => result.run))
      .rejects.toThrow("activation metadata did not commit");
    expect(firstCandidate.abort).toHaveBeenCalledOnce();

<<<<<<< HEAD
    await expect(current.service.activatePreparedRun(RUN_ID)).resolves.toMatchObject({ runId: RUN_ID });
    expect(current.agentRunManager.newPreparation).toHaveBeenCalledTimes(2);
=======
    await expect(current.service.activateHost(RUN_ID, HOST).then((result) => result.run)).resolves.toMatchObject({ runId: RUN_ID });
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledTimes(2);
>>>>>>> origin/personal
    expect(secondCandidate.commitPublication).toHaveBeenCalledOnce();
  });

  it("quarantines an indeterminate started commit and never creates a replacement in-process", async () => {
    const started = metadata({ platformAgentRunId: CLAUDE_SESSION_ID, startedAt: "2026-08-17T20:05:00.000Z" });
    const restoredCandidate = candidate();
    const current = harness({
      metadataStates: [
        { kind: "present", metadata: started },
        { kind: "unreadable", error: new Error("partial metadata") },
      ],
      restoredCandidate,
      recordRunStarted: vi.fn(async () => null),
    });

    await expect(current.service.activateHost(RUN_ID, HOST)).rejects.toMatchObject({
      code: "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
    });
    expect(restoredCandidate.abort).toHaveBeenCalledOnce();
    await expect(current.service.activateHost(RUN_ID, HOST)).rejects.toMatchObject({
      code: "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
    });
    expect(current.agentRunManager.platformPreparation).toHaveBeenCalledOnce();
  });

  it("validates and commits only the model configuration of an inactive run", async () => {
    const stopped = metadata({
      startedAt: "2026-08-17T20:05:00.000Z",
      llmConfig: { effort: "low" },
    });
    const updated = metadata({
      llmModelIdentifier: "sonnet",
      startedAt: "2026-08-17T20:05:00.000Z",
      llmConfig: { effort: "high" },
    });
    const commitRunModelConfig = vi.fn(async () => ({
      kind: "committed" as const,
      metadata: updated,
    }));
    const validateModelConfig = vi.fn(async () => ({
      kind: "valid" as const,
      selection: { llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } },
    }));
    const current = harness({
      metadataStates: [{ kind: "present", metadata: stopped }],
      commitRunModelConfig,
      validateModelConfig,
    });

    await expect(current.service.updateStoppedModelConfig({
      agentRunId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    })).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      canonical: updated,
      editability: { editable: true },
    });
    expect(validateModelConfig).toHaveBeenCalledWith({
      context: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, currentModelIdentifier: "haiku", workspaceRootPath: stopped.workspaceRootPath },
      selection: { llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } },
    });
    expect(commitRunModelConfig).toHaveBeenCalledWith({
      runId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    });
  });

  it("refuses a model-configuration update when the run became active", async () => {
    const stopped = metadata({ startedAt: "2026-08-17T20:05:00.000Z" });
    const validateModelConfig = vi.fn();
    const commitRunModelConfig = vi.fn();
    const current = harness({
      metadataStates: [{ kind: "present", metadata: stopped }],
      commitRunModelConfig,
      validateModelConfig,
    });
    current.agentRunManager.getActiveRun.mockReturnValue({ runId: RUN_ID });

    await expect(current.service.updateStoppedModelConfig({
      agentRunId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
    });
    expect(validateModelConfig).not.toHaveBeenCalled();
    expect(commitRunModelConfig).not.toHaveBeenCalled();
  });

  it("holds restore behind a stopped-model-config commit in the same per-run lane", async () => {
    const stopped = metadata({
      startedAt: "2026-08-17T20:05:00.000Z",
      platformAgentRunId: CLAUDE_SESSION_ID,
      llmConfig: { effort: "low" },
    });
    const updated = metadata({
      llmModelIdentifier: "sonnet",
      startedAt: "2026-08-17T20:05:00.000Z",
      platformAgentRunId: CLAUDE_SESSION_ID,
      llmConfig: { effort: "high" },
    });
    let releaseValidation!: () => void;
    const validationBarrier = new Promise<void>((resolve) => { releaseValidation = resolve; });
    const validateModelConfig = vi.fn(async () => {
      await validationBarrier;
      return { kind: "valid" as const, selection: { llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } } };
    });
    const commitRunModelConfig = vi.fn(async () => ({
      kind: "committed" as const,
      metadata: updated,
    }));
    const restoredCandidate = candidate();
    const current = harness({
      metadataStates: [
        { kind: "present", metadata: stopped },
        { kind: "present", metadata: updated },
      ],
      restoredCandidate,
      commitRunModelConfig,
      validateModelConfig,
    });

    const save = current.service.updateStoppedModelConfig({
      agentRunId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    });
    await vi.waitFor(() => expect(validateModelConfig).toHaveBeenCalledOnce());
    const restore = current.service.activateHost(RUN_ID, HOST);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(current.agentRunManager.platformPreparation).not.toHaveBeenCalled();

    releaseValidation();
    await expect(save).resolves.toMatchObject({ outcome: "UPDATED", canonical: updated });
    await expect(restore).resolves.toMatchObject({ metadata: updated });
    expect(commitRunModelConfig).toHaveBeenCalledOnce();
    expect(current.agentRunManager.platformPreparation).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } }),
      platformAgentRunId: CLAUDE_SESSION_ID,
    });
  });

  it("orders the exact external command resolver after a stopped Save and restores the committed config", async () => {
    const stopped = metadata({
      startedAt: "2026-08-17T20:05:00.000Z",
      platformAgentRunId: CLAUDE_SESSION_ID,
      llmConfig: { effort: "low" },
    });
    const updated = metadata({
      llmModelIdentifier: "sonnet",
      startedAt: "2026-08-17T20:05:00.000Z",
      platformAgentRunId: CLAUDE_SESSION_ID,
      llmConfig: { effort: "high" },
    });
    let releaseValidation!: () => void;
    const validationBarrier = new Promise<void>((resolve) => { releaseValidation = resolve; });
    const validateModelConfig = vi.fn(async () => {
      await validationBarrier;
      return { kind: "valid" as const, selection: { llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } } };
    });
    const commitRunModelConfig = vi.fn(async () => ({
      kind: "committed" as const,
      metadata: updated,
    }));
    const activeRun = commandReadyRun();
    const restoredCandidate = candidate({ run: activeRun });
    const current = harness({
      metadataStates: [
        { kind: "present", metadata: stopped },
        { kind: "present", metadata: updated },
      ],
      restoredCandidate,
      commitRunModelConfig,
      validateModelConfig,
    });
    restoredCandidate.commitPublication.mockImplementation(() => {
      current.agentRunManager.getActiveRun.mockReturnValue(activeRun);
      return activeRun;
    });
    const coordinator = exactCommandCoordinator(current);

    const save = current.service.updateStoppedModelConfig({
      agentRunId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    });
    await vi.waitFor(() => expect(validateModelConfig).toHaveBeenCalledOnce());
    const dispatch = coordinator.postUserMessage({
      runId: RUN_ID,
      messageId: "external-message-save-first",
      dedupeKey: "user-command:save-first",
      message: new AgentInputUserMessage("external message after Save enters"),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(current.agentRunManager.platformPreparation).not.toHaveBeenCalled();

    releaseValidation();
    await expect(save).resolves.toMatchObject({ outcome: "UPDATED", canonical: updated });
    await expect(dispatch).resolves.toMatchObject({
      ack: { accepted: true, state: "accepted" },
      turnId: "external-turn-1",
    });
    expect(current.agentRunManager.platformPreparation).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ llmModelIdentifier: "sonnet", llmConfig: { effort: "high" } }),
      platformAgentRunId: CLAUDE_SESSION_ID,
    });
    expect(activeRun.postUserMessage).toHaveBeenCalledOnce();
  });

  it("returns RUN_ACTIVE when the exact external command resolver activates before Save", async () => {
    const stopped = metadata({
      startedAt: "2026-08-17T20:05:00.000Z",
      platformAgentRunId: CLAUDE_SESSION_ID,
      llmConfig: { effort: "low" },
    });
    const activeRun = commandReadyRun();
    const restoredCandidate = candidate({ run: activeRun });
    const validateModelConfig = vi.fn();
    const commitRunModelConfig = vi.fn();
    const current = harness({
      metadataStates: [{ kind: "present", metadata: stopped }],
      restoredCandidate,
      validateModelConfig,
      commitRunModelConfig,
    });
    restoredCandidate.commitPublication.mockImplementation(() => {
      current.agentRunManager.getActiveRun.mockReturnValue(activeRun);
      return activeRun;
    });
    const coordinator = exactCommandCoordinator(current);

    await expect(coordinator.postUserMessage({
      runId: RUN_ID,
      messageId: "external-message-restore-first",
      dedupeKey: "user-command:restore-first",
      message: new AgentInputUserMessage("external message before Save"),
    })).resolves.toMatchObject({
      ack: { accepted: true, state: "accepted" },
      turnId: "external-turn-1",
    });

    await expect(current.service.updateStoppedModelConfig({
      agentRunId: RUN_ID,
      llmModelIdentifier: "sonnet",
      llmConfig: { effort: "high" },
    })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      canonical: stopped,
      isActive: true,
    });
    expect(validateModelConfig).not.toHaveBeenCalled();
    expect(commitRunModelConfig).not.toHaveBeenCalled();
  });

  it("hands mentions to the run's root and maps its admission outcome to the command ack", async () => {
    const activeRun = commandReadyRun();
    const current = harness({ metadataStates: [{ kind: "present", metadata: metadata({ startedAt: "2026-08-17T20:01:00.000Z" }) }] });
    current.agentRunManager.getActiveRun.mockReturnValue(activeRun);
    const mentions = [{ kind: "agent_team" as const, definitionId: "product-team" }];
    const port = (outcome: "posted" | "rejected" | "failed"): StandaloneRunCommandPort => ({
      postUserMessage: vi.fn(async (input) => {
        expect(input.mentions).toEqual(mentions);
        input.onActiveRunReady?.(activeRun as never);
        if (outcome === "rejected") return { kind: "admission_rejected", run: activeRun as never,
          admission: { admitted: false as const, code: "COLLABORATOR_MENTION_UNAVAILABLE" as const, message: "Product Team is already in this run." } };
        if (outcome === "failed") return { kind: "admission_failed", run: activeRun as never, message: "catalog unavailable" };
        return { kind: "posted", run: activeRun as never, post: await activeRun.postUserMessage(input.message, input.postOptions) };
      }),
    });
    await expect(exactCommandCoordinator(current, port("posted")).postUserMessage({
      runId: RUN_ID, messageId: "m-1", dedupeKey: "d-1", message: new AgentInputUserMessage("Ask @Product Team"), mentions,
    })).resolves.toMatchObject({ ack: { accepted: true } });
    expect(activeRun.postUserMessage.mock.calls[0]![0].metadata).toMatchObject({ message_id: "m-1", dedupe_key: "d-1" });

    await expect(exactCommandCoordinator(current, port("rejected")).postUserMessage({
      runId: RUN_ID, messageId: "m-2", dedupeKey: "d-2", message: new AgentInputUserMessage("again"), mentions,
    })).resolves.toMatchObject({ ack: { accepted: false, state: "rejected", code: "COLLABORATOR_MENTION_UNAVAILABLE" } });
    await expect(exactCommandCoordinator(current, port("failed")).postUserMessage({
      runId: RUN_ID, messageId: "m-3", dedupeKey: "d-3", message: new AgentInputUserMessage("again"), mentions,
    })).resolves.toMatchObject({ ack: { accepted: false, state: "failed", code: "COLLABORATOR_ADMISSION_FAILED" } });
    expect(activeRun.postUserMessage).toHaveBeenCalledOnce();
  });

  it("keeps helpers on the plain path: a mention is unavailable and nothing is posted", async () => {
    const activeRun = commandReadyRun();
    const current = harness({ metadataStates: [{ kind: "present", metadata: metadata({ launchPurpose: "server_helper", startedAt: "2026-08-17T20:01:00.000Z" }) }] });
    current.agentRunManager.getActiveRun.mockReturnValue(activeRun);
    const plain: StandaloneRunCommandPort = { postUserMessage: vi.fn(async () => null) };
    await expect(exactCommandCoordinator(current, plain).postUserMessage({
      runId: RUN_ID, messageId: "m-1", dedupeKey: "d-1", message: new AgentInputUserMessage("Ask @Product Team"),
      mentions: [{ kind: "agent_team", definitionId: "product-team" }],
    })).resolves.toMatchObject({ ack: { accepted: false, state: "rejected", code: "COLLABORATOR_MENTION_UNAVAILABLE" } });
    await expect(exactCommandCoordinator(current, plain).postUserMessage({
      runId: RUN_ID, messageId: "m-2", dedupeKey: "d-2", message: new AgentInputUserMessage("hello"),
    })).resolves.toMatchObject({ ack: { accepted: true } });
    expect(activeRun.postUserMessage).toHaveBeenCalledOnce();
  });
});
