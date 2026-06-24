import { Field, InputType, ObjectType } from "type-graphql";

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

  @Field(() => GraphqlSelfEvolutionNotificationSummary, { nullable: true })
  notificationSummary?: GraphqlSelfEvolutionNotificationSummary | null;

  @Field(() => [String])
  errors!: string[];
}

@InputType()
export class StartAgentRunSelfEvolutionInput {
  @Field(() => String)
  runId!: string;
}

@InputType()
export class StartTeamMemberSelfEvolutionInput {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  memberRunId!: string;
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
