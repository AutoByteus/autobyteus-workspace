import { Arg, Field, ObjectType, Query, Resolver, createUnionType } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getStudioCollaborationRootHistoryService, getStudioRunViewChildren } from "../studio-application-api-services.js";
import { createAgentOrgRootExecutionIdentity } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationRootHistoryItem } from "../../../run-history/services/collaboration-root-history-service.js";

@ObjectType()
class AgentTeamRootHistoryObject {
  @Field(() => String) root_subject_kind!: "agent_team";
  @Field(() => String) root_run_id!: string;
  @Field(() => String) created_at!: string;
  /** Newest memory file of any agent of the run; `created_at` before any (workspace-tree-vs-chooser DS-005). */
  @Field(() => String) last_activity_at!: string;
  @Field(() => String, { nullable: true }) archived_at!: string | null;
  @Field(() => Boolean) is_active!: boolean;
  @Field(() => String) summary!: string;
  @Field(() => GraphQLJSON) team!: unknown;
}

@ObjectType()
export class AgentOrgRootHistoryObject {
  @Field(() => String) root_subject_kind!: "agent_org";
  @Field(() => String) root_run_id!: string;
  @Field(() => String) created_at!: string;
  /** Newest memory file of any agent of the run; `created_at` before any (workspace-tree-vs-chooser DS-005). */
  @Field(() => String) last_activity_at!: string;
  @Field(() => String, { nullable: true }) archived_at!: string | null;
  @Field(() => Boolean) is_active!: boolean;
  @Field(() => String) summary!: string;
  @Field(() => GraphQLJSON) org!: unknown;
  /** The runs it delegated to whose Tasks are all closed while they still run (base's closed set, SR-061 rule 1). */
  @Field(() => GraphQLJSON) closed_task_executions!: unknown;
}

/**
 * An Org history item with its rows (SR-061 rule 1): its delegated runs placed in its tree, and its closed set, from the
 * run's collaboration tree, as its view gives them.
 */
const withRows = async (item: CollaborationRootHistoryItem) => {
  if (item.root_subject_kind !== "agent_org") return item;
  const { rows } = await getStudioRunViewChildren().read(createAgentOrgRootExecutionIdentity(item.root_run_id));
  return { ...item, org: { ...item.org, rootOrg: { ...item.org.rootOrg, taskExecutions: rows.taskExecutions } },
    closed_task_executions: rows.closedTaskExecutions };
};

const CollaborationRootHistoryUnion = createUnionType({
  name: "CollaborationRootHistoryItem",
  types: () => [AgentTeamRootHistoryObject, AgentOrgRootHistoryObject] as const,
  resolveType: (value) => value.root_subject_kind === "agent_org" ? AgentOrgRootHistoryObject : AgentTeamRootHistoryObject,
});

@Resolver()
export class CollaborationRootHistoryResolver {
  private readonly service = getStudioCollaborationRootHistoryService();
  @Query(() => [CollaborationRootHistoryUnion])
  async listCollaborationRootHistory() { return Promise.all((await this.service.list()).map(withRows)); }
  @Query(() => AgentOrgRootHistoryObject, { nullable: true })
  async getAgentOrgRootHistory(@Arg("orgRunId", () => String) orgRunId: string) {
    const item = await this.service.getAgentOrg(orgRunId);
    return item ? withRows(item) : null;
  }
}
