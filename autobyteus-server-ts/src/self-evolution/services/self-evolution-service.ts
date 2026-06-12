import type {
  ManualSelfEvolutionRequestedFrom,
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEligibility,
  SelfEvolutionRequest,
  SelfEvolutionRunRecord,
  SelfEvolutionStartResult,
  SelfEvolutionTargetRef,
} from "../domain/models.js";
import { SelfEvolutionCapabilityService } from "./self-evolution-capability-service.js";
import { SelfEvolutionEvidenceBuilder } from "./self-evolution-evidence-builder.js";
import { SelfEvolutionSkillTargetResolver } from "./self-evolution-skill-target-resolver.js";
import {
  SelfEvolutionTargetContextResolver,
  type SelfEvolutionTargetContext,
} from "./self-evolution-target-context-resolver.js";
import { SelfEvolutionEligibilityEvaluator } from "./self-evolution-eligibility-evaluator.js";
import { SelfEvolutionRecordLifecycle } from "./self-evolution-record-lifecycle.js";
import { SingleAgentEvolverStrategy } from "./strategies/single-agent-evolver-strategy.js";
import { SelfEvolutionStrategyCatalogService } from "./strategies/self-evolution-strategy-catalog.js";
import { ManualTriggerStrategy } from "./triggers/manual-trigger-strategy.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";

export type StartSelfEvolutionForAgentRunInput = { runId: string; requestedByUserId?: string | null; requestedFrom?: "run_detail" | "api"; };

export type StartSelfEvolutionForTeamMemberInput = { teamRunId: string; memberRunId: string; requestedByUserId?: string | null; requestedFrom?: "team_run_detail" | "api"; };

type SelfEvolutionServiceDeps = {
  capabilityService?: SelfEvolutionCapabilityService;
  catalogService?: SelfEvolutionStrategyCatalogService;
  targetContextResolver?: SelfEvolutionTargetContextResolver;
  skillTargetResolver?: SelfEvolutionSkillTargetResolver;
  evidenceBuilder?: SelfEvolutionEvidenceBuilder;
  manualTriggerStrategy?: ManualTriggerStrategy;
  evolverStrategy?: SingleAgentEvolverStrategy;
  eligibilityEvaluator?: SelfEvolutionEligibilityEvaluator;
  recordLifecycle?: SelfEvolutionRecordLifecycle;
  agentRunManager?: Pick<AgentRunManager, "getActiveRun">;
};

export class SelfEvolutionService {
  private static instance: SelfEvolutionService | null = null;

  static getInstance(deps: SelfEvolutionServiceDeps = {}): SelfEvolutionService {
    if (!SelfEvolutionService.instance) {
      SelfEvolutionService.instance = new SelfEvolutionService(deps);
    }
    return SelfEvolutionService.instance;
  }

  static resetInstance(): void {
    SelfEvolutionService.instance = null;
  }

  constructor(private readonly deps: SelfEvolutionServiceDeps = {}) {}

  getStrategyCatalog() {
    return this.catalogService.getCatalog();
  }

  async getAgentRunEligibility(runId: string): Promise<SelfEvolutionEligibility> {
    return this.evaluateTarget({ kind: "agent_run", runId: this.normalizeRequired(runId, "runId") });
  }

  async getTeamMemberEligibility(
    teamRunId: string,
    memberRunId: string,
  ): Promise<SelfEvolutionEligibility> {
    return this.evaluateTarget({
      kind: "team_member_run",
      teamRunId: this.normalizeRequired(teamRunId, "teamRunId"),
      memberRunId: this.normalizeRequired(memberRunId, "memberRunId"),
    });
  }

  async startForAgentRun(input: StartSelfEvolutionForAgentRunInput): Promise<SelfEvolutionStartResult> {
    return this.startForTarget(
      { kind: "agent_run", runId: this.normalizeRequired(input.runId, "runId") },
      input.requestedByUserId ?? null,
      input.requestedFrom ?? "run_detail",
    );
  }

  async startForTeamMember(input: StartSelfEvolutionForTeamMemberInput): Promise<SelfEvolutionStartResult> {
    return this.startForTarget(
      {
        kind: "team_member_run",
        teamRunId: this.normalizeRequired(input.teamRunId, "teamRunId"),
        memberRunId: this.normalizeRequired(input.memberRunId, "memberRunId"),
      },
      input.requestedByUserId ?? null,
      input.requestedFrom ?? "team_run_detail",
    );
  }

  async startFromEvolutionRequest(request: SelfEvolutionRequest): Promise<SelfEvolutionStartResult> {
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
        throw new Error("Self-evolution target has no writable configured SKILL.md files.");
      }
      record = await this.recordLifecycle.patchRecord(record, {
        skillTargets,
        sourceRunIds: context.sourceRunIds,
        workspaceRootPath: context.workspaceRootPath,
      });

      const { evidence, evidenceSummaryHash } = await this.evidenceBuilder.build({
        targetContext: context,
        skillTargets,
      });
      record = await this.recordLifecycle.patchRecord(record, {
        status: "launching_evolver",
        evidenceSummaryHash,
      });

