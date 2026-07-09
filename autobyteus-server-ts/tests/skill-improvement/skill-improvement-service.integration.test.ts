import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { DirectAgentRunMessageGrantRegistry } from "../../src/agent-communication/services/direct-agent-run-message-grant-registry.js";
import { AgentWorkTraceProjectionService } from "../../src/agent-work-traces/services/agent-work-trace-projection-service.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SkillImprovementRecordLifecycle } from "../../src/skill-improvement/services/skill-improvement-record-lifecycle.js";
import { SkillImprovementRunStore } from "../../src/skill-improvement/services/skill-improvement-run-store.js";
import { SkillImprovementService } from "../../src/skill-improvement/services/skill-improvement-service.js";
import { SkillImprovementImproverSessionService } from "../../src/skill-improvement/services/improver-session/skill-improvement-improver-session-service.js";
import type { SkillImprovementRequest, SkillImprovementRunStatus, SkillImprovementSkillTarget } from "../../src/skill-improvement/domain/models.js";
import type { SkillImprovementTargetContext } from "../../src/skill-improvement/services/skill-improvement-target-context-resolver.js";

const effectiveConfig = {
  enabled: true,
  triggerStrategy: "manual_only",
  improverStrategy: "single_agent",
  improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
  resolvedAt: "2026-01-01T00:00:00.000Z",
  sourceTrace: [],
} as const;

const rawTrace = (record: Record<string, unknown>): string => JSON.stringify(record);

const writeActiveRawTraces = async (
  memoryDir: string,
  records: Array<Record<string, unknown>>,
): Promise<void> => {
  await fs.mkdir(memoryDir, { recursive: true });
  await fs.writeFile(
    path.join(memoryDir, "raw_traces_active.jsonl"),
    `${records.map(rawTrace).join("\n")}\n`,
    "utf-8",
  );
};

const workTracePackageFor = (memoryDir: string, summaryHash: string, generatedAt = "2026-01-01T00:00:00.000Z") => ({
  target: { kind: "agent_run" as const, runId: "target-run-1" },
  targetDisplayName: "Target Agent",
  workTraceRootPath: path.join(memoryDir, "work_traces"),
  manifestPath: path.join(memoryDir, "work_traces", "work_traces_manifest.json"),
  summaryHash,
  manifest: {
    schemaVersion: 3 as const,
    target: { kind: "agent_run" as const, runId: "target-run-1" },
    targetDisplayName: "Target Agent",
    generatedAt,
    workTraceRootPath: path.join(memoryDir, "work_traces"),
    manifestPath: path.join(memoryDir, "work_traces", "work_traces_manifest.json"),
    files: [],
  },
});

