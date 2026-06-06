import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SelfEvolutionRecordLifecycle } from "../../src/self-evolution/services/self-evolution-record-lifecycle.js";
import { SelfEvolutionRunStore } from "../../src/self-evolution/services/self-evolution-run-store.js";
import { SelfEvolutionService } from "../../src/self-evolution/services/self-evolution-service.js";
import type { SelfEvolutionRequest, SelfEvolutionRunStatus, SelfEvolutionSkillTarget } from "../../src/self-evolution/domain/models.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";

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
  let skillTarget: SelfEvolutionSkillTarget;
  let targetContext: SelfEvolutionTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-service-flow-"));
    tempMemoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-service-memory-"));
    memoryDir = path.join(tempMemoryRoot, "memory");
    const skillRoot = path.join(tempRoot, "skills", "durable-skill");
    skillMdPath = path.join(skillRoot, "SKILL.md");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf8");

    skillTarget = {
      skillName: "durable-skill",
      skillRootPath: skillRoot,
      skillMdPath,
      isWritable: true,
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

  const buildService = (evolverStatus: SelfEvolutionRunStatus = "completed"): SelfEvolutionService => {
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
            anonymizedWorkHistory: "[WORK_HISTORY_TO_LEARN_FROM]\nFeedback and improvement signals:\n- Prior evidence showed a reusable skill gap.",
            feedbackSignals: ["Prior evidence showed a reusable skill gap."],
            privacyWarnings: ["Do not persist user-specific details."],
          },
          evidenceSummaryHash: "hash-123",
        })),
      } as any,
      evolverStrategy: {
        run: vi.fn(async () => ({
          status: evolverStatus,
          evolverRunId: "evolver-run-1",
          evolverAgentDefinitionId: "autobyteus-skill-evolver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "target-model",
          outputText: evolverStatus === "completed" ? "done" : null,
        })),
      } as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({
        runStore,
        notificationService: {
          notify: vi.fn(async () => ({ status: "next_run_only" })),
        } as any,
      }),
    });
  };

  it("records minimal provenance and notification for a completed visible evolver run", async () => {
    const service = buildService("completed");

    const result = await service.startFromEvolutionRequest(request("evo-minimal-record"));

    expect(result.record).toMatchObject({
      status: "completed",
      sourceRunIds: ["target-run-1"],
      evolverRunId: "evolver-run-1",
      evolverAgentDefinitionId: "autobyteus-skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      workspaceRootPath: tempRoot,
      skillTargets: [skillTarget],
      evidenceSummaryHash: "hash-123",
      notificationSummary: { status: "next_run_only" },
      errors: [],
    });
    expect(result.record).not.toHaveProperty("changeSummary");
    expect(result.record).not.toHaveProperty("updateMetrics");
    expect(result.record).not.toHaveProperty("benefitMetrics");
    await expect(new SelfEvolutionRunStore(memoryDir).readRecord("evo-minimal-record"))
      .resolves.toMatchObject({ status: "completed" });
  });

  it("finalizes a non-completed helper run without notification or metric side effects", async () => {
    const service = buildService("timed_out");

    const result = await service.startFromEvolutionRequest(request("evo-helper-timeout"));

    expect(result.record.status).toBe("timed_out");
    expect(result.record.notificationSummary).toBeNull();
    expect(result.record).not.toHaveProperty("changeSummary");
    expect(result.record).not.toHaveProperty("updateMetrics");
    expect(result.record).not.toHaveProperty("benefitMetrics");
  });
});
