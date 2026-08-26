import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { shutdownPrisma } from "repository_prisma";
import type { AppConfig } from "../config/app-config.js";
import type { LoggingConfig } from "../config/logging-config.js";
import { getFastifyLoggerOptions } from "../logging/runtime-logger-bootstrap.js";
import { registerHttpAccessLogPolicy } from "../logging/http-access-log-policy.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../api/fastify-runtime-config.js";
import { registerAgentToolsMcpRoutes } from "../agent-tools/mcp/agent-tools-mcp-routes.js";
import { registerMcpGatewayRoutes } from "../mcp-gateway/mcp-gateway-routes.js";
import { registerRemoteAccessPolicyPlugin } from "../api/security/remote-access-policy-plugin.js";
import { registerMobileWebStaticRoutes } from "../api/static/mobile-web.js";
import { registerRestRoutes } from "../api/rest/index.js";
import { registerWebsocketRoutes } from "../api/websocket/index.js";
import { registerGraphql } from "../api/graphql/index.js";
import { ApplicationPackageRootSettingsStore } from "../application-packages/stores/application-package-root-settings-store.js";
import { ApplicationPackageRegistryStore } from "../application-packages/stores/application-package-registry-store.js";
import { BuiltInApplicationPackageMaterializer } from "../application-packages/services/built-in-application-package-materializer.js";
import { ApplicationPackageRegistryService } from "../application-packages/services/application-package-registry-service.js";
import { ApplicationPackageCommandService } from "../application-packages/services/application-package-command-service.js";
import { ApplicationCatalogRefreshCoordinator } from "../application-packages/services/application-catalog-refresh-coordinator.js";
import { FileApplicationBundleProvider } from "../application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";
import { ApplicationCapabilityService } from "../application-capability/services/application-capability-service.js";
import { buildApplicationPlatformRuntime } from "../application-platform/runtime/build-application-platform-runtime.js";
import type { ApplicationPlatformRuntime } from "../application-platform/runtime/application-platform-runtime.js";
import { configureStudioApplicationApiServices } from "../api/graphql/studio-application-api-services.js";
import { stopMemorySyncWorker } from "../memory-sync/source/memory-sync-worker.js";
import { stopChannelRunOutputDeliveryRuntime } from "../external-channel/runtime/channel-run-output-runtime-singleton.js";
import { stopGatewayCallbackDeliveryRuntime } from "../external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "../managed-capabilities/messaging-gateway/defaults.js";
import { stopDefaultAgentRunEventPipeline } from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import {
  createAgentToolsMcpRuntime,
  type AgentToolsMcpRuntime,
} from "../agent-tools/mcp/agent-tools-mcp-runtime.js";
import { getGeneralProcessPublishedArtifactPublisher } from "../services/published-artifacts/published-artifact-publication-service.js";
import { StudioRunModelConfigService } from "../run-history/services/studio-run-model-config-service.js";
import {
  createGeneralProcessRunSupervisor,
  type GeneralProcessRunSupervisor,
} from "../agent-execution/runtime/general-process-run-supervisor.js";
import {
  createHostDefinitionServices,
  type HostDefinitionServices,
} from "./host-definition-services.js";

export type StudioServer = Readonly<{
  fastify: FastifyInstance;
  applicationRuntime: ApplicationPlatformRuntime;
  packageRegistryService: ApplicationPackageRegistryService;
}>;

type StudioApiHandle = ReturnType<typeof configureStudioApplicationApiServices>;

