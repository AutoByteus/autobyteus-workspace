import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { getTeamMemberRunViewProjectionService } from "../../../run-history/services/team-member-run-view-projection-service.js";

@ObjectType()
class TeamRunResumeConfigPayload {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => GraphQLJSON)
  metadata!: unknown;
}

@ObjectType()
class TeamMemberRunProjectionPayload {
  @Field(() => String)
  agentRunId!: string;

  @Field(() => [GraphQLJSON])
  conversation!: unknown[];

  @Field(() => [GraphQLJSON])
  activities!: unknown[];

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  lastActivityAt?: string | null;
}

@ObjectType()
class DeleteStoredTeamRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class TeamRunHistoryResolver {
  private teamRunHistoryService = getTeamRunHistoryService();
  private teamMemberRunProjectionService = getTeamMemberRunViewProjectionService();

  @Query(() => TeamRunResumeConfigPayload)
  async getTeamRunResumeConfig(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TeamRunResumeConfigPayload> {
    const config = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
    return {
      teamRunId: config.teamRunId,
      isActive: config.isActive,
      metadata: config.metadata,
    };
  }

  @Query(() => TeamMemberRunProjectionPayload)
  async getTeamMemberRunProjection(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("memberRouteKey", () => String) memberRouteKey: string,
  ): Promise<TeamMemberRunProjectionPayload> {
    const projection = await this.teamMemberRunProjectionService.getProjection(teamRunId, memberRouteKey);
    return {
      agentRunId: projection.agentRunId,
      conversation: projection.conversation,
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
    };
  }

  @Mutation(() => DeleteStoredTeamRunMutationResult)
  async deleteStoredTeamRun(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<DeleteStoredTeamRunMutationResult> {
    try {
      return await this.teamRunHistoryService.deleteStoredTeamRun(teamRunId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }
}
