import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamEventType } from "autobyteus-ts";

const mockAgentManager = vi.hoisted(() => ({
  listActiveRuns: vi.fn(),
  getAgentRun: vi.fn(),
}));

const mockDefinitionService = vi.hoisted(() => ({
  getAgentDefinitionById: vi.fn(),
}));

vi.mock("../../../src/agent-execution/services/agent-run-manager.js", () => ({
  AgentRunManager: {
    getInstance: () => mockAgentManager,
  },
}));

vi.mock("../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => mockDefinitionService,
  },
}));

import { RunHistoryService } from "../../../src/run-history/services/run-history-service.js";

const createTempMemoryDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-run-history-service-"));
};

const dirExists = async (dirPath: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

const writeRunFiles = async (
  memoryDir: string,
  runId: string,
  manifest: {
    agentDefinitionId: string;
    workspaceRootPath: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
  },
  userMessage: string,
): Promise<void> => {
  const agentDir = path.join(memoryDir, "agents", runId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "run_manifest.json"),
    JSON.stringify({
      ...manifest,
      llmConfig: null,
      skillAccessMode: null,
    }),
    "utf-8",
  );
  await fs.writeFile(
    path.join(agentDir, "raw_traces.jsonl"),
    `${JSON.stringify({ trace_type: "user", content: userMessage, ts: 1700000000 })}\n`,
    "utf-8",
  );
};

describe("RunHistoryService", () => {
  let memoryDir: string;
  let service: RunHistoryService;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    service = new RunHistoryService(memoryDir);
    vi.clearAllMocks();
    mockAgentManager.listActiveRuns.mockReturnValue([]);
    mockAgentManager.getAgentRun.mockReturnValue(null);
    mockDefinitionService.getAgentDefinitionById.mockImplementation(async (id: string) => ({
      id,
      name: id === "agent-def-1" ? "SuperAgent" : "DB Agent",
    }));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("rebuilds index from disk and groups run history", async () => {
    await writeRunFiles(
      memoryDir,
      "run-1",
      {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
      },
      "Describe messaging bindings",
    );

    mockAgentManager.listActiveRuns.mockReturnValue(["run-1"]);

    const groups = await service.listRunHistory(6);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.workspaceName).toBe("autobyteus_org");
    expect(groups[0]?.agents[0]?.agentName).toBe("SuperAgent");
    expect(groups[0]?.agents[0]?.runs[0]).toMatchObject({
      runId: "run-1",
      summary: "Describe messaging bindings",
      isActive: true,
      lastKnownStatus: "ACTIVE",
    });
  });

  it("returns editable resume config for inactive run and locked fields for active run", async () => {
    await writeRunFiles(
      memoryDir,
      "run-1",
      {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
      },
      "Describe messaging bindings",
    );

    let config = await service.getRunResumeConfig("run-1");
    expect(config.isActive).toBe(false);
    expect(config.editableFields.llmModelIdentifier).toBe(true);
    expect(config.editableFields.workspaceRootPath).toBe(false);

    mockAgentManager.getAgentRun.mockImplementation((runId: string) =>
      runId === "run-1" ? ({ runId: "run-1" } as any) : null,
    );
    config = await service.getRunResumeConfig("run-1");
    expect(config.isActive).toBe(true);
    expect(config.editableFields.llmModelIdentifier).toBe(false);
    expect(config.editableFields.autoExecuteTools).toBe(false);
  });

  it("creates missing index row on first stream event when manifest exists", async () => {
    await writeRunFiles(
      memoryDir,
      "run-1",
      {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
      },
      "Describe messaging bindings",
    );

    await service.onAgentEvent("run-1", {
      event_type: StreamEventType.AGENT_STATUS_UPDATED,
      data: { status: "running" },
    } as any);

    const groups = await service.listRunHistory();
    expect(groups[0]?.agents[0]?.runs[0]).toMatchObject({
      runId: "run-1",
      lastKnownStatus: "ACTIVE",
    });
  });

  it("marks run as idle after termination", async () => {
    await service.upsertRunHistoryRow({
      runId: "run-1",
      manifest: {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
      },
      summary: "Describe messaging bindings",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
    });

    await service.onRunTerminated("run-1");
    const groups = await service.listRunHistory();
    expect(groups[0]?.agents[0]?.runs[0]?.lastKnownStatus).toBe("IDLE");
  });

  it("maps AGENT_STATUS_UPDATED new_status payload to run history status", async () => {
    await service.upsertRunHistoryRow({
      runId: "run-1",
      manifest: {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
      },
      summary: "Describe messaging bindings",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
    });

    await service.onAgentEvent("run-1", {
      event_type: StreamEventType.AGENT_STATUS_UPDATED,
      data: { new_status: "idle", old_status: "processing_user_input" },
    } as any);

    const groups = await service.listRunHistory();
    expect(groups[0]?.agents[0]?.runs[0]?.lastKnownStatus).toBe("IDLE");
  });

  it("hard-deletes an inactive run directory and removes index row", async () => {
    await writeRunFiles(
      memoryDir,
      "run-1",
      {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        autoExecuteTools: false,
      },
      "Describe messaging bindings",
    );
    await service.upsertRunHistoryRow({
      runId: "run-1",
      manifest: {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
      },
      summary: "Describe messaging bindings",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await service.deleteRunHistory("run-1");
    expect(result.success).toBe(true);

    const runDir = path.join(memoryDir, "agents", "run-1");
    expect(await dirExists(runDir)).toBe(false);
    expect(await service.listRunHistory()).toEqual([]);
  });

  it("rejects deleting an active run", async () => {
    mockAgentManager.getAgentRun.mockImplementation((runId: string) =>
      runId === "run-1" ? ({ runId: "run-1" } as any) : null,
    );

    const result = await service.deleteRunHistory("run-1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Terminate");
  });

  it("rejects invalid run-id path traversal requests", async () => {
    const result = await service.deleteRunHistory("../escape");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid");
  });

  it("treats missing run directory as deletable and prunes index row", async () => {
    await service.upsertRunHistoryRow({
      runId: "run-ghost",
      manifest: {
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/autobyteus_org",
        llmModelIdentifier: "model-a",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
      },
      summary: "Ghost run",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await service.deleteRunHistory("run-ghost");
    expect(result.success).toBe(true);
    expect(await service.listRunHistory()).toEqual([]);
  });
});
