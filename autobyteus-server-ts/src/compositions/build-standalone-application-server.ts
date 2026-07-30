import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import type { LoggingConfig } from "../config/logging-config.js";
import { getFastifyLoggerOptions } from "../logging/runtime-logger-bootstrap.js";
import { registerHttpAccessLogPolicy } from "../logging/http-access-log-policy.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../api/fastify-runtime-config.js";
import type { ApplicationPlatformRuntime } from "../application-platform/runtime/application-platform-runtime.js";
import type { StandaloneApplicationSelection } from "../standalone-application-host/domain/standalone-application-selection.js";
import { registerStandaloneApplicationRest } from "../standalone-application-host/api/register-standalone-application-rest.js";
import { registerStandaloneApplicationWebSockets } from "../standalone-application-host/api/register-standalone-application-websockets.js";
import { registerStandaloneApplicationStaticRoutes } from "../standalone-application-host/api/standalone-application-static-routes.js";
import { registerAgentToolsMcpRoutes } from "../agent-tools/mcp/agent-tools-mcp-routes.js";
import type {
  AgentToolsMcpRouteDependencies,
} from "../agent-tools/mcp/agent-tools-mcp-routes.js";

export const buildStandaloneApplicationServer = async (input: {
  selection: StandaloneApplicationSelection;
  applicationRuntime: ApplicationPlatformRuntime;
  loggingConfig: LoggingConfig;
  agentToolsRouteDependencies: AgentToolsMcpRouteDependencies;
}): Promise<FastifyInstance> => {
  const app = fastify({
    logger: getFastifyLoggerOptions(input.loggingConfig),
    disableRequestLogging: true,
    maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
  });
  app.addHook("onClose", async () => input.applicationRuntime.lifecycle.stop());
  try {
    registerHttpAccessLogPolicy(app, {
      mode: input.loggingConfig.httpAccessLogMode,
      includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
    });
    await app.register(websocket);
    await registerStandaloneApplicationRest(app, {
      selection: input.selection,
      lifecycle: input.applicationRuntime.lifecycle,
      gateway: input.applicationRuntime.backendGateway,
    });
    await registerStandaloneApplicationWebSockets(app, {
      selection: input.selection,
      lifecycle: input.applicationRuntime.lifecycle,
      gateway: input.applicationRuntime.backendGateway,
      notificationHub: input.applicationRuntime.notificationHub,
      agentCommunicationService:
        input.applicationRuntime.agentCommunicationService,
    });
    await registerAgentToolsMcpRoutes(
      app,
      input.agentToolsRouteDependencies,
    );
    await registerStandaloneApplicationStaticRoutes(app, input.selection);
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
};
