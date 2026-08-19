import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class GraphqlSkillImprovementConfigSourceTraceEntry {
  @Field(() => String)
  source!: string;

  @Field(() => [String])
  fields!: string[];
}

@ObjectType()
export class GraphqlSkillImprovementEffectiveConfig {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  triggerStrategy!: string;

  @Field(() => String)
  improverStrategy!: string;

  @Field(() => String, { nullable: true })
  improverAgentDefinitionId?: string | null;

  @Field(() => String)
  resolvedAt!: string;

  @Field(() => [GraphqlSkillImprovementConfigSourceTraceEntry])
  sourceTrace!: GraphqlSkillImprovementConfigSourceTraceEntry[];
}

@ObjectType()
export class SkillImprovementCapability {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  settingKey!: string;

  @Field(() => String)
  source!: string;
}

@ObjectType()
export class GraphqlSkillImprovementStrategyDescriptor {
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
export class GraphqlSkillImprovementStrategyCatalog {
  @Field(() => [GraphqlSkillImprovementStrategyDescriptor])
  triggerStrategies!: GraphqlSkillImprovementStrategyDescriptor[];

  @Field(() => [GraphqlSkillImprovementStrategyDescriptor])
  improverStrategies!: GraphqlSkillImprovementStrategyDescriptor[];

  @Field(() => String)
  defaultTriggerStrategy!: string;

  @Field(() => String)
  defaultImproverStrategy!: string;
}

@ObjectType()
export class GraphqlSkillImprovementSkillTarget {
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
}

@ObjectType()
export class GraphqlSkillImprovementEligibility {
  @Field(() => Boolean)
  eligible!: boolean;

  @Field(() => [String])
  reasons!: string[];

  @Field(() => [String])
  warnings!: string[];

  @Field(() => [GraphqlSkillImprovementSkillTarget])
  skillTargets!: GraphqlSkillImprovementSkillTarget[];

  @Field(() => GraphqlSkillImprovementEffectiveConfig, { nullable: true })
  effectiveConfig?: GraphqlSkillImprovementEffectiveConfig | null;
}

@ObjectType()
export class GraphqlSkillImprovementTargetRef {
  @Field(() => String)
  kind!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;

  @Field(() => String, { nullable: true })
  agentRunId?: string | null;
}

@ObjectType()
export class GraphqlSkillImprovementNotificationSummary {
  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;
}

@ObjectType()
export class GraphqlSkillImprovementRunRecord {
  @Field(() => String)
  improvementRunId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  requestedAt!: string;

  @Field(() => String, { nullable: true })
  completedAt?: string | null;

  @Field(() => String)
  triggerStrategy!: string;

  @Field(() => String)
  improverStrategy!: string;

  @Field(() => GraphqlSkillImprovementTargetRef)
  target!: GraphqlSkillImprovementTargetRef;

  @Field(() => GraphqlSkillImprovementEffectiveConfig)
  effectiveConfig!: GraphqlSkillImprovementEffectiveConfig;

  @Field(() => [String])
  sourceRunIds!: string[];

  @Field(() => String)
  improverAgentDefinitionId!: string;

  @Field(() => String, { nullable: true })
  improverRunId?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => [GraphqlSkillImprovementSkillTarget])
  skillTargets!: GraphqlSkillImprovementSkillTarget[];

  @Field(() => String, { nullable: true })
  evidenceSummaryHash?: string | null;

  @Field(() => GraphqlSkillImprovementNotificationSummary, { nullable: true })
  notificationSummary?: GraphqlSkillImprovementNotificationSummary | null;

  @Field(() => [String])
  errors!: string[];
}

@InputType()
export class StartAgentRunSkillImprovementInput {
  @Field(() => String)
  runId!: string;
}

@InputType()
export class StartTeamMemberSkillImprovementInput {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  agentRunId!: string;
}

@ObjectType()
export class GraphqlSkillImprovementStartResult {
  @Field(() => String)
  improvementRunId!: string;

  @Field(() => String, { nullable: true })
  improverRunId?: string | null;

  @Field(() => GraphqlSkillImprovementRunRecord)
  record!: GraphqlSkillImprovementRunRecord;
}
