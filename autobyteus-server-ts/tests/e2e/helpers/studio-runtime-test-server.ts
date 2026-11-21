import { vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { LoggingConfig } from "../../../src/config/logging-config.js";
import type { AgentToolsMcpHost } from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import type { CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import type { ApplicationPlatformRuntime } from "../../../src/application-platform/runtime/application-platform-runtime.js";
import { attachOwnerCredential } from "../../../../test-support/node-access/owner-credential-attachment.mjs";
import { testLaunchCredential } from "../../setup/test-launch-credential.js";
import { IN_PROCESS_SERVER_HOOK_TIMEOUT_MS } from "../../helpers/os-latency-under-load.js";

/**
 * The one owner of the hook timeout of in-process-server suites (autobyteus-561). A hook that starts or closes the server takes
 * milliseconds on a quiet machine and many seconds on a busy one: the main thread stalls while the machine swaps and `fseventsd` is
 * busy (the teardown of the scripted-Antigravity suites reached 16.6 s against vitest's 10 s default; TESTING.md, "File watching on
 * a busy Mac"). Every file that imports this helper registers its hooks with the longer limit; `vi.setConfig` here applies to the
 * hooks the importing file registers afterwards, and a file that does not import it keeps vitest's default. A wait that proves
 * something does NOT happen keeps its own short window; per-test timeouts and file-event waits still come from
 * `tests/helpers/os-latency-under-load.ts`.
 */
vi.setConfig({ hookTimeout: IN_PROCESS_SERVER_HOOK_TIMEOUT_MS });

const TEST_LOGGING_CONFIG: LoggingConfig = Object.freeze({
  pinoLogLevel: "silent",
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
});

export type StudioE2eRuntimeServerOptions = Readonly<{
  /** The server's logging; silent by default. A suite that scans the server's output for secrets passes its own. */
  loggingConfig?: LoggingConfig;
}>;

export type StartedStudioE2eRuntimeServer = Readonly<{
  fastify: FastifyInstance;
  agentToolsMcpHost: AgentToolsMcpHost;
  /** The studio's credential proxy (its provider relays and run passes), for suites that check the proxy itself. */
  credentialProxyHost: CredentialProxyHost;
  /** The studio's application platform, for suites that stop it before the rest of the server. */
  applicationRuntime: ApplicationPlatformRuntime;
  mainUrl: URL;
  /** The launch owner credential the server accepts; already attached to this process's requests to it. */
  ownerCredential: string;
}>;

/**
 * Starts the studio server in this process on a free port: the one in-process start path of server E2E suites
 * (`tests/architecture/e2e-node-credential-paths.test.ts` keeps it so). Like the desktop app with its own node, the
 * test holds the server's launch owner credential and attaches it to its requests to the server (`fetch`, `ws`
 * upgrades).
 */
export const startStudioE2eRuntimeServer = async (
  requestedHost = "127.0.0.1",
  options: StudioE2eRuntimeServerOptions = {},
): Promise<StartedStudioE2eRuntimeServer> => {
  if (!appConfigProvider.config.isInitialized()) {
    appConfigProvider.config.initialize();
  }
  const studio = await buildStudioServer({
    appConfig: appConfigProvider.config,
    loggingConfig: options.loggingConfig ?? TEST_LOGGING_CONFIG,
  });
  try {
    await studio.applicationRuntime.lifecycle.prepareBeforeListen();
    await studio.agentToolsMcpHost.listen();
    await studio.credentialProxyHost.listen();
    const address = await studio.fastify.listen({
      port: 0,
      host: requestedHost,
    });
    await studio.applicationRuntime.lifecycle.recoverAfterListen();
    const mainUrl = new URL(address);
    const ownerCredential = testLaunchCredential();
    // Attached for the server's port for the rest of this test file (a later server gets another port).
    attachOwnerCredential(mainUrl.toString(), ownerCredential);
    return Object.freeze({
      fastify: studio.fastify,
      agentToolsMcpHost: studio.agentToolsMcpHost,
      credentialProxyHost: studio.credentialProxyHost,
      applicationRuntime: studio.applicationRuntime,
      mainUrl,
      ownerCredential,
    });
  } catch (error) {
    await studio.fastify.close();
    throw error;
  }
};
