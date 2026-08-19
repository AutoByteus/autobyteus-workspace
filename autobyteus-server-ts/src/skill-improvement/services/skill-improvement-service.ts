import type {
  ManualSkillImprovementRequestedFrom,
  SkillImprovementEffectiveConfig,
  SkillImprovementEligibility,
  SkillImprovementRequest,
  SkillImprovementRunRecord,
  SkillImprovementStartResult,
  SkillImprovementTargetRef,
} from "../domain/models.js";
import { SkillImprovementCapabilityService } from "./skill-improvement-capability-service.js";
import { SkillImprovementSkillTargetResolver } from "./skill-improvement-skill-target-resolver.js";
import {
  SkillImprovementTargetContextResolver,
  type SkillImprovementTargetContext,
} from "./skill-improvement-target-context-resolver.js";
import { SkillImprovementEligibilityEvaluator } from "./skill-improvement-eligibility-evaluator.js";
import { SkillImprovementRecordLifecycle } from "./skill-improvement-record-lifecycle.js";
import { SkillImprovementStrategyCatalogService } from "./strategies/skill-improvement-strategy-catalog.js";
import { ManualTriggerStrategy } from "./triggers/manual-trigger-strategy.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { SkillImprovementEffectiveConfigResolver } from "./skill-improvement-effective-config-resolver.js";
import { AgentWorkTraceProjectionService } from "../../agent-work-traces/services/agent-work-trace-projection-service.js";
import { SkillImprovementImproverSessionService } from "./improver-session/skill-improvement-improver-session-service.js";

export type StartSkillImprovementForAgentRunInput = { runId: string; requestedByUserId?: string | null; requestedFrom?: "run_detail" | "api"; };

export type StartSkillImprovementForTeamMemberInput = { teamRunId: string; agentRunId: string; requestedByUserId?: string | null; requestedFrom?: "team_run_detail" | "api"; };

type SkillImprovementServiceDeps = {
  capabilityService?: SkillImprovementCapabilityService;
  catalogService?: SkillImprovementStrategyCatalogService;
  targetContextResolver?: SkillImprovementTargetContextResolver;
  skillTargetResolver?: SkillImprovementSkillTargetResolver;
  manualTriggerStrategy?: ManualTriggerStrategy;
  eligibilityEvaluator?: SkillImprovementEligibilityEvaluator;
  recordLifecycle?: SkillImprovementRecordLifecycle;
  agentRunManager?: Pick<AgentRunManager, "getActiveRun">;
  effectiveConfigResolver?: SkillImprovementEffectiveConfigResolver;
  workTraceProjectionService?: AgentWorkTraceProjectionService;
  improverSessionService?: SkillImprovementImproverSessionService;
};

export class SkillImprovementService {
  private static instance: SkillImprovementService | null = null;

  static getInstance(deps: SkillImprovementServiceDeps = {}): SkillImprovementService {
    if (!SkillImprovementService.instance) {
      SkillImprovementService.instance = new SkillImprovementService(deps);
    }
    return SkillImprovementService.instance;
  }

  static resetInstance(): void {
    SkillImprovementService.instance = null;
  }

  constructor(private readonly deps: SkillImprovementServiceDeps = {}) {}

  getStrategyCatalog() {
    return this.catalogService.getCatalog();
  }

  async getAgentRunEligibility(runId: string): Promise<SkillImprovementEligibility> {
    return this.evaluateTarget({ kind: "agent_run", runId: this.normalizeRequired(runId, "runId") });
  }

  async getTeamMemberEligibility(teamRunId: string, agentRunId: string): Promise<SkillImprovementEligibility> {
    return this.evaluateTarget({
      kind: "team_member_run",
      teamRunId: this.normalizeRequired(teamRunId, "teamRunId"),
      agentRunId: this.normalizeRequired(agentRunId, "agentRunId"),
    });
  }

