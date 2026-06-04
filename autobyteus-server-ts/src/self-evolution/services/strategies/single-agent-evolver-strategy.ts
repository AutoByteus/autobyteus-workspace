import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../../../agent-execution/domain/agent-run-event.js";
import { AgentRunService, getAgentRunService } from "../../../agent-execution/services/agent-run-service.js";
import type { SelfEvolutionEvidencePackage, SelfEvolutionRunStatus, SelfEvolutionSkillTarget } from "../../domain/models.js";
import type { SelfEvolutionTargetContext } from "../self-evolution-target-context-resolver.js";
import { SelfEvolverAgentSettingsResolver } from "../self-evolver-agent-settings-resolver.js";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

type CompletionWaiter = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export type SingleAgentEvolverStrategyResult = {
  status: SelfEvolutionRunStatus;
  evolverRunId: string;
  evolverAgentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  outputText: string | null;
};

export class SingleAgentEvolverStrategy {
  constructor(private readonly deps: {
    agentRunService?: AgentRunService;
    settingsResolver?: SelfEvolverAgentSettingsResolver;
    timeoutMs?: number;
  } = {}) {}

  async run(input: {
    targetContext: SelfEvolutionTargetContext;
    evidence: SelfEvolutionEvidencePackage;
    editableSkillTargets: SelfEvolutionSkillTarget[];
  }): Promise<SingleAgentEvolverStrategyResult> {
    const resolved = await this.settingsResolver.resolve({
      effectiveConfig: input.targetContext.effectiveConfig!,
      targetFallback: {
        runtimeKind: input.targetContext.runtimeKind,
        llmModelIdentifier: input.targetContext.llmModelIdentifier,
        llmConfig: input.targetContext.llmConfig,
        sourceAgentDefinitionId: input.targetContext.agentDefinitionId,
      },
    });
    const agentRunService = this.agentRunService;
    let runId: string | null = null;
    let unsubscribe: (() => void) | null = null;

    try {
      const created = await agentRunService.createAgentRun({
        agentDefinitionId: resolved.agentDefinitionId,
        workspaceRootPath: input.targetContext.workspaceRootPath,
        llmModelIdentifier: resolved.llmModelIdentifier,
        autoExecuteTools: true,
        llmConfig: resolved.llmConfig,
        skillAccessMode: resolved.skillAccessMode,
        runtimeKind: resolved.runtimeKind,
      });
      runId = created.runId;
      const run = this.requireCreatedRun(agentRunService, runId);
      const watcher = new EvolverRunCompletionWatcher(runId);
      unsubscribe = run.subscribeToEvents((event) => watcher.observe(event));

      const postResult = await run.postUserMessage(this.buildTaskMessage(input));
      if (!postResult.accepted) {
        throw new Error(postResult.message ?? `Self-evolver run '${runId}' rejected the task.`);
      }
      await agentRunService.recordRunActivity(run, {
        summary: `Self-evolution skill update for ${input.targetContext.agentName}`,
      }).catch((error) => {
        console.warn(`Failed to record self-evolver run activity for '${runId}': ${String(error)}`);
      });

      const outputText = await watcher.waitForCompletion(this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      return {
        status: "completed",
        evolverRunId: runId,
        evolverAgentDefinitionId: resolved.agentDefinitionId,
        runtimeKind: resolved.runtimeKind,
        llmModelIdentifier: resolved.llmModelIdentifier,
        outputText,
      };
    } catch (error) {
      if (String(error).includes("timed out")) {
        return {
          status: "timed_out",
          evolverRunId: runId ?? "",
          evolverAgentDefinitionId: resolved.agentDefinitionId,
          runtimeKind: resolved.runtimeKind,
          llmModelIdentifier: resolved.llmModelIdentifier,
          outputText: null,
        };
      }
      throw error;
    } finally {
      unsubscribe?.();
      if (runId) {
        await agentRunService.terminateAgentRun(runId).catch((error) => {
          console.warn(`Failed to terminate self-evolver run '${runId}': ${String(error)}`);
        });
      }
    }
  }

  private buildTaskMessage(input: {
    targetContext: SelfEvolutionTargetContext;
    evidence: SelfEvolutionEvidencePackage;
    editableSkillTargets: SelfEvolutionSkillTarget[];
  }): AgentInputUserMessage {
    const editablePaths = input.editableSkillTargets
      .map((target, index) => `${index + 1}. ${target.skillMdPath}`)
      .join("\n");
    const rawTracePaths = input.evidence.rawTracePaths.length
      ? input.evidence.rawTracePaths.map((tracePath) => `- ${tracePath}`).join("\n")
      : "- No raw trace file path was available; use the digest below.";

    const prompt = `You are improving durable skills for a target AutoByteus agent from prior run evidence.\n\nTarget agent: ${input.targetContext.agentName} (${input.targetContext.agentDefinitionId})\nSource run IDs: ${input.evidence.sourceRunIds.join(", ")}\n\nEditable target files:\n${editablePaths}\n\nRead-only evidence references:\n${rawTracePaths}\n\nRun evidence digest:\n${input.evidence.runHistorySummary}\n\nRules:\n1. You may use run_bash with auto-executed tools to inspect evidence and edit ONLY the editable target files listed above.\n2. Do not edit agent.md, agent-config.json, team-config.json, MCP config, tool definitions, source code, run memory, or unrelated skill files.\n3. If an improvement is warranted, update the skill content directly.\n4. If no general reusable improvement is warranted, make no file changes and explain why.\n5. Do not copy secrets, transient file paths, personal data, private messages, proprietary details, or one-off user requests into durable skills.\n6. Prefer general reusable strategy, activation guidance, checklists, and failure-avoidance rules over task-specific details.\n7. Keep the change concise and reviewable.`;

    return new AgentInputUserMessage(prompt, SenderType.USER, null, {
      self_evolution_source_run_ids: input.evidence.sourceRunIds,
      self_evolution_editable_skill_paths: input.editableSkillTargets.map((target) => target.skillMdPath),
    });
  }

  private requireCreatedRun(agentRunService: AgentRunService, runId: string): AgentRun {
    const run = agentRunService.getAgentRun(runId);
    if (!run) {
      throw new Error(`Self-evolver agent run '${runId}' was created but is not active.`);
    }
    return run;
  }

  private get agentRunService(): AgentRunService {
    return this.deps.agentRunService ?? getAgentRunService();
  }

  private get settingsResolver(): SelfEvolverAgentSettingsResolver {
    return this.deps.settingsResolver ?? new SelfEvolverAgentSettingsResolver();
  }
}

class EvolverRunCompletionWatcher {
  private readonly segmentTextById = new Map<string, string>();
  private assistantCompleteText: string | null = null;
  private terminal = false;
  private failure: Error | null = null;
  private waiters: CompletionWaiter[] = [];

