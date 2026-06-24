import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunService, getAgentRunService } from "../../../agent-execution/services/agent-run-service.js";
import { DirectAgentRunMessageGrantRegistry, getDirectAgentRunMessageGrantRegistry } from "../../../agent-communication/services/direct-agent-run-message-grant-registry.js";
import type { DirectAgentRunMessageGrantUsageSummary } from "../../../agent-communication/domain/direct-agent-run-message-grant.js";
import { SELF_EVOLUTION_DIRECT_MESSAGE_GRANT_PURPOSE, SELF_EVOLUTION_TARGET_MESSAGE_TYPE } from "../../domain/messages.js";
import type { SelfEvolutionNotificationSummary, SelfEvolutionSkillTarget, SelfEvolutionTargetRef } from "../../domain/models.js";
import type { SelfEvolutionCompanionRequestResult, SelfEvolutionCompanionSession, SelfEvolutionEvolverSessionState, SelfEvolutionCompanionTriggerRequest } from "../../domain/evolver-session.js";
import type { SelfEvolutionTargetContext } from "../self-evolution-target-context-resolver.js";
import { SelfEvolverAgentSettingsResolver } from "../self-evolver-agent-settings-resolver.js";
import { SelfEvolutionEvolverSessionStore } from "./self-evolution-evolver-session-store.js";
import { CompanionRunCompletionWatcher } from "./companion-run-completion-watcher.js";
import { SelfEvolutionCompanionTriggerMessageBuilder } from "./self-evolution-companion-trigger-message-builder.js";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

export class SelfEvolutionCompanionSessionService {
  constructor(private readonly deps: {
    agentRunService?: AgentRunService;
    settingsResolver?: SelfEvolverAgentSettingsResolver;
    grantRegistry?: DirectAgentRunMessageGrantRegistry;
    evolverSessionStore?: SelfEvolutionEvolverSessionStore;
    timeoutMs?: number;
    triggerMessageBuilder?: SelfEvolutionCompanionTriggerMessageBuilder;
  } = {}) {}

  async activateOrGet(context: SelfEvolutionTargetContext): Promise<SelfEvolutionCompanionSession> {
    if (context.effectiveConfig?.evolverStrategy !== "single_agent") {
      throw new Error(`Evolver strategy '${context.effectiveConfig?.evolverStrategy ?? "unknown"}' is not implemented.`);
    }
    const existing = await this.evolverSessionStore.load(context);
    if (existing?.status === "active" && existing.currentEvolverRunId) {
      const run = this.agentRunService.getAgentRun(existing.currentEvolverRunId);
      if (run?.isActive()) {
        return {
          target: context.target,
          companionRunId: existing.currentEvolverRunId,
          evolverAgentDefinitionId: existing.evolverAgentDefinitionId ?? context.effectiveConfig.evolverAgentDefinitionId ?? "",
          runtimeKind: existing.runtimeKind ?? String(context.runtimeKind ?? ""),
          llmModelIdentifier: existing.llmModelIdentifier ?? context.llmModelIdentifier ?? "",
          state: existing,
        };
      }
      const restored = await this.tryRestoreEvolverRun(existing.currentEvolverRunId);
      if (restored?.isActive()) {
        const state = await this.evolverSessionStore.write(context, {
          ...existing,
          status: "active",
          currentEvolverRunId: restored.runId,
        });
        return {
          target: context.target,
          companionRunId: restored.runId,
          evolverAgentDefinitionId: existing.evolverAgentDefinitionId ?? context.effectiveConfig.evolverAgentDefinitionId ?? "",
          runtimeKind: existing.runtimeKind ?? String(context.runtimeKind ?? ""),
          llmModelIdentifier: existing.llmModelIdentifier ?? context.llmModelIdentifier ?? "",
          state,
        };
      }
      await this.evolverSessionStore.write(context, {
        ...existing,
        status: "unavailable",
        currentEvolverRunId: null,
        priorEvolverRunIds: this.appendPrior(existing.priorEvolverRunIds, existing.currentEvolverRunId),
      });
    }
    return this.createReplacementSession(context, existing);
  }

