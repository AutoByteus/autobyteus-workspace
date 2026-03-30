import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  registerEnumType,
  Resolver,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import { getAgentRunService } from "../../../agent-execution/services/agent-run-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

registerEnumType(SkillAccessMode, {
  name: "SkillAccessModeEnum",
});

@ObjectType()
export class TerminateAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@InputType()
export class CreateAgentRunInput {
  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => SkillAccessMode)
  skillAccessMode!: SkillAccessMode;

  @Field(() => String)
  runtimeKind!: string;
}

@ObjectType()
export class CreateAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;
}

@ObjectType()
export class RestoreAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;
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
  private agentRunService = getAgentRunService();
  private get agentRunManager() {
    return AgentRunManager.getInstance();
  }

  @Mutation(() => TerminateAgentRunResult)
  async terminateAgentRun(
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<TerminateAgentRunResult> {
    try {
      return await this.agentRunService.terminateAgentRun(agentRunId);
    } catch (error) {
      logger.error(`Error terminating agent run with ID ${agentRunId}: ${String(error)}`);
      return {
        success: false,
        message: `Failed to terminate agent run: ${String(error)}`,
      };
    }
  }

  @Mutation(() => CreateAgentRunResult)
  async createAgentRun(
    @Arg("input", () => CreateAgentRunInput) input: CreateAgentRunInput,
  ): Promise<CreateAgentRunResult> {
    try {
      const result = await this.agentRunService.createAgentRun({
        agentDefinitionId: input.agentDefinitionId.trim(),
        workspaceRootPath: input.workspaceRootPath.trim(),
        workspaceId: input.workspaceId ?? null,
        llmModelIdentifier: input.llmModelIdentifier.trim(),
        autoExecuteTools: input.autoExecuteTools,
        llmConfig: input.llmConfig ?? null,
        skillAccessMode: input.skillAccessMode,
        runtimeKind: input.runtimeKind.trim(),
      });

      return {
        success: true,
        message: "Agent run created successfully.",
        runId: result.runId,
      };
    } catch (error) {
      logger.error(`Error in createAgentRun: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        runId: null,
      };
    }
  }

  @Mutation(() => RestoreAgentRunResult)
  async restoreAgentRun(
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<RestoreAgentRunResult> {
    try {
      const result = await this.agentRunService.restoreAgentRun(agentRunId);
      return {
        success: true,
        message: "Agent run restored successfully.",
        runId: result.run.runId,
      };
    } catch (error) {
      logger.error(`Error restoring agent run with ID ${agentRunId}: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        runId: null,
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

      const activeRun = this.agentRunManager.getActiveRun(input.agentRunId);
      if (!activeRun) {
        logger.warn(`approveToolInvocation: Agent run with ID '${input.agentRunId}' not found.`);
        return {
          success: false,
          message: `Agent run with ID '${input.agentRunId}' not found.`,
        };
      }

      const result = await activeRun.approveToolInvocation(
        input.invocationId,
        input.isApproved,
        input.reason ?? null,
      );
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
