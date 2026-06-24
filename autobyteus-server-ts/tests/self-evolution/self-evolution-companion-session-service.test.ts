import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { AgentRunEventType } from "../../src/agent-execution/domain/agent-run-event.js";
import { DirectAgentRunMessageGrantRegistry } from "../../src/agent-communication/services/direct-agent-run-message-grant-registry.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import type { SelfEvolutionEffectiveConfig } from "../../src/self-evolution/domain/models.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";
import { SelfEvolutionEvolverSessionStore } from "../../src/self-evolution/services/companion/self-evolution-evolver-session-store.js";
import { SelfEvolutionCompanionSessionService } from "../../src/self-evolution/services/companion/self-evolution-companion-session-service.js";
import { SelfEvolutionCompanionTriggerMessageBuilder } from "../../src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.js";
import { SELF_EVOLUTION_DIRECT_MESSAGE_GRANT_PURPOSE, SELF_EVOLUTION_TARGET_MESSAGE_TYPE } from "../../src/self-evolution/domain/messages.js";

const effectiveConfig: SelfEvolutionEffectiveConfig = {
  enabled: true,
  triggerStrategy: "manual_only",
  evolverStrategy: "single_agent",
  evolverAgentDefinitionId: "skill-evolver",
  resolvedAt: "2026-01-01T00:00:00.000Z",
  sourceTrace: [],
};

const fakeRun = (runId: string, active = true) => ({
  runId,
  isActive: () => active,
  postUserMessage: vi.fn(async () => ({ accepted: true })),
  subscribeToEvents: vi.fn(() => () => undefined),
});

