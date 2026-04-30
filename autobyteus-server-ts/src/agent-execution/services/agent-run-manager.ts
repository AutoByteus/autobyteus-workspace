import { AutoByteusAgentRunBackendFactory } from "../backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import type { AgentRunBackendFactory } from "../backends/agent-run-backend-factory.js";

import { AgentRun } from "../domain/agent-run.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import {
  getClaudeAgentRunBackendFactory,
} from "../backends/claude/index.js";
import {
  getCodexAgentRunBackendFactory,
} from "../backends/codex/index.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { AgentCreationError, AgentTerminationError } from "../errors.js";
import {
  RunFileChangeService,
  getRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import {
  ApplicationPublishedArtifactRelayService,
  getApplicationPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import {
  AgentRunMemoryRecorder,
  getAgentRunMemoryRecorder,
} from "../../agent-memory/services/agent-run-memory-recorder.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentRunManagerOptions = {
  autoByteusBackendFactory?: AgentRunBackendFactory;
  codexBackendFactory?: AgentRunBackendFactory;
  claudeBackendFactory?: AgentRunBackendFactory;
  runFileChangeService?: RunFileChangeService;
  publishedArtifactRelayService?: ApplicationPublishedArtifactRelayService;
  memoryRecorder?: AgentRunMemoryRecorder;
};

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly runFileChangeService: RunFileChangeService;
  private readonly publishedArtifactRelayService: ApplicationPublishedArtifactRelayService;
  private readonly memoryRecorder: AgentRunMemoryRecorder;
  private activeRuns = new Map<string, AgentRun>();
  private readonly runFileChangeUnsubscribers = new Map<string, () => void>();
  private readonly publishedArtifactRelayUnsubscribers = new Map<string, () => void>();
  private readonly memoryRecorderUnsubscribers = new Map<string, () => void>();

  static getInstance(options: AgentRunManagerOptions = {}): AgentRunManager {
    if (!AgentRunManager.instance) {
      AgentRunManager.instance = new AgentRunManager(options);
    }
    return AgentRunManager.instance;
  }

  constructor(options: AgentRunManagerOptions = {}) {
    this.autoByteusBackendFactory =
      options.autoByteusBackendFactory ?? new AutoByteusAgentRunBackendFactory();
    this.codexBackendFactory =
      options.codexBackendFactory ?? getCodexAgentRunBackendFactory();
    this.claudeBackendFactory =
      options.claudeBackendFactory ?? getClaudeAgentRunBackendFactory();
    this.runFileChangeService =
      options.runFileChangeService ?? getRunFileChangeService();
    this.publishedArtifactRelayService =
      options.publishedArtifactRelayService ?? getApplicationPublishedArtifactRelayService();
    this.memoryRecorder = options.memoryRecorder ?? getAgentRunMemoryRecorder();
    logger.info("AgentRunManager initialized.");
  }

  async createAgentRun(config: AgentRunConfig, preferredRunId: string | null = null): Promise<AgentRun> {
    const { runtimeKind } = config;
    const backendFactory = this.resolveBackendFactory(runtimeKind);
    if (!backendFactory) {
      throw new AgentCreationError(
        `Runtime kind '${runtimeKind}' is not yet supported by AgentRunManager.createAgentRun().`,
      );
    }
    const backend = await backendFactory.createBackend(config, preferredRunId);
    const activeRun = new AgentRun({
      context: backend.getContext(),
      backend,
      commandObservers: [this.memoryRecorder],
    });
    this.registerActiveRun(activeRun);
    logger.info(`Successfully created ${runtimeKind} agent run '${activeRun.runId}'.`);
    return activeRun;
  }

  async restoreAgentRun(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<AgentRun> {
    const { runId } = context;
    const runtimeKind = context.config.runtimeKind;
    const backendFactory = this.resolveBackendFactory(runtimeKind);
    if (!backendFactory) {
      throw new AgentCreationError(
        `Runtime kind '${runtimeKind}' is not yet supported by AgentRunManager.restoreAgentRun().`,
      );
    }
    const backend = await backendFactory.restoreBackend(context);
    const activeRun = new AgentRun({
      context: backend.getContext(),
      backend,
      commandObservers: [this.memoryRecorder],
    });
    this.registerActiveRun(activeRun);
    logger.info(
      `Successfully restored ${runtimeKind} agent run '${runId}'.`,
    );
    return activeRun;
  }

  hasActiveRun(runId: string): boolean {
    return this.getActiveRun(runId) !== null;
  }

  getActiveRun(runId: string): AgentRun | null {
    const activeRun = this.activeRuns.get(runId) ?? null;
    if (!activeRun) {
      return null;
    }
    if (!activeRun.isActive()) {
      this.unregisterActiveRun(runId);
      return null;
    }
    return activeRun;
  }

  listActiveRuns(): string[] {
    const activeRunIds: string[] = [];
    for (const runId of this.activeRuns.keys()) {
      if (this.getActiveRun(runId)) {
        activeRunIds.push(runId);
      }
    }
    return activeRunIds;
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    try {
      const activeRun = this.getActiveRun(runId);
      if (activeRun) {
        const result = await activeRun.terminate();
        if (!result.accepted) {
          return false;
        }
        this.unregisterActiveRun(runId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to terminate agent run '${runId}': ${String(error)}`);
      throw new AgentTerminationError(String(error));
    }
  }

  private resolveBackendFactory(
    runtimeKind: RuntimeKind,
  ): AgentRunBackendFactory | null {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
      return this.autoByteusBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return this.codexBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return this.claudeBackendFactory;
    }
    return null;
  }

  private registerActiveRun(activeRun: AgentRun): void {
    this.unregisterRunFileChanges(activeRun.runId);
    this.unregisterPublishedArtifactRelay(activeRun.runId);
    this.unregisterMemoryRecorder(activeRun.runId);
    this.activeRuns.set(activeRun.runId, activeRun);
    this.runFileChangeUnsubscribers.set(
      activeRun.runId,
      this.runFileChangeService.attachToRun(activeRun),
    );
    this.publishedArtifactRelayUnsubscribers.set(
      activeRun.runId,
      this.publishedArtifactRelayService.attachToRun(activeRun),
    );
    this.memoryRecorderUnsubscribers.set(
      activeRun.runId,
      this.memoryRecorder.attachToRun(activeRun),
    );
  }

  private unregisterActiveRun(runId: string): void {
    this.activeRuns.delete(runId);
    this.unregisterRunFileChanges(runId);
    this.unregisterPublishedArtifactRelay(runId);
    this.unregisterMemoryRecorder(runId);
  }

  private unregisterRunFileChanges(runId: string): void {
    const unsubscribe = this.runFileChangeUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.runFileChangeUnsubscribers.delete(runId);
    unsubscribe();
  }

  private unregisterPublishedArtifactRelay(runId: string): void {
    const unsubscribe = this.publishedArtifactRelayUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.publishedArtifactRelayUnsubscribers.delete(runId);
    unsubscribe();
  }

  private unregisterMemoryRecorder(runId: string): void {
    const unsubscribe = this.memoryRecorderUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.memoryRecorderUnsubscribers.delete(runId);
    unsubscribe();
  }
}
