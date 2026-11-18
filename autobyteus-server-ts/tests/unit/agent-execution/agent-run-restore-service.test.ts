import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const metadata = (): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/agent-run-service-test/agents/run-1",
  llmModelIdentifier: "gpt-test",
  llmConfig: { reasoning_effort: "medium" },
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-old",
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  startedAt: "2026-05-17T00:05:00.000Z",
});

const createSubject = () => {
  const restored = {
    run: { runId: "run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
    metadata: metadata(),
  };
  const lifecycleService = Object.assign(
    Object.create(StandaloneAgentRunLifecycleService.prototype) as StandaloneAgentRunLifecycleService,
    {
    activateHost: vi.fn().mockResolvedValue(restored),
    },
  );
  const service = new AgentRunService("/tmp/agent-run-service-test", {
    agentRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as never,
    metadataService: {} as never,
    historyCatalogService: {} as never,
    provisioningService: {} as never,
    lifecycleService,
  });
  return { lifecycleService, restored, service };
};

describe("AgentRunService restore", () => {
  it("normalizes identity and delegates restore to the lifecycle owner", async () => {
    const { lifecycleService, restored, service } = createSubject();

    await expect(service.restoreAgentRun(" run-1 ")).resolves.toBe(restored);
    expect(lifecycleService.activateHost).toHaveBeenCalledExactlyOnceWith("run-1", { memberExecutionContext: null });
  });

  it("preserves lifecycle-owner restore failures", async () => {
    const { lifecycleService, service } = createSubject();
    lifecycleService.activateHost.mockRejectedValueOnce(
      new Error("Run 'run-missing' was not found."),
    );

    await expect(service.restoreAgentRun("run-missing")).rejects.toThrow(
      "Run 'run-missing' was not found.",
    );
  });

  it("rejects a blank identity before entering the lifecycle owner", async () => {
    const { lifecycleService, service } = createSubject();

    await expect(service.restoreAgentRun("   ")).rejects.toThrow("runId is required.");
    expect(lifecycleService.activateHost).not.toHaveBeenCalled();
  });
});

describe("AgentRunService routes an eligible standalone run through its root (AR-003)", () => {
  const subject = (owned: boolean) => {
    const run = { runId: "run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER };
    const activation = { run, metadata: metadata() };
    const lifecycleService = Object.assign(
      Object.create(StandaloneAgentRunLifecycleService.prototype) as StandaloneAgentRunLifecycleService,
      { activateHost: vi.fn().mockResolvedValue(activation), updateStoppedSelection: vi.fn() },
    );
    const standaloneRuns = {
      resolveRootAndEnsureHost: vi.fn(async () => owned ? activation : null),
      stopRoot: vi.fn(async () => null),
      refreshInheritedLaunch: vi.fn(async () => undefined),
    };
    const provisioningService = { prepareAgentRun: vi.fn(async () => ({ runId: "run-1" })) };
    const service = new AgentRunService("/tmp/agent-run-service-test", {
      agentRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as never,
      metadataService: {} as never,
      historyCatalogService: {} as never,
      provisioningService: provisioningService as never,
      lifecycleService,
      standaloneRuns,
    });
    return { service, lifecycleService, standaloneRuns, activation };
  };

  it("create, restore and resolve make the host ready through the root, never the lifecycle directly", async () => {
    const { service, lifecycleService, standaloneRuns, activation } = subject(true);
    await expect(service.createAgentRun({} as never)).resolves.toEqual({ runId: "run-1" });
    await expect(service.restoreAgentRun("run-1")).resolves.toBe(activation);
    await expect(service.resolveAgentRun("run-1")).resolves.toBe(activation.run);
    await expect(service.activatePreparedRun("run-1")).resolves.toBe(activation.run);
    expect(standaloneRuns.resolveRootAndEnsureHost).toHaveBeenCalledTimes(4);
    expect(lifecycleService.activateHost).not.toHaveBeenCalled();
  });

  it("a run that cannot host delegated copies is activated directly without a member context", async () => {
    const { service, lifecycleService, standaloneRuns } = subject(false);
    await service.restoreAgentRun("run-1");
    expect(standaloneRuns.resolveRootAndEnsureHost).toHaveBeenCalledWith("run-1");
    expect(lifecycleService.activateHost).toHaveBeenCalledExactlyOnceWith("run-1", { memberExecutionContext: null });
  });

  const edit = { agentRunId: "run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "m", llmConfig: null };

  it("a saved edit of a stopped run is followed by its registered root (FU-008, AC-001/AC-004)", async () => {
    const { service, lifecycleService, standaloneRuns } = subject(true);
    const saved = { success: true, outcome: "UPDATED", canonical: null };
    vi.mocked(lifecycleService.updateStoppedSelection).mockResolvedValue(saved as never);
    await expect(service.updateStoppedSelection(edit as never)).resolves.toBe(saved);
    expect(standaloneRuns.refreshInheritedLaunch).toHaveBeenCalledExactlyOnceWith("run-1");
  });

  it.each(["UNCHANGED", "RUN_ACTIVE", "VALIDATION_FAILED", "MODEL_UNAVAILABLE"])("an edit that saved nothing (%s) leaves the root alone", async (outcome) => {
    const { service, lifecycleService, standaloneRuns } = subject(true);
    const refused = { success: false, outcome, canonical: null };
    vi.mocked(lifecycleService.updateStoppedSelection).mockResolvedValue(refused as never);
    await expect(service.updateStoppedSelection(edit as never)).resolves.toBe(refused);
    expect(standaloneRuns.refreshInheritedLaunch).not.toHaveBeenCalled();
  });

  it("a root that cannot follow is logged and the saved edit stays successful", async () => {
    const { service, lifecycleService, standaloneRuns } = subject(true);
    const saved = { success: true, outcome: "UPDATED", canonical: null };
    vi.mocked(lifecycleService.updateStoppedSelection).mockResolvedValue(saved as never);
    standaloneRuns.refreshInheritedLaunch.mockRejectedValue(new Error("metadata unreadable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(service.updateStoppedSelection(edit as never)).resolves.toBe(saved);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("metadata unreadable"));
  });
});
