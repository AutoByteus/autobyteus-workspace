import { Field, InputType, ObjectType } from "type-graphql";

@InputType()
export class GraphqlSelfEvolutionConfigOverrideInput {
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean | null;

  @Field(() => String, { nullable: true })
  triggerStrategy?: string | null;

  @Field(() => String, { nullable: true })
  evolverStrategy?: string | null;

  @Field(() => String, { nullable: true })
  evolverAgentDefinitionId?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionConfigOverride {
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean | null;

  @Field(() => String, { nullable: true })
  triggerStrategy?: string | null;

  @Field(() => String, { nullable: true })
  evolverStrategy?: string | null;

  @Field(() => String, { nullable: true })
  evolverAgentDefinitionId?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionConfigSourceTraceEntry {
  @Field(() => String)
  source!: string;

  @Field(() => [String])
  fields!: string[];
}

@ObjectType()
export class GraphqlSelfEvolutionEffectiveConfig {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  triggerStrategy!: string;

  @Field(() => String)
  evolverStrategy!: string;

  @Field(() => String, { nullable: true })
  evolverAgentDefinitionId?: string | null;

  @Field(() => String)
  resolvedAt!: string;

  @Field(() => [GraphqlSelfEvolutionConfigSourceTraceEntry])
  sourceTrace!: GraphqlSelfEvolutionConfigSourceTraceEntry[];
}

@ObjectType()
export class SelfEvolutionCapability {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  settingKey!: string;

  @Field(() => String)
  source!: string;
}

@ObjectType()
export class GraphqlSelfEvolutionStrategyDescriptor {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class GraphqlSelfEvolutionStrategyCatalog {
  @Field(() => [GraphqlSelfEvolutionStrategyDescriptor])
  triggerStrategies!: GraphqlSelfEvolutionStrategyDescriptor[];

  @Field(() => [GraphqlSelfEvolutionStrategyDescriptor])
  evolverStrategies!: GraphqlSelfEvolutionStrategyDescriptor[];

  @Field(() => String)
  defaultTriggerStrategy!: string;

  @Field(() => String)
  defaultEvolverStrategy!: string;
}

@ObjectType()
export class GraphqlSelfEvolutionSkillTarget {
  @Field(() => String)
  skillName!: string;

  @Field(() => String)
  skillRootPath!: string;

  @Field(() => String)
  skillMdPath!: string;

  @Field(() => String, { nullable: true })
  sourceLabel?: string | null;

  @Field(() => Boolean)
  isWritable!: boolean;

  @Field(() => String, { nullable: true })
  gitRootPath?: string | null;

  @Field(() => String)
  rollbackMode!: string;
}

@ObjectType()
export class GraphqlSelfEvolutionEligibility {
  @Field(() => Boolean)
  eligible!: boolean;

  @Field(() => [String])
  reasons!: string[];

  @Field(() => [String])
  warnings!: string[];

  @Field(() => [GraphqlSelfEvolutionSkillTarget])
  skillTargets!: GraphqlSelfEvolutionSkillTarget[];

  @Field(() => GraphqlSelfEvolutionEffectiveConfig, { nullable: true })
  effectiveConfig?: GraphqlSelfEvolutionEffectiveConfig | null;
}

@ObjectType()
export class GraphqlSelfEvolutionTargetRef {
  @Field(() => String)
  kind!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;

  @Field(() => String, { nullable: true })
  memberRunId?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionChangeSummary {
  @Field(() => String)
  detectionMode!: string;

  @Field(() => [String])
  changedSkillPaths!: string[];

  @Field(() => [String])
  offTargetChangePaths!: string[];

  @Field(() => [String])
  gitRoots!: string[];

  @Field(() => String, { nullable: true })
  diffStat?: string | null;

  @Field(() => [String])
  warnings!: string[];

  @Field(() => [String])
  policyViolations!: string[];
}

@ObjectType()
export class GraphqlSelfEvolutionUpdateMetrics {
  @Field(() => Boolean)
  evolverRunCompleted!: boolean;

  @Field(() => String)
  evolverRunStatus!: string;

  @Field(() => Boolean)
  noOp!: boolean;

  @Field(() => Number)
  changedSkillCount!: number;

  @Field(() => [String])
  changedSkillPaths!: string[];

  @Field(() => Number)
  offTargetChangeCount!: number;

  @Field(() => [String])
  offTargetChangePaths!: string[];

  @Field(() => Number)
  policyViolationCount!: number;

  @Field(() => Number)
  gitBackedTargetCount!: number;

  @Field(() => Number)
  unversionedTargetCount!: number;

  @Field(() => Number)
  warningCount!: number;

  @Field(() => Number)
  errorCount!: number;

  @Field(() => String, { nullable: true })
  notificationStatus?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionBenefitSkillActivation {
  @Field(() => String)
  status!: string;

  @Field(() => Number, { nullable: true })
  loadSkillToolUseCount?: number | null;

  @Field(() => Boolean, { nullable: true })
  configuredSkillPreloaded?: boolean | null;

  @Field(() => Number, { nullable: true })
  directSkillReferenceCount?: number | null;
}

@ObjectType()
export class GraphqlSelfEvolutionBenefitSkillAdherence {
  @Field(() => String)
  status!: string;

  @Field(() => Number, { nullable: true })
  supportingTraceCount?: number | null;

  @Field(() => Number, { nullable: true })
  contradictoryTraceCount?: number | null;
}

@ObjectType()
export class GraphqlSelfEvolutionBenefitMetrics {
  @Field(() => [String])
  linkedPostEvolutionRunIds!: string[];

  @Field(() => String)
  linkMethod!: string;

  @Field(() => Number)
  completedLinkedRuns!: number;

  @Field(() => Number)
  failedLinkedRuns!: number;

  @Field(() => Number, { nullable: true })
  userPositiveFeedbackCount?: number | null;

  @Field(() => Number, { nullable: true })
  userNegativeFeedbackCount?: number | null;

  @Field(() => Number, { nullable: true })
  validationPassedCount?: number | null;

  @Field(() => Number, { nullable: true })
  validationFailedCount?: number | null;

  @Field(() => GraphqlSelfEvolutionBenefitSkillActivation)
  skillActivation!: GraphqlSelfEvolutionBenefitSkillActivation;

  @Field(() => GraphqlSelfEvolutionBenefitSkillAdherence)
  skillAdherence!: GraphqlSelfEvolutionBenefitSkillAdherence;

  @Field(() => String)
  assessment!: string;

  @Field(() => [String])
  notes!: string[];
}

@ObjectType()
export class GraphqlSelfEvolutionNotificationSummary {
  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionRunRecord {
  @Field(() => String)
  evolutionRunId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  requestedAt!: string;

  @Field(() => String, { nullable: true })
  completedAt?: string | null;

  @Field(() => String)
  triggerStrategy!: string;

  @Field(() => String)
  evolverStrategy!: string;

  @Field(() => GraphqlSelfEvolutionTargetRef)
  target!: GraphqlSelfEvolutionTargetRef;

  @Field(() => GraphqlSelfEvolutionEffectiveConfig)
  effectiveConfig!: GraphqlSelfEvolutionEffectiveConfig;

  @Field(() => [String])
  sourceRunIds!: string[];

  @Field(() => String)
  evolverAgentDefinitionId!: string;

  @Field(() => String, { nullable: true })
  evolverRunId?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => [GraphqlSelfEvolutionSkillTarget])
  skillTargets!: GraphqlSelfEvolutionSkillTarget[];

  @Field(() => String, { nullable: true })
  evidenceSummaryHash?: string | null;

  @Field(() => GraphqlSelfEvolutionChangeSummary, { nullable: true })
  changeSummary?: GraphqlSelfEvolutionChangeSummary | null;

  @Field(() => GraphqlSelfEvolutionUpdateMetrics, { nullable: true })
  updateMetrics?: GraphqlSelfEvolutionUpdateMetrics | null;

  @Field(() => GraphqlSelfEvolutionBenefitMetrics, { nullable: true })
  benefitMetrics?: GraphqlSelfEvolutionBenefitMetrics | null;

  @Field(() => GraphqlSelfEvolutionNotificationSummary, { nullable: true })
  notificationSummary?: GraphqlSelfEvolutionNotificationSummary | null;

  @Field(() => [String])
  errors!: string[];
}

@InputType()
export class StartAgentRunSelfEvolutionInput {
  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  requestedByUserId?: string | null;
}

@InputType()
export class StartTeamMemberSelfEvolutionInput {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  memberRunId!: string;

  @Field(() => String, { nullable: true })
  requestedByUserId?: string | null;
}

@ObjectType()
export class GraphqlSelfEvolutionStartResult {
  @Field(() => String)
  evolutionRunId!: string;

  @Field(() => String, { nullable: true })
  evolverRunId?: string | null;

  @Field(() => GraphqlSelfEvolutionRunRecord)
  record!: GraphqlSelfEvolutionRunRecord;
}

@ObjectType()
export class GraphqlSelfEvolutionMetricsReport {
  @Field(() => String)
  evolutionRunId!: string;

  @Field(() => GraphqlSelfEvolutionUpdateMetrics)
  updateMetrics!: GraphqlSelfEvolutionUpdateMetrics;

  @Field(() => GraphqlSelfEvolutionBenefitMetrics)
  benefitMetrics!: GraphqlSelfEvolutionBenefitMetrics;
}
