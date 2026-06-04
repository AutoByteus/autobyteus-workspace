import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { TeamRunMetadataService } from "../../run-history/services/team-run-metadata-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getTeamRunLeafAgentMetadata } from "../../run-history/services/team-run-metadata-flattener.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { SelfEvolutionBenefitMetrics, SelfEvolutionRunRecord, SelfEvolutionSkillTarget, SelfEvolutionUpdateMetrics } from "../domain/models.js";
import { SelfEvolutionRunStore } from "./self-evolution-run-store.js";
import { SelfEvolutionSkillTargetResolver } from "./self-evolution-skill-target-resolver.js";

type TargetMetadataProjection = { agentDefinitionId: string | null; teamDefinitionId?: string | null; completedAt: string | null; };

export class SelfEvolutionMetricsService {
  private readonly memoryDir: string;

  constructor(private readonly deps: {
    runStore?: SelfEvolutionRunStore;
    agentRunHistoryCatalogService?: AgentRunHistoryCatalogService;
    agentRunMetadataService?: AgentRunMetadataService;
    teamRunMetadataService?: TeamRunMetadataService;
    agentDefinitionService?: Pick<AgentDefinitionService, "getFreshAgentDefinitionById">;
    skillTargetResolver?: Pick<SelfEvolutionSkillTargetResolver, "resolveForAgentDefinition">;
    memoryDir?: string;
  } = {}) {
    this.memoryDir = deps.memoryDir ?? appConfigProvider.config.getMemoryDir();
  }

  buildUpdateMetrics(record: SelfEvolutionRunRecord): SelfEvolutionUpdateMetrics {
    const changeSummary = record.changeSummary ?? null;
    return {
      evolverRunCompleted: record.status === "completed",
      evolverRunStatus: record.status,
      noOp: (changeSummary?.changedSkillPaths.length ?? 0) === 0,
      changedSkillCount: changeSummary?.changedSkillPaths.length ?? 0,
      changedSkillPaths: changeSummary?.changedSkillPaths ?? [],
      offTargetChangeCount: changeSummary?.offTargetChangePaths.length ?? 0,
      offTargetChangePaths: changeSummary?.offTargetChangePaths ?? [],
      policyViolationCount: changeSummary?.policyViolations.length ?? 0,
      gitBackedTargetCount: record.skillTargets.filter((target) => target.rollbackMode === "git").length,
      unversionedTargetCount: record.skillTargets.filter((target) => target.rollbackMode === "unversioned").length,
      warningCount: changeSummary?.warnings.length ?? 0,
      errorCount: record.errors.length,
      notificationStatus: record.notificationSummary?.status ?? null,
    };
  }

  buildInitialBenefitMetrics(note = "No downstream target runs observed yet."): SelfEvolutionBenefitMetrics {
    return {
      linkedPostEvolutionRunIds: [],
      linkMethod: "none",
      completedLinkedRuns: 0,
      failedLinkedRuns: 0,
      userPositiveFeedbackCount: null,
      userNegativeFeedbackCount: null,
      validationPassedCount: null,
      validationFailedCount: null,
      skillActivation: { status: "not_enough_data", loadSkillToolUseCount: null, configuredSkillPreloaded: null, directSkillReferenceCount: null },
      skillAdherence: { status: "not_collectible", supportingTraceCount: null, contradictoryTraceCount: null },
      assessment: "not_enough_data",
      notes: [note],
    };
  }

  async getMetricsReport(evolutionRunId: string): Promise<{
    evolutionRunId: string;
    updateMetrics: SelfEvolutionUpdateMetrics;
    benefitMetrics: SelfEvolutionBenefitMetrics;
  }> {
    const record = await this.runStore.readRecord(evolutionRunId);
    if (!record) {
      throw new Error(`Self-evolution run '${evolutionRunId}' was not found.`);
    }
    const benefitMetrics = await this.refreshBenefitMetrics(record);
    const nextRecord: SelfEvolutionRunRecord = {
      ...record,
      updateMetrics: record.updateMetrics ?? this.buildUpdateMetrics(record),
      benefitMetrics,
    };
    await this.runStore.writeRecord(nextRecord);
    return {
      evolutionRunId,
      updateMetrics: nextRecord.updateMetrics!,
      benefitMetrics,
    };
  }

  private async refreshBenefitMetrics(record: SelfEvolutionRunRecord): Promise<SelfEvolutionBenefitMetrics> {
    if (record.status !== "completed") {
      return this.buildInitialBenefitMetrics("Evolution did not complete, so downstream benefit is not collectible.");
    }
    const target = await this.resolveTargetMetadata(record);
    if (!target.agentDefinitionId) {
      return this.buildInitialBenefitMetrics("Target metadata is unavailable; downstream benefit is not collectible.");
    }
    const evolvedSkillTargets = this.getChangedSkillTargets(record);
    if (evolvedSkillTargets.length === 0) {
      return this.buildInitialBenefitMetrics("Evolution produced no changed skill files, so downstream benefit is not collectible.");
    }
    const hasSkillOverlap = await this.hasConfiguredSkillOverlap(target.agentDefinitionId, evolvedSkillTargets);
    if (hasSkillOverlap === null) {
      return this.buildInitialBenefitMetrics("Configured skill overlap is not collectible for the target definition.");
    }
    if (!hasSkillOverlap) {
      return this.buildInitialBenefitMetrics("No linked post-evolution runs with overlapping configured skill targets observed yet.");
    }
    const linkedRunIds = record.target.kind === "agent_run"
      ? await this.findStandaloneLinks(record, target)
      : await this.findTeamMemberLinks(record, target);
    if (linkedRunIds.length === 0) {
      return this.buildInitialBenefitMetrics();
    }
    return {
      ...this.buildInitialBenefitMetrics("Linked post-evolution runs found; proxy benefit assessment remains neutral until feedback/validation is available."),
      linkedPostEvolutionRunIds: linkedRunIds,
      linkMethod: "target_identity_and_skill_overlap",
      completedLinkedRuns: linkedRunIds.length,
      skillActivation: { status: "not_observed", loadSkillToolUseCount: null, configuredSkillPreloaded: true, directSkillReferenceCount: null },
      skillAdherence: { status: "not_collectible", supportingTraceCount: null, contradictoryTraceCount: null },
      assessment: "neutral_signal",
    };
  }

