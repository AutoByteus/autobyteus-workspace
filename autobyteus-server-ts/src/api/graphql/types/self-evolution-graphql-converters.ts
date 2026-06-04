import { normalizeSelfEvolutionConfigOverride } from "../../../self-evolution/domain/config.js";
import type {
  SelfEvolutionBenefitMetrics,
  SelfEvolutionChangeSummary,
  SelfEvolutionConfigOverride,
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEligibility,
  SelfEvolutionNotificationSummary,
  SelfEvolutionRunRecord,
  SelfEvolutionSkillTarget,
  SelfEvolutionStrategyCatalog,
  SelfEvolutionTargetRef,
  SelfEvolutionUpdateMetrics,
} from "../../../self-evolution/domain/models.js";
import {
  GraphqlSelfEvolutionBenefitMetrics,
  GraphqlSelfEvolutionChangeSummary,
  GraphqlSelfEvolutionConfigOverride,
  GraphqlSelfEvolutionConfigOverrideInput,
  GraphqlSelfEvolutionEffectiveConfig,
  GraphqlSelfEvolutionEligibility,
  GraphqlSelfEvolutionNotificationSummary,
  GraphqlSelfEvolutionRunRecord,
  GraphqlSelfEvolutionSkillTarget,
  GraphqlSelfEvolutionStrategyCatalog,
  GraphqlSelfEvolutionTargetRef,
  GraphqlSelfEvolutionUpdateMetrics,
} from "./self-evolution-graphql-types.js";

export const toDomainSelfEvolutionConfigOverride = (
  input?: GraphqlSelfEvolutionConfigOverrideInput | null,
): SelfEvolutionConfigOverride | null | undefined => input === undefined
  ? undefined
  : normalizeSelfEvolutionConfigOverride(input);

export const toGraphqlSelfEvolutionConfigOverride = (
  value?: SelfEvolutionConfigOverride | null,
): GraphqlSelfEvolutionConfigOverride | null => value
  ? {
      enabled: value.enabled ?? null,
      triggerStrategy: value.triggerStrategy ?? null,
      evolverStrategy: value.evolverStrategy ?? null,
      evolverAgentDefinitionId: value.evolverAgentDefinitionId ?? null,
    }
  : null;

const toGraphqlEffectiveConfig = (
  value: SelfEvolutionEffectiveConfig | null,
): GraphqlSelfEvolutionEffectiveConfig | null => value
  ? {
      enabled: value.enabled,
      triggerStrategy: value.triggerStrategy,
      evolverStrategy: value.evolverStrategy,
      evolverAgentDefinitionId: value.evolverAgentDefinitionId ?? null,
      resolvedAt: value.resolvedAt,
      sourceTrace: value.sourceTrace.map((entry) => ({ source: entry.source, fields: entry.fields })),
    }
  : null;

const toGraphqlSkillTarget = (value: SelfEvolutionSkillTarget): GraphqlSelfEvolutionSkillTarget => ({
  skillName: value.skillName,
  skillRootPath: value.skillRootPath,
  skillMdPath: value.skillMdPath,
  sourceLabel: value.sourceLabel ?? null,
  isWritable: value.isWritable,
  gitRootPath: value.gitRootPath ?? null,
  rollbackMode: value.rollbackMode,
});

const toGraphqlTarget = (value: SelfEvolutionTargetRef): GraphqlSelfEvolutionTargetRef => value.kind === "agent_run"
  ? { kind: value.kind, runId: value.runId, teamRunId: null, memberRunId: null }
  : { kind: value.kind, runId: null, teamRunId: value.teamRunId, memberRunId: value.memberRunId };

const toGraphqlChangeSummary = (
  value?: SelfEvolutionChangeSummary | null,
): GraphqlSelfEvolutionChangeSummary | null => value
  ? { ...value, diffStat: value.diffStat ?? null }
  : null;

export const toGraphqlUpdateMetrics = (
  value?: SelfEvolutionUpdateMetrics | null,
): GraphqlSelfEvolutionUpdateMetrics | null => value
  ? { ...value, notificationStatus: value.notificationStatus ?? null }
  : null;

export const toGraphqlBenefitMetrics = (
  value?: SelfEvolutionBenefitMetrics | null,
): GraphqlSelfEvolutionBenefitMetrics | null => value ? {
  ...value,
  userPositiveFeedbackCount: value.userPositiveFeedbackCount ?? null,
  userNegativeFeedbackCount: value.userNegativeFeedbackCount ?? null,
  validationPassedCount: value.validationPassedCount ?? null,
  validationFailedCount: value.validationFailedCount ?? null,
  skillActivation: {
    status: value.skillActivation.status,
    loadSkillToolUseCount: value.skillActivation.loadSkillToolUseCount ?? null,
    configuredSkillPreloaded: value.skillActivation.configuredSkillPreloaded ?? null,
    directSkillReferenceCount: value.skillActivation.directSkillReferenceCount ?? null,
  },
  skillAdherence: {
    status: value.skillAdherence.status,
    supportingTraceCount: value.skillAdherence.supportingTraceCount ?? null,
    contradictoryTraceCount: value.skillAdherence.contradictoryTraceCount ?? null,
  },
} : null;

const toGraphqlNotificationSummary = (
  value?: SelfEvolutionNotificationSummary | null,
): GraphqlSelfEvolutionNotificationSummary | null => value
  ? { status: value.status, message: value.message ?? null, error: value.error ?? null }
  : null;

export const toGraphqlEligibility = (value: SelfEvolutionEligibility): GraphqlSelfEvolutionEligibility => ({
  eligible: value.eligible,
  reasons: value.reasons,
  warnings: value.warnings,
  skillTargets: value.skillTargets.map(toGraphqlSkillTarget),
  effectiveConfig: toGraphqlEffectiveConfig(value.effectiveConfig),
});

export const toGraphqlCatalog = (value: SelfEvolutionStrategyCatalog): GraphqlSelfEvolutionStrategyCatalog => ({
  triggerStrategies: value.triggerStrategies,
  evolverStrategies: value.evolverStrategies,
  defaultTriggerStrategy: value.defaultTriggerStrategy,
  defaultEvolverStrategy: value.defaultEvolverStrategy,
});

export const toGraphqlRecord = (value: SelfEvolutionRunRecord): GraphqlSelfEvolutionRunRecord => ({
  evolutionRunId: value.evolutionRunId,
  status: value.status,
  requestedAt: value.requestedAt,
  completedAt: value.completedAt ?? null,
  triggerStrategy: value.triggerStrategy,
  evolverStrategy: value.evolverStrategy,
  target: toGraphqlTarget(value.target),
  effectiveConfig: toGraphqlEffectiveConfig(value.effectiveConfig)!,
  sourceRunIds: value.sourceRunIds,
  evolverAgentDefinitionId: value.evolverAgentDefinitionId,
  evolverRunId: value.evolverRunId ?? null,
  runtimeKind: value.runtimeKind ?? null,
  llmModelIdentifier: value.llmModelIdentifier ?? null,
  workspaceRootPath: value.workspaceRootPath ?? null,
  skillTargets: value.skillTargets.map(toGraphqlSkillTarget),
  evidenceSummaryHash: value.evidenceSummaryHash ?? null,
  changeSummary: toGraphqlChangeSummary(value.changeSummary),
  updateMetrics: toGraphqlUpdateMetrics(value.updateMetrics),
  benefitMetrics: toGraphqlBenefitMetrics(value.benefitMetrics),
  notificationSummary: toGraphqlNotificationSummary(value.notificationSummary),
  errors: value.errors,
});
