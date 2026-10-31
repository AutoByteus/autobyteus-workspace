import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type {
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "../../../../src/run-history/store/agent-run-history-index-record-types.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

vi.mock("../../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => ({
      getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }),
    }),
  },
}));

const buildMetadata = (runId: string, overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace/",
  memoryDir: overrides.memoryDir ?? "",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  preparedAt: "2026-03-26T10:00:00.000Z",
  preparedExpiresAt: "2026-03-27T10:00:00.000Z",
  startedAt: null,
  ...overrides,
});

const buildIndexRow = (
  overrides: Partial<AgentRunHistoryIndexRowRecord> = {},
): AgentRunHistoryIndexRowRecord => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  agentName: "Agent One",
  workspaceRootPath: "/tmp/workspace",
  summary: "original summary",
  createdAt: "2026-03-26T10:00:00.000Z",
  archivedAt: null,
  terminatedAt: null,
  ...overrides,
});

// Without this, a history mutation resolves the process root manager by a dynamic import of its
// whole module graph, which can exceed the test timeout and leave later tests a half-loaded module.
const noCollaborationRoots = () => ({
  hasRoot: vi.fn().mockReturnValue(false),
  endRoot: vi.fn(async () => undefined),
});

const cloneIndex = (
  index: AgentRunHistoryIndexFileRecord,
): AgentRunHistoryIndexFileRecord => index.map((row) => ({ ...row }));