  async postSelfImproveRequest(
    session: SelfEvolutionCompanionSession,
    request: SelfEvolutionCompanionTriggerRequest,
    context: SelfEvolutionTargetContext,
  ): Promise<SelfEvolutionCompanionRequestResult> {
    const run = this.requireActiveRun(session.companionRunId);
    const grant = this.grantRegistry.register({
      senderRunId: session.companionRunId,
      purpose: SELF_EVOLUTION_DIRECT_MESSAGE_GRANT_PURPOSE,
      allowedTargetAgentRunIds: [request.targetAgentRunId],
      allowedMessageTypes: [SELF_EVOLUTION_TARGET_MESSAGE_TYPE],
      allowedReferenceFileRoots: request.editableSkillTargets.map((target) => target.skillRootPath),
      maxAcceptedDeliveries: 1,
      expiresAt: new Date(Date.now() + this.timeoutMs + 5 * 60 * 1000).toISOString(),
    });
    const watcher = new CompanionRunCompletionWatcher(session.companionRunId);
    const unsubscribe = run.subscribeToEvents((event) => watcher.observe(event));
    try {
      const postResult = await run.postUserMessage(this.triggerMessageBuilder.build(request, session));
      if (!postResult.accepted) {
        throw new Error(postResult.message ?? `Self-evolver companion '${session.companionRunId}' rejected the request.`);
      }
      await this.agentRunService.recordRunActivity(run, {
        summary: `Self-evolution companion request for ${context.agentName}`,
      }).catch((error) => {
        console.warn(`Failed to record self-evolver companion activity for '${session.companionRunId}': ${String(error)}`);
      });
      await this.evolverSessionStore.write(context, {
        ...session.state,
        status: "active",
        currentEvolverRunId: session.companionRunId,
        workTraces: {
          rootPath: request.workTracePackage.workTraceRootPath,
          manifestPath: request.workTracePackage.manifestPath,
          lastSummaryHash: request.workTracePackage.summaryHash,
        },
        lastRequest: {
          evolutionRunId: request.evolutionRunId,
          requestedAt: request.requestedAt,
          postedAt: new Date().toISOString(),
          workTraceSummaryHash: request.workTracePackage.summaryHash,
        },
      });
      const outputText = await watcher.waitForCompletion(this.timeoutMs);
      return {
        status: "completed",
        outputText,
        notificationSummary: this.buildOutcomeNotificationSummary({
          targetAgentRunId: request.targetAgentRunId,
          evolverRunId: session.companionRunId,
          usageSummary: this.grantRegistry.summarizeGrant(grant.grantId),
        }),
      };
    } catch (error) {
      if (String(error).includes("timed out")) {
        return { status: "timed_out", outputText: null, notificationSummary: null };
      }
      throw error;
    } finally {
      unsubscribe();
    }
  }

