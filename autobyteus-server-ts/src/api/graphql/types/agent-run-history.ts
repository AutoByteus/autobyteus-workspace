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
import { AgentUserInput } from "./agent-user-input.js";
import { getRunContinuationService } from "../../../run-history/services/run-continuation-service.js";
import { getRunHistoryService } from "../../../run-history/services/run-history-service.js";
import { getRunProjectionService } from "../../../run-history/services/run-projection-service.js";

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

@ObjectType()
class RunHistoryWorkspaceGroupObject {
  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  workspaceName!: string;

  @Field(() => [RunHistoryAgentGroupObject])
  agents!: RunHistoryAgentGroupObject[];
}

@ObjectType()
class RunProjectionPayload {
  @Field(() => String)
  runId!: string;

  @Field(() => [GraphQLJSON])
  conversation!: Array<Record<string, unknown>>;

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
}

@ObjectType()
class RunManifestConfigObject {
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
}

@ObjectType()
class RunResumeConfigPayload {
  @Field(() => String)
  runId!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => RunManifestConfigObject)
  manifestConfig!: RunManifestConfigObject;

  @Field(() => RunEditableFieldFlagsObject)
  editableFields!: RunEditableFieldFlagsObject;
}

@InputType()
class ContinueRunInput {
  @Field(() => AgentUserInput)
  userInput!: AgentUserInput;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => Boolean, { nullable: true })
  autoExecuteTools?: boolean | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;
}

@ObjectType()
class ContinueRunMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => [String])
  ignoredConfigFields!: string[];
}

@ObjectType()
class DeleteRunHistoryMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class AgentRunHistoryResolver {
  private runHistoryService = getRunHistoryService();
  private runProjectionService = getRunProjectionService();
  private runContinuationService = getRunContinuationService();

  @Query(() => [RunHistoryWorkspaceGroupObject])
  async listRunHistory(
    @Arg("limitPerAgent", () => Int, { defaultValue: 6 }) limitPerAgent = 6,
  ): Promise<RunHistoryWorkspaceGroupObject[]> {
    return this.runHistoryService.listRunHistory(limitPerAgent);
  }

  @Query(() => RunProjectionPayload)
  async getRunProjection(
    @Arg("runId", () => String) runId: string,
  ): Promise<RunProjectionPayload> {
    return this.runProjectionService.getProjection(runId);
  }

  @Query(() => RunResumeConfigPayload)
  async getRunResumeConfig(
    @Arg("runId", () => String) runId: string,
  ): Promise<RunResumeConfigPayload> {
    return this.runHistoryService.getRunResumeConfig(runId);
  }

  @Mutation(() => ContinueRunMutationResult)
  async continueRun(
    @Arg("input", () => ContinueRunInput) input: ContinueRunInput,
  ): Promise<ContinueRunMutationResult> {
    try {
      const result = await this.runContinuationService.continueRun(input);
      return {
        success: true,
        message: "Run continued successfully.",
        runId: result.runId,
        ignoredConfigFields: result.ignoredConfigFields,
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        runId: input.runId ?? null,
        ignoredConfigFields: [],
      };
    }
  }

  @Mutation(() => DeleteRunHistoryMutationResult)
  async deleteRunHistory(
    @Arg("runId", () => String) runId: string,
  ): Promise<DeleteRunHistoryMutationResult> {
    try {
      return await this.runHistoryService.deleteRunHistory(runId);
    } catch (error) {
      return {
        success: false,
        message: String(error),
      };
    }
  }
}
