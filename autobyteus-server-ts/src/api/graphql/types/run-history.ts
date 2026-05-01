import {
  Arg,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { getAgentRunHistoryService } from "../../../run-history/services/agent-run-history-service.js";
import { getAgentRunViewProjectionService } from "../../../run-history/services/agent-run-view-projection-service.js";
import { getAgentRunResumeConfigService } from "../../../run-history/services/agent-run-resume-config-service.js";
import { getWorkspaceRunHistoryService } from "../../../run-history/services/workspace-run-history-service.js";

@ObjectType()
class RunHistoryItemObject {
  @Field(() => String)
  runId!: string;

  @Field(() => String)
  summary!: string;

  @Field(() => String)
  lastActivityAt!: string;

  @Field(() => String)
  lastKnownStatus!: string;

  @Field(() => Boolean)
  isActive!: boolean;
}

@ObjectType()
class RunHistoryAgentGroupObject {
  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  agentName!: string;

  @Field(() => [RunHistoryItemObject])
  runs!: RunHistoryItemObject[];
}

@ObjectType("WorkspaceHistoryTeamRunMemberObject")
class WorkspaceHistoryTeamRunMemberObject {
  @Field(() => String)
  memberRouteKey!: string;

  @Field(() => String)
  memberName!: string;

  @Field(() => String)
  memberRunId!: string;

  @Field(() => String)
  runtimeKind!: string;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;
}

@ObjectType("WorkspaceHistoryTeamRunItemObject")
class WorkspaceHistoryTeamRunItemObject {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => String)
  coordinatorMemberRouteKey!: string;

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

  @Field(() => [WorkspaceHistoryTeamRunMemberObject])
  members!: WorkspaceHistoryTeamRunMemberObject[];
}

@ObjectType("WorkspaceHistoryTeamDefinitionObject")
class WorkspaceHistoryTeamDefinitionObject {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String)
  teamDefinitionName!: string;

  @Field(() => [WorkspaceHistoryTeamRunItemObject])
  runs!: WorkspaceHistoryTeamRunItemObject[];
}

@ObjectType()
class WorkspaceRunHistoryGroupObject {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  workspaceName!: string;

  @Field(() => [RunHistoryAgentGroupObject])
  agentDefinitions!: RunHistoryAgentGroupObject[];

  @Field(() => [WorkspaceHistoryTeamDefinitionObject])
  teamDefinitions!: WorkspaceHistoryTeamDefinitionObject[];
}

@ObjectType()
class RunProjectionPayload {
  @Field(() => String)
  runId!: string;

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
class RunEditableFieldFlagsObject {
  @Field(() => Boolean)
  llmModelIdentifier!: boolean;

  @Field(() => Boolean)
  llmConfig!: boolean;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => Boolean)
  skillAccessMode!: boolean;

  @Field(() => Boolean)
  workspaceRootPath!: boolean;

  @Field(() => Boolean)
  runtimeKind!: boolean;
}

@ObjectType()
class RunRuntimeReferenceObject {
  @Field(() => String)
  runtimeKind!: string;

  @Field(() => String, { nullable: true })
  sessionId?: string | null;

  @Field(() => String, { nullable: true })
  threadId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

@ObjectType()
class RunMetadataConfigObject {
  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;

  @Field(() => String)
  runtimeKind!: string;

  @Field(() => RunRuntimeReferenceObject)
  runtimeReference!: RunRuntimeReferenceObject;
}

@ObjectType()
class RunResumeConfigPayload {
  @Field(() => String)
  runId!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => RunMetadataConfigObject)
  metadataConfig!: RunMetadataConfigObject;

  @Field(() => RunEditableFieldFlagsObject)
  editableFields!: RunEditableFieldFlagsObject;
}

@ObjectType()
class DeleteStoredRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@ObjectType()
class ArchiveStoredRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class RunHistoryResolver {
  private agentRunHistoryService = getAgentRunHistoryService();
  private workspaceRunHistoryService = getWorkspaceRunHistoryService();
  private agentRunProjectionService = getAgentRunViewProjectionService();
  private agentRunResumeConfigService = getAgentRunResumeConfigService();

  @Query(() => [WorkspaceRunHistoryGroupObject])
  async listWorkspaceRunHistory(
    @Arg("limitPerAgent", () => Int, { defaultValue: 6 }) limitPerAgent = 6,
  ): Promise<WorkspaceRunHistoryGroupObject[]> {
    return this.workspaceRunHistoryService.listWorkspaceRunHistory(limitPerAgent);
  }

  @Query(() => RunProjectionPayload)
  async getRunProjection(
    @Arg("runId", () => String) runId: string,
  ): Promise<RunProjectionPayload> {
    return this.agentRunProjectionService.getProjection(runId);
  }

  @Query(() => RunResumeConfigPayload)
  async getAgentRunResumeConfig(
    @Arg("runId", () => String) runId: string,
  ): Promise<RunResumeConfigPayload> {
    return this.agentRunResumeConfigService.getAgentRunResumeConfig(runId);
  }

  @Mutation(() => DeleteStoredRunMutationResult)
  async deleteStoredRun(
    @Arg("runId", () => String) runId: string,
  ): Promise<DeleteStoredRunMutationResult> {
    try {
      return await this.agentRunHistoryService.deleteStoredRun(runId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }

  @Mutation(() => ArchiveStoredRunMutationResult)
  async archiveStoredRun(
    @Arg("runId", () => String) runId: string,
  ): Promise<ArchiveStoredRunMutationResult> {
    try {
      return await this.agentRunHistoryService.archiveStoredRun(runId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }
}
