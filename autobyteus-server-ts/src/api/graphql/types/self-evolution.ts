import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { SelfEvolutionCapabilityService } from "../../../self-evolution/services/self-evolution-capability-service.js";
import { SelfEvolutionMetricsService } from "../../../self-evolution/services/self-evolution-metrics-service.js";
import { SelfEvolutionService } from "../../../self-evolution/services/self-evolution-service.js";
import {
  GraphqlSelfEvolutionEligibility,
  GraphqlSelfEvolutionMetricsReport,
  GraphqlSelfEvolutionRunRecord,
  GraphqlSelfEvolutionStartResult,
  GraphqlSelfEvolutionStrategyCatalog,
  SelfEvolutionCapability,
  StartAgentRunSelfEvolutionInput,
  StartTeamMemberSelfEvolutionInput,
} from "./self-evolution-graphql-types.js";
import {
  toGraphqlBenefitMetrics,
  toGraphqlCatalog,
  toGraphqlEligibility,
  toGraphqlRecord,
  toGraphqlUpdateMetrics,
} from "./self-evolution-graphql-converters.js";

@Resolver()
export class SelfEvolutionResolver {
  private readonly capabilityService = SelfEvolutionCapabilityService.getInstance();
  private readonly service = SelfEvolutionService.getInstance();
  private readonly metricsService = new SelfEvolutionMetricsService();

  @Query(() => SelfEvolutionCapability)
  async selfEvolutionCapability(): Promise<SelfEvolutionCapability> {
    const capability = await this.capabilityService.getCapability();
    return {
      enabled: capability.enabled,
      settingKey: capability.settingKey,
      source: capability.source,
    };
  }

  @Mutation(() => SelfEvolutionCapability)
  async setSelfEvolutionEnabled(@Arg("enabled", () => Boolean) enabled: boolean): Promise<SelfEvolutionCapability> {
    const capability = await this.capabilityService.setEnabled(enabled);
    return { enabled: capability.enabled, settingKey: capability.settingKey, source: capability.source };
  }

  @Query(() => GraphqlSelfEvolutionStrategyCatalog)
  selfEvolutionStrategyCatalog(): GraphqlSelfEvolutionStrategyCatalog {
    return toGraphqlCatalog(this.service.getStrategyCatalog());
  }

  @Query(() => GraphqlSelfEvolutionEligibility)
  async getAgentRunSelfEvolutionEligibility(
    @Arg("runId", () => String) runId: string,
  ): Promise<GraphqlSelfEvolutionEligibility> {
    return toGraphqlEligibility(await this.service.getAgentRunEligibility(runId));
  }

  @Query(() => GraphqlSelfEvolutionEligibility)
  async getTeamMemberSelfEvolutionEligibility(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("memberRunId", () => String) memberRunId: string,
  ): Promise<GraphqlSelfEvolutionEligibility> {
    return toGraphqlEligibility(await this.service.getTeamMemberEligibility(teamRunId, memberRunId));
  }

  @Query(() => GraphqlSelfEvolutionRunRecord, { nullable: true })
  async getSelfEvolutionRunRecord(
    @Arg("evolutionRunId", () => String) evolutionRunId: string,
  ): Promise<GraphqlSelfEvolutionRunRecord | null> {
    const record = await this.service.getRunRecord(evolutionRunId);
    return record ? toGraphqlRecord(record) : null;
  }

  @Query(() => GraphqlSelfEvolutionMetricsReport)
  async getSelfEvolutionMetricsReport(
    @Arg("evolutionRunId", () => String) evolutionRunId: string,
  ): Promise<GraphqlSelfEvolutionMetricsReport> {
    const report = await this.metricsService.getMetricsReport(evolutionRunId);
    return {
      evolutionRunId: report.evolutionRunId,
      updateMetrics: toGraphqlUpdateMetrics(report.updateMetrics)!,
      benefitMetrics: toGraphqlBenefitMetrics(report.benefitMetrics)!,
    };
  }

  @Mutation(() => GraphqlSelfEvolutionStartResult)
  async startAgentRunSelfEvolution(
    @Arg("input", () => StartAgentRunSelfEvolutionInput) input: StartAgentRunSelfEvolutionInput,
  ): Promise<GraphqlSelfEvolutionStartResult> {
    const result = await this.service.startForAgentRun({
      runId: input.runId,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedFrom: "run_detail",
    });
    return { evolutionRunId: result.evolutionRunId, evolverRunId: result.evolverRunId ?? null, record: toGraphqlRecord(result.record) };
  }

  @Mutation(() => GraphqlSelfEvolutionStartResult)
  async startTeamMemberSelfEvolution(
    @Arg("input", () => StartTeamMemberSelfEvolutionInput) input: StartTeamMemberSelfEvolutionInput,
  ): Promise<GraphqlSelfEvolutionStartResult> {
    const result = await this.service.startForTeamMember({
      teamRunId: input.teamRunId,
      memberRunId: input.memberRunId,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedFrom: "team_run_detail",
    });
    return { evolutionRunId: result.evolutionRunId, evolverRunId: result.evolverRunId ?? null, record: toGraphqlRecord(result.record) };
  }
}