describe("SelfEvolutionCompanionSessionService", () => {
  let tempRoot: string;
  let context: SelfEvolutionTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-companion-"));
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

  it("persists evolver session state and reuses an active companion run", async () => {
    const companionRun = fakeRun("companion-run-1");
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "companion-run-1" })),
      getAgentRun: vi.fn(() => companionRun),
      recordRunActivity: vi.fn(),
    };
    const service = new SelfEvolutionCompanionSessionService({
      agentRunService: agentRunService as any,
      settingsResolver: {
        resolve: vi.fn(async () => ({
          agentDefinitionId: "skill-evolver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "companion-model",
          llmConfig: null,
          skillAccessMode: "PRELOADED_ONLY",
        })),
      } as any,
    });

    const first = await service.activateOrGet(context);
    const second = await service.activateOrGet(context);
    const store = new SelfEvolutionEvolverSessionStore();
    const state = await store.load(context);
    const rawState = JSON.parse(await fs.readFile(store.getEvolverSessionPath(context), "utf-8"));

    expect(first.companionRunId).toBe("companion-run-1");
    expect(second.companionRunId).toBe("companion-run-1");
    expect(agentRunService.createAgentRun).toHaveBeenCalledTimes(1);
    expect(store.getEvolverSessionPath(context)).toBe(path.join(context.memoryDir, "self_evolution", "evolver_session.json"));
    expect(first).not.toHaveProperty("targetKey");
    expect(state).toMatchObject({
      status: "active",
      currentEvolverRunId: "companion-run-1",
      priorEvolverRunIds: [],
      memoryRootPath: context.memoryDir,
    });
    expect(rawState).not.toHaveProperty("targetKey");
    await expect(fs.stat(path.join(context.memoryDir, "self_evolution", "targets"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("restores an inactive evolver run when the runtime supports restore", async () => {
    const store = new SelfEvolutionEvolverSessionStore();
    await store.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentEvolverRunId: "restorable-companion",
      priorEvolverRunIds: [],
      evolverAgentDefinitionId: "skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "old-model",
      workspaceRootPath: tempRoot,
      memoryRootPath: context.memoryDir,
      workTraces: {
        rootPath: "/work-traces",
        manifestPath: "/work-traces/work_traces_manifest.json",
        lastSummaryHash: "hash-old",
      },
      lastRequest: { evolutionRunId: "previous", requestedAt: "2026-01-01T00:00:00.000Z" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const restoredRun = fakeRun("restorable-companion");
    const agentRunService = {
      createAgentRun: vi.fn(),
      getAgentRun: vi.fn(() => null),
      restoreAgentRun: vi.fn(async () => ({ run: restoredRun })),
      recordRunActivity: vi.fn(),
    };

    const session = await new SelfEvolutionCompanionSessionService({
      agentRunService: agentRunService as any,
      evolverSessionStore: store,
      settingsResolver: {
        resolve: vi.fn(async () => {
          throw new Error("settings resolver should not be used when restore succeeds");
        }),
      } as any,
    }).activateOrGet(context);
    const state = await store.load(context);

    expect(session.companionRunId).toBe("restorable-companion");
    expect(agentRunService.restoreAgentRun).toHaveBeenCalledWith("restorable-companion");
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "active",
      currentEvolverRunId: "restorable-companion",
      priorEvolverRunIds: [],
      workTraces: {
        manifestPath: "/work-traces/work_traces_manifest.json",
      },
    });
  });

  it("records unavailable prior evolver and creates a replacement", async () => {
    const store = new SelfEvolutionEvolverSessionStore();
    await store.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentEvolverRunId: "dead-companion",
      priorEvolverRunIds: [],
      evolverAgentDefinitionId: "skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "old-model",
      workspaceRootPath: tempRoot,
      memoryRootPath: context.memoryDir,
      workTraces: {
        rootPath: "/work-traces",
        manifestPath: "/work-traces/work_traces_manifest.json",
        lastSummaryHash: "hash-old",
      },
      lastRequest: { evolutionRunId: "previous", requestedAt: "2026-01-01T00:00:00.000Z" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const replacementRun = fakeRun("replacement-companion");
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "replacement-companion" })),
      getAgentRun: vi.fn((runId: string) => runId === "replacement-companion" ? replacementRun : null),
      recordRunActivity: vi.fn(),
    };

    const session = await new SelfEvolutionCompanionSessionService({
      agentRunService: agentRunService as any,
      evolverSessionStore: store,
      settingsResolver: {
        resolve: vi.fn(async () => ({
          agentDefinitionId: "skill-evolver",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "new-model",
          llmConfig: null,
          skillAccessMode: "PRELOADED_ONLY",
        })),
      } as any,
    }).activateOrGet(context);
    const state = await store.load(context);

    expect(session.companionRunId).toBe("replacement-companion");
    expect(state).toMatchObject({
      status: "active",
      currentEvolverRunId: "replacement-companion",
      priorEvolverRunIds: ["dead-companion"],
      workTraces: {
        manifestPath: "/work-traces/work_traces_manifest.json",
      },
    });
  });

  it("posts the concise self-evolution task packet through the companion request path and registers the final-message grant", async () => {
    const manifestPath = path.join(tempRoot, "memory", "agents", "target-run-1", "self_evolution", "work_traces", "work_traces_manifest.json");
    const workTraceRootPath = path.dirname(manifestPath);
    const workTraceFilePath = path.join(workTraceRootPath, "work_trace_active.md");
    const skillRootPath = path.join(tempRoot, "skills", "durable-skill");
    const skillMdPath = path.join(skillRootPath, "SKILL.md");
    await fs.mkdir(path.join(skillRootPath, "references"), { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRootPath, "references", "playbook.md"), "# Playbook\n", "utf-8");

    let listener: ((event: unknown) => void) | null = null;
    const postedMessages: unknown[] = [];
    const companionRun = {
      runId: "companion-run-1",
      isActive: () => true,
      postUserMessage: vi.fn(async (message: unknown) => {
        postedMessages.push(message);
        listener?.({
          runId: "companion-run-1",
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
          statusHint: null,
          payload: { content: "No durable skill change was warranted." },
        });
        listener?.({
          runId: "companion-run-1",
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
      getAgentRun: vi.fn(() => companionRun),
      recordRunActivity: vi.fn(async () => undefined),
    };
    const grantRegistry = new DirectAgentRunMessageGrantRegistry();
    const service = new SelfEvolutionCompanionSessionService({
      agentRunService: agentRunService as any,
      grantRegistry,
      timeoutMs: 100,
    });

    const result = await service.postSelfImproveRequest({
      target: { kind: "agent_run", runId: "target-run-1" },
      companionRunId: "companion-run-1",
      evolverAgentDefinitionId: "skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "model",
      state: {
        schemaVersion: 1,
        target: { kind: "agent_run", runId: "target-run-1" },
        status: "active",
        currentEvolverRunId: "companion-run-1",
        priorEvolverRunIds: ["prior-companion-internal"],
        evolverAgentDefinitionId: "skill-evolver",
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
      evolutionRunId: "evo-integrated-post",
      requestedAt: "2026-01-01T00:00:00.000Z",
      targetAgentRunId: "target-run-1",
      workTracePackage: {
        target: { kind: "agent_run", runId: "target-run-1" },
        workTraceRootPath,
        manifestPath,
        summaryHash: "summary-hash",
        manifest: {
          schemaVersion: 1,
          target: { kind: "agent_run", runId: "target-run-1" },
          generatedAt: "2026-01-01T00:00:00.000Z",
          workTraceRootPath,
          manifestPath,
          files: [{
            sourceId: "active",
            sourceKind: "active",
            sourceFingerprint: "fingerprint",
            fileName: "work_trace_active.md",
            filePath: workTraceFilePath,
            recordCount: 2,
            firstTimestamp: "2026-01-01T00:00:00.000Z",
            lastTimestamp: "2026-01-01T00:00:01.000Z",
            generatedAt: "2026-01-01T00:00:02.000Z",
          }],
        },
      },
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
        evolverRunId: "companion-run-1",
      },
    });
    expect(companionRun.subscribeToEvents).toHaveBeenCalledOnce();
    expect(companionRun.postUserMessage).toHaveBeenCalledOnce();
    expect(agentRunService.recordRunActivity).toHaveBeenCalledOnce();

    const postedMessage = postedMessages[0] as { content: string; metadata: Record<string, unknown> };
    expect(postedMessage.content).toContain(`Work trace manifest: ${manifestPath}`);
    expect(postedMessage.content).toContain(`1. ${workTraceFilePath}`);
    expect(postedMessage.content).toContain(`Root directory: ${skillRootPath}`);
    expect(postedMessage.content).toContain("Package tree:\n   .");
    expect(postedMessage.content).toContain("SKILL.md [entry]");
    expect(postedMessage.content).toContain("playbook.md");
    expect(postedMessage.content).toContain("- target_agent_run_id: target-run-1");
    expect(postedMessage.content).toContain(`- message_type: ${SELF_EVOLUTION_TARGET_MESSAGE_TYPE}`);
    expect(postedMessage.content).not.toContain("Previous evolver run ids");
    expect(postedMessage.content).not.toContain("prior-companion-internal");
    expect(postedMessage.content).not.toContain("priorEvolverRunIds");
    expect(postedMessage.content).not.toContain("Rules:");
    expect(postedMessage.content).not.toContain("raw_traces");
    expect(postedMessage.content).not.toContain("semantically complete");
    expect(postedMessage.content).not.toContain("backend protocol");
    expect(postedMessage.content).not.toContain("Primary guidance file");
    expect(postedMessage.metadata.self_evolution_entry_skill_paths).toEqual([skillMdPath]);

    const allowed = grantRegistry.evaluate({
      senderRunId: "companion-run-1",
      targetAgentRunId: "target-run-1",
      messageType: SELF_EVOLUTION_TARGET_MESSAGE_TYPE,
      referenceFiles: [skillMdPath],
      now: new Date("2026-01-01T00:01:00.000Z"),
    });
    expect(allowed).toMatchObject({
      kind: "allowed",
      grant: {
        senderRunId: "companion-run-1",
        purpose: SELF_EVOLUTION_DIRECT_MESSAGE_GRANT_PURPOSE,
        allowedTargetAgentRunIds: ["target-run-1"],
        allowedMessageTypes: [SELF_EVOLUTION_TARGET_MESSAGE_TYPE],
        allowedReferenceFileRoots: [skillRootPath],
        maxAcceptedDeliveries: 1,
      },
    });
    expect(grantRegistry.evaluate({
      senderRunId: "companion-run-1",
      targetAgentRunId: "target-run-1",
      messageType: SELF_EVOLUTION_TARGET_MESSAGE_TYPE,
      referenceFiles: [path.join(tempRoot, "outside.md")],
      now: new Date("2026-01-01T00:01:00.000Z"),
    })).toMatchObject({
      kind: "rejected",
      code: "DIRECT_MESSAGE_GRANT_REFERENCE_DENIED",
    });
  });

  it("builds a concise path-only companion trigger with package tree metadata", async () => {
    const manifestPath = path.join(tempRoot, "memory", "agents", "target-run-1", "self_evolution", "work_traces", "work_traces_manifest.json");
    const workTraceRootPath = path.dirname(manifestPath);
    const workTraceFilePath = path.join(workTraceRootPath, "work_trace_active.md");
    const skillRootPath = path.join(tempRoot, "skills", "durable-skill");
    const skillMdPath = path.join(skillRootPath, "SKILL.md");
    await fs.mkdir(path.join(skillRootPath, "references"), { recursive: true });
    await fs.writeFile(skillMdPath, "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRootPath, "references", "guide.md"), "# Guide\n", "utf-8");

    const message = await new SelfEvolutionCompanionTriggerMessageBuilder().build({
      evolutionRunId: "evo-path-only",
      requestedAt: "2026-01-01T00:00:00.000Z",
      targetAgentRunId: "target-run-1",
      workTracePackage: {
        target: { kind: "agent_run", runId: "target-run-1" },
        workTraceRootPath,
        manifestPath,
        summaryHash: "summary-hash",
        manifest: {
          schemaVersion: 1,
          target: { kind: "agent_run", runId: "target-run-1" },
          generatedAt: "2026-01-01T00:00:00.000Z",
          workTraceRootPath,
          manifestPath,
          files: [{
            sourceId: "active",
            sourceKind: "active",
            sourceFingerprint: "fingerprint",
            fileName: "work_trace_active.md",
            filePath: workTraceFilePath,
            recordCount: 2,
            firstTimestamp: "2026-01-01T00:00:00.000Z",
            lastTimestamp: "2026-01-01T00:00:01.000Z",
            generatedAt: "2026-01-01T00:00:02.000Z",
          }],
        },
      },
      editableSkillTargets: [{
        skillName: "durable-skill",
        skillRootPath,
        skillMdPath,
        isWritable: true,
      }],
    }, {
      target: { kind: "agent_run", runId: "target-run-1" },
      companionRunId: "companion-run-1",
      evolverAgentDefinitionId: "skill-evolver",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "model",
      state: {
        schemaVersion: 1,
        target: { kind: "agent_run", runId: "target-run-1" },
        status: "active",
        currentEvolverRunId: "companion-run-1",
        priorEvolverRunIds: ["prior-companion"],
        evolverAgentDefinitionId: "skill-evolver",
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
    expect(message.content).toContain("Use the listed work trace files as the evidence package.");
    expect(message.content).toContain("Editable skill packages:");
    expect(message.content).toContain(`Root directory: ${skillRootPath}`);
    expect(message.content).toContain("Package tree:\n   .");
    expect(message.content).toContain("SKILL.md [entry]");
    expect(message.content).toContain("references/");
    expect(message.content).toContain("guide.md");
    expect(message.content).toContain("Completion target:");
    expect(message.content).toContain("- target_agent_run_id: target-run-1");
    expect(message.content).toContain(`- message_type: ${SELF_EVOLUTION_TARGET_MESSAGE_TYPE}`);
    expect(message.content).not.toContain("Previous evolver run ids");
    expect(message.content).not.toContain("prior-companion");
    expect(message.content).not.toContain("priorEvolverRunIds");
    expect(message.content).not.toContain("Rules:");
    expect(message.content).not.toContain("raw_traces");
    expect(message.content).not.toContain("semantically complete");
    expect(message.content).not.toContain("backend protocol");
    expect(message.content).not.toContain("hide backend");
    expect(message.content).not.toContain("Primary guidance file");
    expect(message.content).not.toContain("user:\n");
    expect(message.content).not.toContain("worker:\n");
    expect(message.metadata).toMatchObject({
      self_evolution_work_trace_manifest_path: manifestPath,
      self_evolution_work_trace_root_path: workTraceRootPath,
      self_evolution_target_agent_run_id: "target-run-1",
      self_evolution_target_message_type: SELF_EVOLUTION_TARGET_MESSAGE_TYPE,
    });
    expect(message.metadata.self_evolution_editable_skill_roots).toEqual([skillRootPath]);
    expect(message.metadata.self_evolution_primary_skill_paths).toEqual([skillMdPath]);
    expect(message.metadata.self_evolution_entry_skill_paths).toEqual([skillMdPath]);
  });
});
