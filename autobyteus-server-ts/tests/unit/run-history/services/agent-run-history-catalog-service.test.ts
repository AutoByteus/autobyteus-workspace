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
import { computeAgentRunModelConfigRevision } from "../../../../src/run-history/domain/run-model-config-revision.js";

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
  skillAccessMode: "PRELOADED_ONLY" as never,
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
    });
  };

  const buildServiceWithIndexStore = async (
    initialRows: AgentRunHistoryIndexRowRecord[],
  ) => {
    const { AgentRunHistoryCatalogService } = await import(
      "../../../../src/run-history/services/agent-run-history-catalog-service.js"
    );
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

  it("commits only llmConfig after checking the serialized catalog and revision", async () => {
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
      expectedConfigurationRevision: computeAgentRunModelConfigRevision(metadata),
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
