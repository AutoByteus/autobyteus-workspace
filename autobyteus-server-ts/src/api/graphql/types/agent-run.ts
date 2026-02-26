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
import { getRuntimeCommandIngressService } from "../../../runtime-execution/runtime-command-ingress-service.js";
import { getRuntimeCompositionService } from "../../../runtime-execution/runtime-composition-service.js";
import { normalizeRuntimeKind } from "../../../runtime-management/runtime-kind.js";
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

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
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
  private runtimeCompositionService = getRuntimeCompositionService();
  private runtimeCommandIngressService = getRuntimeCommandIngressService();

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
      const localSuccess = await this.agentRunManager.terminateAgentRun(id);
      let runtimeSuccess = false;
      const runtimeSession = this.runtimeCompositionService.getRunSession(id);
      if (runtimeSession?.runtimeKind === "codex_app_server") {
        const result = await this.runtimeCommandIngressService.terminateRun({
          runId: id,
          mode: "agent",
        });
        runtimeSuccess = result.accepted;
      }

      const success = localSuccess || runtimeSuccess;
      if (success) {
        this.runtimeCompositionService.removeRunSession(id);
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
      const existingAgent = agentRunId ? this.agentRunManager.getAgentRun(agentRunId) : null;
      const existingSession = agentRunId
        ? this.runtimeCompositionService.getRunSession(agentRunId)
        : null;

      if (!agentRunId) {
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

        const session = await this.runtimeCompositionService.createAgentRun({
          runtimeKind: normalizeRuntimeKind(input.runtimeKind),
          agentDefinitionId: input.agentDefinitionId,
          llmModelIdentifier: input.llmModelIdentifier,
          autoExecuteTools: input.autoExecuteTools ?? false,
          workspaceId: input.workspaceId ?? null,
          llmConfig: input.llmConfig ?? null,
          skillAccessMode: input.skillAccessMode ?? null,
        });
        this.runtimeCommandIngressService.bindRunSession(session);
        agentRunId = session.runId;
      } else if (!existingAgent && !existingSession) {
        logger.warn(`sendAgentUserInput: Agent run with ID '${agentRunId}' not found.`);
        return {
          success: false,
          message: `Agent run with ID '${agentRunId}' not found.`,
          agentRunId: null,
        };
      }

      const userMessage = UserInputConverter.toAgentInputUserMessage(input.userInput);
      const result = await this.runtimeCommandIngressService.sendTurn({
        runId: agentRunId,
        mode: "agent",
        message: userMessage,
      });
      if (!result.accepted) {
        logger.warn(
          `sendAgentUserInput rejected for run '${agentRunId}': [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
        );
        return {
          success: false,
          message: result.message ?? "Runtime rejected user input.",
          agentRunId,
        };
      }

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
      const session = this.runtimeCompositionService.getRunSession(input.agentRunId);
      if (!agent && !session) {
        logger.warn(`approveToolInvocation: Agent run with ID '${input.agentRunId}' not found.`);
        return {
          success: false,
          message: `Agent run with ID '${input.agentRunId}' not found.`,
        };
      }

      const result = await this.runtimeCommandIngressService.approveTool({
        runId: input.agentRunId,
        mode: "agent",
        invocationId: input.invocationId,
        approved: input.isApproved,
        reason: input.reason ?? null,
      });
      if (!result.accepted) {
        return {
          success: false,
          message: result.message ?? "Runtime rejected tool approval.",
        };
      }

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