  async startForAgentRun(input: StartSkillImprovementForAgentRunInput): Promise<SkillImprovementStartResult> {
    return this.startForTarget(
      { kind: "agent_run", runId: this.normalizeRequired(input.runId, "runId") },
      input.requestedByUserId ?? null,
      input.requestedFrom ?? "run_detail",
    );
  }

  async startForTeamMember(input: StartSkillImprovementForTeamMemberInput): Promise<SkillImprovementStartResult> {
    return this.startForTarget(
      {
        kind: "team_member_run",
        teamRunId: this.normalizeRequired(input.teamRunId, "teamRunId"),
        agentRunId: this.normalizeRequired(input.agentRunId, "agentRunId"),
      },
      input.requestedByUserId ?? null,
      input.requestedFrom ?? "team_run_detail",
    );
  }

  async startFromImprovementRequest(request: SkillImprovementRequest): Promise<SkillImprovementStartResult> {
    await this.capabilityService.requireEnabled();
    this.requireRunnableSnapshot(request.effectiveConfig);
    let record = this.recordLifecycle.buildInitialRecord(request);
    await this.recordLifecycle.patchRecord(record, {});

    try {
      record = await this.recordLifecycle.patchRecord(record, { status: "resolving_target" });
      const context = await this.resolveRequestContext(request);
      this.requireLiveTarget(context.target);
      const skillTargets = await this.skillTargetResolver.resolveForAgentDefinition(context.targetAgentDefinition);
      const editableTargets = skillTargets.filter((target) => target.isWritable);
      if (editableTargets.length === 0) {
        throw new Error("Skill Improvement target has no writable configured SKILL.md files.");
      }
      record = await this.recordLifecycle.patchRecord(record, {
        skillTargets,
        sourceRunIds: context.sourceRunIds,
        workspaceRootPath: context.workspaceRootPath,
      });

      const workTracePackage = await this.workTraceProjectionService.ensureCurrent({
        target: context.target,
        memoryDir: context.memoryDir,
        targetDisplayName: context.agentName,
      });
      record = await this.recordLifecycle.patchRecord(record, {
        status: "launching_improver",
        evidenceSummaryHash: workTracePackage.summaryHash,
      });

      const session = await this.improverSessionService.activateOrGet(context);
      record = await this.recordLifecycle.patchRecord(record, {
        status: "running_improver",
        improverRunId: session.improverRunId,
        improverAgentDefinitionId: session.improverAgentDefinitionId,
        runtimeKind: session.runtimeKind,
        llmModelIdentifier: session.llmModelIdentifier,
      });

      const triggerRequest = this.improverSessionService.buildTriggerRequest({
        improvementRunId: request.improvementRunId,
        requestedAt: request.requestedAt,
        target: request.target,
        workTracePackage,
        editableSkillTargets: editableTargets,
      });
      const result = await this.improverSessionService.postSkillImprovementRequest(session, triggerRequest, context);
      record = await this.recordLifecycle.finalizeRecord(
        record,
        result.status === "timed_out" ? "timed_out" : "completed",
        result.notificationSummary,
      );
      return {
        improvementRunId: record.improvementRunId,
        improverRunId: record.improverRunId ?? null,
        record,
      };
    } catch (error) {
      record = await this.recordLifecycle.failRecord(record, error);
      throw error;
    }
  }

  async getRunRecord(improvementRunId: string): Promise<SkillImprovementRunRecord | null> {
    return this.recordLifecycle.getRunRecord(this.normalizeRequired(improvementRunId, "improvementRunId"));
  }

  private async startForTarget(
    target: SkillImprovementTargetRef,
    requestedByUserId: string | null,
    requestedFrom: ManualSkillImprovementRequestedFrom,
  ): Promise<SkillImprovementStartResult> {
    const effectiveConfig = await this.resolveCurrentManualSkillImprovementSettings();
    this.requireRunnableSnapshot(effectiveConfig);
    const context = await this.targetContextResolver.resolve(target);
    this.requireLiveTarget(context.target);
    const request = this.manualTriggerStrategy.createRequest(
      { target, requestedByUserId, requestedFrom },
      effectiveConfig,
    );
    return this.startFromImprovementRequest(request);
  }

