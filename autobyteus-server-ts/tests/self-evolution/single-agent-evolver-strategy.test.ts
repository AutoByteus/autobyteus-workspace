import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType, type AgentRunEvent } from "../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { SingleAgentEvolverStrategy } from "../../src/self-evolution/services/strategies/single-agent-evolver-strategy.js";
import type { SelfEvolutionEvidencePackage, SelfEvolutionSkillTarget } from "../../src/self-evolution/domain/models.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";

const skillTarget = (overrides: Partial<SelfEvolutionSkillTarget> = {}): SelfEvolutionSkillTarget => ({
  skillName: "durable-skill",
  skillRootPath: "/tmp/skills/durable-skill",
  skillMdPath: "/tmp/skills/durable-skill/SKILL.md",
  isWritable: true,
  ...overrides,
});

const targetContext = (): SelfEvolutionTargetContext => ({
  target: { kind: "agent_run", runId: "target-run-1" },
  sourceRunIds: ["target-run-1"],
  targetAgentDefinition: { id: "target-agent", name: "Target Agent" } as any,
  agentDefinitionId: "target-agent",
  agentName: "Target Agent",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/memory/agents/target-run-1",
  runMetadataPath: "/tmp/memory/agents/target-run-1/run_metadata.json",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  llmModelIdentifier: "target-model",
  llmConfig: { temperature: 0 },
  skillAccessMode: "PRELOADED_ONLY",
  effectiveConfig: {
    enabled: true,
    triggerStrategy: "manual_only",
    evolverStrategy: "single_agent",
    evolverAgentDefinitionId: null,
    resolvedAt: "2026-01-01T00:00:00.000Z",
    sourceTrace: [],
  },
  targetMetadata: {} as any,
});

const evidencePackage = (): SelfEvolutionEvidencePackage => ({
  target: { kind: "agent_run", runId: "target-run-1" },
  sourceRunIds: ["target-run-1", "source-run-2"],
  anonymizedWorkHistory: "[WORK_HISTORY_TO_LEARN_FROM]\nFeedback and improvement signals:\n- The prior run repeatedly missed the durable-skill checklist.",
  feedbackSignals: ["User corrected the checklist step."],
  privacyWarnings: ["Do not persist user-specific details."],
});

describe("SingleAgentEvolverStrategy", () => {
  it("launches a visible helper agent run with auto-executed tools and exact editable skill roots", async () => {
    let eventListener: ((event: AgentRunEvent) => void) | null = null;
    let postedMessage: AgentInputUserMessage | null = null;

    const run = {
      runId: "evolver-run-1",
      subscribeToEvents: vi.fn((listener: (event: AgentRunEvent) => void) => {
        eventListener = listener;
        return vi.fn();
      }),
      postUserMessage: vi.fn(async (message: AgentInputUserMessage) => {
        postedMessage = message;
        eventListener?.({
          runId: "evolver-run-1",
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
          statusHint: null,
          payload: { content: "Applied one concise skill update." },
        });
        eventListener?.({
          runId: "evolver-run-1",
          eventType: AgentRunEventType.TURN_COMPLETED,
          statusHint: "IDLE",
          payload: {},
        });
        return { accepted: true };
      }),
    };
    const agentRunService = {
      createAgentRun: vi.fn(async () => ({ runId: "evolver-run-1" })),
      getAgentRun: vi.fn(() => run),
      recordRunActivity: vi.fn(async () => undefined),
      terminateAgentRun: vi.fn(async () => ({ success: true })),
    };
    const settingsResolver = {
      resolve: vi.fn(async () => ({
        agentDefinitionId: "autobyteus-skill-evolver",
        agentName: "Skill Evolver",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "target-model",
        llmConfig: { temperature: 0 },
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      })),
    };

    const strategy = new SingleAgentEvolverStrategy({
      agentRunService: agentRunService as any,
      settingsResolver: settingsResolver as any,
      timeoutMs: 1_000,
    });

    const editableTarget = skillTarget();
    const result = await strategy.run({
      targetContext: targetContext(),
      evidence: evidencePackage(),
      editableSkillTargets: [editableTarget],
    });

    expect(settingsResolver.resolve).toHaveBeenCalledWith(expect.objectContaining({
      targetFallback: expect.objectContaining({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "target-model",
        sourceAgentDefinitionId: "target-agent",
      }),
    }));
    expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      agentDefinitionId: "autobyteus-skill-evolver",
      workspaceRootPath: "/tmp/workspace",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "target-model",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    }));
    expect(run.subscribeToEvents).toHaveBeenCalledTimes(1);
    expect(run.postUserMessage).toHaveBeenCalledTimes(1);
    expect(postedMessage?.content).toContain("Editable skill packages:");
    expect(postedMessage?.content).toContain(editableTarget.skillRootPath);
    expect(postedMessage?.content).toContain(editableTarget.skillMdPath);
    expect(postedMessage?.content).toContain("edit files ONLY inside those root directories");
    expect(postedMessage?.content).toContain("Do not edit agent/team definitions");
    expect(postedMessage?.content).toContain("Source: anonymized work-history digest from prior source work session(s)");
    expect(postedMessage?.content).toContain("Explicit durable correction handling");
    expect(postedMessage?.content).toContain("explicit durable skill update or future-answer correction");
    expect(postedMessage?.content).toContain("Do not stop at process guidance");
    expect(postedMessage?.content).toContain("Do not claim the improvement is complete unless");
    expect(postedMessage?.content).not.toContain("raw_traces.jsonl");
    expect(postedMessage?.content).toContain('target_agent_run_id "target-run-1"');
    expect(postedMessage?.content).not.toContain("source-run-2");
    expect(postedMessage?.metadata).toMatchObject({
      self_evolution_editable_skill_roots: [editableTarget.skillRootPath],
      self_evolution_primary_skill_paths: [editableTarget.skillMdPath],
      self_evolution_target_agent_run_id: "target-run-1",
      self_evolution_outcome_message_type: "self_evolution_outcome",
    });
    expect(postedMessage?.metadata).not.toHaveProperty("self_evolution_source_run_ids");
    expect(JSON.stringify(postedMessage?.metadata ?? {})).toContain("target-run-1");
    expect(JSON.stringify(postedMessage?.metadata ?? {})).not.toContain("source-run-2");
    expect(agentRunService.recordRunActivity).toHaveBeenCalledWith(run, {
      summary: "Self-evolution skill update for Target Agent",
    });
    expect(agentRunService.terminateAgentRun).toHaveBeenCalledWith("evolver-run-1");
    expect(result).toMatchObject({
      status: "completed",
      evolverRunId: "evolver-run-1",
      evolverAgentDefinitionId: "autobyteus-skill-evolver",
      outputText: "Applied one concise skill update.",
      notificationSummary: expect.objectContaining({
        status: "send_message_not_attempted",
        targetAgentRunId: "target-run-1",
        evolverRunId: "evolver-run-1",
      }),
    });
  });
});
