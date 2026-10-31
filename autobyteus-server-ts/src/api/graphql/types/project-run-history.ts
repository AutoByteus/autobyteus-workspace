import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import {
  ProjectRunHistoryError,
  ProjectRunHistoryService,
} from "../../../run-history/services/project-run-history-service.js";
import { getStudioCollaborationRootHistoryService } from "../studio-application-api-services.js";
import { AgentOrgRootHistoryObject } from "./collaboration-root-history.js";
import { RunHistoryAgentGroupObject, WorkspaceHistoryTeamDefinitionObject } from "./run-history.js";

@ObjectType()
class ProjectRunExecutionObject {
  @Field(() => String, { nullable: true }) agentRunId?: string | null;
  @Field(() => String, { nullable: true }) teamRunId?: string | null;
}

@ObjectType({ description: "Which delegated copies of one listed root are listed under the Project." })
class ProjectRunScopeObject {
  @Field(() => String, { description: "AGENT, AGENT_TEAM or AGENT_ORG." }) rootKind!: string;
  @Field(() => String) rootRunId!: string;
  @Field(() => [ProjectRunExecutionObject]) executions!: ProjectRunExecutionObject[];
}

@ObjectType({ description: "The runs listed under one Project: started under it or hosting its Tasks' work." })
class ProjectRunHistoryObject {
  @Field(() => String) projectId!: string;
  @Field(() => [RunHistoryAgentGroupObject]) agentDefinitions!: RunHistoryAgentGroupObject[];
  @Field(() => [WorkspaceHistoryTeamDefinitionObject]) teamDefinitions!: WorkspaceHistoryTeamDefinitionObject[];
  @Field(() => [AgentOrgRootHistoryObject]) agentOrgRuns!: AgentOrgRootHistoryObject[];
  @Field(() => [ProjectRunScopeObject]) scopes!: ProjectRunScopeObject[];
}

/** Transport only: `ProjectRunHistoryService` owns the listing, the cap rule and the scopes. */
@Resolver()
export class ProjectRunHistoryResolver {
  private service: ProjectRunHistoryService | null = null;

  @Query(() => ProjectRunHistoryObject)
  async projectRunHistory(
    @Arg("projectId", () => String) projectId: string,
    @Arg("limitPerAgent", () => Int, { defaultValue: 6 }) limitPerAgent = 6,
  ): Promise<ProjectRunHistoryObject> {
    this.service ??= new ProjectRunHistoryService({ orgs: getStudioCollaborationRootHistoryService() });
    try {
      return await this.service.projectRunHistory(projectId, limitPerAgent) as unknown as ProjectRunHistoryObject;
    } catch (error) {
      if (error instanceof ProjectRunHistoryError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
      throw error;
    }
  }
}