const closeStudioProcessResources = async (input: {
  hostDefinitionServices: HostDefinitionServices;
  agentToolsMcpRuntime: AgentToolsMcpRuntime | null;
  generalProcessRunSupervisor: GeneralProcessRunSupervisor | null;
  studioApiHandle: StudioApiHandle | null;
}): Promise<void> => {
  stopMemorySyncWorker();
  try {
    await input.generalProcessRunSupervisor?.close();
  } finally {
    try {
      input.agentToolsMcpRuntime?.close();
    } finally {
      try {
        input.studioApiHandle?.close();
      } finally {
        try {
          await stopChannelRunOutputDeliveryRuntime();
        } finally {
          try {
            await stopGatewayCallbackDeliveryRuntime();
          } finally {
            try {
              await getManagedMessagingGatewayService().close();
            } finally {
              try {
                await stopDefaultAgentRunEventPipeline();
              } finally {
                try {
                  input.hostDefinitionServices.close();
                } finally {
                  try {
                    await getSecretVaultRuntime().close();
                  } finally {
                    await shutdownPrisma();
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const createStudioPackageServices = (appConfig: AppConfig) => {
  const packageRegistryService = new ApplicationPackageRegistryService({
    rootSettingsStore: new ApplicationPackageRootSettingsStore(appConfig),
    registryStore: new ApplicationPackageRegistryStore(appConfig),
    builtInMaterializer: new BuiltInApplicationPackageMaterializer(appConfig),
  });
  const bundleProvider = new FileApplicationBundleProvider();
  const bundleService = new ApplicationBundleService({
    provider: bundleProvider,
    packageRegistryService,
  });
  return { packageRegistryService, bundleProvider, bundleService };
};

const createStudioApplicationServices = (input: {
  appConfig: AppConfig;
  packages: ReturnType<typeof createStudioPackageServices>;
  definitions: HostDefinitionServices;
  agentToolsMcpRuntime: AgentToolsMcpRuntime;
}) => {
  const applicationRuntime = buildApplicationPlatformRuntime({
    appConfig: input.appConfig,
    bundleService: input.packages.bundleService,
    agentDefinitionService: input.definitions.agentDefinitionService,
    agentTeamDefinitionService: input.definitions.agentTeamDefinitionService,
    agentToolsSessionFactory: input.agentToolsMcpRuntime,
  });
  const catalogRefreshCoordinator = new ApplicationCatalogRefreshCoordinator({
    bundleService: input.packages.bundleService,
    catalogReconciliation: applicationRuntime.hostManagement.catalogReconciliation,
    agentDefinitionService: input.definitions.agentDefinitionService,
    agentTeamDefinitionService: input.definitions.agentTeamDefinitionService,
  });
  const packageCommandService = new ApplicationPackageCommandService({
    registry: input.packages.packageRegistryService,
    provider: input.packages.bundleProvider,
    refreshCoordinator: catalogRefreshCoordinator,
  });
  return { applicationRuntime, packageCommandService };
};

export const buildStudioServer = async (input: {
  appConfig: AppConfig;
  loggingConfig: LoggingConfig;
}): Promise<StudioServer> => {
  const packages = createStudioPackageServices(input.appConfig);
  const hostDefinitionServices = createHostDefinitionServices({
    appConfig: input.appConfig,
    bundleService: packages.bundleService,
  });
  let agentToolsMcpRuntime: AgentToolsMcpRuntime | null = null;
  let generalProcessRunSupervisor: GeneralProcessRunSupervisor | null = null;
  let studioApiHandle: StudioApiHandle | null = null;
  let applicationRuntime: ApplicationPlatformRuntime | null = null;
  let processResourcesClosed = false;
  const closeProcessResources = async (): Promise<void> => {
    if (processResourcesClosed) return;
    processResourcesClosed = true;
    await closeStudioProcessResources({
      hostDefinitionServices,
      agentToolsMcpRuntime,
      generalProcessRunSupervisor,
      studioApiHandle,
    });
  };

  try {
    agentToolsMcpRuntime = createAgentToolsMcpRuntime({
      generalProcessPublisher: getGeneralProcessPublishedArtifactPublisher(),
    });
    generalProcessRunSupervisor = createGeneralProcessRunSupervisor({
      appConfig: input.appConfig,
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      agentTeamDefinitionService: hostDefinitionServices.agentTeamDefinitionService,
      agentToolsSessionManager: agentToolsMcpRuntime.generalProcessSessionManager,
    });
    const applicationServices = createStudioApplicationServices({
      appConfig: input.appConfig,
      packages,
      definitions: hostDefinitionServices,
      agentToolsMcpRuntime,
    });
    const currentApplicationRuntime = applicationServices.applicationRuntime;
    applicationRuntime = currentApplicationRuntime;
    const runModelConfigService = new StudioRunModelConfigService({
      applicationRunOwnership: currentApplicationRuntime.hostManagement.runOwnership,
      agentResumeConfigService: generalProcessRunSupervisor.agentRunResumeConfigService,
      teamResumeConfigService: generalProcessRunSupervisor.teamRunHistoryService,
      agentRunService: generalProcessRunSupervisor.agentRunService,
      teamRunService: generalProcessRunSupervisor.teamRunService,
    });
    studioApiHandle = configureStudioApplicationApiServices({
      bundleService: packages.bundleService,
      capabilityService: new ApplicationCapabilityService({
        applicationBundleService: packages.bundleService,
      }),
      packageQueries: packages.packageRegistryService,
      packageCommands: applicationServices.packageCommandService,
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      agentTeamDefinitionService: hostDefinitionServices.agentTeamDefinitionService,
      agentRunService: generalProcessRunSupervisor.agentRunService,
      teamRunService: generalProcessRunSupervisor.teamRunService,
      runModelConfigService,
    });

    const app = fastify({
      logger: getFastifyLoggerOptions(input.loggingConfig),
      disableRequestLogging: true,
      maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
    });
    app.addHook("onClose", async () => {
      try {
        await currentApplicationRuntime.lifecycle.stop();
      } finally {
        await closeProcessResources();
      }
    });
    try {
      registerHttpAccessLogPolicy(app, {
        mode: input.loggingConfig.httpAccessLogMode,
        includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
      });
      await registerAgentToolsMcpRoutes(app, agentToolsMcpRuntime.routeDependencies);
      await registerMcpGatewayRoutes(app);
      await app.register(cors, {
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      });
      await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
      await app.register(websocket);
      await registerRemoteAccessPolicyPlugin(app);
      await registerMobileWebStaticRoutes(app);
      await app.register(
        async (restApp) => registerRestRoutes(restApp, {
          lifecycleReadiness: currentApplicationRuntime.lifecycle,
          application: currentApplicationRuntime.rest,
        }),
        { prefix: "/rest" },
      );
      await registerWebsocketRoutes(app, {
        lifecycleReadiness: currentApplicationRuntime.lifecycle,
        application: currentApplicationRuntime.realtime,
      });
      await registerGraphql(app);
      return Object.freeze({
        fastify: app,
        applicationRuntime: currentApplicationRuntime,
        packageRegistryService: packages.packageRegistryService,
      });
    } catch (error) {
      await app.close();
      throw error;
    }
  } catch (error) {
    try {
      await applicationRuntime?.lifecycle.stop();
    } finally {
      await closeProcessResources();
    }
    throw error;
  }
};