  private getChangedSkillTargets(record: SelfEvolutionRunRecord): SelfEvolutionSkillTarget[] {
    const changedPaths = new Set(record.changeSummary?.changedSkillPaths ?? []);
    if (changedPaths.size === 0) {
      return [];
    }
    return record.skillTargets.filter((target) => changedPaths.has(target.skillMdPath));
  }

  private async hasConfiguredSkillOverlap(
    agentDefinitionId: string,
    evolvedSkillTargets: SelfEvolutionSkillTarget[],
  ): Promise<boolean | null> {
    try {
      const definition = await this.agentDefinitionService.getFreshAgentDefinitionById(agentDefinitionId);
      if (!definition) {
        return null;
      }
      const currentTargets = await this.skillTargetResolver.resolveForAgentDefinition(definition);
      const evolvedNames = new Set(evolvedSkillTargets.map((target) => target.skillName));
      const evolvedPaths = new Set(evolvedSkillTargets.map((target) => target.skillMdPath));
      return currentTargets.some((target) =>
        evolvedNames.has(target.skillName) || evolvedPaths.has(target.skillMdPath),
      );
    } catch {
      return null;
    }
  }

  private async resolveTargetMetadata(record: SelfEvolutionRunRecord): Promise<TargetMetadataProjection> {
    if (record.target.kind === "agent_run") {
      const metadata = await this.agentRunMetadataService.readMetadata(record.target.runId);
      return {
        agentDefinitionId: metadata?.agentDefinitionId ?? null,
        completedAt: record.completedAt ?? record.requestedAt,
      };
    }
    const target = record.target;
    const metadata = await this.teamRunMetadataService.readMetadata(target.teamRunId);
    const member = metadata
      ? getTeamRunLeafAgentMetadata(metadata).find((candidate) => candidate.memberRunId === target.memberRunId)
      : null;
    return {
      agentDefinitionId: member?.agentDefinitionId ?? null,
      teamDefinitionId: metadata?.teamDefinitionId ?? null,
      completedAt: record.completedAt ?? record.requestedAt,
    };
  }

  private async findStandaloneLinks(
    record: SelfEvolutionRunRecord,
    target: TargetMetadataProjection,
  ): Promise<string[]> {
    const rows = await this.agentRunHistoryCatalogService.listCatalogRows();
    const cutoff = Date.parse(target.completedAt ?? record.requestedAt);
    return rows
      .filter((row) => record.target.kind !== "agent_run" || row.runId !== record.target.runId)
      .filter((row) => row.agentDefinitionId === target.agentDefinitionId)
      .filter((row) => Date.parse(row.createdAt) > cutoff)
      .map((row) => row.runId)
      .slice(0, 20);
  }

  private async findTeamMemberLinks(
    record: SelfEvolutionRunRecord,
    target: TargetMetadataProjection,
  ): Promise<string[]> {
    const teamRunIds = await this.teamRunMetadataService.listTeamRunIds();
    const cutoff = Date.parse(target.completedAt ?? record.requestedAt);
    const linked: string[] = [];
    for (const teamRunId of teamRunIds) {
      if (record.target.kind === "team_member_run" && teamRunId === record.target.teamRunId) {
        continue;
      }
      const metadata = await this.teamRunMetadataService.readMetadata(teamRunId);
      if (!metadata || (target.teamDefinitionId && metadata.teamDefinitionId !== target.teamDefinitionId)) {
        continue;
      }
      if (Date.parse(metadata.createdAt) <= cutoff) {
        continue;
      }
      const member = getTeamRunLeafAgentMetadata(metadata)
        .find((candidate) => candidate.agentDefinitionId === target.agentDefinitionId);
      if (member) {
        linked.push(member.memberRunId);
      }
    }
    return linked.slice(0, 20);
  }

  private get runStore(): SelfEvolutionRunStore {
    return this.deps.runStore ?? new SelfEvolutionRunStore(this.memoryDir);
  }

  private get agentRunHistoryCatalogService(): AgentRunHistoryCatalogService {
    return this.deps.agentRunHistoryCatalogService ?? new AgentRunHistoryCatalogService(this.memoryDir);
  }

  private get agentRunMetadataService(): AgentRunMetadataService {
    return this.deps.agentRunMetadataService ?? new AgentRunMetadataService(this.memoryDir);
  }

  private get teamRunMetadataService(): TeamRunMetadataService {
    return this.deps.teamRunMetadataService ?? new TeamRunMetadataService(this.memoryDir);
  }

  private get agentDefinitionService(): Pick<AgentDefinitionService, "getFreshAgentDefinitionById"> {
    return this.deps.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private get skillTargetResolver(): Pick<SelfEvolutionSkillTargetResolver, "resolveForAgentDefinition"> {
    return this.deps.skillTargetResolver ?? new SelfEvolutionSkillTargetResolver();
  }
}
