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
import { TeamRunMutationService } from "../services/team-run-mutation-service.js";
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
  memberRunId?: string | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
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
  targetNodeName?: string | null;

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
  private readonly mutationService = new TeamRunMutationService();

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
    return this.mutationService.createAgentTeamRun(input);
  }

  @Mutation(() => TerminateAgentTeamRunResult)
  async terminateAgentTeamRun(
    @Arg("id", () => String) id: string,
  ): Promise<TerminateAgentTeamRunResult> {
    return this.mutationService.terminateAgentTeamRun(id);
  }

  @Mutation(() => SendMessageToTeamResult)
  async sendMessageToTeam(
    @Arg("input", () => SendMessageToTeamInput) input: SendMessageToTeamInput,
  ): Promise<SendMessageToTeamResult> {
    return this.mutationService.sendMessageToTeam(input);
  }
}
