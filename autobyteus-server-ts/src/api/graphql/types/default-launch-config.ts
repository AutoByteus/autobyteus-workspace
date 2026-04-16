import { Field, InputType, ObjectType } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import type { DefaultLaunchConfig } from "../../../launch-preferences/default-launch-config.js";

@ObjectType("DefaultLaunchConfig")
export class GraphqlDefaultLaunchConfig {
  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

@InputType("DefaultLaunchConfigInput")
export class GraphqlDefaultLaunchConfigInput {
  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;
}

export const toGraphqlDefaultLaunchConfig = (
  value: DefaultLaunchConfig | null | undefined,
): GraphqlDefaultLaunchConfig | null => {
  if (!value) {
    return null;
  }

  return {
    llmModelIdentifier: value.llmModelIdentifier ?? null,
    runtimeKind: value.runtimeKind ?? null,
    llmConfig: value.llmConfig ?? null,
  };
};

export const toDomainDefaultLaunchConfig = (
  value: GraphqlDefaultLaunchConfigInput | null | undefined,
): DefaultLaunchConfig | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  return {
    llmModelIdentifier: value.llmModelIdentifier ?? null,
    runtimeKind: value.runtimeKind ?? null,
    llmConfig: value.llmConfig ?? null,
  };
};
