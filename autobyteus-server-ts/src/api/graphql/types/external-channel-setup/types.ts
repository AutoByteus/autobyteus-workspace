import { GraphQLJSONObject } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { Field, InputType, Int, ObjectType, registerEnumType } from "type-graphql";

registerEnumType(SkillAccessMode, {
  name: "ExternalChannelSkillAccessModeEnum",
});

@ObjectType()
export class ExternalChannelCapabilities {
  @Field(() => Boolean)
  bindingCrudEnabled!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => [String])
  acceptedProviderTransportPairs!: string[];
}

@ObjectType()
export class ExternalChannelBindingGql {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  provider!: string;

  @Field(() => String)
  transport!: string;

  @Field(() => String)
  accountId!: string;

  @Field(() => String)
  peerId!: string;

  @Field(() => String, { nullable: true })
  threadId?: string | null;

  @Field(() => String)
  targetType!: string;

  @Field(() => String, { nullable: true })
  targetAgentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  targetTeamDefinitionId?: string | null;

  @Field(() => ExternalChannelLaunchPresetGql, { nullable: true })
  launchPreset?: ExternalChannelLaunchPresetGql | null;

  @Field(() => ExternalChannelTeamLaunchPresetGql, { nullable: true })
  teamLaunchPreset?: ExternalChannelTeamLaunchPresetGql | null;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class ExternalChannelTeamDefinitionOptionGql {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  coordinatorMemberName!: string;

  @Field(() => Int)
  memberCount!: number;
}

@ObjectType()
export class ExternalChannelLaunchPresetGql {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => String)
  runtimeKind!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

@InputType()
export class ExternalChannelLaunchPresetInput {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => Boolean, { nullable: true })
  autoExecuteTools?: boolean | null;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

@ObjectType()
export class ExternalChannelTeamLaunchPresetGql {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => String)
  runtimeKind!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

@InputType()
export class ExternalChannelTeamLaunchPresetInput {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => Boolean, { nullable: true })
  autoExecuteTools?: boolean | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

@InputType()
export class UpsertExternalChannelBindingInput {
  @Field(() => String)
  provider!: string;

  @Field(() => String)
  transport!: string;

  @Field(() => String)
  accountId!: string;

  @Field(() => String)
  peerId!: string;

  @Field(() => String, { nullable: true })
  threadId?: string | null;

  @Field(() => String)
  targetType!: string;

  @Field(() => String, { nullable: true })
  targetAgentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  targetTeamDefinitionId?: string | null;

  @Field(() => ExternalChannelLaunchPresetInput, { nullable: true })
  launchPreset?: ExternalChannelLaunchPresetInput | null;

  @Field(() => ExternalChannelTeamLaunchPresetInput, { nullable: true })
  teamLaunchPreset?: ExternalChannelTeamLaunchPresetInput | null;
}