  private async evaluateTarget(target: SkillImprovementTargetRef) {
    return this.eligibilityEvaluator.evaluateTarget(target);
  }

  private async resolveRequestContext(request: SkillImprovementRequest): Promise<SkillImprovementTargetContext> {
    const context = await this.targetContextResolver.resolve(request.target);
    return { ...context, effectiveConfig: request.effectiveConfig };
  }

  private async resolveCurrentManualSkillImprovementSettings(): Promise<SkillImprovementEffectiveConfig> {
    const capability = await this.capabilityService.getCapability();
    return this.effectiveConfigResolver.resolveCurrentManualSkillImprovementSettings({ enabled: capability.enabled });
  }

  private requireRunnableSnapshot(snapshot: SkillImprovementEffectiveConfig | null): SkillImprovementEffectiveConfig {
    const reasons: string[] = [];
    this.eligibilityEvaluator.collectSnapshotEligibility(snapshot, reasons);
    if (reasons.length > 0 || !snapshot) {
      throw new Error(reasons.join(" ") || "Skill Improvement settings are unavailable.");
    }
    return snapshot;
  }

  private requireLiveTarget(target: SkillImprovementTargetRef): void {
    const runId = target.kind === "agent_run" ? target.runId : target.agentRunId;
    if (!this.agentRunManager.getActiveRun(runId)) {
      throw new Error(`Skill Improvement target run '${runId}' is not active.`);
    }
  }

  private normalizeRequired(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) throw new Error(`${fieldName} is required.`);
    return normalized;
  }

  private get capabilityService(): SkillImprovementCapabilityService { return this.deps.capabilityService ?? SkillImprovementCapabilityService.getInstance(); }
  private get catalogService(): SkillImprovementStrategyCatalogService { return this.deps.catalogService ?? new SkillImprovementStrategyCatalogService(); }
  private get targetContextResolver(): SkillImprovementTargetContextResolver { return this.deps.targetContextResolver ?? new SkillImprovementTargetContextResolver(); }
  private get skillTargetResolver(): SkillImprovementSkillTargetResolver { return this.deps.skillTargetResolver ?? new SkillImprovementSkillTargetResolver(); }
  private get manualTriggerStrategy(): ManualTriggerStrategy { return this.deps.manualTriggerStrategy ?? new ManualTriggerStrategy(); }
  private get eligibilityEvaluator(): SkillImprovementEligibilityEvaluator {
    return this.deps.eligibilityEvaluator ?? new SkillImprovementEligibilityEvaluator({
      capabilityService: this.capabilityService,
      catalogService: this.catalogService,
      targetContextResolver: this.targetContextResolver,
      skillTargetResolver: this.skillTargetResolver,
      effectiveConfigResolver: this.effectiveConfigResolver,
    });
  }
  private get recordLifecycle(): SkillImprovementRecordLifecycle { return this.deps.recordLifecycle ?? new SkillImprovementRecordLifecycle(); }
  private get agentRunManager(): Pick<AgentRunManager, "getActiveRun"> { return this.deps.agentRunManager ?? AgentRunManager.getInstance(); }
  private get effectiveConfigResolver(): SkillImprovementEffectiveConfigResolver { return this.deps.effectiveConfigResolver ?? new SkillImprovementEffectiveConfigResolver(); }
  private get workTraceProjectionService(): AgentWorkTraceProjectionService { return this.deps.workTraceProjectionService ?? new AgentWorkTraceProjectionService(); }
  private get improverSessionService(): SkillImprovementImproverSessionService { return this.deps.improverSessionService ?? new SkillImprovementImproverSessionService(); }
}
