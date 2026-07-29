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
import { stopDefaultAgentRunEventPipeline } from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { seedInternalServerBaseUrlFromListenAddress } from "../config/server-runtime-endpoints.js";
import { createApplicationPlatformRuntimeGraph } from "../application-platform/runtime/create-application-platform-runtime-graph.js";
import { buildStandaloneApplicationServerComposition } from "../compositions/build-standalone-application-server-composition.js";
import {
  resolveStandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfigInput,
} from "./config/standalone-application-host-config.js";
import { materializeStandaloneHostConfig } from "./config/standalone-host-config-materializer.js";
import { StandaloneApplicationSelectionService } from "./services/standalone-application-selection-service.js";
import { createApplicationDefinitionServices } from "../application-platform/runtime/create-application-definition-services.js";

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
  let app: FastifyInstance | null = null;
  let processResources: StandaloneProcessResources | null = null;
  try {
    processResources = await initializeStandaloneProcessResources(config);
    const { selection, bundleService } =
      await new StandaloneApplicationSelectionService().resolve(config);
    const definitionServices = createApplicationDefinitionServices({
      appConfig: processResources.appConfig,
      bundleService,
    });
    const graph = createApplicationPlatformRuntimeGraph({
      appConfig: processResources.appConfig,
      bundleService,
      ...definitionServices,
      selectedApplicationIds: new Set([selection.applicationId]),
    });
    app = await buildStandaloneApplicationServerComposition({
      selection,
      graph,
      loggingConfig: processResources.loggingConfig,
    });
    await graph.lifecycle.prepareBeforeListen();
    const url = await app.listen({ host: config.host, port: config.port });
    seedInternalServerBaseUrlFromListenAddress({
      requestedHost: config.host,
      listenAddress: app.server.address(),
    });
    await graph.lifecycle.recoverAfterListen();

    let closePromise: Promise<void> | null = null;
    const close = (): Promise<void> => {
      closePromise ??= (async () => {
        try {
          await app!.close();
        } finally {
          try {
            await stopDefaultAgentRunEventPipeline();
          } finally {
            await processResources!.close();
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
          await stopDefaultAgentRunEventPipeline();
        } finally {
          await processResources.close();
        }
      }
    }
    throw error;
  }
};
