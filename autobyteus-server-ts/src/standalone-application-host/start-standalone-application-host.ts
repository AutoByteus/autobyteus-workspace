import "reflect-metadata";
import type { FastifyInstance } from "fastify";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getLoggingConfigFromEnv } from "../config/logging-config.js";
import {
  initializeRuntimeLoggerBootstrap,
} from "../logging/runtime-logger-bootstrap.js";
import { initializeServerAppLogger } from "../logging/server-app-logger.js";
import { runMigrations } from "../startup/migrations.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import { getAppDataMigrationRunner } from "../app-data-migrations/app-data-migration-runner.js";
import {
  resetDefaultAgentRunEventPipeline,
  stopDefaultAgentRunEventPipeline,
} from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { seedInternalServerBaseUrlFromListenAddress } from "../config/server-runtime-endpoints.js";
import { buildApplicationPlatformRuntime } from "../application-platform/runtime/build-application-platform-runtime.js";
import { buildStandaloneApplicationServer } from "../compositions/build-standalone-application-server.js";
import {
  resolveStandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfigInput,
} from "./config/standalone-application-host-config.js";
import { materializeStandaloneHostConfig } from "./config/standalone-host-config-materializer.js";
import { createApplicationDefinitionServices } from "../application-platform/runtime/create-application-definition-services.js";
import { validateStandaloneApplicationPackage } from "../application-platform/launch-configuration/application-standalone-package-validator.js";
import {
  createAgentToolsMcpRuntime,
  type AgentToolsMcpRuntime,
} from "../agent-tools/mcp/agent-tools-mcp-runtime.js";
import {
  getPublishedArtifactPublicationService,
} from "../services/published-artifacts/published-artifact-publication-service.js";
import {
  GeneralProcessRunSupervisor,
} from "../agent-execution/runtime/general-process-run-supervisor.js";

export type StandaloneApplicationHostHandle = Readonly<{
  config: StandaloneApplicationHostConfig;
  applicationId: string;
  url: string;
  close: () => Promise<void>;
}>;

type StandaloneProcessResources = Readonly<{
  appConfig: ReturnType<typeof appConfigProvider.initialize>;
  loggingConfig: ReturnType<typeof getLoggingConfigFromEnv>;
  close: () => Promise<void>;
}>;

const closeRepositoryResources = async (input: {
  vaultInitializationStarted: boolean;
  prismaInitializationStarted: boolean;
}): Promise<void> => {
  if (input.vaultInitializationStarted) {
    try {
      await getSecretVaultRuntime().close();
    } finally {
      if (input.prismaInitializationStarted) {
        await shutdownPrisma();
      }
    }
  } else if (input.prismaInitializationStarted) {
    await shutdownPrisma();
  }
};

const assertStandaloneMigrationsReady = async (): Promise<void> => {
  const results = await getAppDataMigrationRunner().runPending();
  const failures = results.filter(
    (result) => result.requiredOnStartup
      && result.status !== "SUCCEEDED"
      && result.status !== "SUCCEEDED_WITH_WARNINGS",
  );
  if (failures.length > 0) {
    throw new Error(
      "Standalone app-data migration readiness failed: "
      + failures.map((result) =>
        `${result.migrationId}=${result.status}${result.errorMessage ? ` (${result.errorMessage})` : ""}`)
        .join("; "),
    );
  }
};

