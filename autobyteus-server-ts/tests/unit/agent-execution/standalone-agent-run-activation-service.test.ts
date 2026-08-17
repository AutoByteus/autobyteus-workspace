import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it, vi } from "vitest";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { StandaloneAgentRunActivationService } from "../../../src/agent-execution/services/standalone-agent-run-activation-service.js";

const RUN_ID = "standalone-run-1";
const CLAUDE_SESSION_ID = "22222222-2222-4222-8222-222222222222";

const metadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: RUN_ID,
  agentDefinitionId: "agent-1",
  workspaceRootPath: "/tmp/standalone-workspace",
  memoryDir: "/tmp/standalone-memory",
  llmModelIdentifier: "haiku",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
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
}) => {
  const states = [...input.metadataStates];
  const metadataService = {
    readMetadataState: vi.fn(async () => states.length > 1 ? states.shift() : states[0]),
  };
  const agentRunManager = {
    getActiveRun: vi.fn(() => null),
    prepareNewAgentRun: vi.fn(async () => input.preparedCandidate),
    prepareRestoreAgentRunFromPlatformState: vi.fn(async () => input.restoredCandidate),
    prepareRestoreAgentRun: vi.fn(async () => input.restoredCandidate),
  };
  const historyCatalogService = {
    recordRunStarted: input.recordRunStarted ?? vi.fn(async (target: AgentRunMetadata) => target),
  };
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })),
  };
  const service = new StandaloneAgentRunActivationService("/unused", {
    metadataService: metadataService as never,
    agentRunManager: agentRunManager as never,
    historyCatalogService: historyCatalogService as never,
    workspaceManager: workspaceManager as never,
  });
  return { service, metadataService, agentRunManager, historyCatalogService, workspaceManager };
};

describe("StandaloneAgentRunActivationService", () => {
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

    const first = current.service.activatePreparedRun(RUN_ID);
    const second = current.service.resolveCommandReadyAgentRun(RUN_ID);
    await vi.waitFor(() => expect(recordRunStarted).toHaveBeenCalledOnce());
    expect(preparedCandidate.commitPublication).not.toHaveBeenCalled();
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([run, run]);
    expect(current.metadataService.readMetadataState).toHaveBeenCalledOnce();
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledOnce();
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledWith({
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

  it("restores a started external run from only its exact durable provider identity", async () => {
    const started = metadata({ platformAgentRunId: CLAUDE_SESSION_ID, startedAt: "2026-08-17T20:05:00.000Z" });
    const restoredCandidate = candidate();
    const current = harness({
      metadataStates: [{ kind: "present", metadata: started }],
      restoredCandidate,
    });

    await expect(current.service.restorePersistedRun(RUN_ID)).resolves.toMatchObject({
      run: { runId: RUN_ID },
      metadata: { platformAgentRunId: CLAUDE_SESSION_ID },
    });
    expect(current.agentRunManager.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith({
      runId: RUN_ID,
      config: expect.objectContaining({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }),
      platformAgentRunId: CLAUDE_SESSION_ID,
    });
    expect(current.agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(restoredCandidate.commitPublication).toHaveBeenCalledOnce();
  });

  it.each([null, RUN_ID])("fails closed for an invalid external provider identity %s", async (platformAgentRunId) => {
    const started = metadata({ platformAgentRunId, startedAt: "2026-08-17T20:05:00.000Z" });
    const current = harness({ metadataStates: [{ kind: "present", metadata: started }] });

    await expect(current.service.restorePersistedRun(RUN_ID)).rejects.toMatchObject({
      code: "PLATFORM_AGENT_RUN_BINDING_INVALID",
    });
    expect(current.agentRunManager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(current.agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
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

    await expect(current.service.restorePersistedRun(RUN_ID)).resolves.toMatchObject({
      metadata: { runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null },
    });
    expect(current.agentRunManager.prepareRestoreAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
    );
    expect(current.agentRunManager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
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
    current.agentRunManager.prepareNewAgentRun
      .mockResolvedValueOnce(firstCandidate)
      .mockResolvedValueOnce(secondCandidate);

    await expect(current.service.activatePreparedRun(RUN_ID))
      .rejects.toThrow("activation metadata did not commit");
    expect(firstCandidate.abort).toHaveBeenCalledOnce();

    await expect(current.service.activatePreparedRun(RUN_ID)).resolves.toMatchObject({ runId: RUN_ID });
    expect(current.agentRunManager.prepareNewAgentRun).toHaveBeenCalledTimes(2);
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

    await expect(current.service.restorePersistedRun(RUN_ID)).rejects.toMatchObject({
      code: "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
    });
    expect(restoredCandidate.abort).toHaveBeenCalledOnce();
    await expect(current.service.restorePersistedRun(RUN_ID)).rejects.toMatchObject({
      code: "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
    });
    expect(current.agentRunManager.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledOnce();
  });
});
