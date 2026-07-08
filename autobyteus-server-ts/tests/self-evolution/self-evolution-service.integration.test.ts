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
      workTraceProjectionService: {
        ensureCurrent: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
          manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
          summaryHash: "hash-123",
          manifest: {
            schemaVersion: 1,
            target: { kind: "agent_run", runId: "target-run-1" },
            generatedAt: "2026-01-01T00:00:00.000Z",
            workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
            manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
            files: [],
          },
        })),
      } as any,
      companionSessionService: {
        activateOrGet: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          companionRunId: "evolver-run-1",
          evolverAgentDefinitionId: "autobyteus-skill-evolver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "target-model",
          state: {},
        })),
        buildTriggerRequest: vi.fn((input) => ({
          evolutionRunId: input.evolutionRunId,
          requestedAt: input.requestedAt,
          targetAgentRunId: "target-run-1",
          workTracePackage: input.workTracePackage,
          editableSkillTargets: input.editableSkillTargets,
        })),
        postSelfImproveRequest: vi.fn(async () => ({
          status: evolverStatus === "timed_out" ? "timed_out" : "completed",
          outputText: evolverStatus === "completed" ? "done" : null,
          notificationSummary: evolverStatus === "completed"
            ? { status: "send_message_sent", message: "outcome sent", targetAgentRunId: "target-run-1", evolverRunId: "evolver-run-1" }
            : null,
        })),
      } as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({
        runStore,
        notificationService: {
          notify: vi.fn(async () => ({ status: "next_run_only" })),
        } as any,
      }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
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
      notificationSummary: { status: "send_message_sent", message: "outcome sent", targetAgentRunId: "target-run-1", evolverRunId: "evolver-run-1" },
      errors: [],
    });
    expect(result.record).not.toHaveProperty("changeSummary");
    expect(result.record).not.toHaveProperty("updateMetrics");
    expect(result.record).not.toHaveProperty("benefitMetrics");
    await expect(new SelfEvolutionRunStore(memoryDir).readRecord("evo-minimal-record"))
      .resolves.toMatchObject({ status: "completed" });
  });

  it("rejects a stale target before launching the helper", async () => {
    const runStore = new SelfEvolutionRunStore(memoryDir);
    const companionSessionService = { activateOrGet: vi.fn(), postSelfImproveRequest: vi.fn(), buildTriggerRequest: vi.fn() };
    const service = new SelfEvolutionService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: { ensureCurrent: vi.fn() } as any,
      companionSessionService: companionSessionService as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => null) } as any,
    });

    await expect(service.startFromEvolutionRequest(request("evo-stale-target")))
      .rejects.toThrow("Self-evolution target run 'target-run-1' is not active.");
    expect(companionSessionService.activateOrGet).not.toHaveBeenCalled();
    await expect(runStore.readRecord("evo-stale-target"))
      .resolves.toMatchObject({ status: "failed" });
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
  it("refreshes work traces before each companion trigger and reuses the companion on later clicks", async () => {
    const runStore = new SelfEvolutionRunStore(memoryDir);
    let projectionCount = 0;
    const packageFor = (count: number) => ({
      target: { kind: "agent_run" as const, runId: "target-run-1" },
      workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
      manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
      summaryHash: `hash-${count}`,
      manifest: {
        schemaVersion: 1,
        target: { kind: "agent_run" as const, runId: "target-run-1" },
        generatedAt: `2026-01-01T00:00:0${count}.000Z`,
        workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
        manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
        files: [],
      },
    });
    const workTraceProjectionService = {
      ensureCurrent: vi.fn(async () => packageFor(++projectionCount)),
    };
    const companionSession = {
      target: { kind: "agent_run" as const, runId: "target-run-1" },
      companionRunId: "evolver-run-1",
      evolverAgentDefinitionId: "autobyteus-skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      state: {},
    };
    const companionSessionService = {
      activateOrGet: vi.fn(async () => companionSession),
      buildTriggerRequest: vi.fn((input) => ({
        evolutionRunId: input.evolutionRunId,
        requestedAt: input.requestedAt,
        targetAgentRunId: "target-run-1",
        workTracePackage: input.workTracePackage,
        editableSkillTargets: input.editableSkillTargets,
      })),
      postSelfImproveRequest: vi.fn(async () => ({
        status: "completed",
        outputText: "done",
        notificationSummary: {
          status: "send_message_sent",
          message: "outcome sent",
          targetAgentRunId: "target-run-1",
          evolverRunId: "evolver-run-1",
        },
      })),
    };
    const service = new SelfEvolutionService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: workTraceProjectionService as any,
      companionSessionService: companionSessionService as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });

    await service.startFromEvolutionRequest(request("evo-first-click"));
    await service.startFromEvolutionRequest(request("evo-later-click"));

    expect(workTraceProjectionService.ensureCurrent).toHaveBeenCalledTimes(2);
    expect(companionSessionService.activateOrGet).toHaveBeenCalledTimes(2);
    expect(companionSessionService.postSelfImproveRequest).toHaveBeenCalledTimes(2);
    expect(companionSessionService.postSelfImproveRequest.mock.calls[0][0].companionRunId).toBe("evolver-run-1");
    expect(companionSessionService.postSelfImproveRequest.mock.calls[1][0].companionRunId).toBe("evolver-run-1");
    expect(companionSessionService.postSelfImproveRequest.mock.calls[0][1].workTracePackage.summaryHash).toBe("hash-1");
    expect(companionSessionService.postSelfImproveRequest.mock.calls[1][1].workTracePackage.summaryHash).toBe("hash-2");
    expect(workTraceProjectionService.ensureCurrent.mock.invocationCallOrder[0])
      .toBeLessThan(companionSessionService.postSelfImproveRequest.mock.invocationCallOrder[0]);
    expect(workTraceProjectionService.ensureCurrent.mock.invocationCallOrder[1])
      .toBeLessThan(companionSessionService.postSelfImproveRequest.mock.invocationCallOrder[1]);
    await expect(runStore.readRecord("evo-later-click"))
      .resolves.toMatchObject({ status: "completed", evolverRunId: "evolver-run-1", evidenceSummaryHash: "hash-2" });
  });

  it("records companion runtime errors as failed instead of timed out", async () => {
    const runStore = new SelfEvolutionRunStore(memoryDir);
    const service = new SelfEvolutionService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: {
        ensureCurrent: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
          manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
          summaryHash: "hash-123",
          manifest: {
            schemaVersion: 1,
            target: { kind: "agent_run", runId: "target-run-1" },
            generatedAt: "2026-01-01T00:00:00.000Z",
            workTraceRootPath: path.join(targetContext.memoryDir, "work_traces"),
            manifestPath: path.join(targetContext.memoryDir, "work_traces", "work_traces_manifest.json"),
            files: [],
          },
        })),
      } as any,
      companionSessionService: {
        activateOrGet: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          companionRunId: "evolver-run-1",
          evolverAgentDefinitionId: "autobyteus-skill-evolver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "target-model",
          state: {},
        })),
        buildTriggerRequest: vi.fn((input) => ({
          evolutionRunId: input.evolutionRunId,
          requestedAt: input.requestedAt,
          targetAgentRunId: "target-run-1",
          workTracePackage: input.workTracePackage,
          editableSkillTargets: input.editableSkillTargets,
        })),
        postSelfImproveRequest: vi.fn(async () => {
          throw new Error("Self-evolver companion run 'evolver-run-1' failed.");
        }),
      } as any,
      recordLifecycle: new SelfEvolutionRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });

    await expect(service.startFromEvolutionRequest(request("evo-companion-error")))
      .rejects.toThrow("Self-evolver companion run 'evolver-run-1' failed.");
    await expect(runStore.readRecord("evo-companion-error"))
      .resolves.toMatchObject({ status: "failed", errors: ["Error: Self-evolver companion run 'evolver-run-1' failed."] });
  });

});
