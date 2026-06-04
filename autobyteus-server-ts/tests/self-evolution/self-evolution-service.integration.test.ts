import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SelfEvolutionChangeRecorder } from "../../src/self-evolution/services/self-evolution-change-recorder.js";
import { SelfEvolutionRecordLifecycle } from "../../src/self-evolution/services/self-evolution-record-lifecycle.js";
import { SelfEvolutionRunStore } from "../../src/self-evolution/services/self-evolution-run-store.js";
import { SelfEvolutionService } from "../../src/self-evolution/services/self-evolution-service.js";
import type { SelfEvolutionRequest, SelfEvolutionSkillTarget } from "../../src/self-evolution/domain/models.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";

const execFileAsync = promisify(execFile);

const runGit = async (root: string, args: string[]) => {
  await execFileAsync("git", ["-C", root, ...args], { timeout: 5_000 });
};

const effectiveConfig = {
  enabled: true,
  triggerStrategy: "manual_only",
  evolverStrategy: "single_agent",
  evolverAgentDefinitionId: "autobyteus-skill-evolver",
  resolvedAt: "2026-01-01T00:00:00.000Z",
  sourceTrace: [],
} as const;

describe("SelfEvolutionService executable direct-edit flow", () => {
  let tempRoot: string;
  let tempMemoryRoot: string;
  let memoryDir: string;
  let skillMdPath: string;
  let offTargetPath: string;
  let skillTarget: SelfEvolutionSkillTarget;
  let targetContext: SelfEvolutionTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-service-flow-"));
    tempMemoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-service-memory-"));
    memoryDir = path.join(tempMemoryRoot, "memory");
    const skillRoot = path.join(tempRoot, "skills", "durable-skill");
    skillMdPath = path.join(skillRoot, "SKILL.md");
    offTargetPath = path.join(tempRoot, "agent.md");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf8");
    await fs.writeFile(offTargetPath, "# Agent\n", "utf8");
    await runGit(tempRoot, ["init"]);
    await runGit(tempRoot, ["config", "user.email", "test@example.com"]);
    await runGit(tempRoot, ["config", "user.name", "Test User"]);
    await runGit(tempRoot, ["add", "."]);
    await runGit(tempRoot, ["commit", "-m", "initial"]);

    skillTarget = {
      skillName: "durable-skill",
      skillRootPath: skillRoot,
      skillMdPath,
      isWritable: true,
      gitRootPath: tempRoot,
      rollbackMode: "git",
    };
    targetContext = {
      target: { kind: "agent_run", runId: "target-run-1" },
      sourceRunIds: ["target-run-1"],
      targetAgentDefinition: new AgentDefinition({
        id: "target-agent",
        name: "Target Agent",
        description: "Target agent",
        instructions: "Use durable skills.",
        skillNames: ["durable-skill"],
      }),
      agentDefinitionId: "target-agent",
      agentName: "Target Agent",
      workspaceRootPath: tempRoot,
      memoryDir: path.join(memoryDir, "agents", "target-run-1"),
      runMetadataPath: path.join(memoryDir, "agents", "target-run-1", "run_metadata.json"),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY",
      effectiveConfig,
      targetMetadata: {} as any,
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.rm(tempMemoryRoot, { recursive: true, force: true });
  });

  const request = (id: string): SelfEvolutionRequest => ({
    evolutionRunId: id,
    triggerStrategy: "manual_only",
    target: { kind: "agent_run", runId: "target-run-1" },
    effectiveConfig,
    requestedAt: "2026-01-01T00:00:00.000Z",
    requestedByUserId: "validator",
    requestedFrom: "api",
  });

  const buildService = (evolverRun: () => Promise<void>): SelfEvolutionService => {
    const runStore = new SelfEvolutionRunStore(memoryDir);
    return new SelfEvolutionService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      evidenceBuilder: {
        build: vi.fn(async () => ({
          evidence: {
            target: { kind: "agent_run", runId: "target-run-1" },
            sourceRunIds: ["target-run-1"],
            rawTracePaths: [path.join(targetContext.memoryDir, "raw_traces.jsonl")],
            runHistorySummary: "Prior evidence showed a reusable skill gap.",
            feedbackSignals: [],
            privacyWarnings: [],
          },
          evidenceSummaryHash: "hash-123",
        })),
      } as any,
      changeRecorder: new SelfEvolutionChangeRecorder(),
      evolverStrategy: {
        run: vi.fn(async () => {
          await evolverRun();
          return {
            status: "completed",
            evolverRunId: "evolver-run-1",
            evolverAgentDefinitionId: "autobyteus-skill-evolver",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            llmModelIdentifier: "target-model",
            outputText: "done",
          };
        }),
      } as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({
        runStore,
        notificationService: {
          notify: vi.fn(async () => ({ status: "next_run_only" })),
        } as any,
      }),
    });
  };

  it("records a Git-backed editable SKILL.md mutation as a valid harness update", async () => {
    const service = buildService(async () => {
      await fs.writeFile(skillMdPath, "# Durable Skill\n\n- New reusable checklist.\n", "utf8");
    });

    const result = await service.startFromEvolutionRequest(request("evo-valid-edit"));

    expect(result.record.status).toBe("completed");
    expect(result.record.skillTargets).toEqual([skillTarget]);
    expect(result.record.changeSummary?.changedSkillPaths).toEqual([skillMdPath]);
    expect(result.record.changeSummary?.offTargetChangePaths).toEqual([]);
    expect(result.record.changeSummary?.policyViolations).toEqual([]);
    expect(result.record.updateMetrics).toMatchObject({
      evolverRunCompleted: true,
      changedSkillCount: 1,
      changedSkillPaths: [skillMdPath],
      offTargetChangeCount: 0,
      policyViolationCount: 0,
      notificationStatus: "next_run_only",
    });
    expect(result.record.benefitMetrics?.assessment).toBe("not_enough_data");
    await expect(new SelfEvolutionRunStore(memoryDir).readRecord("evo-valid-edit"))
      .resolves.toMatchObject({ status: "completed" });
  });

  it("fails the evolution record when the helper mutates an off-target path", async () => {
    const service = buildService(async () => {
      await fs.writeFile(offTargetPath, "# Agent\nInvalid off-target update.\n", "utf8");
    });

    const result = await service.startFromEvolutionRequest(request("evo-off-target-edit"));

    expect(result.record.status).toBe("failed");
    expect(result.record.changeSummary?.changedSkillPaths).toEqual([]);
    expect(result.record.changeSummary?.offTargetChangePaths).toContain(offTargetPath);
    expect(result.record.errors.join("\n")).toContain("off-target path");
    expect(result.record.updateMetrics).toMatchObject({
      evolverRunCompleted: false,
      changedSkillCount: 0,
      offTargetChangeCount: 1,
      policyViolationCount: 1,
    });
    expect(result.record.benefitMetrics?.notes.join("\n")).toContain("not collectible");
  });
});
