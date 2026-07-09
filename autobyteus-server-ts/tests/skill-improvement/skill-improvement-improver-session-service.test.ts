import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { DirectAgentRunMessageGrantRegistry } from "../../src/agent-communication/services/direct-agent-run-message-grant-registry.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import type { SkillImprovementEffectiveConfig } from "../../src/skill-improvement/domain/models.js";
import type { SkillImprovementTargetContext } from "../../src/skill-improvement/services/skill-improvement-target-context-resolver.js";
import { SkillImprovementImproverSessionStore } from "../../src/skill-improvement/services/improver-session/skill-improvement-improver-session-store.js";
import { SkillImprovementImproverSessionService } from "../../src/skill-improvement/services/improver-session/skill-improvement-improver-session-service.js";
import { SkillImprovementImproverTriggerMessageBuilder } from "../../src/skill-improvement/services/improver-session/skill-improvement-improver-trigger-message-builder.js";
import { SKILL_IMPROVEMENT_DIRECT_MESSAGE_GRANT_PURPOSE, SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE } from "../../src/skill-improvement/domain/messages.js";

const effectiveConfig: SkillImprovementEffectiveConfig = {
  enabled: true,
  triggerStrategy: "manual_only",
  improverStrategy: "single_agent",
  improverAgentDefinitionId: "retrospective-skill-improver",
  resolvedAt: "2026-01-01T00:00:00.000Z",
  sourceTrace: [],
};

const fakeRun = (runId: string, active = true) => ({
  runId,
  isActive: () => active,
  postUserMessage: vi.fn(async () => ({ accepted: true })),
  subscribeToEvents: vi.fn(() => () => undefined),
});

const buildWorkTracePackage = (input: {
  workTraceRootPath: string;
  manifestPath: string;
  workTraceFilePath: string;
}) => ({
  target: { kind: "agent_run" as const, runId: "target-run-1" },
  targetDisplayName: "Target",
  workTraceRootPath: input.workTraceRootPath,
  manifestPath: input.manifestPath,
  summaryHash: "summary-hash",
  manifest: {
    schemaVersion: 3 as const,
    target: { kind: "agent_run" as const, runId: "target-run-1" },
    targetDisplayName: "Target",
    generatedAt: "2026-01-01T00:00:00.000Z",
    workTraceRootPath: input.workTraceRootPath,
    manifestPath: input.manifestPath,
    files: [{
      sourceId: "active",
      sourceKind: "active" as const,
      sourceDisplayName: "active raw traces",
      fileName: "work_trace_active.md",
      filePath: input.workTraceFilePath,
      recordCount: 2,
      firstTimestamp: "2026-01-01T00:00:00.000Z",
      lastTimestamp: "2026-01-01T00:00:01.000Z",
      generatedAt: "2026-01-01T00:00:02.000Z",
    }],
  },
});

