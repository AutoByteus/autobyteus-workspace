import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { getRunHistoryService } from "../../../run-history/services/run-history-service.js";
import { UserInputConverter } from "../converters/user-input-converter.js";
import { AgentRunConverter } from "../converters/agent-run-converter.js";
import { AgentUserInput } from "./agent-user-input.js";
import { WorkspaceInfo } from "./workspace.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

registerEnumType(SkillAccessMode, {
  name: "SkillAccessModeEnum",
});

@ObjectType()
export class AgentRun {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  currentStatus!: string;

  @Field(() => WorkspaceInfo, { nullable: true })
  workspace?: WorkspaceInfo | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;
}

@ObjectType()
export class TerminateAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@InputType()
export class SendAgentUserInputInput {
  @Field(() => AgentUserInput)
  userInput!: AgentUserInput;

  @Field(() => String, { nullable: true })
  agentRunId?: string | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId?: string | null;

  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => Boolean, { nullable: true })
  autoExecuteTools?: boolean | null;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => Boolean, { nullable: true })
  useXmlToolFormat?: boolean | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;
}

@ObjectType()
export class SendAgentUserInputResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  agentRunId?: string | null;
}

@InputType()
export class ApproveToolInvocationInput {
  @Field(() => String)
  agentRunId!: string;

  @Field(() => String)
  invocationId!: string;

  @Field(() => Boolean)
  isApproved!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;
}

@ObjectType()
export class ApproveToolInvocationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class AgentRunResolver {
  private runHistoryService = getRunHistoryService();

  private get agentRunManager(): AgentRunManager {
    return AgentRunManager.getInstance();
  }

  @Query(() => AgentRun, { nullable: true })
  async agentRun(@Arg("id", () => String) id: string): Promise<AgentRun | null> {
    try {
      const domainAgent = this.agentRunManager.getAgentRun(id);
      if (!domainAgent) {
        return null;
      }
      return await AgentRunConverter.toGraphql(domainAgent as any);
    } catch (error) {
      logger.error(`Error fetching agent run by ID ${id}: ${String(error)}`);
      throw new Error("Unable to fetch agent run at this time.");
    }
  }

  @Query(() => [AgentRun])
  async agentRuns(): Promise<AgentRun[]> {
    try {
      const runIds = this.agentRunManager.listActiveRuns();
      const results = await Promise.all(
        runIds.map(async (runId) => {
          const domainAgent = this.agentRunManager.getAgentRun(runId);
          if (!domainAgent) {
            return null;
          }
          return AgentRunConverter.toGraphql(domainAgent as any);
        }),
      );
      return results.filter((item): item is AgentRun => item !== null);
    } catch (error) {
      logger.error(`Error fetching all agent runs: ${String(error)}`);
      throw new Error("Unable to fetch agent runs at this time.");
    }
  }

  @Mutation(() => TerminateAgentRunResult)
  async terminateAgentRun(
    @Arg("id", () => String) id: string,
  ): Promise<TerminateAgentRunResult> {
    try {
      const success = await this.agentRunManager.terminateAgentRun(id);
      if (success) {
        await this.runHistoryService.onRunTerminated(id);
      }
      return {
        success,
        message: success
          ? "Agent run terminated successfully."
          : "Agent run not found.",
      };
    } catch (error) {
      logger.error(`Error terminating agent run with ID ${id}: ${String(error)}`);
      return {
        success: false,
        message: `Failed to terminate agent run: ${String(error)}`,
      };
    }
  }

  @Mutation(() => SendAgentUserInputResult)
  async sendAgentUserInput(
    @Arg("input", () => SendAgentUserInputInput) input: SendAgentUserInputInput,
  ): Promise<SendAgentUserInputResult> {
    try {
      let agentRunId = input.agentRunId ?? null;
      let agent = agentRunId ? this.agentRunManager.getAgentRun(agentRunId) : null;

      if (agentRunId && !agent) {
        logger.warn(`sendAgentUserInput: Agent run with ID '${agentRunId}' not found.`);
        return {
          success: false,
          message: `Agent run with ID '${agentRunId}' not found.`,
          agentRunId: null,
        };
      }

      if (!agent) {
        if (!input.agentDefinitionId || !input.llmModelIdentifier) {
          logger.warn(
            "sendAgentUserInput: agentDefinitionId and llmModelIdentifier are required to create a new agent.",
          );
          return {
            success: false,
            message:
              "agentDefinitionId and llmModelIdentifier are required when creating a new agent.",
            agentRunId: null,
          };
        }

        logger.info(
          `Creating a new agent run from definition '${input.agentDefinitionId}'...`,
        );
        agentRunId = await this.agentRunManager.createAgentRun({
          agentDefinitionId: input.agentDefinitionId,
          llmModelIdentifier: input.llmModelIdentifier,
          autoExecuteTools: input.autoExecuteTools ?? false,
          workspaceId: input.workspaceId ?? null,
          llmConfig: input.llmConfig ?? null,
          skillAccessMode: input.skillAccessMode ?? null,
        });

        agent = this.agentRunManager.getAgentRun(agentRunId);
        if (!agent) {
          logger.error(
            `Failed to retrieve newly created agent run with ID '${agentRunId}'.`,
          );
          throw new Error("Failed to retrieve newly created agent run.");
        }
      }

      const userMessage = UserInputConverter.toAgentInputUserMessage(input.userInput);
      await (agent as any).postUserMessage(userMessage);

      logger.info(`Successfully posted user message to agent run '${agentRunId}'.`);
      return {
        success: true,
        message: "User input successfully sent to agent.",
        agentRunId,
      };
    } catch (error) {
      logger.error(`Error in sendAgentUserInput: ${String(error)}`);
      return {
        success: false,
        message: `An unexpected error occurred: ${String(error)}`,
        agentRunId: input.agentRunId ?? null,
      };
    }
  }

  @Mutation(() => ApproveToolInvocationResult)
  async approveToolInvocation(
    @Arg("input", () => ApproveToolInvocationInput) input: ApproveToolInvocationInput,
  ): Promise<ApproveToolInvocationResult> {
    try {
      logger.info(
        `Received tool invocation approval request for agent run '${input.agentRunId}', invocation '${input.invocationId}', approved: ${input.isApproved}`,
      );

      const agent = this.agentRunManager.getAgentRun(input.agentRunId);
      if (!agent) {
        logger.warn(`approveToolInvocation: Agent run with ID '${input.agentRunId}' not found.`);
        return {
          success: false,
          message: `Agent run with ID '${input.agentRunId}' not found.`,
        };
      }

      await (agent as any).postToolExecutionApproval(
        input.invocationId,
        input.isApproved,
        input.reason ?? null,
      );

      logger.info(
        `Successfully posted tool execution approval for agent run '${input.agentRunId}', invocation '${input.invocationId}'.`,
      );
      return {
        success: true,
        message: "Tool invocation approval/denial successfully sent to agent.",
      };
    } catch (error) {
      logger.error(
        `Error in approveToolInvocation for agent run '${input.agentRunId}': ${String(error)}`,
      );
      return {
        success: false,
        message: `An unexpected error occurred: ${String(error)}`,
      };
    }
  }
}