  constructor(private readonly runId: string) {}

  observe(event: unknown): void {
    if (!isAgentRunEvent(event) || event.runId !== this.runId || this.failure || this.terminal) {
      return;
    }
    if (event.eventType === AgentRunEventType.ERROR || event.statusHint === "ERROR") {
      this.fail(new Error(`Self-evolver run '${this.runId}' failed.`));
      return;
    }
    if (event.eventType === AgentRunEventType.ASSISTANT_COMPLETE) {
      this.assistantCompleteText = this.extractText(event.payload) ?? this.assistantCompleteText;
    } else if (event.eventType === AgentRunEventType.SEGMENT_CONTENT || event.eventType === AgentRunEventType.SEGMENT_END) {
      this.captureSegment(event);
    } else if (event.eventType === AgentRunEventType.TURN_COMPLETED || this.isIdleStatus(event)) {
      this.terminal = true;
    }
    this.notifyWaiters();
  }

  waitForCompletion(timeoutMs: number): Promise<string> {
    const immediate = this.resolveImmediateResult();
    if (immediate) {
      return immediate;
    }
    return new Promise((resolve, reject) => {
      let waiter: CompletionWaiter;
      const timer = setTimeout(() => {
        this.removeWaiter(waiter);
        reject(new Error(`Self-evolver run '${this.runId}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timer.unref?.();
      waiter = { resolve, reject, timer };
      this.waiters.push(waiter);
    });
  }

  private captureSegment(event: AgentRunEvent): void {
    const id = this.asString(event.payload.id) ?? this.asString(event.payload.segment_id) ?? this.asString(event.payload.segmentId);
    const text = this.extractText(event.payload);
    if (!id || !text) {
      return;
    }
    if (event.eventType === AgentRunEventType.SEGMENT_CONTENT) {
      this.segmentTextById.set(id, `${this.segmentTextById.get(id) ?? ""}${text}`);
    } else if (!this.segmentTextById.has(id)) {
      this.segmentTextById.set(id, text);
    }
  }

  private resolveImmediateResult(): Promise<string> | null {
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    if (!this.terminal) {
      return null;
    }
    return Promise.resolve(this.getFinalOutput());
  }

  private getFinalOutput(): string {
    return this.assistantCompleteText?.trim() || Array.from(this.segmentTextById.values()).join("").trim();
  }

  private notifyWaiters(): void {
    const result = this.resolveImmediateResult();
    if (!result) {
      return;
    }
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      result.then(waiter.resolve, waiter.reject);
    }
  }

  private removeWaiter(waiter: CompletionWaiter): void {
    this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
  }

  private fail(error: Error): void {
    this.failure = error;
  }

  private isIdleStatus(event: AgentRunEvent): boolean {
    return event.eventType === AgentRunEventType.AGENT_STATUS && this.asString(event.payload.status)?.toLowerCase() === "idle";
  }

  private extractText(payload: Record<string, unknown>): string | null {
    return this.asString(payload.content) ?? this.asString(payload.text) ?? this.asString(payload.message);
  }

  private asString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}