describe("SkillImprovementImproverSessionService", () => {
  let tempRoot: string;
  let context: SkillImprovementTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-improvement-improver-"));
    context = {
      target: { kind: "agent_run", runId: "target-run-1" },
      sourceRunIds: ["target-run-1"],
      targetAgentDefinition: new AgentDefinition({ id: "target-agent", name: "Target", description: "Target", instructions: "" }),
      agentDefinitionId: "target-agent",
      agentName: "Target",
      workspaceRootPath: tempRoot,
      memoryDir: path.join(tempRoot, "memory", "agents", "target-run-1"),
      runMetadataPath: null,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      llmConfig: null,
      effectiveConfig,
      targetMetadata: {} as any,
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("persists improver session state and reuses an active improver run", async () => {
    const improverRun = fakeRun("improver-run-1");
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "improver-run-1" })),
      getAgentRun: vi.fn(() => improverRun),
      recordRunActivity: vi.fn(),
    };
    const service = new SkillImprovementImproverSessionService({
      agentRunService: agentRunService as any,
      settingsResolver: {
        resolve: vi.fn(async () => ({
          agentDefinitionId: "retrospective-skill-improver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "improver-model",
          llmConfig: null,
          skillAccessMode: "PRELOADED_ONLY",
        })),
      } as any,
    });

    const first = await service.activateOrGet(context);
    const second = await service.activateOrGet(context);
    const store = new SkillImprovementImproverSessionStore();
    const state = await store.load(context);
    const rawState = JSON.parse(await fs.readFile(store.getImproverSessionPath(context), "utf-8"));

    expect(first.improverRunId).toBe("improver-run-1");
    expect(second.improverRunId).toBe("improver-run-1");
    expect(agentRunService.createAgentRun).toHaveBeenCalledTimes(1);
    expect(store.getImproverSessionPath(context)).toBe(path.join(context.memoryDir, "skill_improvement", "improver_session.json"));
    expect(first).not.toHaveProperty("targetKey");
    expect(state).toMatchObject({
      status: "active",
      currentImproverRunId: "improver-run-1",
      priorImproverRunIds: [],
      memoryRootPath: context.memoryDir,
    });
    expect(rawState).not.toHaveProperty("targetKey");
    await expect(fs.stat(path.join(context.memoryDir, "skill_improvement", "targets"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("restores an inactive improver run when the runtime supports restore", async () => {
    const store = new SkillImprovementImproverSessionStore();
    await store.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentImproverRunId: "restorable-improver",
      priorImproverRunIds: [],
      improverAgentDefinitionId: "retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "old-model",
      workspaceRootPath: tempRoot,
      memoryRootPath: context.memoryDir,
      workTraces: {
        rootPath: "/work-traces",
        manifestPath: "/work-traces/work_traces_manifest.json",
        lastSummaryHash: "hash-old",
      },
      lastRequest: { improvementRunId: "previous", requestedAt: "2026-01-01T00:00:00.000Z" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const restoredRun = fakeRun("restorable-improver");
    const agentRunService = {
      createAgentRun: vi.fn(),
      getAgentRun: vi.fn(() => null),
      restoreAgentRun: vi.fn(async () => ({ run: restoredRun })),
      recordRunActivity: vi.fn(),
    };

    const session = await new SkillImprovementImproverSessionService({
      agentRunService: agentRunService as any,
      improverSessionStore: store,
      settingsResolver: {
        resolve: vi.fn(async () => {
          throw new Error("settings resolver should not be used when restore succeeds");
        }),
      } as any,
    }).activateOrGet(context);
    const state = await store.load(context);

    expect(session.improverRunId).toBe("restorable-improver");
    expect(agentRunService.restoreAgentRun).toHaveBeenCalledWith("restorable-improver");
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "active",
      currentImproverRunId: "restorable-improver",
      priorImproverRunIds: [],
      workTraces: {
        manifestPath: "/work-traces/work_traces_manifest.json",
      },
    });
  });

  it("records unavailable prior improver and creates a replacement", async () => {
    const store = new SkillImprovementImproverSessionStore();
    await store.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentImproverRunId: "dead-improver",
      priorImproverRunIds: [],
      improverAgentDefinitionId: "retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "old-model",
      workspaceRootPath: tempRoot,
      memoryRootPath: context.memoryDir,
      workTraces: {
        rootPath: "/work-traces",
        manifestPath: "/work-traces/work_traces_manifest.json",
        lastSummaryHash: "hash-old",
      },
      lastRequest: { improvementRunId: "previous", requestedAt: "2026-01-01T00:00:00.000Z" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const replacementRun = fakeRun("replacement-improver");
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "replacement-improver" })),
      getAgentRun: vi.fn((runId: string) => runId === "replacement-improver" ? replacementRun : null),
      recordRunActivity: vi.fn(),
    };

    const session = await new SkillImprovementImproverSessionService({
      agentRunService: agentRunService as any,
      improverSessionStore: store,
      settingsResolver: {
        resolve: vi.fn(async () => ({
          agentDefinitionId: "retrospective-skill-improver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "new-model",
          llmConfig: null,
          skillAccessMode: "PRELOADED_ONLY",
        })),
      } as any,
    }).activateOrGet(context);
    const state = await store.load(context);

    expect(session.improverRunId).toBe("replacement-improver");
    expect(state).toMatchObject({
      status: "active",
      currentImproverRunId: "replacement-improver",
      priorImproverRunIds: ["dead-improver"],
      workTraces: {
        manifestPath: "/work-traces/work_traces_manifest.json",
      },
    });
  });

  it("posts the concise Skill Improvement task packet through the improver request path and registers the final-message grant", async () => {
    const manifestPath = path.join(tempRoot, "memory", "agents", "target-run-1", "work_traces", "work_traces_manifest.json");
    const workTraceRootPath = path.dirname(manifestPath);
    const workTraceFilePath = path.join(workTraceRootPath, "work_trace_active.md");
    const skillRootPath = path.join(tempRoot, "skills", "durable-skill");
    const skillMdPath = path.join(skillRootPath, "SKILL.md");
    await fs.mkdir(path.join(skillRootPath, "references"), { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRootPath, "references", "playbook.md"), "# Playbook\n", "utf-8");

    let listener: ((event: unknown) => void) | null = null;
    const postedMessages: unknown[] = [];
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
      getAgentRun: vi.fn(() => improverRun),
      recordRunActivity: vi.fn(async () => undefined),
    };
    const grantRegistry = new DirectAgentRunMessageGrantRegistry();
    const service = new SkillImprovementImproverSessionService({
      agentRunService: agentRunService as any,
      grantRegistry,
      timeoutMs: 100,
    });

    const result = await service.postSkillImprovementRequest({
      target: { kind: "agent_run", runId: "target-run-1" },
      improverRunId: "improver-run-1",
      improverAgentDefinitionId: "retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "model",
      state: {
        schemaVersion: 1,
        target: { kind: "agent_run", runId: "target-run-1" },
        status: "active",
        currentImproverRunId: "improver-run-1",
        priorImproverRunIds: ["prior-improver-internal"],
        improverAgentDefinitionId: "retrospective-skill-improver",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "model",
        workspaceRootPath: tempRoot,
        memoryRootPath: context.memoryDir,
        workTraces: {
          rootPath: null,
          manifestPath: null,
          lastSummaryHash: null,
        },
        lastRequest: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    }, {
      improvementRunId: "improvement-integrated-post",
      requestedAt: "2026-01-01T00:00:00.000Z",
      targetAgentRunId: "target-run-1",
      workTracePackage: buildWorkTracePackage({ workTraceRootPath, manifestPath, workTraceFilePath }),
      editableSkillTargets: [{
        skillName: "durable-skill",
        skillRootPath,
        skillMdPath,
        isWritable: true,
      }],
    }, context);

    expect(result).toMatchObject({
      status: "completed",
      outputText: "No durable skill change was warranted.",
      notificationSummary: {
        status: "send_message_not_attempted",
        targetAgentRunId: "target-run-1",
        improverRunId: "improver-run-1",
      },
    });
    expect(improverRun.subscribeToEvents).toHaveBeenCalledOnce();
    expect(improverRun.postUserMessage).toHaveBeenCalledOnce();
    expect(agentRunService.recordRunActivity).toHaveBeenCalledOnce();

    const postedMessage = postedMessages[0] as { content: string; metadata: Record<string, unknown> };
    expect(postedMessage.content).toContain(`Work trace manifest: ${manifestPath}`);
    expect(postedMessage.content).toContain(`1. ${workTraceFilePath}`);
    expect(postedMessage.content).toContain(`Root directory: ${skillRootPath}`);
    expect(postedMessage.content).toContain("Package tree:\n   .");
    expect(postedMessage.content).toContain("SKILL.md [entry]");
    expect(postedMessage.content).toContain("playbook.md");
    expect(postedMessage.content).toContain("- target_agent_run_id: target-run-1");
    expect(postedMessage.content).toContain(`- message_type: ${SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE}`);
    expect(postedMessage.content).not.toContain("Previous improver run ids");
    expect(postedMessage.content).not.toContain("prior-improver-internal");
    expect(postedMessage.content).not.toContain("priorImproverRunIds");
    expect(postedMessage.content).not.toContain("Rules:");
    expect(postedMessage.content).not.toContain("raw_traces");
    expect(postedMessage.content).not.toContain("semantically complete");
    expect(postedMessage.content).not.toContain("backend protocol");
    expect(postedMessage.content).not.toContain("Primary guidance file");
    expect(postedMessage.metadata.skill_improvement_entry_skill_paths).toEqual([skillMdPath]);

    const allowed = grantRegistry.evaluate({
      senderRunId: "improver-run-1",
      targetAgentRunId: "target-run-1",
      messageType: SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE,
      referenceFiles: [skillMdPath],
      now: new Date("2026-01-01T00:01:00.000Z"),
    });
    expect(allowed).toMatchObject({
      kind: "allowed",
      grant: {
        senderRunId: "improver-run-1",
        purpose: SKILL_IMPROVEMENT_DIRECT_MESSAGE_GRANT_PURPOSE,
        allowedTargetAgentRunIds: ["target-run-1"],
        allowedMessageTypes: [SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE],
        allowedReferenceFileRoots: [skillRootPath],
        maxAcceptedDeliveries: 1,
      },
    });
    expect(grantRegistry.evaluate({
      senderRunId: "improver-run-1",
      targetAgentRunId: "target-run-1",
      messageType: SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE,
      referenceFiles: [path.join(tempRoot, "outside.md")],
      now: new Date("2026-01-01T00:01:00.000Z"),
    })).toMatchObject({
      kind: "rejected",
      code: "DIRECT_MESSAGE_GRANT_REFERENCE_DENIED",
    });
  });

  it("builds a concise path-only improver trigger with package tree metadata", async () => {
    const manifestPath = path.join(tempRoot, "memory", "agents", "target-run-1", "work_traces", "work_traces_manifest.json");
    const workTraceRootPath = path.dirname(manifestPath);
    const workTraceFilePath = path.join(workTraceRootPath, "work_trace_active.md");
    const skillRootPath = path.join(tempRoot, "skills", "durable-skill");
    const skillMdPath = path.join(skillRootPath, "SKILL.md");
    await fs.mkdir(path.join(skillRootPath, "references"), { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRootPath, "references", "guide.md"), "# Guide\n", "utf-8");

    const message = await new SkillImprovementImproverTriggerMessageBuilder().build({
      improvementRunId: "improvement-path-only",
      requestedAt: "2026-01-01T00:00:00.000Z",
      targetAgentRunId: "target-run-1",
      workTracePackage: buildWorkTracePackage({ workTraceRootPath, manifestPath, workTraceFilePath }),
      editableSkillTargets: [{
        skillName: "durable-skill",
        skillRootPath,
        skillMdPath,
        isWritable: true,
      }],
    }, {
      target: { kind: "agent_run", runId: "target-run-1" },
      improverRunId: "improver-run-1",
      improverAgentDefinitionId: "retrospective-skill-improver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "model",
      state: {
        schemaVersion: 1,
        target: { kind: "agent_run", runId: "target-run-1" },
        status: "active",
        currentImproverRunId: "improver-run-1",
        priorImproverRunIds: ["prior-improver"],
        improverAgentDefinitionId: "retrospective-skill-improver",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "model",
        workspaceRootPath: tempRoot,
        memoryRootPath: context.memoryDir,
        workTraces: {
          rootPath: workTraceRootPath,
          manifestPath,
          lastSummaryHash: "summary-hash",
        },
        lastRequest: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(message.content).toContain(`Work trace manifest: ${manifestPath}`);
    expect(message.content).toContain(`Work trace root: ${workTraceRootPath}`);
    expect(message.content).toContain(`1. ${workTraceFilePath}`);
    expect(message.content).toContain("Skill Improvement requested for the target run/agent.");
    expect(message.content).toContain("Use the listed work trace files as the evidence package.");
    expect(message.content).toContain("The task message and work trace manifest provide the target identity.");
    expect(message.content).toContain("Editable skill packages:");
    expect(message.content).toContain(`Root directory: ${skillRootPath}`);
    expect(message.content).toContain("Package tree:\n   .");
    expect(message.content).toContain("SKILL.md [entry]");
    expect(message.content).toContain("references/");
    expect(message.content).toContain("guide.md");
    expect(message.content).toContain("Completion target:");
    expect(message.content).toContain("- target_agent_run_id: target-run-1");
    expect(message.content).toContain(`- message_type: ${SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE}`);
    expect(message.content).not.toContain("Previous improver run ids");
    expect(message.content).not.toContain("prior-improver");
    expect(message.content).not.toContain("priorImproverRunIds");
    expect(message.content).not.toContain("Rules:");
    expect(message.content).not.toContain("raw_traces");
    expect(message.content).not.toContain("semantically complete");
    expect(message.content).not.toContain("backend protocol");
    expect(message.content).not.toContain("hide backend");
    expect(message.content).not.toContain("Primary guidance file");
    expect(message.content).not.toContain("user:\n");
    expect(message.content).not.toContain("worker:\n");
    expect(message.content).not.toContain("target worker");
    expect(message.metadata).toMatchObject({
      skill_improvement_work_trace_manifest_path: manifestPath,
      skill_improvement_work_trace_root_path: workTraceRootPath,
      skill_improvement_target_agent_run_id: "target-run-1",
      skill_improvement_target_message_type: SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE,
    });
    expect(message.metadata.skill_improvement_editable_skill_roots).toEqual([skillRootPath]);
    expect(message.metadata.skill_improvement_primary_skill_paths).toEqual([skillMdPath]);
    expect(message.metadata.skill_improvement_entry_skill_paths).toEqual([skillMdPath]);
  });
});
