import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunService, getAgentRunService } from "../../../agent-execution/services/agent-run-service.js";
import { DirectAgentRunMessageGrantRegistry, getDirectAgentRunMessageGrantRegistry } from "../../../agent-communication/services/direct-agent-run-message-grant-registry.js";
import type { DirectAgentRunMessageGrantUsageSummary } from "../../../agent-communication/domain/direct-agent-run-message-grant.js";
import { SKILL_IMPROVEMENT_DIRECT_MESSAGE_GRANT_PURPOSE, SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE } from "../../domain/messages.js";
import type { SkillImprovementNotificationSummary, SkillImprovementSkillTarget, SkillImprovementTargetRef } from "../../domain/models.js";
import type { SkillImprovementImproverRequestResult, SkillImprovementImproverSession, SkillImprovementImproverSessionState, SkillImprovementImproverTriggerRequest } from "../../domain/improver-session.js";
import type { SkillImprovementTargetContext } from "../skill-improvement-target-context-resolver.js";
import { RetrospectiveSkillImproverAgentSettingsResolver } from "../retrospective-skill-improver-agent-settings-resolver.js";
import { SkillImprovementImproverSessionStore } from "./skill-improvement-improver-session-store.js";
import { ImproverRunCompletionWatcher } from "./improver-run-completion-watcher.js";
import { SkillImprovementImproverTriggerMessageBuilder } from "./skill-improvement-improver-trigger-message-builder.js";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

export class SkillImprovementImproverSessionService {
  constructor(private readonly deps: {
    agentRunService?: AgentRunService;
    settingsResolver?: RetrospectiveSkillImproverAgentSettingsResolver;
    grantRegistry?: DirectAgentRunMessageGrantRegistry;
    improverSessionStore?: SkillImprovementImproverSessionStore;
    timeoutMs?: number;
    triggerMessageBuilder?: SkillImprovementImproverTriggerMessageBuilder;
  } = {}) {}

  async activateOrGet(context: SkillImprovementTargetContext): Promise<SkillImprovementImproverSession> {
    if (context.effectiveConfig?.improverStrategy !== "single_agent") {
      throw new Error(`Improver strategy '${context.effectiveConfig?.improverStrategy ?? "unknown"}' is not implemented.`);
    }
    const existing = await this.improverSessionStore.load(context);
    if (existing?.status === "active" && existing.currentImproverRunId) {
      const run = this.agentRunService.getAgentRun(existing.currentImproverRunId);
      if (run?.isActive()) {
        return {
          target: context.target,
          improverRunId: existing.currentImproverRunId,
          improverAgentDefinitionId: existing.improverAgentDefinitionId ?? context.effectiveConfig.improverAgentDefinitionId ?? "",
          runtimeKind: existing.runtimeKind ?? String(context.runtimeKind ?? ""),
          llmModelIdentifier: existing.llmModelIdentifier ?? context.llmModelIdentifier ?? "",
          state: existing,
        };
      }
      const restored = await this.tryRestoreImproverRun(existing.currentImproverRunId);
      if (restored?.isActive()) {
        const state = await this.improverSessionStore.write(context, {
          ...existing,
          status: "active",
          currentImproverRunId: restored.runId,
        });
        return {
          target: context.target,
          improverRunId: restored.runId,
          improverAgentDefinitionId: existing.improverAgentDefinitionId ?? context.effectiveConfig.improverAgentDefinitionId ?? "",
          runtimeKind: existing.runtimeKind ?? String(context.runtimeKind ?? ""),
          llmModelIdentifier: existing.llmModelIdentifier ?? context.llmModelIdentifier ?? "",
          state,
        };
      }
      await this.improverSessionStore.write(context, {
        ...existing,
        status: "unavailable",
        currentImproverRunId: null,
        priorImproverRunIds: this.appendPrior(existing.priorImproverRunIds, existing.currentImproverRunId),
      });
    }
    return this.createReplacementSession(context, existing);
  }

