import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLError } from "graphql";
import {
  ProjectRunHistoryError,
  ProjectRunHistoryService,
} from "../../../run-history/services/project-run-history-service.js";
import { RunHistoryAgentGroupObject, WorkspaceHistoryTeamDefinitionObject } from "./run-history.js";

@ObjectType({ description: "The runs started under one Project, grouped as a workspace's are." })
class ProjectRunHistoryObject {
  @Field(() => String) projectId!: string;
  @Field(() => [RunHistoryAgentGroupObject]) agentDefinitions!: RunHistoryAgentGroupObject[];
  @Field(() => [WorkspaceHistoryTeamDefinitionObject]) teamDefinitions!: WorkspaceHistoryTeamDefinitionObject[];
}

/** Transport only: `ProjectRunHistoryService` owns the listing and the cap rule. */
@Resolver()
export class ProjectRunHistoryResolver {
  private service: ProjectRunHistoryService | null = null;

  @Query(() => ProjectRunHistoryObject)
  async projectRunHistory(
    @Arg("projectId", () => String) projectId: string,
    @Arg("limitPerAgent", () => Int, { defaultValue: 6 }) limitPerAgent = 6,
  ): Promise<ProjectRunHistoryObject> {
    this.service ??= new ProjectRunHistoryService();
    try {
      return await this.service.projectRunHistory(projectId, limitPerAgent) as ProjectRunHistoryObject;
    } catch (error) {
      if (error instanceof ProjectRunHistoryError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
      throw error;
    }
  }
}
