import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  CompactionAgentRunnerError,
} from "autobyteus-ts/memory/compaction/compaction-agent-runner.js";
import type {
  CompactionAgentExecutionMetadata,
  CompactionAgentRunner,
  CompactionAgentRunnerResult,
  CompactionAgentTask,
} from "autobyteus-ts/memory/compaction/compaction-agent-runner.js";
import type { AgentRun } from "../domain/agent-run.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../services/agent-run-service.js";
import {
  MemoryCompactorAgentLaunchResolver,
  type CompactionParentLaunchFallback,
} from "./memory-compactor-agent-launch-resolver.js";
import { CompactionRunOutputCollector } from "./compaction-run-output-collector.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

export type ServerCompactionAgentRunnerOptions = {
  launchResolver?: MemoryCompactorAgentLaunchResolver;
  agentRunService?: AgentRunService;
  timeoutMs?: number;
  workspaceRootPath?: string | null;
  parentLaunchFallback?: CompactionParentLaunchFallback | null;
};

const DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS = 300_000;

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export class ServerCompactionAgentRunner implements CompactionAgentRunner {
  private readonly launchResolver: MemoryCompactorAgentLaunchResolver | null;
  private readonly agentRunService: AgentRunService | null;
  private readonly timeoutMs: number;
  private readonly workspaceRootPath: string;
  private readonly parentLaunchFallback: CompactionParentLaunchFallback | null;

  constructor(options: ServerCompactionAgentRunnerOptions = {}) {
    this.launchResolver = options.launchResolver ?? null;
    this.agentRunService = options.agentRunService ?? null;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS;
    this.workspaceRootPath =
      normalizeOptionalString(options.workspaceRootPath) ??
      appConfigProvider.config.getTempWorkspaceDir();
    this.parentLaunchFallback = options.parentLaunchFallback ?? null;
  }

  async runCompactionTask(task: CompactionAgentTask): Promise<CompactionAgentRunnerResult> {
    const resolved = await this.getLaunchResolver().resolve(this.parentLaunchFallback);
    let runId: string | null = null;
    let unsubscribe: (() => void) | null = null;

    const agentRunService = this.getAgentRunService();

    try {
      const created = await agentRunService.createAgentRun({
        agentDefinitionId: resolved.agentDefinitionId,
        workspaceRootPath: this.workspaceRootPath,
        llmModelIdentifier: resolved.llmModelIdentifier,
        autoExecuteTools: false,
        llmConfig: resolved.llmConfig,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: resolved.runtimeKind,
      });
      runId = created.runId;
      const run = this.requireCreatedRun(agentRunService, runId);
      const collector = new CompactionRunOutputCollector({ runId });
      unsubscribe = run.subscribeToEvents((event) => collector.observe(event));

      const postResult = await run.postUserMessage(this.buildTaskMessage(task));
      if (!postResult.accepted) {
        throw new Error(
          postResult.message ??
          `Compactor agent run '${runId}' rejected the compaction task.`,
        );
      }

      await this.recordRunActivity(agentRunService, run, task.taskId);
      const outputText = await collector.waitForFinalOutput(this.timeoutMs);
      return {
        outputText,
        metadata: {
          compactionAgentDefinitionId: resolved.agentDefinitionId,
          compactionAgentName: resolved.agentName,
          runtimeKind: resolved.runtimeKind,
          modelIdentifier: resolved.llmModelIdentifier,
          provider: resolved.provider,
          compactionRunId: runId,
          taskId: task.taskId,
        },
      };
    } catch (error) {
      throw new CompactionAgentRunnerError(
        this.formatFailureMessage(error),
        this.buildExecutionMetadata(resolved, runId, task.taskId),
        error,
      );
    } finally {
      unsubscribe?.();
      if (runId) {
        await agentRunService.terminateAgentRun(runId).catch((error) => {
          console.warn(
            `Failed to terminate compactor agent run '${runId}': ${String(error)}`,
          );
        });
      }
    }
  }

  private getLaunchResolver(): MemoryCompactorAgentLaunchResolver {
    return this.launchResolver ?? new MemoryCompactorAgentLaunchResolver();
  }

  private getAgentRunService(): AgentRunService {
    return this.agentRunService ?? getAgentRunService();
  }

  private requireCreatedRun(agentRunService: AgentRunService, runId: string): AgentRun {
    const run = agentRunService.getAgentRun(runId);
    if (!run) {
      throw new Error(`Compactor agent run '${runId}' was created but is not active.`);
    }
    return run;
  }

  private buildExecutionMetadata(
    resolved: Awaited<ReturnType<MemoryCompactorAgentLaunchResolver["resolve"]>>,
    runId: string | null,
    taskId: string,
  ): CompactionAgentExecutionMetadata {
    return {
      compactionAgentDefinitionId: resolved.agentDefinitionId,
      compactionAgentName: resolved.agentName,
      runtimeKind: resolved.runtimeKind,
      modelIdentifier: resolved.llmModelIdentifier,
      provider: resolved.provider,
      compactionRunId: runId,
      taskId,
    };
  }

  private formatFailureMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private buildTaskMessage(task: CompactionAgentTask): AgentInputUserMessage {
    return new AgentInputUserMessage(
      task.prompt,
      SenderType.USER,
      null,
      {
        compaction_task_id: task.taskId,
        compaction_parent_agent_id: task.parentAgentId ?? null,
        compaction_parent_turn_id: task.parentTurnId ?? null,
        compaction_block_count: task.blockCount,
        compaction_trace_count: task.traceCount,
      },
    );
  }

  private async recordRunActivity(
    agentRunService: AgentRunService,
    run: AgentRun,
    taskId: string,
  ): Promise<void> {
    await agentRunService.recordRunActivity(run, {
      summary: `Memory compaction task ${taskId}`,
    }).catch((error) => {
      console.warn(
        `Failed to record compactor agent run activity for '${run.runId}': ${String(error)}`,
      );
    });
  }
}