  private async createReplacementSession(
    context: SelfEvolutionTargetContext,
    existing: SelfEvolutionEvolverSessionState | null,
  ): Promise<SelfEvolutionCompanionSession> {
    const resolved = await this.settingsResolver.resolve({
      effectiveConfig: context.effectiveConfig!,
      targetFallback: {
        runtimeKind: context.runtimeKind,
        llmModelIdentifier: context.llmModelIdentifier,
        llmConfig: context.llmConfig,
        sourceAgentDefinitionId: context.agentDefinitionId,
      },
    });
    const created = await this.agentRunService.createAgentRun({
      agentDefinitionId: resolved.agentDefinitionId,
      workspaceRootPath: context.workspaceRootPath,
      llmModelIdentifier: resolved.llmModelIdentifier,
      autoExecuteTools: true,
      llmConfig: resolved.llmConfig,
      skillAccessMode: resolved.skillAccessMode,
      runtimeKind: resolved.runtimeKind,
    });
    const run = this.requireActiveRun(created.runId);
    const state: SelfEvolutionEvolverSessionState = await this.evolverSessionStore.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentEvolverRunId: run.runId,
      priorEvolverRunIds: this.appendPrior(existing?.priorEvolverRunIds ?? [], existing?.currentEvolverRunId ?? null),
      evolverAgentDefinitionId: resolved.agentDefinitionId,
      runtimeKind: resolved.runtimeKind,
      llmModelIdentifier: resolved.llmModelIdentifier,
      workspaceRootPath: context.workspaceRootPath,
      memoryRootPath: context.memoryDir,
      workTraces: existing?.workTraces ?? {
        rootPath: null,
        manifestPath: null,
        lastSummaryHash: null,
      },
      lastRequest: existing?.lastRequest ?? null,
      updatedAt: new Date().toISOString(),
    });
    return {
      target: context.target,
      companionRunId: run.runId,
      evolverAgentDefinitionId: resolved.agentDefinitionId,
      runtimeKind: resolved.runtimeKind,
      llmModelIdentifier: resolved.llmModelIdentifier,
      state,
    };
  }

  private appendPrior(prior: string[], runId: string | null): string[] {
    return runId && !prior.includes(runId) ? [...prior, runId] : prior;
  }

  private async tryRestoreEvolverRun(runId: string): Promise<AgentRun | null> {
    const service = this.agentRunService as AgentRunService & {
      restoreAgentRun?: (runId: string) => Promise<{ run: AgentRun }>;
    };
    if (typeof service.restoreAgentRun !== "function") {
      return null;
    }
    try {
      return (await service.restoreAgentRun(runId)).run;
    } catch {
      return null;
    }
  }

  private requireActiveRun(runId: string): AgentRun {
    const run = this.agentRunService.getAgentRun(runId);
    if (!run?.isActive()) {
      throw new Error(`Self-evolver companion run '${runId}' is not active.`);
    }
    return run;
  }

  private resolveTargetAgentRunId(target: SelfEvolutionTargetRef): string {
    return target.kind === "agent_run" ? target.runId : target.memberRunId;
  }

  buildTriggerRequest(input: {
    evolutionRunId: string;
    requestedAt: string;
    target: SelfEvolutionTargetRef;
    workTracePackage: SelfEvolutionCompanionTriggerRequest["workTracePackage"];
    editableSkillTargets: SelfEvolutionSkillTarget[];
  }): SelfEvolutionCompanionTriggerRequest {
    return {
      evolutionRunId: input.evolutionRunId,
      requestedAt: input.requestedAt,
      targetAgentRunId: this.resolveTargetAgentRunId(input.target),
      workTracePackage: input.workTracePackage,
      editableSkillTargets: input.editableSkillTargets,
    };
  }

  private buildOutcomeNotificationSummary(input: {
    targetAgentRunId: string;
    evolverRunId: string;
    usageSummary: DirectAgentRunMessageGrantUsageSummary | null;
  }): SelfEvolutionNotificationSummary {
    const latestUsage = input.usageSummary?.latestUsage ?? null;
    if (!latestUsage) {
      return {
        status: "send_message_not_attempted",
        targetAgentRunId: input.targetAgentRunId,
        evolverRunId: input.evolverRunId,
        message: "Self-evolver completed but did not call send_message_to with a final outcome.",
      };
    }
    if (latestUsage.accepted) {
      return {
        status: "send_message_sent",
        targetAgentRunId: input.targetAgentRunId,
        evolverRunId: input.evolverRunId,
        message: latestUsage.message ?? "Self-evolver delivered its final outcome message.",
      };
    }
    return {
      status: latestUsage.code === "TARGET_AGENT_RUN_NOT_ACTIVE" ? "send_message_target_inactive" : "send_message_rejected",
      targetAgentRunId: input.targetAgentRunId,
      evolverRunId: input.evolverRunId,
      message: latestUsage.message,
      error: latestUsage.code,
    };
  }

  private get triggerMessageBuilder(): SelfEvolutionCompanionTriggerMessageBuilder {
    return this.deps.triggerMessageBuilder ?? new SelfEvolutionCompanionTriggerMessageBuilder();
  }

  private get agentRunService(): AgentRunService {
    return this.deps.agentRunService ?? getAgentRunService();
  }

  private get settingsResolver(): SelfEvolverAgentSettingsResolver {
    return this.deps.settingsResolver ?? new SelfEvolverAgentSettingsResolver();
  }

  private get grantRegistry(): DirectAgentRunMessageGrantRegistry {
    return this.deps.grantRegistry ?? getDirectAgentRunMessageGrantRegistry();
  }

  private get evolverSessionStore(): SelfEvolutionEvolverSessionStore {
    return this.deps.evolverSessionStore ?? new SelfEvolutionEvolverSessionStore();
  }

  private get timeoutMs(): number {
    return this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }
}
