import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { SkillImprovementCapabilityService } from "../../../skill-improvement/services/skill-improvement-capability-service.js";
import { SkillImprovementService } from "../../../skill-improvement/services/skill-improvement-service.js";
import {
  GraphqlSkillImprovementEligibility,
  GraphqlSkillImprovementRunRecord,
  GraphqlSkillImprovementStartResult,
  GraphqlSkillImprovementStrategyCatalog,
  SkillImprovementCapability,
  StartAgentRunSkillImprovementInput,
  StartTeamMemberSkillImprovementInput,
} from "./skill-improvement-graphql-types.js";
import {
  toGraphqlCatalog,
  toGraphqlEligibility,
  toGraphqlRecord,
} from "./skill-improvement-graphql-converters.js";

@Resolver()
export class SkillImprovementResolver {
  private readonly capabilityService = SkillImprovementCapabilityService.getInstance();
  private readonly service = SkillImprovementService.getInstance();

  @Query(() => SkillImprovementCapability)
  async skillImprovementCapability(): Promise<SkillImprovementCapability> {
    const capability = await this.capabilityService.getCapability();
    return {
      enabled: capability.enabled,
      settingKey: capability.settingKey,
      source: capability.source,
    };
  }

  @Mutation(() => SkillImprovementCapability)
  async setSkillImprovementEnabled(@Arg("enabled", () => Boolean) enabled: boolean): Promise<SkillImprovementCapability> {
    const capability = await this.capabilityService.setEnabled(enabled);
    return { enabled: capability.enabled, settingKey: capability.settingKey, source: capability.source };
  }

  @Query(() => GraphqlSkillImprovementStrategyCatalog)
  skillImprovementStrategyCatalog(): GraphqlSkillImprovementStrategyCatalog {
    return toGraphqlCatalog(this.service.getStrategyCatalog());
  }

  @Query(() => GraphqlSkillImprovementEligibility)
  async getAgentRunSkillImprovementEligibility(
    @Arg("runId", () => String) runId: string,
  ): Promise<GraphqlSkillImprovementEligibility> {
    return toGraphqlEligibility(await this.service.getAgentRunEligibility(runId));
  }

  @Query(() => GraphqlSkillImprovementEligibility)
  async getTeamMemberSkillImprovementEligibility(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
  ): Promise<GraphqlSkillImprovementEligibility> {
    return toGraphqlEligibility(await this.service.getTeamMemberEligibility(teamRunId, agentRunId));
  }

  @Query(() => GraphqlSkillImprovementRunRecord, { nullable: true })
  async getSkillImprovementRunRecord(
    @Arg("improvementRunId", () => String) improvementRunId: string,
  ): Promise<GraphqlSkillImprovementRunRecord | null> {
    const record = await this.service.getRunRecord(improvementRunId);
    return record ? toGraphqlRecord(record) : null;
  }

  @Mutation(() => GraphqlSkillImprovementStartResult)
  async startAgentRunSkillImprovement(
    @Arg("input", () => StartAgentRunSkillImprovementInput) input: StartAgentRunSkillImprovementInput,
  ): Promise<GraphqlSkillImprovementStartResult> {
    const result = await this.service.startForAgentRun({
      runId: input.runId,
      requestedFrom: "run_detail",
    });
    return { improvementRunId: result.improvementRunId, improverRunId: result.improverRunId ?? null, record: toGraphqlRecord(result.record) };
  }

  @Mutation(() => GraphqlSkillImprovementStartResult)
  async startTeamMemberSkillImprovement(
    @Arg("input", () => StartTeamMemberSkillImprovementInput) input: StartTeamMemberSkillImprovementInput,
  ): Promise<GraphqlSkillImprovementStartResult> {
    const result = await this.service.startForTeamMember({
      teamRunId: input.teamRunId,
      agentRunId: input.agentRunId,
      requestedFrom: "team_run_detail",
    });
    return { improvementRunId: result.improvementRunId, improverRunId: result.improverRunId ?? null, record: toGraphqlRecord(result.record) };
  }
}
