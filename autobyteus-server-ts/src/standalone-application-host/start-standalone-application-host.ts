import { NativeCommandShutdown } from "../compositions/native-command-shutdown.js";
import "reflect-metadata";
import type { FastifyInstance } from "fastify";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { configureFileToolDeniedPaths } from "autobyteus-ts/tools/file/workspace-path-utils.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getLoggingConfigFromEnv } from "../config/logging-config.js";
import {
  initializeRuntimeLoggerBootstrap,
} from "../logging/runtime-logger-bootstrap.js";
import {
  createServerLogger,
  initializeServerAppLogger,
} from "../logging/server-app-logger.js";
import { runMigrations } from "../startup/migrations.js";
import { disableEnvironmentProviderApiKeySource } from "autobyteus-ts/secrets/provider-api-key-resolver.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import {
  selectedTestVaultPaths,
  selectSecretVaultSource,
} from "../secret-management/secret-vault-source.js";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";
import { getAppDataMigrationRunner } from "../app-data-migrations/app-data-migration-runner.js";
import {
  resetDefaultAgentRunEventPipeline,
  stopDefaultAgentRunEventPipeline,
} from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { buildApplicationPlatformRuntime } from "../application-platform/runtime/build-application-platform-runtime.js";
import { buildStandaloneApplicationServer } from "../compositions/build-standalone-application-server.js";
import {
  resolveStandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfig,
  type StandaloneApplicationHostConfigInput,
} from "./config/standalone-application-host-config.js";
import { materializeStandaloneHostConfig } from "./config/standalone-host-config-materializer.js";
import { validateStandaloneApplicationPackage } from "../application-platform/launch-configuration/application-standalone-package-validator.js";
import {
  createAgentToolsMcpHost,
  type AgentToolsMcpHost,
} from "../agent-tools/mcp/agent-tools-mcp-host.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  getGeneralProcessPublishedArtifactPublisher,
} from "../services/published-artifacts/published-artifact-publication-service.js";
import {
  createGeneralProcessRunSupervisor,
  type GeneralProcessRunSupervisor,
} from "../agent-execution/runtime/general-process-run-supervisor.js";
import { assertTokenUsageCurrentSchema } from "../startup/token-usage-current-schema-readiness.js";
import { createContextFilePathEnvironment } from "../context-files/domain/context-file-path-environment.js";
import { configureTokenUsageCapability } from "../token-usage/providers/token-usage-capability.js";
import { applyCapabilityReadiness, markCapabilitiesPending } from "../startup/app-data-capability-readiness.js";
import { RootRunPackageReadinessIndex } from "../run-history/services/root-run-package-readiness-index.js";
import {
  createHostDefinitionServices,
  type HostDefinitionServices,
} from "../compositions/host-definition-services.js";
import { getWorkspaceManager } from "../workspaces/workspace-manager.js";
import { getRuntimeAvailabilityService } from "../runtime-management/runtime-availability-service.js";
import { getModelCatalogService } from "../llm-management/services/model-catalog-service.js";
import { RunModelSelectionService } from "../llm-management/services/run-model-selection-service.js";
import { getModelAvailabilityService } from "../llm-management/services/model-availability-service.js";
import { getLlmProviderService } from "../llm-management/llm-providers/services/llm-provider-service.js";
import { getCodexAppServerClientManager } from "../runtime-management/codex/client/codex-app-server-client-manager.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { createProcessAgentProviderFactoryBuilder } from "../compositions/create-process-agent-provider-factory-builder.js";
import { getActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { TaskExecutionResourcePort } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import { composeProjectTaskExecutionResources, releaseProjectTaskExecutionResources } from "../compositions/project-task-execution-resource-composition.js";
import { createSkillUpdateNotices, type SkillUpdateNotices } from "../skill-update-notices/skill-update-notices.js";
import { createToolListUpdates, type ToolListUpdates } from "../tool-list-updates/tool-list-updates.js";
import { AgentRunPlatformNotices } from "../agent-execution/domain/agent-run-platform-notices.js";

const logger = createServerLogger("standalone.application-host");

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

const initializeStandaloneProcessResources = async (
  config: StandaloneApplicationHostConfig,
): Promise<StandaloneProcessResources> => {
  // The host owns its vault: autobyteus-ts must never read AUTOBYTEUS_TEST_VAULT itself here.
  disableEnvironmentProviderApiKeySource();
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
    const vaultSource = selectSecretVaultSource({
      testVaultSetting: appConfig.get(TEST_VAULT_SETTING_NAME),
      appDataDir: appConfig.getAppDataDir(),
      databaseLocation,
    });
    configureFileToolDeniedPaths([
      databaseLocation.databasePath,
      databaseLocation.rootKeyPath,
      `${databaseLocation.databasePath}-wal`,
      `${databaseLocation.databasePath}-shm`,
      `${databaseLocation.databasePath}-journal`,
      ...selectedTestVaultPaths(vaultSource),
    ]);
    prismaInitializationStarted = true;
    await initializePrisma({ datasourceUrl: databaseLocation.databaseUrl });
    try {
      await assertTokenUsageCurrentSchema();
      markCapabilitiesPending();
    } catch (error) {
      const reason = `Required current token-usage schema is unavailable: ${String(error)}`;
      configureTokenUsageCapability({
        kind: "CRITICAL_CURRENT_SCHEMA_FAILURE",
        reason,
      });
      throw new Error(reason, { cause: error });
    }
    vaultInitializationStarted = true;
    await getSecretVaultRuntime().initialize(vaultSource);
    const runner = getAppDataMigrationRunner();
    const statuses = await runner.runPending();
    for (const migration of statuses) {
      if (migration.status === "FAILED" || migration.status === "RUNNING") {
        logger.warn(
          `Standalone app-data migration '${migration.migrationId}' is ${migration.status}: `
          + `${migration.errorMessage ?? "no detail"}`,
        );
      }
    }
    applyCapabilityReadiness(await runner.capabilityReadiness());
    await new RootRunPackageReadinessIndex(appConfig.getMemoryDir()).rebuild();
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
  const nativeShutdown = new NativeCommandShutdown();
  let app: FastifyInstance | null = null;
  let processResources: StandaloneProcessResources | null = null;
  let agentToolsMcpHost: AgentToolsMcpHost | null = null;
  let generalProcessAuthority: ScopedAgentToolMcpSessionAuthority | null = null;
  let generalProcessRunSupervisor:
    GeneralProcessRunSupervisor | null = null;
  let skillUpdateNotices: SkillUpdateNotices | null = null;
  let toolListUpdates: ToolListUpdates | null = null;
  let taskExecutionResources: TaskExecutionResourcePort | null = null;
  let hostDefinitionServices: HostDefinitionServices | null = null;
  try {
    processResources = await initializeStandaloneProcessResources(config);
    await resetDefaultAgentRunEventPipeline();
    const { selection, bundleService } = validatedPackage;
    hostDefinitionServices = createHostDefinitionServices({
      appConfig: processResources.appConfig,
      bundleService,
    });
    const definitionProblems = (await hostDefinitionServices.definitionAdmissionService.scan())
      .filter((result) => result.status === "unavailable");
    for (const diagnostic of definitionProblems) {
      console.warn(`DEFINITION_ADMISSION_UNAVAILABLE:${diagnostic.subjectKind}:${diagnostic.definitionId ?? "unknown"}:${diagnostic.code}:${diagnostic.definitionPath}`);
    }
    const workspaceManager = getWorkspaceManager();
    const contextFilePathEnvironment = createContextFilePathEnvironment({
      appDataDir: processResources.appConfig.getAppDataDir(),
      baseUrl: processResources.appConfig.getBaseUrl(),
    });
    agentToolsMcpHost = createAgentToolsMcpHost({
      loggingConfig: processResources.loggingConfig,
    });
    const agentProviderFactoryBuilder = createProcessAgentProviderFactoryBuilder({
      workspaceManager, nativeCommandProcessScope: nativeShutdown.scope,
    });
    const modelCatalogService = getModelCatalogService();
    const modelSelectionValidator = new RunModelSelectionService(modelCatalogService);
    const generalAssembly = agentToolsMcpHost.sessionAuthorities.begin({
      scopeIdentity: "general-process",
    });
    generalProcessAuthority = generalAssembly.complete({
      executionCapabilities: {
        publishedArtifactPublisher: getGeneralProcessPublishedArtifactPublisher(),
        applicationAgentTools: null,
      },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    taskExecutionResources = await composeProjectTaskExecutionResources({
      activeRootDirectory: getActiveCollaborationRootDirectory(), appDataDir: processResources.appConfig.getAppDataDir() });
    skillUpdateNotices = createSkillUpdateNotices({
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
    });
    toolListUpdates = createToolListUpdates({
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      definitionChanges: hostDefinitionServices.agentDefinitionChanges,
    });
    generalProcessRunSupervisor =
      createGeneralProcessRunSupervisor({
        memoryDir: processResources.appConfig.getMemoryDir(),
        contextFilePathEnvironment,
        agentDefinitionService: hostDefinitionServices.agentDefinitionService,
        agentTeamDefinitionService: hostDefinitionServices.agentTeamDefinitionService,
        agentOrgDefinitionService: hostDefinitionServices.agentOrgDefinitionService,
        definitionAdmissionService: hostDefinitionServices.definitionAdmissionService,
        workspaceManager,
        agentProviderFactoryBuilder,
        // The standalone application host gives its runs no integration access in this step.
        integrationRunAccess: null,
        agentToolMcpSessionAuthority: generalProcessAuthority,
        modelSelectionValidator,
        taskExecutionResources,
        // One notice slot: tool list updates first, then skill notices (one notice per input).
        platformInputNotices: new AgentRunPlatformNotices([toolListUpdates.service, skillUpdateNotices.service]),
      });
    generalProcessAuthority = null;
    const applicationRuntime = buildApplicationPlatformRuntime({
      appConfig: processResources.appConfig,
      contextFilePathEnvironment,
      bundleService,
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      agentTeamDefinitionService: hostDefinitionServices.agentTeamDefinitionService,
      agentToolMcpSessionAuthorities: agentToolsMcpHost.sessionAuthorities,
      agentProviderFactoryBuilder,
      workspaceManager,
      runtimeAvailabilityService: getRuntimeAvailabilityService(),
      modelCatalogService,
      modelSelectionValidator,
      modelAvailabilityService: getModelAvailabilityService(),
      llmProviderService: getLlmProviderService(),
      codexClientManager: getCodexAppServerClientManager(),
      requireCurrentModelIdentifier: (modelIdentifier) =>
        LLMFactory.requireCurrentModelIdentifier(modelIdentifier),
      staticAdapterToolNames: agentToolsMcpHost.staticAdapterToolNames,
      selectedApplicationIds: new Set([selection.applicationId]),
    });
    app = await buildStandaloneApplicationServer({
      selection,
      applicationRuntime,
      loggingConfig: processResources.loggingConfig,
    });
    nativeShutdown.install(app);
    await applicationRuntime.lifecycle.prepareBeforeListen();
    await agentToolsMcpHost.listen();
    const url = await app.listen({ host: config.host, port: config.port });
    await applicationRuntime.lifecycle.recoverAfterListen();

    let closePromise: Promise<void> | null = null;
    const close = (): Promise<void> => {
      closePromise ??= nativeShutdown.close(async () => {
        try {
          await app!.close();
        } finally {
          // Tool list updates and skill notices stop first, so none go out while runs stop.
          await toolListUpdates?.close().catch((error) => console.warn("TOOL_LIST_UPDATES_CLOSE_FAILED", error));
          await skillUpdateNotices?.close().catch((error) => console.warn("SKILL_UPDATE_NOTICES_CLOSE_FAILED", error));
          try {
            await generalProcessRunSupervisor!.close();
          } finally {
            releaseProjectTaskExecutionResources(taskExecutionResources!);
            try {
              await agentToolsMcpHost!.close();
            } finally {
              try {
                await stopDefaultAgentRunEventPipeline();
              } finally {
                try {
                  hostDefinitionServices!.close();
                } finally {
                  await processResources!.close();
                }
              }
            }
          }
        }
      });
      return closePromise;
    };
    return Object.freeze({
      config,
      applicationId: selection.applicationId,
      url: url.replace(/\/$/, ""),
      close,
    });
  } catch (error) {
    await nativeShutdown.close(async () => {
    try {
      if (app) {
        await app.close();
      }
    } finally {
      await toolListUpdates?.close().catch(() => undefined);
      await skillUpdateNotices?.close().catch(() => undefined);
      if (processResources) {
        try {
          await generalProcessRunSupervisor?.close();
        } finally {
          if (taskExecutionResources) releaseProjectTaskExecutionResources(taskExecutionResources);
          try {
            generalProcessAuthority?.close();
          } finally {
            try {
              await agentToolsMcpHost?.close();
            } finally {
              try {
                await stopDefaultAgentRunEventPipeline();
              } finally {
                try {
                  hostDefinitionServices?.close();
                } finally {
                  await processResources.close();
                }
              }
            }
          }
        }
      }
    }
    });
    throw error;
  }
};