const initializeStandaloneProcessResources = async (
  config: StandaloneApplicationHostConfig,
): Promise<StandaloneProcessResources> => {
  let prismaInitializationStarted = false;
  let vaultInitializationStarted = false;
  try {
    await materializeStandaloneHostConfig(config);
    const appConfig = appConfigProvider.initialize({ appDataDir: config.appDataDir });
    appConfig.initialize();
    const loggingConfig = getLoggingConfigFromEnv(process.env);
    initializeRuntimeLoggerBootstrap({
      logsDir: appConfig.getLogsDir(),
      loggingConfig,
    });
    initializeServerAppLogger(loggingConfig);
    runMigrations({
      appRoot: appConfig.getAppRootDir(),
      databaseUrl: appConfig.getOperationalDatabaseUrl(),
    });
    const databaseLocation = appConfig.getOperationalDatabaseLocation();
    configureFileToolDeniedPaths([
      databaseLocation.databasePath,
      databaseLocation.rootKeyPath,
      `${databaseLocation.databasePath}-wal`,
      `${databaseLocation.databasePath}-shm`,
      `${databaseLocation.databasePath}-journal`,
    ]);
    prismaInitializationStarted = true;
    await initializePrisma({ datasourceUrl: databaseLocation.databaseUrl });
    vaultInitializationStarted = true;
    await getSecretVaultRuntime().initialize(databaseLocation);
    await assertStandaloneMigrationsReady();
    let closePromise: Promise<void> | null = null;
    return {
      appConfig,
      loggingConfig,
      close: () => {
        closePromise ??= closeRepositoryResources({
          vaultInitializationStarted,
          prismaInitializationStarted,
        });
        return closePromise;
      },
    };
  } catch (error) {
    await closeRepositoryResources({
      vaultInitializationStarted,
      prismaInitializationStarted,
    });
    throw error;
  }
};

export const startStandaloneApplicationHost = async (
  input: StandaloneApplicationHostConfigInput,
): Promise<StandaloneApplicationHostHandle> => {
  const config = resolveStandaloneApplicationHostConfig(input);
  const validatedPackage = await validateStandaloneApplicationPackage({
    packageRoot: config.packageRoot,
    localApplicationId: config.localApplicationId,
  });
  let app: FastifyInstance | null = null;
  let processResources: StandaloneProcessResources | null = null;
  let agentToolsMcpRuntime:
    AgentToolsMcpRuntime | null = null;
  let generalProcessRunSupervisor:
    GeneralProcessRunSupervisor | null = null;
  try {
    processResources = await initializeStandaloneProcessResources(config);
    await resetDefaultAgentRunEventPipeline();
    const { selection, bundleService } = validatedPackage;
    const definitionServices = createApplicationDefinitionServices({
      appConfig: processResources.appConfig,
      bundleService,
    });
    agentToolsMcpRuntime =
      createAgentToolsMcpRuntime({
        generalProcessPublisher:
          getPublishedArtifactPublicationService(),
      });
    generalProcessRunSupervisor =
      new GeneralProcessRunSupervisor(
        agentToolsMcpRuntime.generalProcessSessionManager,
      );
    const applicationRuntime = buildApplicationPlatformRuntime({
      appConfig: processResources.appConfig,
      bundleService,
      ...definitionServices,
      agentToolsSessionManagerFactory:
        agentToolsMcpRuntime,
      selectedApplicationIds: new Set([selection.applicationId]),
    });
    app = await buildStandaloneApplicationServer({
      selection,
      applicationRuntime,
      loggingConfig: processResources.loggingConfig,
      agentToolsRouteDependencies:
        agentToolsMcpRuntime.routeDependencies,
    });
    await applicationRuntime.lifecycle.prepareBeforeListen();
    const url = await app.listen({ host: config.host, port: config.port });
    seedInternalServerBaseUrlFromListenAddress({
      requestedHost: config.host,
      listenAddress: app.server.address(),
    });
    await applicationRuntime.lifecycle.recoverAfterListen();

    let closePromise: Promise<void> | null = null;
    const close = (): Promise<void> => {
      closePromise ??= (async () => {
        try {
          await app!.close();
        } finally {
          try {
            await generalProcessRunSupervisor!.close();
          } finally {
            try {
              agentToolsMcpRuntime!.close();
            } finally {
              try {
                await stopDefaultAgentRunEventPipeline();
              } finally {
                await processResources!.close();
              }
            }
          }
        }
      })();
      return closePromise;
    };
    return Object.freeze({
      config,
      applicationId: selection.applicationId,
      url: url.replace(/\/$/, ""),
      close,
    });
  } catch (error) {
    try {
      if (app) {
        await app.close();
      }
    } finally {
      if (processResources) {
        try {
          await generalProcessRunSupervisor?.close();
        } finally {
          try {
            agentToolsMcpRuntime?.close();
          } finally {
            try {
              await stopDefaultAgentRunEventPipeline();
            } finally {
              await processResources.close();
            }
          }
        }
      }
    }
    throw error;
  }
};
