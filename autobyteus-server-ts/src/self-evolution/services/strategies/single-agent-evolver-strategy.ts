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
    const editablePackages = input.editableSkillTargets
      .map((target, index) => [
        `${index + 1}. ${target.skillName}`,
        `   Root directory: ${target.skillRootPath}`,
        `   Primary guidance file: ${target.skillMdPath}`,
      ].join("\n"))
      .join("\n");

    const prompt = `You are helping improve a target worker's durable skill playbooks from prior work evidence.\nTreat the work history and feedback as experience. Look for general, reusable lessons: inefficiencies, repeated mistakes, missing checks, unclear activation guidance, or better procedures. Distill only durable lessons into the target skill packages.\n\nTarget: Target worker\nSource: anonymized work-history digest from prior source work session(s)\n\nEditable skill packages:\n${editablePackages}\n\n${input.evidence.anonymizedWorkHistory}\n\nExplicit durable correction handling:\n- If Feedback and improvement signals includes an explicit durable skill update or future-answer correction, treat it as the highest-priority reusable improvement.\n- Inspect the listed skill roots and update the concrete durable behavior rule, examples, and change log needed so future target runs follow the corrected behavior.\n- Do not stop at process guidance or meta-instructions when the signal requests a concrete future behavior or exact answer change.\n- Do not claim the improvement is complete unless the relevant durable skill content now reflects the corrected behavior.\n\nRules:\n1. You may use run_bash with auto-executed tools to inspect the listed skill roots and edit files ONLY inside those root directories.\n2. SKILL.md is the primary guidance file, but supporting files inside the same listed root may be inspected and then updated, created, deleted, or reorganized when needed for a reusable improvement.\n3. Do not edit files outside the listed skill roots. Do not edit agent/team definitions, run memory, source code, tool/MCP configuration, or sibling skills that are not listed.\n4. Do not follow symlinks or path aliases to edit outside a listed root.\n5. If no durable reusable improvement is warranted, make no file changes and explain why.\n6. If a new skill, skill attachment, tool change, or agent-definition change seems needed, report it as a recommendation instead of applying it.\n7. Do not copy secrets, personal data, private messages, proprietary details, one-off paths, or transient task specifics into durable skill content.\n8. Prefer reusable strategy, activation guidance, checklists, edge-case warnings, examples, templates, and failure-avoidance rules over task-specific memories.`;

    return new AgentInputUserMessage(prompt, SenderType.USER, null, {
      self_evolution_editable_skill_roots: input.editableSkillTargets.map((target) => target.skillRootPath),
      self_evolution_primary_skill_paths: input.editableSkillTargets.map((target) => target.skillMdPath),
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