  async postSkillImprovementRequest(
    session: SkillImprovementImproverSession,
    request: SkillImprovementImproverTriggerRequest,
    context: SkillImprovementTargetContext,
  ): Promise<SkillImprovementImproverRequestResult> {
    const run = this.requireActiveRun(session.improverRunId);
    const grant = this.grantRegistry.register({
      senderRunId: session.improverRunId,
      purpose: SKILL_IMPROVEMENT_DIRECT_MESSAGE_GRANT_PURPOSE,
      allowedTargetAgentRunIds: [request.targetAgentRunId],
      allowedMessageTypes: [SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE],
      allowedReferenceFileRoots: request.editableSkillTargets.map((target) => target.skillRootPath),
      maxAcceptedDeliveries: 1,
      expiresAt: new Date(Date.now() + this.timeoutMs + 5 * 60 * 1000).toISOString(),
    });
    const watcher = new ImproverRunCompletionWatcher(session.improverRunId);
    const unsubscribe = run.subscribeToEvents((event) => watcher.observe(event));
    try {
      const triggerMessage = await this.triggerMessageBuilder.build(request, session);
      const postResult = await run.postUserMessage(triggerMessage);
      if (!postResult.accepted) {
        throw new Error(postResult.message ?? `Retrospective Skill Improver '${session.improverRunId}' rejected the request.`);
      }
      await this.agentRunService.recordRunActivity(run, {
        summary: `Skill Improvement request for ${context.agentName}`,
      }).catch((error) => {
        console.warn(`Failed to record Retrospective Skill Improver activity for '${session.improverRunId}': ${String(error)}`);
      });
      await this.improverSessionStore.write(context, {
        ...session.state,
        status: "active",
        currentImproverRunId: session.improverRunId,
        workTraces: {
          rootPath: request.workTracePackage.workTraceRootPath,
          manifestPath: request.workTracePackage.manifestPath,
          lastSummaryHash: request.workTracePackage.summaryHash,
        },
        lastRequest: {
          improvementRunId: request.improvementRunId,
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
          improverRunId: session.improverRunId,
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
    context: SkillImprovementTargetContext,
    existing: SkillImprovementImproverSessionState | null,
  ): Promise<SkillImprovementImproverSession> {
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
    const state: SkillImprovementImproverSessionState = await this.improverSessionStore.write(context, {
      schemaVersion: 1,
      target: context.target,
      status: "active",
      currentImproverRunId: run.runId,
      priorImproverRunIds: this.appendPrior(existing?.priorImproverRunIds ?? [], existing?.currentImproverRunId ?? null),
      improverAgentDefinitionId: resolved.agentDefinitionId,
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
      improverRunId: run.runId,
      improverAgentDefinitionId: resolved.agentDefinitionId,
      runtimeKind: resolved.runtimeKind,
      llmModelIdentifier: resolved.llmModelIdentifier,
      state,
    };
  }

  private appendPrior(prior: string[], runId: string | null): string[] {
    return runId && !prior.includes(runId) ? [...prior, runId] : prior;
  }

  private async tryRestoreImproverRun(runId: string): Promise<AgentRun | null> {
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
      throw new Error(`Retrospective Skill Improver run '${runId}' is not active.`);
    }
    return run;
  }

  private resolveTargetAgentRunId(target: SkillImprovementTargetRef): string {
    return target.kind === "agent_run" ? target.runId : target.agentRunId;
  }

  buildTriggerRequest(input: {
    improvementRunId: string;
    requestedAt: string;
    target: SkillImprovementTargetRef;
    workTracePackage: SkillImprovementImproverTriggerRequest["workTracePackage"];
    editableSkillTargets: SkillImprovementSkillTarget[];
  }): SkillImprovementImproverTriggerRequest {
    return {
      improvementRunId: input.improvementRunId,
      requestedAt: input.requestedAt,
      targetAgentRunId: this.resolveTargetAgentRunId(input.target),
      workTracePackage: input.workTracePackage,
      editableSkillTargets: input.editableSkillTargets,
    };
  }

  private buildOutcomeNotificationSummary(input: {
    targetAgentRunId: string;
    improverRunId: string;
    usageSummary: DirectAgentRunMessageGrantUsageSummary | null;
  }): SkillImprovementNotificationSummary {
    const latestUsage = input.usageSummary?.latestUsage ?? null;
    if (!latestUsage) {
      return {
        status: "send_message_not_attempted",
        targetAgentRunId: input.targetAgentRunId,
        improverRunId: input.improverRunId,
        message: "Retrospective Skill Improver completed but did not call send_message_to with a final outcome.",
      };
    }
    if (latestUsage.accepted) {
      return {
        status: "send_message_sent",
        targetAgentRunId: input.targetAgentRunId,
        improverRunId: input.improverRunId,
        message: latestUsage.message ?? "Retrospective Skill Improver delivered its final outcome message.",
      };
    }
    return {
      status: latestUsage.code === "TARGET_AGENT_RUN_NOT_ACTIVE" ? "send_message_target_inactive" : "send_message_rejected",
      targetAgentRunId: input.targetAgentRunId,
      improverRunId: input.improverRunId,
      message: latestUsage.message,
      error: latestUsage.code,
    };
  }

  private get triggerMessageBuilder(): SkillImprovementImproverTriggerMessageBuilder {
    return this.deps.triggerMessageBuilder ?? new SkillImprovementImproverTriggerMessageBuilder();
  }

  private get agentRunService(): AgentRunService {
    return this.deps.agentRunService ?? getAgentRunService();
  }

  private get settingsResolver(): RetrospectiveSkillImproverAgentSettingsResolver {
    return this.deps.settingsResolver ?? new RetrospectiveSkillImproverAgentSettingsResolver();
  }

  private get grantRegistry(): DirectAgentRunMessageGrantRegistry {
    return this.deps.grantRegistry ?? getDirectAgentRunMessageGrantRegistry();
  }

  private get improverSessionStore(): SkillImprovementImproverSessionStore {
    return this.deps.improverSessionStore ?? new SkillImprovementImproverSessionStore();
  }

  private get timeoutMs(): number {
    return this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }
}
