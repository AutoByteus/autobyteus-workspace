import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { TaskNotificationMode } from "autobyteus-ts/agent-team/task-notification/task-notification-mode.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRuntimeBootstrapApplicationService } from "../../../agent-team-execution/services/team-runtime-bootstrap-application-service.js";
import {
  getDefaultTeamCommandIngressService,
} from "../../../distributed/bootstrap/default-distributed-runtime-composition.js";
import { getTeamRunContinuationService } from "../../../run-history/services/team-run-continuation-service.js";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { UserInputConverter } from "../converters/user-input-converter.js";
import { AgentTeamRunConverter } from "../converters/agent-team-run-converter.js";
import { AgentUserInput } from "./agent-user-input.js";

registerEnumType(TaskNotificationMode, {
  name: "TaskNotificationModeEnum",
});

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

@ObjectType()
export class AgentTeamRun {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  currentStatus!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;
}

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

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  memberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  memberAgentId?: string | null;

  @Field(() => String, { nullable: true })
  memoryDir?: string | null;

  @Field(() => String, { nullable: true })
  hostNodeId?: string | null;
}

@InputType()
export class CreateAgentTeamRunInput {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => [TeamMemberConfigInput])
  memberConfigs!: TeamMemberConfigInput[];

  @Field(() => TaskNotificationMode, { nullable: true })
  taskNotificationMode?: TaskNotificationMode | null;

  @Field(() => Boolean, { nullable: true })
  useXmlToolFormat?: boolean | null;
}

@InputType()
export class SendMessageToTeamInput {
  @Field(() => AgentUserInput)
  userInput!: AgentUserInput;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;

  @Field(() => String, { nullable: true })
  targetMemberName?: string | null;

  @Field(() => String, { nullable: true })
  teamDefinitionId?: string | null;

  @Field(() => [TeamMemberConfigInput], { nullable: true })
  memberConfigs?: TeamMemberConfigInput[] | null;

  @Field(() => TaskNotificationMode, { nullable: true })
  taskNotificationMode?: TaskNotificationMode | null;

  @Field(() => Boolean, { nullable: true })
  useXmlToolFormat?: boolean | null;
}

@ObjectType()
export class SendMessageToTeamResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;
}

@Resolver()
export class AgentTeamRunResolver {
  private readonly teamRunHistoryService = getTeamRunHistoryService();
  private readonly teamRunContinuationService = getTeamRunContinuationService();
  private readonly teamRuntimeBootstrapService = TeamRuntimeBootstrapApplicationService.getInstance();

  private get agentTeamRunManager(): AgentTeamRunManager {
    return AgentTeamRunManager.getInstance();
  }

  @Query(() => AgentTeamRun, { nullable: true })
  agentTeamRun(@Arg("id", () => String) id: string): AgentTeamRun | null {
    try {
      const domainTeam = this.agentTeamRunManager.getTeamRun(id);
      if (!domainTeam) {
        return null;
      }
      return AgentTeamRunConverter.toGraphql(domainTeam as any);
    } catch (error) {
      logger.error(`Error fetching agent team run by ID ${id}: ${String(error)}`);
      throw new Error("Unable to fetch agent team run at this time.");
    }
  }

  @Query(() => [AgentTeamRun])
  agentTeamRuns(): AgentTeamRun[] {
    try {
      const runIds = this.agentTeamRunManager.listActiveRuns();
      const results: AgentTeamRun[] = [];
      for (const runId of runIds) {
        const domainTeam = this.agentTeamRunManager.getTeamRun(runId);
        if (domainTeam) {
          results.push(AgentTeamRunConverter.toGraphql(domainTeam as any));
        }
      }
      return results;
    } catch (error) {
      logger.error(`Error fetching all agent team runs: ${String(error)}`);
      throw new Error("Unable to fetch agent team runs at this time.");
    }
  }

