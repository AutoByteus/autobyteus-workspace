import type { AgentRunBackendFactory } from "../backends/agent-run-backend-factory.js";
import { AgentRun } from "../domain/agent-run.js";
import type {
  CommittedAgentRunTermination,
  PreparedAgentRunTermination,
} from "../domain/prepared-agent-run-termination.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  AgentCreationError,
  AgentRunActivationError,
  AgentTerminationError,
  PlatformAgentRunRestoreError,
} from "../errors.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type {
  AgentToolMcpRunSessionDeactivator,
} from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  AgentRunActivationRegistry,
  AgentRunRemovalCleanupError,
} from "../runtime/agent-run-activation-registry.js";
import { beginAgentRunActivation, type AgentRunActivationOperation } from "./agent-run-activation-operation.js";
import type { AgentRunProviderInputNormalizer } from "../input/agent-run-provider-input-normalizer.js";
import { createManagedAgentRunTermination } from "./managed-agent-run-termination.js";
import { buildAgentRunRestoreRuntimeContext } from "./agent-run-restore-context-factory.js";

const logger = console;

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new AgentCreationError("agentRunId is required for agent run creation.");
  return normalized;
};

export type AgentRunManagerOptions = Readonly<{
  autoByteusBackendFactory: AgentRunBackendFactory;
  codexBackendFactory: AgentRunBackendFactory;
  claudeBackendFactory: AgentRunBackendFactory;
  agyBackendFactory: AgentRunBackendFactory;
  grokBackendFactory: AgentRunBackendFactory;
  activationRegistry: AgentRunActivationRegistry;
  memoryRecorder: AgentRunMemoryRecorder;
  providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
  agentToolMcpRunSessionDeactivator: AgentToolMcpRunSessionDeactivator;
}>;

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly agyBackendFactory: AgentRunBackendFactory;
  private readonly grokBackendFactory: AgentRunBackendFactory;
  private readonly activationRegistry: AgentRunActivationRegistry;
  private readonly memoryRecorder: AgentRunMemoryRecorder;
  private readonly providerInputNormalizer: Pick<AgentRunProviderInputNormalizer, "normalizeForProvider">;
  private readonly agentToolMcpRunSessionDeactivator: AgentToolMcpRunSessionDeactivator;
  private readonly activations = new Set<AgentRunActivationOperation>();
  private activationAdmissionOpen = true;
  private readonly managedTerminationPreparations = new WeakMap<
    AgentRun,
    Promise<PreparedAgentRunTermination>
  >();
  private readonly quiescentTerminationAttempts = new WeakMap<
    AgentRun,
    Promise<PreparedAgentRunTermination | null>
  >();

  static getInstance(): AgentRunManager {
    if (!AgentRunManager.instance) {
      throw new Error("The process AgentRunManager is not initialized.");
    }
    return AgentRunManager.instance;
  }

  static initializeProcessInstance(options: AgentRunManagerOptions): AgentRunManager {
    if (AgentRunManager.instance) {
      throw new Error("The process AgentRunManager is already initialized.");
    }
    AgentRunManager.instance = new AgentRunManager(options);
    return AgentRunManager.instance;
  }

  static releaseProcessInstance(instance: AgentRunManager): void {
    if (AgentRunManager.instance === instance) AgentRunManager.instance = null;
  }

  constructor(options: AgentRunManagerOptions) {
    const required = [
      options?.autoByteusBackendFactory,
      options?.codexBackendFactory,
      options?.claudeBackendFactory,
      options?.agyBackendFactory,
      options?.grokBackendFactory,
      options?.activationRegistry,
      options?.memoryRecorder,
      options?.providerInputNormalizer,
      options?.agentToolMcpRunSessionDeactivator,
    ];
    if (required.some((value) => !value)) {
      throw new Error("AgentRunManager requires all execution-family dependencies.");
    }
    if (typeof options.providerInputNormalizer.normalizeForProvider !== "function") {
      throw new Error("AgentRunManager provider input normalizer is invalid.");
    }
    this.autoByteusBackendFactory = options.autoByteusBackendFactory;
    this.codexBackendFactory = options.codexBackendFactory;
    this.claudeBackendFactory = options.claudeBackendFactory;
    this.agyBackendFactory = options.agyBackendFactory;
    this.grokBackendFactory = options.grokBackendFactory;
    this.memoryRecorder = options.memoryRecorder;
    this.providerInputNormalizer = options.providerInputNormalizer;
    this.agentToolMcpRunSessionDeactivator =
      options.agentToolMcpRunSessionDeactivator;
    this.activationRegistry = options.activationRegistry;
    logger.info("AgentRunManager initialized.");
  }

  beginActivation(request: AgentRunActivationRequest): AgentRunActivationOperation {
    this.assertActivationAdmissionOpen();
    const runId = normalizeRequiredRunId(request.kind === "restore" ? request.context.runId : request.runId);
    const config = request.kind === "restore" ? request.context.config : request.config;
    let expectedPlatformId: string | null = null;
    let context: AgentRunContext<RuntimeAgentRunContext> | null = null;
    if (request.kind === "restore") context = request.context;
    if (request.kind === "platform_restore") {
      expectedPlatformId = request.platformAgentRunId?.trim();
      if (!expectedPlatformId || expectedPlatformId === runId) throw new AgentRunActivationError(
        "PLATFORM_AGENT_RUN_BINDING_INVALID", "The persisted provider conversation identity is missing or invalid.");
      context = new AgentRunContext({ runId, config,
        runtimeContext: buildAgentRunRestoreRuntimeContext(config, expectedPlatformId) });
    }
    const factory = this.resolveBackendFactory(config.runtimeKind);
    if (!factory) throw new AgentCreationError(`Runtime kind '${config.runtimeKind}' is not supported.`);
    const claim = this.activationRegistry.claim(runId);
    try {
      const preparation = factory.beginPreparation(context ? { kind: "restore", context } : { kind: "new", runId, config });
      let operation!: AgentRunActivationOperation;
      operation = beginAgentRunActivation({
        claim, registry: this.activationRegistry, preparation,
        constructRun: (backend) => {
          const run = new AgentRun({ context: backend.getContext(), backend,
            commandObservers: [this.memoryRecorder], providerInputNormalizer: this.providerInputNormalizer });
          return run;
        },
        validateRun: run => { if (expectedPlatformId && run.getPlatformAgentRunId() !== expectedPlatformId) throw new PlatformAgentRunRestoreError(); },
        onTerminal: () => { this.activations.delete(operation); },
        deactivateMcp: () => { this.agentToolMcpRunSessionDeactivator.deactivateForRun(runId); },
      });
      this.activations.add(operation);
      return operation;
    } catch (error) { this.activationRegistry.releaseClaim(claim); throw error; }
  }

  closeActivationAdmission(): void { this.activationAdmissionOpen = false; }

  private assertActivationAdmissionOpen(): void { if (!this.activationAdmissionOpen) throw new AgentCreationError("AgentRun activation admission is closed for process shutdown."); }

  hasActiveRun(runId: string): boolean { return this.getActiveRun(runId) !== null; }

  getActiveRun(runId: string): AgentRun | null {
    return this.activationRegistry.getActiveRun(runId.trim());
  }

  listActiveRuns(): string[] {
    return this.activationRegistry.listActiveRunIds();
  }

  prepareAgentRunTermination(
    expectedRun: AgentRun,
  ): Promise<PreparedAgentRunTermination> {
    if (!this.isCurrentPublishedRun(expectedRun)) {
      return Promise.reject(new AgentTerminationError(
        `Agent run '${expectedRun.runId}' is not the current published run.`,
      ));
    }
    const existing = this.managedTerminationPreparations.get(expectedRun);
    if (existing) return existing;
    const quiescentAttempt = this.quiescentTerminationAttempts.get(expectedRun);
    if (quiescentAttempt) {
      return quiescentAttempt.then((prepared) => prepared ?? this.prepareAgentRunTermination(expectedRun));
    }
    const preparation = expectedRun.prepareTermination()
      .then((runPreparation) => createManagedAgentRunTermination({
        expectedRun,
        runPreparation,
        clearPreparation: () => {
          if (this.managedTerminationPreparations.get(expectedRun) === preparation) {
            this.managedTerminationPreparations.delete(expectedRun);
          }
        },
        finishPublished: (run, termination) => this.finishPublishedAgentRunTermination(run, termination),
      }));
    this.managedTerminationPreparations.set(expectedRun, preparation);
    void preparation.catch(() => {
      if (this.managedTerminationPreparations.get(expectedRun) === preparation) {
        this.managedTerminationPreparations.delete(expectedRun);
      }
    });
    return preparation;
  }

  async tryPrepareAgentRunTerminationIfQuiescent(
    expectedRun: AgentRun,
  ): Promise<PreparedAgentRunTermination | null> {
    this.assertCurrentPublishedRun(expectedRun);
    const existing = this.managedTerminationPreparations.get(expectedRun);
    if (existing || this.quiescentTerminationAttempts.has(expectedRun)) return null;
    let attempt!: Promise<PreparedAgentRunTermination | null>;
    attempt = expectedRun.tryPrepareTerminationIfQuiescent().then((runPreparation) => {
      if (!runPreparation) return null;
      let managedPromise!: Promise<PreparedAgentRunTermination>;
      const managed = createManagedAgentRunTermination({
        expectedRun,
        runPreparation,
        clearPreparation: () => {
          if (this.managedTerminationPreparations.get(expectedRun) === managedPromise) {
            this.managedTerminationPreparations.delete(expectedRun);
          }
        },
        finishPublished: (run, termination) => this.finishPublishedAgentRunTermination(run, termination),
      });
      managedPromise = Promise.resolve(managed);
      this.managedTerminationPreparations.set(expectedRun, managedPromise);
      return managed;
    });
    this.quiescentTerminationAttempts.set(expectedRun, attempt);
    void attempt.finally(() => {
      if (this.quiescentTerminationAttempts.get(expectedRun) === attempt) {
        this.quiescentTerminationAttempts.delete(expectedRun);
      }
    }).catch(() => undefined);
    return attempt;
  }

  private assertCurrentPublishedRun(expectedRun: AgentRun): void {
    if (!this.isCurrentPublishedRun(expectedRun)) {
      throw new AgentTerminationError(
        `Agent run '${expectedRun.runId}' is not the current published run.`,
      );
    }
  }

  private isCurrentPublishedRun(expectedRun: AgentRun): boolean {
    return this.activationRegistry.ownsPublishedOrRetired(expectedRun);
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    try {
      const activeRun = this.getActiveRun(normalizedRunId);
      if (!activeRun) return false;
      const prepared = await this.prepareAgentRunTermination(activeRun);
      return (await prepared.commit().finish()).accepted;
    } catch (error) {
      logger.error(`Failed to terminate agent run '${normalizedRunId}': ${String(error)}`);
      if (error instanceof AgentRunRemovalCleanupError || error instanceof AgentTerminationError) {
        throw error;
      }
      throw new AgentTerminationError(String(error));
    }
  }

  async stopAllAgentRuns(): Promise<void> {
    this.activationRegistry.blockNewClaims();
    const errors: unknown[] = [];
    for (const operation of this.activations) operation.cancel();
    for (const operation of this.activations) {
      const result = await operation.releasePrivate();
      if (result.kind === "quarantined") errors.push(result.error);
      if (result.kind === "pending") errors.push(new Error("AgentRun preparation is still pending during shutdown."));
      if (result.kind === "released") this.activations.delete(operation);
    }
    const snapshot = this.activationRegistry.snapshotForStop();
    errors.push(...snapshot.pruningErrors);

    for (const run of snapshot.activeRuns) {
      try {
        const prepared = await this.prepareAgentRunTermination(run);
        const termination = await prepared.commit().finish();
        if (!termination.accepted) {
          errors.push(new Error(`Agent run '${run.runId}' did not become inactive during stop.`));
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, "Failed to stop all agent runs.");
  }

  private async finishPublishedAgentRunTermination(
    expectedRun: AgentRun,
    runTermination: CommittedAgentRunTermination,
  ) {
    const result = await runTermination.finish();
    if (!result.accepted) return result;
    if (expectedRun.isActive()) {
      throw new AgentTerminationError(
        `Agent run '${expectedRun.runId}' accepted termination but remained active.`,
      );
    }
    const removal = this.activationRegistry.removeIfCurrent({
      runId: expectedRun.runId,
      expectedRun,
      reason: "explicit_termination",
    });
    if (removal.kind !== "removed") {
      throw new AgentTerminationError(
        `Agent run '${expectedRun.runId}' is no longer the current published run.`,
      );
    }
    this.activationRegistry.assertCleanupSucceeded(removal);
    return result;
  }

  /** Uses retained exact authority; never materializes or substitutes a run by ID. */
  async releaseExactRun(expectedRun: AgentRun) {
    if (!this.isCurrentPublishedRun(expectedRun)) throw new AgentTerminationError("Exact published/retired release authority is unavailable.");
    const errors: unknown[] = [];
    let result: Awaited<ReturnType<AgentRun["forceReleaseRuntime"]>> | undefined;
    try { result = await expectedRun.forceReleaseRuntime(); } catch (error) { errors.push(error); }
    // Listener/MCP attachment release is independent of provider stop proof. Keep the exact claim until both succeed.
    const attachments = this.activationRegistry.releaseRuntimeAttachments(expectedRun);
    errors.push(...attachments.errors);
    if (errors.length) throw new AggregateError(errors, "Exact AgentRun runtime/component release failed.");
    if (!result!.accepted) return result!;
    if (expectedRun.isActive()) throw new AgentTerminationError("Exact runtime accepted release but remained active.");
    const removal = this.activationRegistry.removeIfCurrent({ runId: expectedRun.runId, expectedRun, reason: "explicit_termination" });
    if (removal.kind !== "removed") throw new AgentTerminationError("Exact runtime removal authority is unavailable.");
    this.activationRegistry.assertCleanupSucceeded(removal);
    return result!;
  }

  private resolveBackendFactory(runtimeKind: RuntimeKind): AgentRunBackendFactory | null {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) return this.autoByteusBackendFactory;
    if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) return this.codexBackendFactory;
    if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) return this.claudeBackendFactory;
    if (runtimeKind === RuntimeKind.ANTIGRAVITY_CLI) return this.agyBackendFactory;
    if (runtimeKind === RuntimeKind.GROK_BUILD) return this.grokBackendFactory;
    return null;
  }

}

export type AgentRunActivationRequest =
  | Readonly<{ kind: "new"; runId: string; config: AgentRunConfig }>
  | Readonly<{ kind: "restore"; context: AgentRunContext<RuntimeAgentRunContext> }>
  | Readonly<{ kind: "platform_restore"; runId: string; config: AgentRunConfig; platformAgentRunId: string }>;
