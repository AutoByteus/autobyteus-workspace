import { normalizeSelfEvolutionConfigOverride } from "../../../self-evolution/domain/config.js";
import type {
  SelfEvolutionConfigOverride,
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEligibility,
  SelfEvolutionNotificationSummary,
  SelfEvolutionRunRecord,
  SelfEvolutionSkillTarget,
  SelfEvolutionStrategyCatalog,
  SelfEvolutionTargetRef,
} from "../../../self-evolution/domain/models.js";
import {
  GraphqlSelfEvolutionConfigOverride,
  GraphqlSelfEvolutionConfigOverrideInput,
  GraphqlSelfEvolutionEffectiveConfig,
  GraphqlSelfEvolutionEligibility,
  GraphqlSelfEvolutionNotificationSummary,
  GraphqlSelfEvolutionRunRecord,
  GraphqlSelfEvolutionSkillTarget,
  GraphqlSelfEvolutionStrategyCatalog,
  GraphqlSelfEvolutionTargetRef,
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
});

const toGraphqlTarget = (value: SelfEvolutionTargetRef): GraphqlSelfEvolutionTargetRef => value.kind === "agent_run"
  ? { kind: value.kind, runId: value.runId, teamRunId: null, memberRunId: null }
  : { kind: value.kind, runId: null, teamRunId: value.teamRunId, memberRunId: value.memberRunId };

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
  notificationSummary: toGraphqlNotificationSummary(value.notificationSummary),
  errors: value.errors,
});
