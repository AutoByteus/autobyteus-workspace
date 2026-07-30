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
import { FileApplicationBundleProvider } from "../application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";
import { createApplicationPlatformRuntimeGraph } from "../application-platform/runtime/create-application-platform-runtime-graph.js";
import type { ApplicationPlatformRuntimeGraph } from "../application-platform/runtime/application-platform-runtime-graph.js";
import { createApplicationDefinitionServices } from "../application-platform/runtime/create-application-definition-services.js";
import { configureStudioApplicationApiAuthorities } from "../api/graphql/studio-application-api-authorities.js";
import { stopMemorySyncWorker } from "../memory-sync/source/memory-sync-worker.js";
import { stopChannelRunOutputDeliveryRuntime } from "../external-channel/runtime/channel-run-output-runtime-singleton.js";
import { stopGatewayCallbackDeliveryRuntime } from "../external-channel/runtime/gateway-callback-delivery-runtime.js";
import { getManagedMessagingGatewayService } from "../managed-capabilities/messaging-gateway/defaults.js";
import { stopDefaultAgentRunEventPipeline } from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import {
  createAgentToolsMcpProcessAuthority,
  type AgentToolsMcpProcessAuthority,
} from "../agent-tools/mcp/agent-tools-mcp-process-authority.js";
import {
  getPublishedArtifactPublicationService,
} from "../services/published-artifacts/published-artifact-publication-service.js";
import {
  GeneralProcessRunAuthority,
} from "../agent-execution/runtime/general-process-run-authority.js";

export type StudioServerComposition = Readonly<{
  app: FastifyInstance;
  applicationGraph: ApplicationPlatformRuntimeGraph;
  packageRegistryService: ApplicationPackageRegistryService;
}>;

const closeStudioProcessResources = async (input: {
  agentToolsProcessAuthority: AgentToolsMcpProcessAuthority;
  generalProcessRunAuthority: GeneralProcessRunAuthority;
}): Promise<void> => {
  stopMemorySyncWorker();
  try {
    await input.generalProcessRunAuthority.close();
  } finally {
    try {
      input.agentToolsProcessAuthority.close();
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
};

const createStudioApplicationAuthorities = (
  appConfig: AppConfig,
  agentToolsProcessAuthority: AgentToolsMcpProcessAuthority,
) => {
  let bundleService!: ApplicationBundleService;
  let applicationGraph!: ApplicationPlatformRuntimeGraph;
  let definitionServices!: ReturnType<typeof createApplicationDefinitionServices>;
  const packageRegistryService = new ApplicationPackageRegistryService({
    rootSettingsStore: new ApplicationPackageRootSettingsStore(appConfig),
    registryStore: new ApplicationPackageRegistryStore(appConfig),
    builtInMaterializer: new BuiltInApplicationPackageMaterializer(appConfig),
    refreshApplicationBundles: () => bundleService.refresh(),
    refreshAgentDefinitions: () => definitionServices.agentDefinitionService.refreshCache(),
    refreshAgentTeams: () => definitionServices.agentTeamDefinitionService.refreshCache(),
    validateApplicationPackageContents: (packageRoot, packageId) =>
      bundleService.validatePackageRoot(packageRoot, packageId),
    applicationBundleService: {
      getCatalogSnapshot: () => bundleService.getCatalogSnapshot(),
    },
    availabilityService: {
      reconcileCatalogSnapshotWithKnownApplications: (...args) =>
        applicationGraph.availabilityService
          .reconcileCatalogSnapshotWithKnownApplications(...args),
    },
    platformStateStore: {
      listKnownApplicationIds: () =>
        applicationGraph.platformStateStore.listKnownApplicationIds(),
    },
  });
  bundleService = new ApplicationBundleService({
    provider: new FileApplicationBundleProvider(),
    packageRegistryService,
  });
  definitionServices = createApplicationDefinitionServices({
    appConfig,
    bundleService,
  });
  applicationGraph = createApplicationPlatformRuntimeGraph({
    appConfig,
    bundleService,
    ...definitionServices,
    agentToolsSessionAuthorityFactory:
      agentToolsProcessAuthority,
  });
  return {
    packageRegistryService,
    bundleService,
    applicationGraph,
    ...definitionServices,
  };
};

export const buildStudioServerComposition = async (input: {
  appConfig: AppConfig;
  loggingConfig: LoggingConfig;
}): Promise<StudioServerComposition> => {
  const agentToolsProcessAuthority =
    createAgentToolsMcpProcessAuthority({
      generalProcessPublication:
        getPublishedArtifactPublicationService(),
    });
  const generalProcessRunAuthority =
    new GeneralProcessRunAuthority(
      agentToolsProcessAuthority.generalProcessSessionAuthority,
    );
  let studioAuthorities:
    ReturnType<typeof createStudioApplicationAuthorities>;
  try {
    studioAuthorities = createStudioApplicationAuthorities(
      input.appConfig,
      agentToolsProcessAuthority,
    );
  } catch (error) {
    await closeStudioProcessResources({
      agentToolsProcessAuthority,
      generalProcessRunAuthority,
    });
    throw error;
  }
  const {
    packageRegistryService,
    bundleService,
    applicationGraph,
    agentDefinitionService,
    agentTeamDefinitionService,
  } = studioAuthorities;
  configureStudioApplicationApiAuthorities({
    bundleService,
    packageRegistryService,
    agentDefinitionService,
    agentTeamDefinitionService,
  });

  const app = fastify({
    logger: getFastifyLoggerOptions(input.loggingConfig),
    disableRequestLogging: true,
    maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
  });
  app.addHook("onClose", async () => {
    try {
      await applicationGraph.lifecycle.stop();
    } finally {
      await closeStudioProcessResources({
        agentToolsProcessAuthority,
        generalProcessRunAuthority,
      });
    }
  });
  try {
    registerHttpAccessLogPolicy(app, {
      mode: input.loggingConfig.httpAccessLogMode,
      includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
    });
    await registerAgentToolsMcpRoutes(
      app,
      agentToolsProcessAuthority.routeDependencies,
    );
    await registerMcpGatewayRoutes(app);
    await app.register(cors, {
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
    await app.register(multipart, {
      limits: { fileSize: 25 * 1024 * 1024 },
    });
    await app.register(websocket);
    await registerRemoteAccessPolicyPlugin(app);
    await registerMobileWebStaticRoutes(app);
    await app.register(
      async (restApp) => registerRestRoutes(restApp, applicationGraph),
      { prefix: "/rest" },
    );
    await registerWebsocketRoutes(app, applicationGraph);
    await registerGraphql(app);
    return Object.freeze({
      app,
      applicationGraph,
      packageRegistryService,
    });
  } catch (error) {
    await app.close();
    throw error;
  }
};