describe("SkillImprovementService executable direct-edit flow", () => {
  let tempRoot: string;
  let tempMemoryRoot: string;
  let memoryDir: string;
  let skillMdPath: string;
  let skillTarget: SkillImprovementSkillTarget;
  let targetContext: SkillImprovementTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-improvement-service-flow-"));
    tempMemoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-improvement-service-memory-"));
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

  const request = (id: string): SkillImprovementRequest => ({
    improvementRunId: id,
    triggerStrategy: "manual_only",
    target: { kind: "agent_run", runId: "target-run-1" },
    effectiveConfig,
    requestedAt: "2026-01-01T00:00:00.000Z",
    requestedByUserId: "validator",
    requestedFrom: "api",
  });

  const buildService = (improverStatus: SkillImprovementRunStatus = "completed"): SkillImprovementService => {
    const runStore = new SkillImprovementRunStore(memoryDir);
    return new SkillImprovementService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: {
        ensureCurrent: vi.fn(async () => workTracePackageFor(targetContext.memoryDir, "hash-123")),
      } as any,
      improverSessionService: {
        activateOrGet: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          improverRunId: "improver-run-1",
          improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "target-model",
          state: {},
        })),
        buildTriggerRequest: vi.fn((input) => ({
          improvementRunId: input.improvementRunId,
          requestedAt: input.requestedAt,
          targetAgentRunId: "target-run-1",
          workTracePackage: input.workTracePackage,
          editableSkillTargets: input.editableSkillTargets,
        })),
        postSkillImprovementRequest: vi.fn(async () => ({
          status: improverStatus === "timed_out" ? "timed_out" : "completed",
          outputText: improverStatus === "completed" ? "done" : null,
          notificationSummary: improverStatus === "completed"
            ? { status: "send_message_sent", message: "outcome sent", targetAgentRunId: "target-run-1", improverRunId: "improver-run-1" }
            : null,
        })),
      } as any,
      recordLifecycle: new SkillImprovementRecordLifecycle({
        runStore,
        notificationService: {
          notify: vi.fn(async () => ({ status: "next_run_only" })),
        } as any,
      }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });
  };

  it("records minimal provenance and notification for a completed visible improver run", async () => {
    const service = buildService("completed");

    const result = await service.startFromImprovementRequest(request("improvement-minimal-record"));

    expect(result.record).toMatchObject({
      status: "completed",
      sourceRunIds: ["target-run-1"],
      improverRunId: "improver-run-1",
      improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      workspaceRootPath: tempRoot,
      skillTargets: [skillTarget],
      evidenceSummaryHash: "hash-123",
      notificationSummary: { status: "send_message_sent", message: "outcome sent", targetAgentRunId: "target-run-1", improverRunId: "improver-run-1" },
      errors: [],
    });
    expect(result.record).not.toHaveProperty("changeSummary");
    expect(result.record).not.toHaveProperty("updateMetrics");
    expect(result.record).not.toHaveProperty("benefitMetrics");
    await expect(new SkillImprovementRunStore(memoryDir).readRecord("improvement-minimal-record"))
      .resolves.toMatchObject({ status: "completed" });
  });

  it("manual trigger generates real work-trace files before posting the improver request", async () => {
    await writeActiveRawTraces(targetContext.memoryDir, [
      {
        id: "manual-user-1",
        trace_type: "user",
        ts: 1_788_100_000,
        turn_id: "turn-1",
        seq: 1,
        content: "Please prepare Skill Improvement evidence.",
      },
      {
        id: "manual-assistant-1",
        trace_type: "assistant",
        ts: 1_788_100_010,
        turn_id: "turn-1",
        seq: 2,
        content: "Visible response for the manual trigger.",
      },
      {
        id: "manual-reasoning-1",
        trace_type: "reasoning",
        ts: 1_788_100_020,
        turn_id: "turn-1",
        seq: 3,
        content: "INTEGRATED_REASONING_SHOULD_NOT_RENDER",
      },
      {
        id: "manual-tool-call-1",
        trace_type: "tool_call",
        tool_name: "inspect_repo",
        tool_call_id: "tool-call-1",
        ts: 1_788_100_030,
        turn_id: "turn-1",
        seq: 4,
        tool_args: { path: "SKILL.md" },
      },
      {
        id: "manual-tool-result-1",
        trace_type: "tool_result",
        tool_name: "inspect_repo",
        tool_call_id: "tool-call-1",
        ts: 1_788_100_040,
        turn_id: "turn-1",
        seq: 5,
        tool_result: { status: "ok" },
      },
    ]);

    const postedMessages: unknown[] = [];
    let listener: ((event: unknown) => void) | null = null;
    const improverRun = {
      runId: "improver-run-1",
      isActive: () => true,
      postUserMessage: vi.fn(async (message: unknown) => {
        postedMessages.push(message);
        listener?.({
          runId: "improver-run-1",
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
          statusHint: null,
          payload: { content: "No durable skill change was warranted." },
        });
        listener?.({
          runId: "improver-run-1",
          eventType: AgentRunEventType.TURN_COMPLETED,
          statusHint: null,
          payload: {},
        });
        return { accepted: true };
      }),
      subscribeToEvents: vi.fn((callback: (event: unknown) => void) => {
        listener = callback;
        return vi.fn();
      }),
    };
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "improver-run-1" })),
      getAgentRun: vi.fn((runId: string) => runId === "improver-run-1" ? improverRun : null),
      recordRunActivity: vi.fn(async () => undefined),
    };
    const runStore = new SkillImprovementRunStore(memoryDir);
    const service = new SkillImprovementService({
      capabilityService: {
        getCapability: vi.fn(async () => ({
          enabled: true,
          settingKey: "AUTOBYTEUS_SKILL_IMPROVEMENT_ENABLED",
          source: "SERVER_SETTING",
        })),
        requireEnabled: vi.fn(async () => undefined),
      } as any,
      effectiveConfigResolver: {
        resolveCurrentManualSkillImprovementSettings: vi.fn(() => effectiveConfig),
      } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: new AgentWorkTraceProjectionService(),
      improverSessionService: new SkillImprovementImproverSessionService({
        agentRunService: agentRunService as any,
        settingsResolver: {
          resolve: vi.fn(async () => ({
            agentDefinitionId: "autobyteus-retrospective-skill-improver",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            llmModelIdentifier: "target-model",
            llmConfig: null,
            skillAccessMode: "PRELOADED_ONLY",
          })),
        } as any,
        grantRegistry: new DirectAgentRunMessageGrantRegistry(),
        timeoutMs: 100,
      }),
      recordLifecycle: new SkillImprovementRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });

    const result = await service.startForAgentRun({
      runId: "target-run-1",
      requestedByUserId: "validator",
      requestedFrom: "api",
    });

    const workTraceRootPath = path.join(targetContext.memoryDir, "work_traces");
    const manifestPath = path.join(workTraceRootPath, "work_traces_manifest.json");
    const workTraceFilePath = path.join(workTraceRootPath, "work_trace_active.md");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as Record<string, any>;
    const workTraceContent = await fs.readFile(workTraceFilePath, "utf-8");

    expect(result.record).toMatchObject({
      status: "completed",
      sourceRunIds: ["target-run-1"],
      evidenceSummaryHash: expect.any(String),
      improverRunId: "improver-run-1",
      improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
      notificationSummary: {
        status: "send_message_not_attempted",
        targetAgentRunId: "target-run-1",
        improverRunId: "improver-run-1",
      },
    });
    expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      agentDefinitionId: "autobyteus-retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }));
    expect(manifest).toMatchObject({
      schemaVersion: 3,
      target: { kind: "agent_run", runId: "target-run-1" },
      targetDisplayName: "Target Agent",
      workTraceRootPath,
      manifestPath,
      files: [{
        sourceId: "active",
        sourceKind: "active",
        fileName: "work_trace_active.md",
        filePath: workTraceFilePath,
        recordCount: 5,
      }],
    });
    expect(JSON.stringify(manifest)).not.toContain("renderContext");
    expect(JSON.stringify(manifest)).not.toContain("subjectLabel");
    expect(JSON.stringify(manifest)).not.toContain("rendererVersion");
    expect(JSON.stringify(manifest)).not.toContain("fingerprint");
    expect(workTraceContent.startsWith("# Work Trace\n")).toBe(true);
    expect(workTraceContent).toContain("user:\nPlease prepare Skill Improvement evidence.");
    expect(workTraceContent).toContain("assistant:\nVisible response for the manual trigger.");
    expect(workTraceContent).toContain("tool:\nname: inspect_repo\nstatus: success");
    expect(workTraceContent).not.toContain("Target Agent:");
    expect(workTraceContent).not.toContain("assistant reasoning:");
    expect(workTraceContent).not.toContain("INTEGRATED_REASONING_SHOULD_NOT_RENDER");
    expect(workTraceContent).not.toContain("Source:");
    expect(workTraceContent).not.toContain("Records:");

    expect(postedMessages).toHaveLength(1);
    const postedMessage = postedMessages[0] as { content: string; metadata: Record<string, unknown> };
    expect(postedMessage.content).toContain(`Work trace manifest: ${manifestPath}`);
    expect(postedMessage.content).toContain(`Work trace root: ${workTraceRootPath}`);
    expect(postedMessage.content).toContain(`1. ${workTraceFilePath}`);
    expect(postedMessage.content).toContain(`Root directory: ${path.dirname(skillMdPath)}`);
    expect(postedMessage.content).not.toContain("Visible response for the manual trigger.");
    expect(postedMessage.content).not.toContain("INTEGRATED_REASONING_SHOULD_NOT_RENDER");
    expect(postedMessage.content).not.toContain("raw_traces");
    expect(postedMessage.content).not.toContain("target worker");
    expect(postedMessage.metadata).toMatchObject({
      skill_improvement_work_trace_manifest_path: manifestPath,
      skill_improvement_work_trace_root_path: workTraceRootPath,
      skill_improvement_target_agent_run_id: "target-run-1",
    });
    await expect(runStore.readRecord(result.improvementRunId))
      .resolves.toMatchObject({ status: "completed", evidenceSummaryHash: result.record.evidenceSummaryHash });
  });

  it("rejects a stale target before launching the improver", async () => {
    const runStore = new SkillImprovementRunStore(memoryDir);
    const improverSessionService = { activateOrGet: vi.fn(), postSkillImprovementRequest: vi.fn(), buildTriggerRequest: vi.fn() };
    const service = new SkillImprovementService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: { ensureCurrent: vi.fn() } as any,
      improverSessionService: improverSessionService as any,
      recordLifecycle: new SkillImprovementRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => null) } as any,
    });

    await expect(service.startFromImprovementRequest(request("improvement-stale-target")))
      .rejects.toThrow("Skill Improvement target run 'target-run-1' is not active.");
    expect(improverSessionService.activateOrGet).not.toHaveBeenCalled();
    await expect(runStore.readRecord("improvement-stale-target"))
      .resolves.toMatchObject({ status: "failed" });
  });

  it("finalizes a non-completed improver run without notification or metric side effects", async () => {
    const service = buildService("timed_out");

    const result = await service.startFromImprovementRequest(request("improvement-improver-timeout"));

    expect(result.record.status).toBe("timed_out");
    expect(result.record.notificationSummary).toBeNull();
    expect(result.record).not.toHaveProperty("changeSummary");
    expect(result.record).not.toHaveProperty("updateMetrics");
    expect(result.record).not.toHaveProperty("benefitMetrics");
  });
  it("refreshes work traces before each improver trigger and reuses the improver run on later clicks", async () => {
    const runStore = new SkillImprovementRunStore(memoryDir);
    let projectionCount = 0;
    const packageFor = (count: number) => workTracePackageFor(
      targetContext.memoryDir,
      `hash-${count}`,
      `2026-01-01T00:00:0${count}.000Z`,
    );
    const workTraceProjectionService = {
      ensureCurrent: vi.fn(async () => packageFor(++projectionCount)),
    };
    const improverSession = {
      target: { kind: "agent_run" as const, runId: "target-run-1" },
      improverRunId: "improver-run-1",
      improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      state: {},
    };
    const improverSessionService = {
      activateOrGet: vi.fn(async () => improverSession),
      buildTriggerRequest: vi.fn((input) => ({
        improvementRunId: input.improvementRunId,
        requestedAt: input.requestedAt,
        targetAgentRunId: "target-run-1",
        workTracePackage: input.workTracePackage,
        editableSkillTargets: input.editableSkillTargets,
      })),
      postSkillImprovementRequest: vi.fn(async () => ({
        status: "completed",
        outputText: "done",
        notificationSummary: {
          status: "send_message_sent",
          message: "outcome sent",
          targetAgentRunId: "target-run-1",
          improverRunId: "improver-run-1",
        },
      })),
    };
    const service = new SkillImprovementService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: workTraceProjectionService as any,
      improverSessionService: improverSessionService as any,
      recordLifecycle: new SkillImprovementRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });

    await service.startFromImprovementRequest(request("improvement-first-click"));
    await service.startFromImprovementRequest(request("improvement-later-click"));

    expect(workTraceProjectionService.ensureCurrent).toHaveBeenCalledTimes(2);
    expect(workTraceProjectionService.ensureCurrent).toHaveBeenNthCalledWith(1, {
      target: { kind: "agent_run", runId: "target-run-1" },
      memoryDir: targetContext.memoryDir,
      targetDisplayName: "Target Agent",
    });
    expect(workTraceProjectionService.ensureCurrent).toHaveBeenNthCalledWith(2, {
      target: { kind: "agent_run", runId: "target-run-1" },
      memoryDir: targetContext.memoryDir,
      targetDisplayName: "Target Agent",
    });
    expect(improverSessionService.activateOrGet).toHaveBeenCalledTimes(2);
    expect(improverSessionService.postSkillImprovementRequest).toHaveBeenCalledTimes(2);
    expect(improverSessionService.postSkillImprovementRequest.mock.calls[0][0].improverRunId).toBe("improver-run-1");
    expect(improverSessionService.postSkillImprovementRequest.mock.calls[1][0].improverRunId).toBe("improver-run-1");
    expect(improverSessionService.postSkillImprovementRequest.mock.calls[0][1].workTracePackage.summaryHash).toBe("hash-1");
    expect(improverSessionService.postSkillImprovementRequest.mock.calls[1][1].workTracePackage.summaryHash).toBe("hash-2");
    expect(workTraceProjectionService.ensureCurrent.mock.invocationCallOrder[0])
      .toBeLessThan(improverSessionService.postSkillImprovementRequest.mock.invocationCallOrder[0]);
    expect(workTraceProjectionService.ensureCurrent.mock.invocationCallOrder[1])
      .toBeLessThan(improverSessionService.postSkillImprovementRequest.mock.invocationCallOrder[1]);
    await expect(runStore.readRecord("improvement-later-click"))
      .resolves.toMatchObject({ status: "completed", improverRunId: "improver-run-1", evidenceSummaryHash: "hash-2" });
  });

  it("records improver runtime errors as failed instead of timed out", async () => {
    const runStore = new SkillImprovementRunStore(memoryDir);
    const service = new SkillImprovementService({
      capabilityService: { requireEnabled: vi.fn(async () => undefined) } as any,
      targetContextResolver: { resolve: vi.fn(async () => targetContext) } as any,
      skillTargetResolver: { resolveForAgentDefinition: vi.fn(async () => [skillTarget]) } as any,
      workTraceProjectionService: {
        ensureCurrent: vi.fn(async () => workTracePackageFor(targetContext.memoryDir, "hash-123")),
      } as any,
      improverSessionService: {
        activateOrGet: vi.fn(async () => ({
          target: { kind: "agent_run", runId: "target-run-1" },
          improverRunId: "improver-run-1",
          improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "target-model",
          state: {},
        })),
        buildTriggerRequest: vi.fn((input) => ({
          improvementRunId: input.improvementRunId,
          requestedAt: input.requestedAt,
          targetAgentRunId: "target-run-1",
          workTracePackage: input.workTracePackage,
          editableSkillTargets: input.editableSkillTargets,
        })),
        postSkillImprovementRequest: vi.fn(async () => {
          throw new Error("Retrospective Skill Improver run 'improver-run-1' failed.");
        }),
      } as any,
      recordLifecycle: new SkillImprovementRecordLifecycle({ runStore }),
      agentRunManager: { getActiveRun: vi.fn(() => ({ runId: "target-run-1" })) } as any,
    });

    await expect(service.startFromImprovementRequest(request("improvement-improver-error")))
      .rejects.toThrow("Retrospective Skill Improver run 'improver-run-1' failed.");
    await expect(runStore.readRecord("improvement-improver-error"))
      .resolves.toMatchObject({ status: "failed", errors: ["Error: Retrospective Skill Improver run 'improver-run-1' failed."] });
  });

});
