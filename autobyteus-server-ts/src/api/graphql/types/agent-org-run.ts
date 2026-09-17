import { RunModelConfigEditabilityObject, RunModelConfigFieldErrorObject, RunModelOptionsObject } from "./run-model-config.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { GraphQLJSON } from "graphql-scalars";
import { Arg, Field, InputType, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getStudioAgentOrgRunService } from "../studio-application-api-services.js";
import { EventMonitorActiveTracePageObject } from "./event-monitor-active-trace-page.js";
import { getAgentOrgMemberRunViewProjectionService } from "../../../run-history/services/agent-org-member-run-view-projection-service.js";
import { AgentOrgRunManager } from "../../../agent-org-execution/services/agent-org-run-manager.js";
import { TokenUsageRunSummaryGraphql, toTokenUsageRunSummaryGraphql } from "./token-usage-stats.js";

@InputType()
export class AgentOrgRootLaunchConfigurationInput {
  @Field(() => String) runtimeKind!: string;
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig?: Record<string, unknown> | null;
  @Field(() => Boolean) autoExecuteTools!: boolean;
  @Field(() => SkillAccessMode) skillAccessMode!: SkillAccessMode;
  @Field(() => String, { nullable: true }) workspaceRootPath?: string | null;
}

@InputType()
export class AgentOrgPlacementLaunchConfigurationInput {
  @Field(() => String, { nullable: true }) runtimeKind?: string;
  @Field(() => String, { nullable: true }) llmModelIdentifier?: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig?: Record<string, unknown> | null;
  @Field(() => Boolean, { nullable: true }) autoExecuteTools?: boolean;
  @Field(() => SkillAccessMode, { nullable: true }) skillAccessMode?: SkillAccessMode;
  @Field(() => String, { nullable: true }) workspaceRootPath?: string | null;
}

@InputType()
export class AgentOrgPlacementLaunchOverrideInput {
  @Field(() => String) address!: string;
  @Field(() => AgentOrgPlacementLaunchConfigurationInput)
  configuration!: AgentOrgPlacementLaunchConfigurationInput;
}

@InputType()
export class CreateAgentOrgRunInput {
  @Field(() => String) agentOrgDefinitionId!: string;
  @Field(() => AgentOrgRootLaunchConfigurationInput)
  rootConfiguration!: AgentOrgRootLaunchConfigurationInput;
  @Field(() => [AgentOrgPlacementLaunchOverrideInput], { nullable: true })
  teamOverrides?: AgentOrgPlacementLaunchOverrideInput[] | null;
  @Field(() => [AgentOrgPlacementLaunchOverrideInput], { nullable: true })
  agentOverrides?: AgentOrgPlacementLaunchOverrideInput[] | null;
}

@ObjectType()
export class AgentOrgRunMutationResult {
  @Field(() => Boolean) success!: boolean;
  @Field(() => String) message!: string;
  @Field(() => String, { nullable: true }) agentOrgRunId?: string | null;
}

@ObjectType()
export class AgentOrgMemberRunProjectionPayload {
  @Field(() => String) agentRunId!: string;
  @Field(() => String) memberAddress!: string;
  @Field(() => [GraphQLJSON]) conversation!: unknown[];
  @Field(() => [GraphQLJSON]) activities!: unknown[];
  @Field(() => String, { nullable: true }) summary?: string | null;
  @Field(() => String, { nullable: true }) lastActivityAt?: string | null;
  @Field(() => Boolean) hasEarlierActiveTraceEvents!: boolean;
}

@ObjectType()
export class AgentOrgExecutionCheckpointPayload {
  @Field(() => String) orgRunId!: string;
  @Field(() => Int) changeSequence!: number;
  @Field(() => Boolean) hasOpenExecutionWork!: boolean;
}

@InputType()
export class AgentOrgMemberModelConfigIdentityInput {
  @Field(() => String) orgRunId!: string;
  @Field(() => String) memberAddress!: string;
  @Field(() => String) agentRunId!: string;
}
@InputType()
export class UpdateStoppedAgentOrgMemberModelConfigInput extends AgentOrgMemberModelConfigIdentityInput {
  @Field(() => String) llmModelIdentifier!: string;
  @Field(() => GraphQLJSON, { nullable: true }) llmConfig?: Record<string, unknown> | null;
}
@ObjectType()
export class AgentOrgMemberModelConfigObject {
  @Field(() => String) orgRunId!: string;
  @Field(() => String) memberAddress!: string;
  @Field(() => String) agentRunId!: string;
  @Field(() => GraphQLJSON) launchConfiguration!: Record<string, unknown>;
  @Field(() => Boolean) isActive!: boolean;
  @Field(() => RunModelConfigEditabilityObject) editability!: RunModelConfigEditabilityObject;
}
@ObjectType()
export class AgentOrgMemberModelConfigReadObject extends AgentOrgMemberModelConfigObject {
  @Field(() => RunModelOptionsObject) modelOptions!: RunModelOptionsObject;
}
@ObjectType()
export class AgentOrgMemberModelConfigUpdateResult {
  @Field(() => Boolean) success!: boolean;
  @Field(() => String) outcome!: string;
  @Field(() => String) message!: string;
  @Field(() => Boolean) isActive!: boolean;
  @Field(() => RunModelConfigEditabilityObject) editability!: RunModelConfigEditabilityObject;
  @Field(() => AgentOrgMemberModelConfigObject, { nullable: true }) canonical!: AgentOrgMemberModelConfigObject | null;
  @Field(() => [RunModelConfigFieldErrorObject]) fieldErrors!: readonly RunModelConfigFieldErrorObject[];
}

