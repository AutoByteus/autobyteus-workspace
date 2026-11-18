import { GraphQLJSON } from "graphql-scalars";
import { Field, ObjectType } from "type-graphql";
import { runtimeKindFromString, type RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

/** The agent runtime a patch names (autobyteus-348); a missing or unknown one is refused with the scope it was meant for. */
export const requiredRuntimeKind = (value: string | null | undefined, scopeAddress: string): RuntimeKind => {
  const runtimeKind = runtimeKindFromString(value);
  if (!runtimeKind) throw new Error(`The setting for scope '${scopeAddress}' must name its agent runtime (runtimeKind).`);
  return runtimeKind;
};

@ObjectType()
export class RunModelConfigEditabilityObject {
  @Field(() => Boolean)
  editable!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;

}

@ObjectType()
export class RunModelConfigFieldErrorObject {
  @Field(() => String)
  path!: string;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class RunModelSelectionObject {
  /** The agent runtime of the selection (a stopped Agent run can switch it). */
  @Field(() => String)
  runtimeKind!: string;
  @Field(() => String)
  llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig!: Readonly<Record<string, unknown>> | null;
}
@ObjectType()
export class RunModelOptionObject {
  @Field(() => String)
  llmModelIdentifier!: string;
  @Field(() => String) providerName!: string;
  @Field(() => String) displayName!: string;
  @Field(() => String) canonicalName!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => GraphQLJSON, { nullable: true }) configSchema!: Record<string, unknown> | null;
  @Field(() => Boolean) recommended!: boolean;
}
@ObjectType()
export class RunModelOptionsObject {
  @Field(() => String)
  currentModelIdentifier!: string;
  /** False only when the runtime's model list could not be read; the options are then empty and `unavailableReason` says why. */
  @Field(() => Boolean)
  modelListReadable!: boolean;
  @Field(() => RunModelOptionObject, { nullable: true })
  currentModel!: RunModelOptionObject | null;
  @Field(() => [RunModelOptionObject])
  replacements!: readonly RunModelOptionObject[];
  @Field(() => String, { nullable: true })
  unavailableReason!: string | null;
}
@ObjectType()
export class TeamScopeModelOptionsObject extends RunModelOptionsObject {
  @Field(() => String)
  scopeKind!: string;
  @Field(() => String)
  scopeAddress!: string;
}
