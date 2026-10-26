import path from "node:path";
import { getAgentRunService } from "../agent-execution/services/agent-run-service.js";
import { findAvailableAgentRuntimesService } from "../available-agent-runtimes/available-agent-runtimes-service.js";
import { configureRoutingDecisionRecorder } from "../model-routing/domain/routing-decision-recorder-binding.js";
import { ModelRoutingSettings } from "../model-routing/model-routing-settings.js";
import { ModelRouter } from "../model-routing/services/model-router.js";
import { ModelRouterAgent } from "../model-routing/services/model-router-agent.js";
import { configureModelRouting } from "../model-routing/services/model-routing-binding.js";
import { ModelRoutingSessions } from "../model-routing/services/model-routing-sessions.js";
import { RoutingStatistics } from "../model-routing/services/routing-statistics.js";
import { RoutingDecisionLog } from "../model-routing/stores/routing-decision-log.js";
import { getServerSettingsService } from "../services/server-settings-service.js";

/**
 * The node's Model Routing (autobyteus-32) for the studio server: the decision log under `<appData>/model-routing/`,
 * statistics, sessions, the Model Router agent and the router, bound for the decision tool, GraphQL, collaboration
 * admission (`PROCESS_MODEL_ROUTING`) and dispatch's decision recording until `close()`. The agent run service and the
 * runtime report are the process's, read when used.
 */
export const composeModelRouting = (input: Readonly<{ appDataDir: string }>): Readonly<{ close(): void }> => {
  const stateDir = path.join(input.appDataDir, "model-routing");
  const log = new RoutingDecisionLog({ dir: stateDir });
  const statistics = new RoutingStatistics(log);
  const sessions = new ModelRoutingSessions();
  const agent = new ModelRouterAgent({
    stateDir,
    agentRuns: {
      createAgentRun: (runInput) => getAgentRunService().createAgentRun(runInput),
      getAgentRun: (runId) => getAgentRunService().getAgentRun(runId),
      resolveCommandReadyAgentRun: (runId) => getAgentRunService().resolveCommandReadyAgentRun(runId),
    },
  });
  const router = new ModelRouter({
    agent, sessions, statistics,
    readNodeRuntimes: () => {
      const service = findAvailableAgentRuntimesService();
      if (!service) throw new Error("the runtime report is not composed on this server");
      return service.readWithSignIn();
    },
  });
  const routing = configureModelRouting({ router, agent, sessions, log, statistics, settings: new ModelRoutingSettings(getServerSettingsService()) });
  const recorder = configureRoutingDecisionRecorder(log);
  return Object.freeze({ close: () => { recorder.close(); routing.close(); } });
};