@Resolver()
export class AgentOrgRunResolver {
  private readonly service = getStudioAgentOrgRunService();
  private readonly memberViews = getAgentOrgMemberRunViewProjectionService();

  @Query(() => AgentOrgMemberModelConfigReadObject)
  getAgentOrgMemberModelConfig(@Arg("identity", () => AgentOrgMemberModelConfigIdentityInput) identity: AgentOrgMemberModelConfigIdentityInput) {
    return this.service.getMemberModelConfig(identity);
  }
  @Mutation(() => AgentOrgMemberModelConfigUpdateResult)
  updateStoppedAgentOrgMemberModelConfig(@Arg("input", () => UpdateStoppedAgentOrgMemberModelConfigInput) input: UpdateStoppedAgentOrgMemberModelConfigInput) {
    return this.service.updateStoppedMemberModelConfig({ ...input, llmConfig: input.llmConfig ?? null });
  }

  @Query(() => GraphQLJSON)
  getAgentOrgRunInspection(@Arg("orgRunId", () => String) orgRunId: string) {
    return this.service.getInspection(orgRunId);
  }

  @Query(() => AgentOrgMemberRunProjectionPayload)
  async getAgentOrgMemberRunProjection(
    @Arg("orgRunId", () => String) orgRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<AgentOrgMemberRunProjectionPayload> {
    return this.memberViews.getProjection(orgRunId, memberAddress, agentRunId);
  }

  @Query(() => EventMonitorActiveTracePageObject)
  async getAgentOrgMemberEventMonitorActiveTracePage(
    @Arg("orgRunId", () => String) orgRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("beforeCursor", () => String, { nullable: true }) beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePageObject> {
    return this.memberViews.getActiveTracePage(
      orgRunId,
      memberAddress,
      agentRunId,
      beforeCursor,
    );
  }

  @Query(() => AgentOrgExecutionCheckpointPayload)
  getAgentOrgExecutionCheckpoint(
    @Arg("orgRunId", () => String) orgRunId: string,
  ): AgentOrgExecutionCheckpointPayload {
    const run = AgentOrgRunManager.getInstance().getActive(orgRunId);
    if (!run) throw new Error(`Active AgentOrg '${orgRunId}' was not found.`);
    return run.getExecutionCheckpoint();
  }

  @Query(() => TokenUsageRunSummaryGraphql)
  async getAgentOrgMemberTokenUsageSummary(
    @Arg("orgRunId", () => String) orgRunId: string,
    @Arg("memberAddress", () => String) memberAddress: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<TokenUsageRunSummaryGraphql> {
    return toTokenUsageRunSummaryGraphql(await this.memberViews.getTokenUsageSummary(
      orgRunId,
      memberAddress,
      agentRunId,
    ));
  }

  @Mutation(() => AgentOrgRunMutationResult)
  async createAgentOrgRun(
    @Arg("input", () => CreateAgentOrgRunInput) input: CreateAgentOrgRunInput,
  ): Promise<AgentOrgRunMutationResult> {
    try {
      const run = await this.service.create(input);
      return { success: true, message: "Agent organization run created successfully.", agentOrgRunId: run.orgRunId };
    } catch (error) {
      return { success: false, message: message(error), agentOrgRunId: null };
    }
  }

  @Mutation(() => AgentOrgRunMutationResult)
  async restoreAgentOrgRun(
    @Arg("agentOrgRunId", () => String) agentOrgRunId: string,
  ): Promise<AgentOrgRunMutationResult> {
    try {
      const run = await this.service.restore(agentOrgRunId);
      return { success: true, message: "Agent organization run restored successfully.", agentOrgRunId: run.orgRunId };
    } catch (error) {
      return { success: false, message: message(error), agentOrgRunId: null };
    }
  }

  @Mutation(() => AgentOrgRunMutationResult)
  async terminateAgentOrgRun(
    @Arg("agentOrgRunId", () => String) agentOrgRunId: string,
  ): Promise<AgentOrgRunMutationResult> {
    try {
      const success = await this.service.terminate(agentOrgRunId);
      return {
        success,
        message: success ? "Agent organization run terminated successfully." : "Agent organization run not found.",
        agentOrgRunId: success ? agentOrgRunId : null,
      };
    } catch (error) {
      return { success: false, message: message(error), agentOrgRunId: null };
    }
  }
}

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
