import type {
  SkillImprovementEffectiveConfig,
  SkillImprovementEligibility,
  SkillImprovementNotificationSummary,
  SkillImprovementRunRecord,
  SkillImprovementSkillTarget,
  SkillImprovementStrategyCatalog,
  SkillImprovementTargetRef,
} from "../../../skill-improvement/domain/models.js";
import {
  GraphqlSkillImprovementEffectiveConfig,
  GraphqlSkillImprovementEligibility,
  GraphqlSkillImprovementNotificationSummary,
  GraphqlSkillImprovementRunRecord,
  GraphqlSkillImprovementSkillTarget,
  GraphqlSkillImprovementStrategyCatalog,
  GraphqlSkillImprovementTargetRef,
} from "./skill-improvement-graphql-types.js";

const toGraphqlEffectiveConfig = (
  value: SkillImprovementEffectiveConfig | null,
): GraphqlSkillImprovementEffectiveConfig | null => value
  ? {
      enabled: value.enabled,
      triggerStrategy: value.triggerStrategy,
      improverStrategy: value.improverStrategy,
      improverAgentDefinitionId: value.improverAgentDefinitionId ?? null,
      resolvedAt: value.resolvedAt,
      sourceTrace: value.sourceTrace.map((entry) => ({ source: entry.source, fields: entry.fields })),
    }
  : null;

const toGraphqlSkillTarget = (value: SkillImprovementSkillTarget): GraphqlSkillImprovementSkillTarget => ({
  skillName: value.skillName,
  skillRootPath: value.skillRootPath,
  skillMdPath: value.skillMdPath,
  sourceLabel: value.sourceLabel ?? null,
  isWritable: value.isWritable,
});

const toGraphqlTarget = (value: SkillImprovementTargetRef): GraphqlSkillImprovementTargetRef => value.kind === "agent_run"
  ? { kind: value.kind, runId: value.runId, teamRunId: null, agentRunId: null }
  : { kind: value.kind, runId: null, teamRunId: value.teamRunId, agentRunId: value.agentRunId };

const toGraphqlNotificationSummary = (
  value?: SkillImprovementNotificationSummary | null,
): GraphqlSkillImprovementNotificationSummary | null => value
  ? { status: value.status, message: value.message ?? null, error: value.error ?? null }
  : null;

export const toGraphqlEligibility = (value: SkillImprovementEligibility): GraphqlSkillImprovementEligibility => ({
  eligible: value.eligible,
  reasons: value.reasons,
  warnings: value.warnings,
  skillTargets: value.skillTargets.map(toGraphqlSkillTarget),
  effectiveConfig: toGraphqlEffectiveConfig(value.effectiveConfig),
});

export const toGraphqlCatalog = (value: SkillImprovementStrategyCatalog): GraphqlSkillImprovementStrategyCatalog => ({
  triggerStrategies: value.triggerStrategies,
  improverStrategies: value.improverStrategies,
  defaultTriggerStrategy: value.defaultTriggerStrategy,
  defaultImproverStrategy: value.defaultImproverStrategy,
});

export const toGraphqlRecord = (value: SkillImprovementRunRecord): GraphqlSkillImprovementRunRecord => ({
  improvementRunId: value.improvementRunId,
  status: value.status,
  requestedAt: value.requestedAt,
  completedAt: value.completedAt ?? null,
  triggerStrategy: value.triggerStrategy,
  improverStrategy: value.improverStrategy,
  target: toGraphqlTarget(value.target),
  effectiveConfig: toGraphqlEffectiveConfig(value.effectiveConfig)!,
  sourceRunIds: value.sourceRunIds,
  improverAgentDefinitionId: value.improverAgentDefinitionId,
  improverRunId: value.improverRunId ?? null,
  runtimeKind: value.runtimeKind ?? null,
  llmModelIdentifier: value.llmModelIdentifier ?? null,
  workspaceRootPath: value.workspaceRootPath ?? null,
  skillTargets: value.skillTargets.map(toGraphqlSkillTarget),
  evidenceSummaryHash: value.evidenceSummaryHash ?? null,
  notificationSummary: toGraphqlNotificationSummary(value.notificationSummary),
  errors: value.errors,
});
