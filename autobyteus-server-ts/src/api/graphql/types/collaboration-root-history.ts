import { Field, ObjectType, Query, Resolver, createUnionType } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getStudioCollaborationRootHistoryService } from "../studio-application-api-services.js";

@ObjectType()
class AgentTeamRootHistoryObject {
  @Field(() => String) root_subject_kind!: "agent_team";
  @Field(() => String) root_run_id!: string;
  @Field(() => String) created_at!: string;
  @Field(() => String, { nullable: true }) archived_at!: string | null;
  @Field(() => Boolean) is_active!: boolean;
  @Field(() => String) summary!: string;
  @Field(() => GraphQLJSON) team!: unknown;
}

@ObjectType()
class AgentOrgRootHistoryObject {
  @Field(() => String) root_subject_kind!: "agent_org";
  @Field(() => String) root_run_id!: string;
  @Field(() => String) created_at!: string;
  @Field(() => String, { nullable: true }) archived_at!: string | null;
  @Field(() => Boolean) is_active!: boolean;
  @Field(() => String) summary!: string;
  @Field(() => GraphQLJSON) org!: unknown;
}

const CollaborationRootHistoryUnion = createUnionType({
  name: "CollaborationRootHistoryItem",
  types: () => [AgentTeamRootHistoryObject, AgentOrgRootHistoryObject] as const,
  resolveType: (value) => value.root_subject_kind === "agent_org" ? AgentOrgRootHistoryObject : AgentTeamRootHistoryObject,
});

@Resolver()
export class CollaborationRootHistoryResolver {
  private readonly service = getStudioCollaborationRootHistoryService();
  @Query(() => [CollaborationRootHistoryUnion])
  listCollaborationRootHistory() { return this.service.list(); }
}