      const result = await this.evolverStrategy.run({
        targetContext: context,
        evidence,
        editableSkillTargets: editableTargets,
      });
      record = await this.recordLifecycle.patchRecord(record, {
        evolverRunId: result.evolverRunId || null,
        evolverAgentDefinitionId: result.evolverAgentDefinitionId,
        runtimeKind: result.runtimeKind,
        llmModelIdentifier: result.llmModelIdentifier,
      });

      record = await this.recordLifecycle.finalizeRecord(record, result.status, result.notificationSummary ?? null);
      return {
        evolutionRunId: record.evolutionRunId,
        evolverRunId: record.evolverRunId ?? null,
        record,
      };
    } catch (error) {
      record = await this.recordLifecycle.failRecord(record, error);
      throw error;
    }
  }

  async getRunRecord(evolutionRunId: string): Promise<SelfEvolutionRunRecord | null> {
    return this.recordLifecycle.getRunRecord(this.normalizeRequired(evolutionRunId, "evolutionRunId"));
  }

  private async startForTarget(
    target: SelfEvolutionTargetRef,
    requestedByUserId: string | null,
    requestedFrom: ManualSelfEvolutionRequestedFrom,
  ): Promise<SelfEvolutionStartResult> {
    await this.capabilityService.requireEnabled();
    const context = await this.targetContextResolver.resolve(target);
    this.requireLiveTarget(context.target);
    const snapshot = this.requireRunnableSnapshot(context.effectiveConfig);
    const request = this.manualTriggerStrategy.createRequest(
      { target, requestedByUserId, requestedFrom },
      snapshot,
    );
    return this.startFromEvolutionRequest(request);
  }

  private async evaluateTarget(target: SelfEvolutionTargetRef) {
    return this.eligibilityEvaluator.evaluateTarget(target);
  }

  private async resolveRequestContext(request: SelfEvolutionRequest): Promise<SelfEvolutionTargetContext> {
    const context = await this.targetContextResolver.resolve(request.target);
    return { ...context, effectiveConfig: request.effectiveConfig };
  }

  private requireRunnableSnapshot(
    snapshot: SelfEvolutionEffectiveConfig | null,
  ): SelfEvolutionEffectiveConfig {
    const reasons: string[] = [];
    this.eligibilityEvaluator.collectSnapshotEligibility(snapshot, reasons);
    if (reasons.length > 0 || !snapshot) {
      throw new Error(reasons.join(" ") || "Self-evolution run snapshot is unavailable.");
    }
    return snapshot;
  }

  private requireLiveTarget(target: SelfEvolutionTargetRef): void {
    const runId = target.kind === "agent_run" ? target.runId : target.memberRunId;
    if (!this.agentRunManager.getActiveRun(runId)) {
      throw new Error(`Self-evolution target run '${runId}' is not active.`);
    }
  }

  private normalizeRequired(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new Error(`${fieldName} is required.`);
    }
    return normalized;
  }

  private get capabilityService(): SelfEvolutionCapabilityService {
    return this.deps.capabilityService ?? SelfEvolutionCapabilityService.getInstance();
  }

  private get catalogService(): SelfEvolutionStrategyCatalogService {
    return this.deps.catalogService ?? new SelfEvolutionStrategyCatalogService();
  }

  private get targetContextResolver(): SelfEvolutionTargetContextResolver {
    return this.deps.targetContextResolver ?? new SelfEvolutionTargetContextResolver();
  }

  private get skillTargetResolver(): SelfEvolutionSkillTargetResolver {
    return this.deps.skillTargetResolver ?? new SelfEvolutionSkillTargetResolver();
  }

  private get evidenceBuilder(): SelfEvolutionEvidenceBuilder {
    return this.deps.evidenceBuilder ?? new SelfEvolutionEvidenceBuilder();
  }

  private get manualTriggerStrategy(): ManualTriggerStrategy {
    return this.deps.manualTriggerStrategy ?? new ManualTriggerStrategy();
  }

  private get evolverStrategy(): SingleAgentEvolverStrategy {
    return this.deps.evolverStrategy ?? new SingleAgentEvolverStrategy();
  }

  private get eligibilityEvaluator(): SelfEvolutionEligibilityEvaluator {
    return this.deps.eligibilityEvaluator ?? new SelfEvolutionEligibilityEvaluator({
      capabilityService: this.capabilityService,
      catalogService: this.catalogService,
      targetContextResolver: this.targetContextResolver,
      skillTargetResolver: this.skillTargetResolver,
    });
  }

  private get recordLifecycle(): SelfEvolutionRecordLifecycle {
    return this.deps.recordLifecycle ?? new SelfEvolutionRecordLifecycle();
  }

  private get agentRunManager(): Pick<AgentRunManager, "getActiveRun"> {
    return this.deps.agentRunManager ?? AgentRunManager.getInstance();
  }
}
