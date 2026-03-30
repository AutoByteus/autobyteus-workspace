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
import { getTeamRunService } from "../../../agent-team-execution/services/team-run-service.js";

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
  memberName!: string;

  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode)
  skillAccessMode!: SkillAccessMode;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  memberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
}

@InputType()
export class CreateAgentTeamRunInput {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => [TeamMemberConfigInput])
  memberConfigs!: TeamMemberConfigInput[];
}

@Resolver()
export class AgentTeamRunResolver {
  private readonly teamRunService = getTeamRunService();

  @Mutation(() => CreateAgentTeamRunResult)
  async createAgentTeamRun(
    @Arg("input", () => CreateAgentTeamRunInput)
    input: CreateAgentTeamRunInput,
  ): Promise<CreateAgentTeamRunResult> {
    try {
      const run = await this.teamRunService.createTeamRun({
        teamDefinitionId: input.teamDefinitionId,
        memberConfigs: input.memberConfigs,
      });
      return {
        success: true,
        message: "Agent team run created successfully.",
        teamRunId: run.runId,
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
        teamRunId: run.runId,
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
}
