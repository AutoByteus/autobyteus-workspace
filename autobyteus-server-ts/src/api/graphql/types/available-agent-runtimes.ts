import { GraphQLError } from "graphql";
import { GraphQLJSON } from "graphql-scalars";
import { Query, Resolver } from "type-graphql";
import { findAvailableAgentRuntimesService } from "../../../runtime-management/agent-runtimes/available-agent-runtimes-service.js";
import type { AvailableAgentRuntimesReport } from "../../../runtime-management/agent-runtimes/available-agent-runtimes-report.js";

/**
 * Settings → Model Routing → "Agent runtimes now": this node's report, the same object `list_available_agent_runtimes`
 * returns. One JSON value, because `limits` and `models` are a list or a text ("not reported", "unknown: …"); the page
 * reads it exactly as the tool shows it. Each query reads the runtimes live.
 */
@Resolver()
export class AvailableAgentRuntimesResolver {
  @Query(() => GraphQLJSON)
  async availableAgentRuntimes(): Promise<AvailableAgentRuntimesReport> {
    const service = findAvailableAgentRuntimesService();
    if (!service) {
      throw new GraphQLError("Available agent runtimes are not available on this server.", {
        extensions: { code: "AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE" },
      });
    }
    return service.read();
  }
}
