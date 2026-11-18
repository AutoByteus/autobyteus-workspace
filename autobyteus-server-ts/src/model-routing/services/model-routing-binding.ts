import type { ModelRouterPort } from "../domain/model-routing-types.js";
import type { ModelRoutingSettings } from "../model-routing-settings.js";
import type { RoutingDecisionLog } from "../stores/routing-decision-log.js";
import type { ModelRouter } from "./model-router.js";
import type { ModelRouterAgent } from "./model-router-agent.js";
import type { ModelRoutingSessions } from "./model-routing-sessions.js";
import type { RoutingStatistics } from "./routing-statistics.js";

/** The node's Model Routing, as the server composes it: the tool and GraphQL reach these owners through it. */
export type ModelRouting = Readonly<{
  router: ModelRouter;
  agent: ModelRouterAgent;
  sessions: ModelRoutingSessions;
  log: RoutingDecisionLog;
  statistics: RoutingStatistics;
  settings: ModelRoutingSettings;
}>;

let configured: ModelRouting | null = null;

/** Binds the node's Model Routing until `close()` (the server composition). */
export const configureModelRouting = (routing: ModelRouting): Readonly<{ close(): void }> => {
  if (configured) throw new Error("Model Routing is already configured.");
  configured = routing;
  return Object.freeze({ close: () => { if (configured === routing) configured = null; } });
};

/** The node's Model Routing; null on a server that does not compose it. */
export const findModelRouting = (): ModelRouting | null => configured;

/**
 * The process's Model Routing as the collaboration port: the bound router, or off (null) on a server that does not
 * compose it. Collaboration admission is built before Model Routing is composed, so it asks on each delegation.
 */
export const PROCESS_MODEL_ROUTING: ModelRouterPort = Object.freeze({
  openDelegation: () => findModelRouting()?.router.openDelegation() ?? Promise.resolve(null),
});
