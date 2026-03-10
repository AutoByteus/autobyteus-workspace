import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RunContinuationService } from "../../../src/run-history/services/run-continuation-service.js";

describe("RunContinuationService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-run-continuation-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("persists resolved runtime skillAccessMode from runtime reference metadata", async () => {
    const service = new RunContinuationService(memoryDir) as any;
    const runtimeReference = {
      runtimeKind: "claude_agent_sdk",
      sessionId: "run-1",
      threadId: "run-1",
      metadata: {
        configuredSkillNames: ["runtime-skill"],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      },
    };

    service.runtimeCompositionService = {
      createAgentRun: vi.fn().mockResolvedValue({
        runId: "run-1",
        runtimeKind: "claude_agent_sdk",
        runtimeReference,
      }),
    };
    service.runtimeCommandIngressService = {
      bindRunSession: vi.fn(),
      sendTurn: vi.fn().mockResolvedValue({
        accepted: true,
        runtimeKind: "claude_agent_sdk",
        runtimeReference,
      }),
    };
    service.runHistoryService = {
      upsertRunHistoryRow: vi.fn().mockResolvedValue(undefined),
    };
    service.workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
      getWorkspaceById: vi.fn().mockReturnValue(null),
    };

    await service.continueRun({
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "model-1",
      runtimeKind: "claude_agent_sdk",
      workspaceRootPath: path.join(memoryDir, "workspace"),
      userInput: {
        content: "hello skill runtime",
        contextFiles: [],
      },
    });

    const manifest = await service.manifestStore.readManifest("run-1");
    expect(manifest?.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
  });
});
