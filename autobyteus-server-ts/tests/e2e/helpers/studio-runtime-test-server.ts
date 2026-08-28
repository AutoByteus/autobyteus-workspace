import type { FastifyInstance } from "fastify";
import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { AgentToolsMcpHost } from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import {
  seedInternalServerBaseUrlFromListenAddress,
} from "../../../src/config/server-runtime-endpoints.js";

const TEST_LOGGING_CONFIG = Object.freeze({
  pinoLogLevel: "silent",
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
});

export type StartedStudioE2eRuntimeServer = Readonly<{
  fastify: FastifyInstance;
  agentToolsMcpHost: AgentToolsMcpHost;
  mainUrl: URL;
}>;

export const startStudioE2eRuntimeServer = async (
  requestedHost = "127.0.0.1",
): Promise<StartedStudioE2eRuntimeServer> => {
  if (!appConfigProvider.config.isInitialized()) {
    appConfigProvider.config.initialize();
  }
  const studio = await buildStudioServer({
    appConfig: appConfigProvider.config,
    loggingConfig: TEST_LOGGING_CONFIG,
  });
  try {
    await studio.applicationRuntime.lifecycle.prepareBeforeListen();
    await studio.agentToolsMcpHost.listen();
    const address = await studio.fastify.listen({
      port: 0,
      host: requestedHost,
    });
    seedInternalServerBaseUrlFromListenAddress({
      requestedHost,
      listenAddress: studio.fastify.server.address(),
    });
    await studio.applicationRuntime.lifecycle.recoverAfterListen();
    return Object.freeze({
      fastify: studio.fastify,
      agentToolsMcpHost: studio.agentToolsMcpHost,
      mainUrl: new URL(address),
    });
  } catch (error) {
    await studio.fastify.close();
    throw error;
  }
};