describe("AgentRunHistoryCatalogService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-history-catalog-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const buildService = async () => {
    const { AgentRunHistoryCatalogService } = await import(
      "../../../../src/run-history/services/agent-run-history-catalog-service.js"
    );
    return new AgentRunHistoryCatalogService(memoryDir, {
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }),
      } as never,
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
      } as never,
      collaborationRoots: noCollaborationRoots(),
    });
  };

  const buildServiceWithIndexStore = async (
    initialRows: AgentRunHistoryIndexRowRecord[],
  ) => {
    const { AgentRunHistoryCatalogService } = await import(
      "../../../../src/run-history/services/agent-run-history-catalog-service.js"
    );
    for (const row of initialRows) {
      const dir = path.join(memoryDir, "agents", row.runId);
      await fs.mkdir(dir, {recursive: true});
      await fs.writeFile(path.join(dir, "run_metadata.json"), JSON.stringify(buildMetadata(row.runId, {memoryDir: dir})));
    }
    let index: AgentRunHistoryIndexFileRecord = initialRows.map((row) => ({ ...row }));
    const writeFailures: Error[] = [];
    const indexStore = {
      readIndex: vi.fn(async () => cloneIndex(index)),
      writeIndex: vi.fn(async (nextIndex: AgentRunHistoryIndexFileRecord) => {
        const failure = writeFailures.shift();
        if (failure) {
          throw failure;
        }
        index = cloneIndex(nextIndex);
      }),
    };
    const service = new AgentRunHistoryCatalogService(memoryDir, {
      indexStore: indexStore as never,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }),
      } as never,
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
      } as never,
      collaborationRoots: noCollaborationRoots(),
    });
    return {
      service,
      indexStore,
      failNextWrite: (message: string) => {
        writeFailures.push(new Error(message));
      },
      getPersistedIndex: () => cloneIndex(index),
    };
  };

  it("records prepared metadata and one V2 catalog row through one boundary", async () => {
    const service = await buildService();
    const metadata = buildMetadata("run-1", {
      memoryDir: path.join(memoryDir, "agents", "run-1"),
    });

    await service.recordPreparedRun({
      runId: "run-1",
      metadata,
      summary: "  hello\nworld ",
      createdAt: "2026-03-26T10:00:00.000Z",
    });

    const metadataPayload = JSON.parse(
      await fs.readFile(path.join(memoryDir, "agents", "run-1", "run_metadata.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(metadataPayload).not.toHaveProperty("lastKnownStatus");
    expect(metadataPayload).not.toHaveProperty("activationState");

    const indexPayload = JSON.parse(
      await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8"),
    ) as Array<Record<string, unknown>>;
    expect(indexPayload).toEqual([
      {
        runId: "run-1",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent One",
        workspaceRootPath: "/tmp/workspace",
        summary: "hello world",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);
  });

  it("does not flush the index for a normal start/activity metadata update", async () => {
    const service = await buildService();
    const metadata = buildMetadata("run-1", {
      memoryDir: path.join(memoryDir, "agents", "run-1"),
    });
    await service.recordPreparedRun({ runId: "run-1", metadata, createdAt: "2026-03-26T10:00:00.000Z" });
    const before = await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8");

    await service.recordRunStarted({
      runId: "run-1",
      platformAgentRunId: "thread-1",
      startedAt: "2026-03-26T10:01:00.000Z",
    });

    await expect(fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8")).resolves.toBe(before);
  });

  describe("an agent runtime switch (autobyteus-316)", () => {
    const pending = {
      requestedAt: "2026-10-30T10:00:00.000Z",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "session-1" },
    };
    const switchedRun = async () => {
      const service = await buildService();
      const dir = path.join(memoryDir, "agents", "run-1");
      await service.recordPreparedRun({ runId: "run-1", createdAt: "2026-03-26T10:00:00.000Z", metadata: buildMetadata("run-1", { memoryDir: dir }) });
      await service.recordRunStarted({ runId: "run-1", platformAgentRunId: "session-1", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, startedAt: "2026-03-26T10:01:00.000Z" });
      return { service, file: path.join(dir, "run_metadata.json") };
    };
    const readFile = async (file: string) => JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, unknown>;

    it("a settings save of another agent runtime records the new binding and the pending switch; the same run stays", async () => {
      const { service, file } = await switchedRun();
      const committed = await service.commitRunRuntimeSwitch({
        runId: "run-1", requestedAt: pending.requestedAt,
        selection: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null },
      });
      expect(committed.kind).toBe("committed");
      expect(await readFile(file)).toMatchObject({
        runId: "run-1", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: null,
        startedAt: "2026-03-26T10:01:00.000Z",
        pendingRuntimeSwitch: { requestedAt: pending.requestedAt, from: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "model-1", platformAgentRunId: "session-1" } },
      });
    });

    it("the activation commit clears the pending switch in the same write that sets the session, and the run is reactivated in the history", async () => {
      const { service, file } = await switchedRun();
      await service.commitRunRuntimeSwitch({ runId: "run-1", requestedAt: pending.requestedAt,
        selection: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null } });
      await service.recordRunTerminated({ runId: "run-1", terminatedAt: "2026-03-26T11:00:00.000Z" });

      const started = await service.recordRunStarted({
        runId: "run-1", platformAgentRunId: "thread-9", runtimeKind: RuntimeKind.CODEX_APP_SERVER, clearPendingRuntimeSwitch: true,
      });

      const stored = await readFile(file);
      expect(stored).toMatchObject({ runtimeKind: "codex_app_server", platformAgentRunId: "thread-9", startedAt: "2026-03-26T10:01:00.000Z" });
      expect(Object.hasOwn(stored, "pendingRuntimeSwitch")).toBe(false);
      expect(started).toEqual(expect.objectContaining({ platformAgentRunId: "thread-9" }));
      expect(Object.hasOwn(started!, "pendingRuntimeSwitch")).toBe(false);
      const index = JSON.parse(await fs.readFile(path.join(memoryDir, "run_history_index.json"), "utf-8")) as Array<{ runId: string; terminatedAt: string | null }>;
      expect(index.find((row) => row.runId === "run-1")?.terminatedAt).toBeNull();
    });

    it("without the flag the pending switch stays (an ordinary start never removes it)", async () => {
      const { service, file } = await switchedRun();
      await service.commitRunRuntimeSwitch({ runId: "run-1", requestedAt: pending.requestedAt,
        selection: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null } });
      await service.recordRunStarted({ runId: "run-1", platformAgentRunId: "thread-9" });
      expect((await readFile(file)).pendingRuntimeSwitch).toMatchObject({ requestedAt: pending.requestedAt });
    });
  });

  it("keeps a remote run's delegatedFrom back-link when activation adds startedAt (N-10, DEC-112)", async () => {
    const service = await buildService();
    const delegatedFrom = { nodeId: "srv_peer_a", coordinatingRun: { kind: "agent" as const, runId: "agent_a1" }, delegatorAgentRunId: "agent_a1" };
    await service.recordPreparedRun({ runId: "run-1", createdAt: "2026-03-26T10:00:00.000Z",
      metadata: buildMetadata("run-1", { memoryDir: path.join(memoryDir, "agents", "run-1"), delegatedFrom }) });

    const started = await service.recordRunStarted({ runId: "run-1", platformAgentRunId: "thread-1", startedAt: "2026-03-26T10:01:00.000Z" });

    const raw = JSON.parse(await fs.readFile(path.join(memoryDir, "agents", "run-1", "run_metadata.json"), "utf-8")) as Record<string, unknown>;
    expect(raw).toMatchObject({ startedAt: "2026-03-26T10:01:00.000Z", preparedAt: "2026-03-26T10:00:00.000Z", delegatedFrom });
    expect(started?.delegatedFrom).toEqual(delegatedFrom);
  });

  it("commits only llmConfig through the serialized catalog", async () => {
    const service = await buildService();
    const metadata = buildMetadata("run-1", {
      memoryDir: path.join(memoryDir, "agents", "run-1"),
      llmConfig: { effort: "low" },
    });
    await service.recordPreparedRun({
      runId: "run-1",
      metadata,
      createdAt: "2026-03-26T10:00:00.000Z",
    });
    const metadataPath = path.join(memoryDir, "agents", "run-1", "run_metadata.json");
    const storedBefore = JSON.parse(await fs.readFile(metadataPath, "utf-8"));

    await expect(service.commitRunModelConfig({
      runId: "run-1",
      llmModelIdentifier: "model-1",
      llmConfig: { effort: "high" },
    })).resolves.toMatchObject({
      kind: "committed",
      metadata: {
        ...storedBefore,
        llmConfig: { effort: "high" },
      },
    });

    const stored = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    expect(stored).toEqual({ ...storedBefore, llmConfig: { effort: "high" } });
  });

  it("updates first summary only and does not rewrite on ordinary later activity", async () => {
    const { service, indexStore, getPersistedIndex } = await buildServiceWithIndexStore([
      buildIndexRow({ summary: "" }),
    ]);
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);

    await service.recordRunSummary({ runId: "run-1", summary: "first" });
    await service.recordRunSummary({ runId: "run-1", summary: "second" });

    expect(indexStore.writeIndex).toHaveBeenCalledTimes(1);
    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({
      summary: "first",
    });
    expect(getPersistedIndex()).toMatchObject([{ summary: "first" }]);
  });

  it("AC-602 (autobyteus-269): a 300-character, multi-line delegated description becomes a one-line title of at most 100 characters", async () => {
    const { service } = await buildServiceWithIndexStore([buildIndexRow({ summary: "" })]);
    const description = `Cut the launch trailer\n\nand have it checked. ${"x".repeat(300)}`;
    await service.recordRunSummary({ runId: "run-1", summary: description });
    const { summary } = (await service.getCatalogRow("run-1"))!;
    expect(summary.length).toBeLessThanOrEqual(100);
    expect(summary).not.toContain("\n");
    expect(summary.startsWith("Cut the launch trailer and have it checked. x")).toBe(true);
    expect(summary.endsWith("...")).toBe(true);
  });

  it("serializes concurrent prepared-run catalog mutations", async () => {
    const service = await buildService();
    await Promise.all([
      service.recordPreparedRun({
        runId: "run-1",
        metadata: buildMetadata("run-1", { memoryDir: path.join(memoryDir, "agents", "run-1") }),
        createdAt: "2026-03-26T10:00:00.000Z",
      }),
      service.recordPreparedRun({
        runId: "run-2",
        metadata: buildMetadata("run-2", { memoryDir: path.join(memoryDir, "agents", "run-2") }),
        createdAt: "2026-03-26T11:00:00.000Z",
      }),
    ]);

    await expect(service.listCatalogRows()).resolves.toMatchObject([
      { runId: "run-2" },
      { runId: "run-1" },
    ]);
  });

  it("refuses to cancel a run after the serialized catalog start mutation", async () => {
    const service = await buildService();
    await service.recordPreparedRun({
      runId: "run-1",
      metadata: buildMetadata("run-1", { memoryDir: path.join(memoryDir, "agents", "run-1") }),
      createdAt: "2026-03-26T10:00:00.000Z",
    });
    await service.recordRunStarted({
      runId: "run-1",
      platformAgentRunId: "thread-1",
      startedAt: "2026-03-26T10:01:00.000Z",
    });

    const result = await service.cancelPreparedRun("run-1");

    expect(result).toEqual({
      success: false,
      message: "Only unactivated prepared runs can be cancelled.",
    });
    await expect(
      fs.access(path.join(memoryDir, "agents", "run-1", "run_metadata.json")),
    ).resolves.toBeUndefined();
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);
  });

  it("rejects unsafe delete identities inside the catalog boundary", async () => {
    const result = await (await buildService()).deleteRun("../outside");
    expect(result).toEqual({ success: false, message: "Invalid run ID path." });
  });

  it("rolls back archive state in memory when the index flush fails", async () => {
    const row = buildIndexRow();
    const { service, failNextWrite, getPersistedIndex } = await buildServiceWithIndexStore([row]);
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);

    failNextWrite("archive flush failed");
    await expect(service.archiveRun("run-1")).rejects.toThrow("archive flush failed");

    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({
      runId: "run-1",
      archivedAt: null,
      summary: "original summary",
      terminatedAt: null,
    });
    expect(getPersistedIndex()).toEqual([row]);
  });

  it("rolls back first summary and termination state in memory when index flushes fail", async () => {
    const row = buildIndexRow({ summary: "" });
    const { service, failNextWrite, getPersistedIndex } = await buildServiceWithIndexStore([row]);
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);

    failNextWrite("summary flush failed");
    await expect(
      service.recordRunSummary({ runId: "run-1", summary: "new summary" }),
    ).rejects.toThrow("summary flush failed");
    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({
      summary: "",
      terminatedAt: null,
    });

    failNextWrite("termination flush failed");
    await expect(
      service.recordRunTerminated({
        runId: "run-1",
        terminatedAt: "2026-03-26T12:00:00.000Z",
      }),
    ).rejects.toThrow("termination flush failed");
    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({
      summary: "",
      terminatedAt: null,
    });
    expect(getPersistedIndex()).toEqual([row]);
  });

  it("rolls back delete state and leaves the run directory when the index flush fails", async () => {
    const row = buildIndexRow();
    const runDirPath = path.join(memoryDir, "agents", "run-1");
    await fs.mkdir(runDirPath, { recursive: true });
    const { service, failNextWrite, getPersistedIndex } = await buildServiceWithIndexStore([row]);
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);

    failNextWrite("delete flush failed");
    await expect(service.deleteRun("run-1")).rejects.toThrow("delete flush failed");

    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({ runId: "run-1" });
    await expect(fs.access(runDirPath)).resolves.toBeUndefined();
    expect(getPersistedIndex()).toEqual([row]);
  });

  describe("a run whose host is down but whose Agent root lingers (CR-001/CR-002)", () => {
    const setup = async (options: { hostActive?: boolean; endFails?: boolean } = {}) => {
      const row = buildIndexRow();
      const { indexStore } = await buildServiceWithIndexStore([row]);
      const runDir = path.join(memoryDir, "agents", "run-1");
      const childMemory = path.join(runDir, "collaboration", "child-run", "raw_traces_active.jsonl");
      await fs.mkdir(path.dirname(childMemory), { recursive: true });
      await fs.writeFile(childMemory, "");
      const { AgentRunHistoryCatalogService } = await import(
        "../../../../src/run-history/services/agent-run-history-catalog-service.js"
      );
      const state = { rootRegistered: true, filesPresentWhenEnded: [] as boolean[] };
      const endRoot = vi.fn(async () => {
        state.filesPresentWhenEnded.push(await fs.access(childMemory).then(() => true, () => false));
        if (options.endFails) throw new Error("a child did not stop");
        state.rootRegistered = false;
      });
      const adHocTasks = { deleteAdHocTasksHostedBy: vi.fn(async () => undefined) };
      const service = new AgentRunHistoryCatalogService(memoryDir, {
        indexStore: indexStore as never,
        agentDefinitionService: { getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) } as never,
        agentRunManager: { hasActiveRun: vi.fn().mockReturnValue(options.hostActive ?? false) },
        collaborationRoots: { hasRoot: vi.fn(() => state.rootRegistered), endRoot },
        adHocTasks,
      });
      return { service, state, endRoot, runDir, childMemory, adHocTasks };
    };

    it("delete ends the root (children stop) before removing anything, then deletes, then removes the run's ad-hoc Tasks", async () => {
      const f = await setup();
      await expect(f.service.deleteRun("run-1")).resolves.toMatchObject({ success: true });
      expect(f.endRoot).toHaveBeenCalledWith("run-1");
      expect(f.state.filesPresentWhenEnded).toEqual([true]);
      await expect(fs.access(f.runDir)).rejects.toThrow();
      expect(f.adHocTasks.deleteAdHocTasksHostedBy).toHaveBeenCalledExactlyOnceWith({ rootSubjectKind: "agent", rootRunId: "run-1" });
    });

    it("archive ends the root first, then archives", async () => {
      const f = await setup();
      await expect(f.service.archiveRun("run-1")).resolves.toMatchObject({ success: true });
      expect(f.endRoot).toHaveBeenCalledWith("run-1");
      await expect(fs.access(f.childMemory)).resolves.toBeUndefined();
    });

    it("refuses delete and archive, keeping every file, when the root cannot be ended", async () => {
      const f = await setup({ endFails: true });
      await expect(f.service.deleteRun("run-1")).resolves.toEqual({
        success: false, message: "Run is active. Terminate it before deleting history.",
      });
      await expect(f.service.archiveRun("run-1")).resolves.toMatchObject({ success: false });
      await expect(fs.access(f.childMemory)).resolves.toBeUndefined();
      expect(f.adHocTasks.deleteAdHocTasksHostedBy).not.toHaveBeenCalled();
    });

    it("refuses while the host itself is active, without touching the root", async () => {
      const f = await setup({ hostActive: true });
      await expect(f.service.deleteRun("run-1")).resolves.toMatchObject({ success: false });
      expect(f.endRoot).not.toHaveBeenCalled();
    });

    it("a run without a root deletes directly", async () => {
      const f = await setup();
      f.state.rootRegistered = false;
      await expect(f.service.deleteRun("run-1")).resolves.toMatchObject({ success: true });
      expect(f.endRoot).not.toHaveBeenCalled();
    });
  });

  it("rolls back cancel state and leaves prepared metadata when the index flush fails", async () => {
    const row = buildIndexRow();
    const runDirPath = path.join(memoryDir, "agents", "run-1");
    const metadataPath = path.join(runDirPath, "run_metadata.json");
    await fs.mkdir(runDirPath, { recursive: true });
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(buildMetadata("run-1", { memoryDir: runDirPath }), null, 2)}\n`,
      "utf-8",
    );
    const { service, failNextWrite, getPersistedIndex } = await buildServiceWithIndexStore([row]);
    await expect(service.listCatalogRows()).resolves.toMatchObject([{ runId: "run-1" }]);

    failNextWrite("cancel flush failed");
    await expect(service.cancelPreparedRun("run-1")).rejects.toThrow("cancel flush failed");

    await expect(service.getCatalogRow("run-1")).resolves.toMatchObject({ runId: "run-1" });
    await expect(fs.access(metadataPath)).resolves.toBeUndefined();
    expect(getPersistedIndex()).toEqual([row]);
  });
});
