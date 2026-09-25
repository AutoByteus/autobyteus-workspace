import { GraphQLJSON } from "graphql-scalars";
import { Field, ObjectType } from "type-graphql";

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
  @Field(() => String)
  llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig!: Readonly<Record<string, unknown>> | null;
}
@ObjectType()
export class RunModelOptionObject {
  @Field(() => String)
  llmModelIdentifier!: string;
}
@ObjectType()
export class RunModelOptionsObject {
  @Field(() => String)
  currentModelIdentifier!: string;
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
