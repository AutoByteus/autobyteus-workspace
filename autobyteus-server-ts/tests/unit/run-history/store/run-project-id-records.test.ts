/**
 * "Started under a Project" on run records (projects-left-navigation, REQ-004, DS-001, DS-002; persisted-data decision
 * `Directly Usable — No Migration`): Agent run metadata, the Agent and Team index rows and the Team execution tree carry
 * an optional `projectId`, written once at creation; absent means not started under a Project; an invalid value is
 * dropped with a warning naming the run (DESIGN rule 7). Run creation refuses an unknown Project before any record.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/store/run-project-id-records.test.ts --no-watch
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { AgentRunHistoryIndexStore } from "../../../../src/run-history/store/agent-run-history-index-store.js";
import { TeamRunHistoryIndexStore } from "../../../../src/run-history/store/team-run-history-index-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { projectAgentRunHistoryIndexRow } from "../../../../src/run-history/services/agent-run-history-row-projector.js";
import { projectTeamRunHistoryIndexRow } from "../../../../src/run-history/services/team-run-history-index-row-projector.js";
import { AgentRunProvisioningService } from "../../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { configureRunProjectContextReader } from "../../../../src/agent-execution/domain/run-project-context.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const metadata = (memoryDir: string, overrides: Record<string, unknown> = {}): AgentRunMetadata => ({
  runId: "run-1", agentDefinitionId: "pm", workspaceRootPath: "/tmp/ws", memoryDir: path.join(memoryDir, "agents", "run-1"),
  llmModelIdentifier: "model-1", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null, preparedAt: "2026-10-31T00:00:00.000Z", preparedExpiresAt: null, startedAt: null,
  applicationExecutionContext: null, ...overrides,
}) as AgentRunMetadata;

const tree = () => testExecutionTree({ children: [testAgentNode("/lead")], coordinatorAddress: "/lead" });

describe("run records: started under a Project", () => {
  let memoryDir: string;
  beforeEach(async () => { memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-project-id-")); });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(memoryDir, { recursive: true, force: true }); });

  it("run metadata keeps projectId; absent stays absent; an invalid value is dropped with a warning naming the run", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("run-1", metadata(memoryDir, { projectId: " project_a1 " }));
    expect(JSON.parse(await fs.readFile(store.getMetadataPath("run-1"), "utf8")).projectId).toBe("project_a1");
    expect((await store.readMetadata("run-1"))?.projectId).toBe("project_a1");

    await store.writeMetadata("run-1", metadata(memoryDir));
    expect(Object.keys(JSON.parse(await fs.readFile(store.getMetadataPath("run-1"), "utf8")))).not.toContain("projectId");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const file = store.getMetadataPath("run-1");
    const raw = { ...JSON.parse(await fs.readFile(file, "utf8")), projectId: 42 };
    await fs.writeFile(file, JSON.stringify(raw));
    const read = await store.readMetadata("run-1");
    expect(read).not.toBeNull();
    expect(read).not.toHaveProperty("projectId");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RUN_PROJECT_ID_IGNORED: run 'run-1'"));
    expect(JSON.parse(await fs.readFile(file, "utf8")).projectId).toBe(42);
  });

  it("the Agent index row carries the metadata's projectId through the projector and the index store", async () => {
    const row = projectAgentRunHistoryIndexRow({ runId: "run-1", metadata: metadata(memoryDir, { projectId: "project_a1" }), agentName: "PM", summary: "", createdAt: "2026-10-31T00:00:00.000Z" });
    const plain = projectAgentRunHistoryIndexRow({ runId: "run-2", metadata: metadata(memoryDir), agentName: "PM", summary: "", createdAt: "2026-10-31T00:00:00.000Z" });
    expect(row.projectId).toBe("project_a1");
    expect(plain).not.toHaveProperty("projectId");
    const store = new AgentRunHistoryIndexStore(memoryDir);
    await store.writeIndex([row, plain]);
    expect(await store.readIndex()).toEqual([row, plain]);
  });

  it("the Team tree and its projected index row carry projectId; an invalid tree value is dropped with a warning", async () => {
    const stamped = validateTeamRunExecutionTreePayload({ ...tree(), projectId: "project_a1" });
    expect(stamped.projectId).toBe("project_a1");
    const row = projectTeamRunHistoryIndexRow({ tree: stamped });
    expect(row.projectId).toBe("project_a1");
    expect(projectTeamRunHistoryIndexRow({ tree: tree() })).not.toHaveProperty("projectId");
    const store = new TeamRunHistoryIndexStore(memoryDir);
    await store.writeIndex([row]);
    expect((await store.readIndexStrict()).rows).toEqual([row]);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invalid = validateTeamRunExecutionTreePayload({ ...tree(), projectId: "  " });
    expect(invalid).not.toHaveProperty("projectId");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RUN_PROJECT_ID_IGNORED: Team run"));
  });

  describe("Agent run creation", () => {
    let reader: { close(): void };
    beforeEach(() => {
      reader = configureRunProjectContextReader({ contextOf: async (id) => (id === "project_a1" ? { projectId: id, name: "AutoByteus" } : null) });
    });
    afterEach(() => reader.close());

    const service = (recordPreparedRun: ReturnType<typeof vi.fn>) => new AgentRunProvisioningService(memoryDir, {
      agentRunManager: { hasActiveRun: () => false } as never,
      metadataService: { readMetadata: async () => null } as never,
      historyCatalogService: { recordPreparedRun } as never,
      workspaceManager: { ensureWorkspaceByRootPath: async () => ({ workspaceId: "ws-1" }), getWorkspaceById: () => null } as never,
      agentRunIdentityAllocator: { allocateForAgentDefinition: async () => "pm_run_1" },
    });
    const input = (projectId?: string) => ({
      agentDefinitionId: "pm", workspaceRootPath: "/tmp/ws", llmModelIdentifier: "model-1", autoExecuteTools: false,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, ...(projectId ? { projectId } : {}),
    });

    it("stamps the chosen Project on the prepared run's metadata once (DS-001)", async () => {
      const recordPreparedRun = vi.fn(async () => undefined);
      await service(recordPreparedRun).prepareAgentRun(input("project_a1"));
      expect(recordPreparedRun.mock.calls[0]![0].metadata.projectId).toBe("project_a1");
      await service(recordPreparedRun).prepareAgentRun(input());
      expect(recordPreparedRun.mock.calls[1]![0].metadata).not.toHaveProperty("projectId");
    });

    it("refuses an unknown Project with PROJECT_NOT_FOUND before anything is recorded", async () => {
      const recordPreparedRun = vi.fn(async () => undefined);
      await expect(service(recordPreparedRun).prepareAgentRun(input("project_missing"))).rejects.toThrow("PROJECT_NOT_FOUND");
      expect(recordPreparedRun).not.toHaveBeenCalled();
    });
  });
});
