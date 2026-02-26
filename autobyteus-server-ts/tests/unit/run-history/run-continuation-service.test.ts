import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

const mockAgentManager = vi.hoisted(() => ({
  getAgentRun: vi.fn(),
  restoreAgentRun: vi.fn(),
  createAgentRun: vi.fn(),
}));

const mockWorkspaceManager = vi.hoisted(() => ({
  ensureWorkspaceByRootPath: vi.fn(),
  getWorkspaceById: vi.fn(),
}));

const mockRunHistoryService = vi.hoisted(() => ({
  upsertRunHistoryRow: vi.fn(),
}));

vi.mock("../../../src/agent-execution/services/agent-run-manager.js", () => ({
  AgentRunManager: {
    getInstance: () => mockAgentManager,
  },
}));

vi.mock("../../../src/workspaces/workspace-manager.js", () => ({
  getWorkspaceManager: () => mockWorkspaceManager,
}));

vi.mock("../../../src/run-history/services/run-history-service.js", () => ({
  getRunHistoryService: () => mockRunHistoryService,
}));

import { RunContinuationService } from "../../../src/run-history/services/run-continuation-service.js";
import { RunManifestStore } from "../../../src/run-history/store/run-manifest-store.js";

const createTempMemoryDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-run-continuation-"));
};

describe("RunContinuationService", () => {
  let memoryDir: string;
  let service: RunContinuationService;
  let manifestStore: RunManifestStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    service = new RunContinuationService(memoryDir);
    manifestStore = new RunManifestStore(memoryDir);

    vi.clearAllMocks();
    mockWorkspaceManager.ensureWorkspaceByRootPath.mockResolvedValue({ workspaceId: "ws-1" });
    mockWorkspaceManager.getWorkspaceById.mockReturnValue({ getBasePath: () => "/tmp/base" });
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("continues active run and ignores runtime overrides", async () => {
    const postUserMessage = vi.fn().mockResolvedValue(undefined);
    mockAgentManager.getAgentRun.mockReturnValue({ postUserMessage });

    const result = await service.continueRun({
      runId: "run-1",
      userInput: { content: "Continue this task", contextFiles: null } as any,
      llmModelIdentifier: "new-model",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.GLOBAL_DISCOVERY,
      workspaceRootPath: "/tmp/other",
      llmConfig: { temperature: 0.8 },
    });

    expect(result.runId).toBe("run-1");
    expect(result.ignoredConfigFields.sort()).toEqual([
      "autoExecuteTools",
      "llmConfig",
      "llmModelIdentifier",
      "skillAccessMode",
      "workspaceRootPath",
    ]);
    expect(postUserMessage).toHaveBeenCalledTimes(1);
    expect(mockAgentManager.restoreAgentRun).not.toHaveBeenCalled();
  });

  it("restores inactive run with allowed overrides and writes updated manifest", async () => {
    await manifestStore.writeManifest("run-1", {
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/ws-a",
      llmModelIdentifier: "model-old",
      llmConfig: { temperature: 0.2 },
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    const restoredAgent = {
      postUserMessage: vi.fn().mockResolvedValue(undefined),
    };
    let restored = false;
    mockAgentManager.getAgentRun.mockImplementation((runId: string) => {
      if (runId !== "run-1") {
        return null;
      }
      return restored ? restoredAgent : null;
    });
    mockAgentManager.restoreAgentRun.mockImplementation(async () => {
      restored = true;
    });

    const result = await service.continueRun({
      runId: "run-1",
      userInput: { content: "Continue with new model", contextFiles: null } as any,
      llmModelIdentifier: "model-new",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.GLOBAL_DISCOVERY,
      workspaceRootPath: "/tmp/ws-a",
      llmConfig: { temperature: 0.9 },
    });

    expect(result.runId).toBe("run-1");
    expect(mockAgentManager.restoreAgentRun).toHaveBeenCalledWith({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-new",
      autoExecuteTools: true,
      workspaceId: "ws-1",
      llmConfig: { temperature: 0.9 },
      skillAccessMode: SkillAccessMode.GLOBAL_DISCOVERY,
    });

    const savedManifest = await manifestStore.readManifest("run-1");
    expect(savedManifest).toMatchObject({
      llmModelIdentifier: "model-new",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.GLOBAL_DISCOVERY,
    });
    expect(mockRunHistoryService.upsertRunHistoryRow).toHaveBeenCalledTimes(1);
    expect(restoredAgent.postUserMessage).toHaveBeenCalledTimes(1);
  });

  it("creates and continues a new run with manifest persisted", async () => {
    const agent = { postUserMessage: vi.fn().mockResolvedValue(undefined) };
    mockAgentManager.createAgentRun.mockResolvedValue("run-new");
    mockAgentManager.getAgentRun.mockImplementation((runId: string) =>
      runId === "run-new" ? agent : null,
    );

    const result = await service.continueRun({
      userInput: { content: "Start new task", contextFiles: null } as any,
      agentDefinitionId: "agent-def-2",
      workspaceRootPath: "/tmp/new-workspace",
      llmModelIdentifier: "model-new",
      autoExecuteTools: false,
      llmConfig: { temperature: 0.4 },
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(result.runId).toBe("run-new");
    expect(mockWorkspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(
      path.resolve("/tmp/new-workspace"),
    );
    expect(mockAgentManager.createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinitionId: "agent-def-2",
        llmModelIdentifier: "model-new",
        workspaceId: "ws-1",
      }),
    );

    const manifest = await manifestStore.readManifest("run-new");
    expect(manifest).toMatchObject({
      agentDefinitionId: "agent-def-2",
      workspaceRootPath: path.resolve("/tmp/new-workspace"),
      llmModelIdentifier: "model-new",
    });
    expect(agent.postUserMessage).toHaveBeenCalledTimes(1);
  });
});
