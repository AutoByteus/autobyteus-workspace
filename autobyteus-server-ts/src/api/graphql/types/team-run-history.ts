import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { getTeamMemberRunProjectionService } from "../../../run-history/services/team-member-run-projection-service.js";

@ObjectType()
class TeamRunMemberHistoryObject {
  @Field(() => String)
  memberRouteKey!: string;

  @Field(() => String)
  memberName!: string;

  @Field(() => String)
  memberRunId!: string;

  @Field(() => String)
  runtimeKind!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  runtimeReference?: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;
}

@ObjectType()
class TeamRunHistoryItemObject {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String)
  summary!: string;

  @Field(() => String)
  lastActivityAt!: string;

  @Field(() => String)
  lastKnownStatus!: string;

  @Field(() => String)
  deleteLifecycle!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => [TeamRunMemberHistoryObject])
  members!: TeamRunMemberHistoryObject[];
}

@ObjectType()
class TeamRunResumeConfigPayload {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => GraphQLJSON)
  manifest!: unknown;
}

@ObjectType()
class TeamMemberRunProjectionPayload {
  @Field(() => String)
  agentRunId!: string;

  @Field(() => [GraphQLJSON])
  conversation!: Array<Record<string, unknown>>;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  lastActivityAt?: string | null;
}

@ObjectType()
class DeleteTeamRunHistoryMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class TeamRunHistoryResolver {
  private teamRunHistoryService = getTeamRunHistoryService();
  private teamMemberRunProjectionService = getTeamMemberRunProjectionService();

  @Query(() => [TeamRunHistoryItemObject])
  async listTeamRunHistory(): Promise<TeamRunHistoryItemObject[]> {
    const rows = await this.teamRunHistoryService.listTeamRunHistory();
    return rows.map((row) => ({
      teamRunId: row.teamRunId,
      teamDefinitionId: row.teamDefinitionId,
      teamDefinitionName: row.teamDefinitionName,
      workspaceRootPath: row.workspaceRootPath,
      summary: row.summary,
      lastActivityAt: row.lastActivityAt,
      lastKnownStatus: row.lastKnownStatus,
      deleteLifecycle: row.deleteLifecycle,
      isActive: row.isActive,
      members: row.members.map((member) => ({
        ...member,
        runtimeReference:
          (member.runtimeReference as unknown as Record<string, unknown> | null | undefined) ?? null,
      })),
    }));
  }

  @Query(() => TeamRunResumeConfigPayload)
  async getTeamRunResumeConfig(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TeamRunResumeConfigPayload> {
    const config = await this.teamRunHistoryService.getTeamRunResumeConfig(teamRunId);
    return {
      teamRunId: config.teamRunId,
      isActive: config.isActive,
      manifest: config.manifest,
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
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
    };
  }

  @Mutation(() => DeleteTeamRunHistoryMutationResult)
  async deleteTeamRunHistory(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<DeleteTeamRunHistoryMutationResult> {
    try {
      return await this.teamRunHistoryService.deleteTeamRunHistory(teamRunId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }
}
