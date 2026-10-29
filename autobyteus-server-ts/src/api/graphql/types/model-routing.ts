import { GraphQLError } from "graphql";
import { GraphQLJSON } from "graphql-scalars";
import { Arg, Int, Mutation, Query, Resolver } from "type-graphql";
import { readModelRouterLaunch } from "../../../model-routing/model-routing-settings.js";
import { findModelRouting, type ModelRouting } from "../../../model-routing/services/model-routing-binding.js";
import type { ModelRoutingStatus } from "../../../model-routing/services/model-router.js";
import type { RoutingStatisticsPeriod, RoutingStatisticsView } from "../../../model-routing/services/routing-statistics.js";
import type { DecisionSourceFilter, RoutingDecisionPage } from "../../../model-routing/stores/routing-decision-log.js";

const routing = (): ModelRouting => {
  const found = findModelRouting();
  if (!found) {
    throw new GraphQLError("Model Routing is not available on this server.", { extensions: { code: "MODEL_ROUTING_UNAVAILABLE" } });
  }
  return found;
};

const invalid = (message: string): GraphQLError => new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

const SOURCES: Readonly<Record<string, DecisionSourceFilter>> = { ROUTER: "router", NOT_ROUTER: "not_router" };
const PERIODS: Readonly<Record<string, RoutingStatisticsPeriod>> = { DAYS_7: 7, DAYS_30: 30, ALL: "all" };

/**
 * Settings → Model Routing (DS-005, design § Interface Boundary Mapping): the status line, Decisions (Task groups, a
 * source filter applied before paging) and Overview, the switch and the router's launch configuration (runtime, model
 * and model settings, checked like any agent launch; autobyteus-313), and "Talk to the router". Each value is one JSON object, read live; the page reads them as the server words them.
 */
@Resolver()
export class ModelRoutingResolver {
  @Query(() => GraphQLJSON)
  async modelRoutingStatus(): Promise<ModelRoutingStatus> {
    return routing().router.status();
  }

  @Query(() => GraphQLJSON)
  async modelRoutingDecisions(
    @Arg("limit", () => Int) limit: number,
    @Arg("before", () => String, { nullable: true }) before?: string | null,
    @Arg("source", () => String, { nullable: true }) source?: string | null,
  ): Promise<RoutingDecisionPage> {
    if (source && !SOURCES[source]) throw invalid("source must be ROUTER or NOT_ROUTER.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid("limit must be 1-100.");
    return routing().log.listTaskGroups({ before: before ?? null, limit, source: source ? SOURCES[source]! : null });
  }

  @Query(() => GraphQLJSON)
  async modelRoutingStatistics(@Arg("period", () => String) period: string): Promise<RoutingStatisticsView> {
    const value = PERIODS[period];
    if (value === undefined) throw invalid("period must be DAYS_7, DAYS_30 or ALL.");
    return routing().statistics.forPeriod(value);
  }

  @Mutation(() => GraphQLJSON)
  async setModelRoutingEnabled(@Arg("enabled", () => Boolean) enabled: boolean): Promise<ModelRoutingStatus> {
    const current = routing();
    try { current.settings.setEnabled(enabled); } catch (error) { throw invalid(error instanceof Error ? error.message : String(error)); }
    return current.router.status();
  }

  @Mutation(() => GraphQLJSON)
  async setModelRouterLaunch(
    @Arg("runtimeKind", () => String) runtimeKind: string,
    @Arg("llmModelIdentifier", () => String) llmModelIdentifier: string,
    @Arg("llmConfig", () => GraphQLJSON, { nullable: true }) llmConfig?: Record<string, unknown> | null,
  ): Promise<ModelRoutingStatus> {
    const current = routing();
    try { await current.settings.setRouterLaunch({ runtimeKind, llmModelIdentifier, llmConfig: llmConfig ?? null }); }
    catch (error) { throw invalid(error instanceof Error ? error.message : String(error)); }
    return current.router.status();
  }

  /** "Talk to the router": the node's Model Router agent's run (created or restored), opened by its ID. */
  @Mutation(() => String)
  async openModelRouterAgent(): Promise<string> {
    const current = routing();
    const launch = readModelRouterLaunch();
    if (!launch) throw invalid("Choose the Model Router's runtime and model first.");
    return (await current.agent.ensureRun(launch)).runId;
  }
}
