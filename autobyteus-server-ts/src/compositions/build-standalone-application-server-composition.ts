import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import type { LoggingConfig } from "../config/logging-config.js";
import { getFastifyLoggerOptions } from "../logging/runtime-logger-bootstrap.js";
import { registerHttpAccessLogPolicy } from "../logging/http-access-log-policy.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../api/fastify-runtime-config.js";
import type { ApplicationPlatformRuntimeGraph } from "../application-platform/runtime/application-platform-runtime-graph.js";
import type { StandaloneApplicationSelection } from "../standalone-application-host/domain/standalone-application-selection.js";
import { registerStandaloneApplicationRest } from "../standalone-application-host/api/register-standalone-application-rest.js";
import { registerStandaloneApplicationWebSockets } from "../standalone-application-host/api/register-standalone-application-websockets.js";
import { registerStandaloneApplicationStaticRoutes } from "../standalone-application-host/api/standalone-application-static-routes.js";
import { registerAgentToolsMcpRoutes } from "../agent-tools/mcp/agent-tools-mcp-routes.js";

export const buildStandaloneApplicationServerComposition = async (input: {
  selection: StandaloneApplicationSelection;
  graph: ApplicationPlatformRuntimeGraph;
  loggingConfig: LoggingConfig;
}): Promise<FastifyInstance> => {
  const app = fastify({
    logger: getFastifyLoggerOptions(input.loggingConfig),
    disableRequestLogging: true,
    maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
  });
  registerHttpAccessLogPolicy(app, {
    mode: input.loggingConfig.httpAccessLogMode,
    includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
  });
  await app.register(websocket);
  await registerStandaloneApplicationRest(app, {
    selection: input.selection,
    lifecycle: input.graph.lifecycle,
    gateway: input.graph.backendGateway,
  });
  await registerStandaloneApplicationWebSockets(app, {
    selection: input.selection,
    lifecycle: input.graph.lifecycle,
    gateway: input.graph.backendGateway,
    notificationHub: input.graph.notificationHub,
    agentCommunicationService: input.graph.agentCommunicationService,
  });
  await registerAgentToolsMcpRoutes(app);
  await registerStandaloneApplicationStaticRoutes(app, input.selection);
  app.addHook("onClose", async () => input.graph.lifecycle.stop());
  return app;
};
