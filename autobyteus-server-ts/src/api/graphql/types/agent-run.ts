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
import { getStudioAgentRunService } from "../studio-application-api-services.js";
import {
  RunModelConfigEditabilityObject,
  RunModelConfigFieldErrorObject,
} from "./run-model-config.js";

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

  @Field(() => String, { nullable: true })
  initialSummary?: string | null;
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

@ObjectType()
export class PrepareAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  runId?: string | null;

  @Field(() => String, { nullable: true })
  activationState?: string | null;

  @Field(() => String, { nullable: true })
  preparedExpiresAt?: string | null;
}

@ObjectType()
export class CancelPreparedAgentRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@InputType()
export class UpdateStoppedAgentRunModelConfigInput {
  @Field(() => String)
  agentRunId!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig!: Record<string, unknown> | null;
}

@ObjectType()
export class UpdateStoppedAgentRunModelConfigResult {
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
  canonicalLlmConfig?: Record<string, unknown> | null;

  @Field(() => [RunModelConfigFieldErrorObject])
  fieldErrors!: RunModelConfigFieldErrorObject[];
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
  private readonly agentRunService = getStudioAgentRunService();

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

  @Mutation(() => PrepareAgentRunResult)
  async prepareAgentRun(
    @Arg("input", () => CreateAgentRunInput) input: CreateAgentRunInput,
  ): Promise<PrepareAgentRunResult> {
    try {
      const result = await this.agentRunService.prepareAgentRun({
        agentDefinitionId: input.agentDefinitionId.trim(),
        workspaceRootPath: input.workspaceRootPath.trim(),
        workspaceId: input.workspaceId ?? null,
        llmModelIdentifier: input.llmModelIdentifier.trim(),
        autoExecuteTools: input.autoExecuteTools,
        llmConfig: input.llmConfig ?? null,
        skillAccessMode: input.skillAccessMode,
        runtimeKind: input.runtimeKind.trim(),
        initialSummary: input.initialSummary ?? null,
      });

      return {
        success: true,
        message: "Agent run prepared successfully.",
        runId: result.runId,
        activationState: result.activationState,
        preparedExpiresAt: result.preparedExpiresAt,
      };
    } catch (error) {
      logger.error(`Error in prepareAgentRun: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        runId: null,
        activationState: null,
        preparedExpiresAt: null,
      };
    }
  }

  @Mutation(() => CancelPreparedAgentRunResult)
  async cancelPreparedAgentRun(
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<CancelPreparedAgentRunResult> {
    try {
      return await this.agentRunService.cancelPreparedAgentRun(agentRunId);
    } catch (error) {
      logger.error(`Error cancelling prepared agent run with ID ${agentRunId}: ${String(error)}`);
      return {
        success: false,
        message: String(error),
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

  @Mutation(() => UpdateStoppedAgentRunModelConfigResult)
  async updateStoppedAgentRunModelConfig(
    @Arg("input", () => UpdateStoppedAgentRunModelConfigInput)
    input: UpdateStoppedAgentRunModelConfigInput,
  ): Promise<UpdateStoppedAgentRunModelConfigResult> {
    try {
      if (!Object.hasOwn(input, "llmConfig")) {
        throw new Error("llmConfig must be present and may be null.");
      }
      const result = await this.agentRunService.updateStoppedModelConfig({
        agentRunId: input.agentRunId,
        llmConfig: input.llmConfig,
      });
      return {
        success: result.success,
        outcome: result.outcome,
        message: result.message,
        isActive: result.isActive,
        editability: result.editability,
        canonicalLlmConfig: result.canonical?.llmConfig ?? null,
        fieldErrors: [...result.fieldErrors],
      };
    } catch (error) {
      logger.error("Stopped Agent model-config update failed unexpectedly.", error);
      return {
        success: false,
        outcome: "INTERNAL_ERROR",
        message: "Model settings could not be updated.",
        isActive: false,
        editability: { editable: false, reason: "INTERNAL_ERROR" },
        canonicalLlmConfig: null,
        fieldErrors: [],
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

      const activeRun = this.agentRunService.getAgentRun(input.agentRunId);
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