  @Mutation(() => CreateAgentTeamRunResult)
  async createAgentTeamRun(
    @Arg("input", () => CreateAgentTeamRunInput)
    input: CreateAgentTeamRunInput,
  ): Promise<CreateAgentTeamRunResult> {
    try {
      const prepared = await this.teamRuntimeBootstrapService.prepareTeamRuntimeBootstrap({
        teamDefinitionId: input.teamDefinitionId,
        memberConfigs: input.memberConfigs,
      });
      await this.agentTeamRunManager.createTeamRunWithId(
        prepared.teamId,
        prepared.teamDefinitionId,
        prepared.resolvedMemberConfigs,
      );
      try {
        await this.teamRunHistoryService.upsertTeamRunHistoryRow({
          teamRunId: prepared.teamId,
          manifest: prepared.manifest,
          summary: "",
          lastKnownStatus: "IDLE",
        });
      } catch (historyError) {
        logger.warn(
          `Failed to upsert team run history for '${prepared.teamId}' during createAgentTeamRun: ${String(historyError)}`,
        );
      }
      return {
        success: true,
        message: "Agent team run created successfully.",
        teamRunId: prepared.teamId,
      };
    } catch (error) {
      logger.error(`Error creating agent team run: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => TerminateAgentTeamRunResult)
  async terminateAgentTeamRun(
    @Arg("id", () => String) id: string,
  ): Promise<TerminateAgentTeamRunResult> {
    try {
      let success = false;
      let message = "Agent team run not found.";
      const ingress = getDefaultTeamCommandIngressService();
      const stopResult = await ingress.dispatchControlStop(id);
      if (stopResult.accepted) {
        success = await this.agentTeamRunManager.terminateTeamRun(id);
        message = success
          ? "Agent team run terminated successfully."
          : "Agent team run not found.";
      } else {
        success = false;
        message = stopResult.errorMessage ?? "Failed to terminate distributed team run.";
      }

      if (success) {
        try {
          await this.teamRunHistoryService.onTeamTerminated(id);
        } catch (historyError) {
          logger.warn(`Failed to mark team run '${id}' terminated in history: ${String(historyError)}`);
        }
      }
      return {
        success,
        message,
      };
    } catch (error) {
      logger.error(`Error terminating agent team run with ID ${id}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => SendMessageToTeamResult)
  async sendMessageToTeam(
    @Arg("input", () => SendMessageToTeamInput) input: SendMessageToTeamInput,
  ): Promise<SendMessageToTeamResult> {
    try {
      let teamRunId = input.teamRunId ?? null;

      if (teamRunId && !input.teamDefinitionId && !input.memberConfigs) {
        await this.teamRunContinuationService.continueTeamRun({
          teamRunId,
          targetMemberRouteKey: input.targetMemberName ?? null,
          userInput: input.userInput,
        });
        return {
          success: true,
          message: "Message sent to team successfully.",
          teamRunId,
        };
      }

      if (!teamRunId) {
        logger.info("sendMessageToTeam: teamRunId not provided. Attempting lazy creation.");
        if (!input.teamDefinitionId || !input.memberConfigs) {
          throw new Error("teamDefinitionId and memberConfigs are required for lazy team creation.");
        }

        const prepared = await this.teamRuntimeBootstrapService.prepareTeamRuntimeBootstrap({
          teamDefinitionId: input.teamDefinitionId,
          memberConfigs: input.memberConfigs,
        });
        teamRunId = prepared.teamId;
        await this.agentTeamRunManager.createTeamRunWithId(
          prepared.teamId,
          prepared.teamDefinitionId,
          prepared.resolvedMemberConfigs,
        );
        try {
          await this.teamRunHistoryService.upsertTeamRunHistoryRow({
            teamRunId: prepared.teamId,
            manifest: prepared.manifest,
            summary: "",
            lastKnownStatus: "IDLE",
          });
        } catch (historyError) {
          logger.warn(
            `Failed to upsert team run history for '${prepared.teamId}' during lazy create: ${String(historyError)}`,
          );
        }
        logger.info(`Lazy creation successful. New team run ID: ${prepared.teamId}`);
      }

      if (!teamRunId) {
        throw new Error("Team run ID could not be resolved for sendMessageToTeam.");
      }
      const userMessage = UserInputConverter.toAgentInputUserMessage(input.userInput);
      await getDefaultTeamCommandIngressService().dispatchUserMessage({
        teamId: teamRunId,
        userMessage,
        targetMemberName: input.targetMemberName ?? null,
      });
      try {
        await this.teamRunHistoryService.onTeamEvent(teamRunId, {
          status: "ACTIVE",
          summary: input.userInput?.content ?? "",
        });
      } catch (historyError) {
        logger.warn(`Failed to record team run activity for '${teamRunId}': ${String(historyError)}`);
      }

      return {
        success: true,
        message: "Message sent to team successfully.",
        teamRunId,
      };
    } catch (error) {
      logger.error(`Error sending message to team: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        teamRunId: input.teamRunId ?? null,
      };
    }
  }
}
