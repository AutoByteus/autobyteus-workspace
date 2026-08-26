import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  getStudioRunModelConfigService,
  getStudioTeamRunService,
} from "../studio-application-api-services.js";
import {
  RunModelConfigEditabilityObject,
  RunModelConfigFieldErrorObject,
} from "./run-model-config.js";
import { projectExecutionTree } from "../../../services/agent-streaming/team-execution-view-projector.js";

registerEnumType(SkillAccessMode, {
  name: "SkillAccessModeEnum",
});

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

@ObjectType()
export class CreateAgentTeamRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;
}

@ObjectType()
export class TerminateAgentTeamRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class RestoreAgentTeamRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;
}

@InputType()
export class TeamMemberConfigInput {
  @Field(() => String)
  memberAddress!: string;

  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode)
  skillAccessMode!: SkillAccessMode;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String)
  runtimeKind!: string;
}

@InputType()
export class TeamScopeLaunchConfigInput {
  @Field(() => String)
  teamAddress!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode)
  skillAccessMode!: SkillAccessMode;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String)
  runtimeKind!: string;
}

@InputType()
export class CreateAgentTeamRunInput {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => [TeamScopeLaunchConfigInput])
  teamConfigs!: TeamScopeLaunchConfigInput[];

  @Field(() => [TeamMemberConfigInput])
  memberConfigs!: TeamMemberConfigInput[];
}

@InputType()
export class TeamRunModelConfigPatchInput {
  @Field(() => String)
  scopeKind!: "CONFIGURED_TEAM" | "CONFIGURED_AGENT";

  @Field(() => String)
  scopeAddress!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig!: Record<string, unknown> | null;
}

@InputType()
export class UpdateStoppedTeamRunModelConfigsInput {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => [TeamRunModelConfigPatchInput])
  patches!: TeamRunModelConfigPatchInput[];
}

@ObjectType()
export class UpdateStoppedTeamRunModelConfigsResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  outcome!: string;

  @Field(() => String)
  message!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => RunModelConfigEditabilityObject)
  editability!: RunModelConfigEditabilityObject;

  @Field(() => GraphQLJSON, { nullable: true })
  canonicalExecutionTree?: unknown | null;

  @Field(() => [RunModelConfigFieldErrorObject])
  fieldErrors!: RunModelConfigFieldErrorObject[];
}

@Resolver()
export class AgentTeamRunResolver {
  private readonly teamRunService = getStudioTeamRunService();
  private readonly runModelConfigService = getStudioRunModelConfigService();

  @Mutation(() => CreateAgentTeamRunResult)
  async createAgentTeamRun(
    @Arg("input", () => CreateAgentTeamRunInput)
    input: CreateAgentTeamRunInput,
  ): Promise<CreateAgentTeamRunResult> {
    try {
      const run = await this.teamRunService.createTeamRun({
        teamDefinitionId: input.teamDefinitionId,
        teamConfigs: input.teamConfigs,
        memberConfigs: input.memberConfigs,
      });
      return {
        success: true,
        message: "Agent team run created successfully.",
        teamRunId: run.teamRunId,
      };
    } catch (error) {
      logger.error(`Error creating agent team run: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => TerminateAgentTeamRunResult)
  async terminateAgentTeamRun(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TerminateAgentTeamRunResult> {
    try {
      const success = await this.teamRunService.terminateTeamRun(teamRunId);
      return {
        success,
        message: success
          ? "Agent team run terminated successfully."
          : "Agent team run not found.",
      };
    } catch (error) {
      logger.error(`Error terminating agent team run with ID ${teamRunId}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => RestoreAgentTeamRunResult)
  async restoreAgentTeamRun(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<RestoreAgentTeamRunResult> {
    try {
      const run = await this.teamRunService.restoreTeamRun(teamRunId);
      return {
        success: true,
        message: "Agent team run restored successfully.",
        teamRunId: run.teamRunId,
      };
    } catch (error) {
      logger.error(`Error restoring agent team run with ID ${teamRunId}: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        teamRunId: null,
      };
    }
  }

  @Mutation(() => UpdateStoppedTeamRunModelConfigsResult)
  async updateStoppedTeamRunModelConfigs(
    @Arg("input", () => UpdateStoppedTeamRunModelConfigsInput)
    input: UpdateStoppedTeamRunModelConfigsInput,
  ): Promise<UpdateStoppedTeamRunModelConfigsResult> {
    try {
      if (input.patches.some((patch) => !Object.hasOwn(patch, "llmConfig"))) {
        throw new Error("Every Team patch must contain llmConfig and it may be null.");
      }
      const result = await this.runModelConfigService.updateStoppedTeamRunModelConfigs({
        teamRunId: input.teamRunId,
        patches: input.patches,
      });
      return {
        success: result.success,
        outcome: result.outcome,
        message: result.message,
        isActive: result.isActive,
        editability: result.editability,
        canonicalExecutionTree: result.canonical ? projectExecutionTree(result.canonical) : null,
        fieldErrors: [...result.fieldErrors],
      };
    } catch (error) {
      console.error("Stopped Team model-config update failed unexpectedly.", error);
      return {
        success: false,
        outcome: "INTERNAL_ERROR",
        message: "Team model settings could not be updated.",
        isActive: false,
        editability: { editable: false, reason: "INTERNAL_ERROR" },
        canonicalExecutionTree: null,
        fieldErrors: [],
      };
    }
  }
}
