import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { getTeamMemberRunViewProjectionService } from "../../../run-history/services/team-member-run-view-projection-service.js";
import { EventMonitorActiveTracePageObject } from "./event-monitor-active-trace-page.js";
import { RunFileChangeEntryObject } from "./run-file-changes.js";
import { projectExecutionTree } from "../../../services/agent-streaming/team-execution-view-projector.js";
import { remoteTaskExecutionDtos } from "../../../services/agent-streaming/remote-task-execution-dto-projection.js";
import { getAgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import { RunModelConfigEditabilityObject } from "./run-model-config.js";
import { getStudioRunModelConfigService } from "../studio-application-api-services.js";

@ObjectType()
class TeamRunResumeConfigPayload {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => GraphQLJSON)
  executionTree!: unknown;

  /** `{ agentRunId } | { teamRunId }` of each task execution in `executionTree` whose Task is DONE or CANCELLED. */
  @Field(() => GraphQLJSON)
  closedTaskExecutions!: unknown;

  /** autobyteus-278: the runs this Team delegated to other nodes, with their node's name, as its stream snapshot lists them. */
  @Field(() => GraphQLJSON)
  remoteTaskExecutions!: unknown;

  @Field(() => RunModelConfigEditabilityObject)
  modelConfigEditability!: RunModelConfigEditabilityObject;
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

  @Field(() => Boolean)
  hasEarlierActiveTraceEvents!: boolean;
}

@ObjectType()
class TeamRunExecutionCheckpointPayload {
  @Field(() => String)
  rootTeamRunId!: string;

  @Field(() => Int)
  changeSequence!: number;

  @Field(() => Boolean)
  hasOpenExecutionWork!: boolean;
}

@ObjectType()
class DeleteStoredTeamRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@ObjectType()
class ArchiveStoredTeamRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class TeamRunHistoryResolver {
  private teamRunHistoryService = getTeamRunHistoryService();
  private teamMemberRunProjectionService = getTeamMemberRunViewProjectionService();
  private runModelConfigService = getStudioRunModelConfigService();

  @Query(() => TeamRunResumeConfigPayload)
  async getTeamRunResumeConfig(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TeamRunResumeConfigPayload> {
    const config = await this.runModelConfigService.getTeamRunResumeConfig(teamRunId);
    return {
      teamRunId: config.teamRunId,
      isActive: config.isActive,
      executionTree: projectExecutionTree(config.executionTree),
      closedTaskExecutions: config.closedTaskExecutions,
      remoteTaskExecutions: await remoteTaskExecutionDtos(config.executionTree.rootTeam.remoteTaskExecutions),
      modelConfigEditability: config.modelConfigEditability,
    };
  }

  @Query(() => TeamMemberRunProjectionPayload)
  async getTeamMemberRunProjection(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<TeamMemberRunProjectionPayload> {
    const projection = await this.teamMemberRunProjectionService.getProjection(teamRunId, agentRunId);
    return {
      agentRunId: projection.agentRunId,
      conversation: projection.conversation,
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  /** One team member's artifact list, located inside the named team run only (live while it runs). */
  @Query(() => [RunFileChangeEntryObject])
  async getTeamMemberFileChanges(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<RunFileChangeEntryObject[]> {
    return this.teamMemberRunProjectionService.getFileChanges(teamRunId, agentRunId);
  }

  @Query(() => TeamRunExecutionCheckpointPayload)
  getTeamRunExecutionCheckpoint(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): TeamRunExecutionCheckpointPayload {
    const root = getAgentTeamRunManager().getActiveTeamRun(teamRunId);
    if (!root) throw new Error(`Active RootTeamRun '${teamRunId}' was not found.`);
    return root.getExecutionCheckpoint();
  }

  @Query(() => EventMonitorActiveTracePageObject)
  async getTeamMemberEventMonitorActiveTracePage(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("beforeCursor", () => String, { nullable: true }) beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePageObject> {
    return this.teamMemberRunProjectionService.getActiveTracePage(teamRunId, agentRunId, beforeCursor);
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

  @Mutation(() => ArchiveStoredTeamRunMutationResult)
  async archiveStoredTeamRun(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<ArchiveStoredTeamRunMutationResult> {
    try {
      return await this.teamRunHistoryService.archiveStoredTeamRun(teamRunId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }
}
