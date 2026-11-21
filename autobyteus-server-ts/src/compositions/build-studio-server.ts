import { createCredentialProxyHost, type CredentialProxyHost } from "../credential-proxy/credential-proxy-host.js";
import { composeRemoteFiles } from "./remote-files-composition.js";
import type { RemoteFiles } from "../agent-collaboration/execution/remote/transferred-files.js";
import type { StoredModelOfferCheck } from "../llm-management/services/run-model-selection-service.js";
import type { ProviderRelayAccess } from "../credential-proxy/provider-relays/provider-relay-access.js";
import { setProcessProviderRelayAccess } from "../credential-proxy/provider-relays/provider-relay-process-access.js";
import type { RunPassRevocation } from "../credential-proxy/run-pass-revocation.js";
import { NativeCommandShutdown } from "./native-command-shutdown.js";
import fastify, { LogController, type FastifyInstance } from "fastify";
import { installClientConnectionClose } from "../shutdown/client-connection-close.js";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import type { AppConfig } from "../config/app-config.js";
import type { LoggingConfig } from "../config/logging-config.js";
import { getFastifyLoggerOptions } from "../logging/runtime-logger-bootstrap.js";
import { registerHttpAccessLogPolicy } from "../logging/http-access-log-policy.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../api/fastify-runtime-config.js";
import { registerMcpGatewayRoutes } from "../mcp-gateway/mcp-gateway-routes.js";
import { registerRemoteAccessHostGate } from "../api/security/remote-access-host-gate.js";
import { registerNodeAccessPlugin } from "../api/security/node-access-plugin.js";
import { startNodeAccess, type NodeAccess } from "./node-access-composition.js";
import { registerMobileWebStaticRoutes } from "../api/static/mobile-web.js";
import { registerRestRoutes } from "../api/rest/index.js";
import { registerWebsocketRoutes } from "../api/websocket/index.js";
import { registerGraphql } from "../api/graphql/index.js";
import { ApplicationPackageRegistryService } from "../application-packages/services/application-package-registry-service.js";
import { ApplicationPackageCommandService } from "../application-packages/services/application-package-command-service.js";
import { ApplicationCapabilityService } from "../application-capability/services/application-capability-service.js";
import { buildApplicationPlatformRuntime } from "../application-platform/runtime/build-application-platform-runtime.js";
import type { ApplicationPlatformRuntime } from "../application-platform/runtime/application-platform-runtime.js";
import { configureStudioApplicationApiServices } from "../api/graphql/studio-application-api-services.js";
import {
  createAgentToolsMcpHost,
  type AgentToolsMcpHost,
} from "../agent-tools/mcp/agent-tools-mcp-host.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { getGeneralProcessPublishedArtifactPublisher } from "../services/published-artifacts/published-artifact-publication-service.js";
import { StudioRunModelConfigService } from "../run-history/services/studio-run-model-config-service.js";
import { createStudioPackageServices } from "./studio-package-services.js";
import { composeStudioRemoteCollaboration, createLateRemoteCollaborationBinding, type LateRemoteCollaborationBinding } from "./remote-collaboration-composition.js";
import { createCollaborationRootResolver } from "./collaboration-root-resolver.js";
import { composeRunningAgents } from "./running-agents-composition.js";
import { composeCollaboration, composeTaskSide, type Collaboration, type TaskSide } from "./collaboration-composition.js";
import { createAgentStreamHandler } from "../services/agent-streaming/agent-stream-handler.js";
import { composeRestartResume, type RestartResume } from "./restart-resume-composition.js";
import { RestartReminderService } from "../restart-resume/restart-reminder-service.js";
import { restartReminderRecordPath } from "../restart-resume/restart-reminder-record.js";
import { getStandaloneAgentRunRootManager } from "../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import {
  createGeneralProcessRunSupervisor,
  type GeneralProcessRunSupervisor,
} from "../agent-execution/runtime/general-process-run-supervisor.js";
import {
  createHostDefinitionServices,
  type HostDefinitionServices,
} from "./host-definition-services.js";
import { getWorkspaceManager } from "../workspaces/workspace-manager.js";
import { getRuntimeAvailabilityService } from "../runtime-management/runtime-availability-service.js";
import {
  getModelCatalogService,
  type ModelCatalogService,
} from "../llm-management/services/model-catalog-service.js";
import {
  RunModelSelectionService,
  type RunModelSelectionValidator,
} from "../llm-management/services/run-model-selection-service.js";
import { getModelAvailabilityService } from "../llm-management/services/model-availability-service.js";
import { getLlmProviderService } from "../llm-management/llm-providers/services/llm-provider-service.js";
import { getCodexAppServerClientManager } from "../runtime-management/codex/client/codex-app-server-client-manager.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import type { WorkspaceManager } from "../workspaces/workspace-manager.js";
import type { AgentProviderFactoryBuilder } from "../agent-execution/providers/agent-provider-factory-builder.js";
import { createProcessAgentProviderFactoryBuilder } from "./create-process-agent-provider-factory-builder.js";
import {
  createContextFilePathEnvironment,
  type ContextFilePathEnvironment,
} from "../context-files/domain/context-file-path-environment.js";
import { getActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { composeAgentPackageDefinitionFeed, type AgentPackageDefinitionFeed } from "./agent-package-definition-feed-composition.js";
import { closeStudioProcessResources, stopStudioFileWatchesForProcessExit, type StudioApiHandle } from "./studio-process-resources.js";
import { createPlatformNoticeSources, type PlatformNoticeSources } from "./platform-notice-sources.js";
import { getWorkJournalService } from "../agent-work-journal/services/work-journal-service.js";
import {
  createEpisodicCatalog, releaseProcessEpisodicCatalog, setProcessEpisodicCatalog, type EpisodicCatalog,
} from "../agent-episodic-catalog/services/episodic-catalog.js";
import { readPendingRuntimeHandover } from "../agent-memory/services/runtime-handover-reader.js";
import { RuntimeSwitchRecorder } from "../agent-memory/services/runtime-switch-recorder.js";
import { RuntimeHandoverNoticeService } from "../runtime-handover-notices/services/runtime-handover-notice-service.js";
import { AgentRunPlatformNotices } from "../agent-execution/domain/agent-run-platform-notices.js";
import { composeUpdateNotifications, type UpdateNotifications } from "./update-notifications-composition.js";
import { composeAgentRuntimeStatus, type AgentRuntimeStatusHandle } from "./agent-runtime-status-composition.js";
import { composeModelRouting } from "./model-routing-composition.js";

export type StudioServer = Readonly<{
  fastify: FastifyInstance;
  agentToolsMcpHost: AgentToolsMcpHost;
  /** The loopback credential proxy for integrations; listened next to the Agent Tools MCP host. */
  credentialProxyHost: CredentialProxyHost;
  applicationRuntime: ApplicationPlatformRuntime;
  packageRegistryService: ApplicationPackageRegistryService;
  /** autobyteus-285: the busy-run recorder (shutdown) and the resumer (startup). */
  restartResume: RestartResume;
  /** Process shutdown only, right before the close: ends the file watches and leaves their OS watches to the exit. */
  stopFileWatchesForProcessExit(): void;
}>;

const createStudioApplicationServices = (input: {
  appConfig: AppConfig;
  packages: ReturnType<typeof createStudioPackageServices>;
  definitions: HostDefinitionServices;
  agentToolsMcpHost: AgentToolsMcpHost;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  workspaceManager: WorkspaceManager;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  modelCatalogService: ModelCatalogService;
  modelSelectionValidator: RunModelSelectionValidator & StoredModelOfferCheck;
  providerRelayAccess: ProviderRelayAccess;
  runPasses: RunPassRevocation;
  taskSide: TaskSide;
  remote: LateRemoteCollaborationBinding;
  remoteFiles: RemoteFiles;
}) => {
  const applicationRuntime = buildApplicationPlatformRuntime({
    appConfig: input.appConfig, delegationIndex: input.taskSide.tree, viewStreams: input.taskSide.viewStreams, taskRecords: input.taskSide.taskRecords,
    contextFilePathEnvironment: input.contextFilePathEnvironment,
    bundleService: input.packages.bundleService,
    agentDefinitionService: input.definitions.agentDefinitionService,
    agentTeamDefinitionService: input.definitions.agentTeamDefinitionService,
    agentToolMcpSessionAuthorities: input.agentToolsMcpHost.sessionAuthorities,
    agentProviderFactoryBuilder: input.agentProviderFactoryBuilder,
    workspaceManager: input.workspaceManager,
    runtimeAvailabilityService: getRuntimeAvailabilityService(),
    modelCatalogService: input.modelCatalogService,
    modelSelectionValidator: input.modelSelectionValidator,
    // The studio's application launches get its provider relays and end their passes through the same host.
    providerRelayAccess: input.providerRelayAccess,
    runPasses: input.runPasses,
    remoteChannel: input.remote.channel, peerDiscovery: input.remote.discovery, remoteFiles: input.remoteFiles,
    modelAvailabilityService: getModelAvailabilityService(),
    llmProviderService: getLlmProviderService(),
    codexClientManager: getCodexAppServerClientManager(),
    requireCurrentModelIdentifier: (modelIdentifier) =>
      LLMFactory.requireCurrentModelIdentifier(modelIdentifier),
    staticAdapterToolNames: input.agentToolsMcpHost.staticAdapterToolNames,
  });
  const packageCommandService = new ApplicationPackageCommandService({
    registry: input.packages.packageRegistryService,
    provider: input.packages.bundleProvider,
    catalogTransition: applicationRuntime.hostManagement.catalogTransition,
    definitionChanges: input.definitions.agentDefinitionChanges,
  });
  return { applicationRuntime, packageCommandService };
};

export const buildStudioServer = async (input: {
  appConfig: AppConfig;
  loggingConfig: LoggingConfig;
  onCleanupOwnershipTransferred?: (close: () => Promise<void>) => void;
}): Promise<StudioServer> => {
  const nativeShutdown = new NativeCommandShutdown();
  const packages = createStudioPackageServices(input.appConfig);
  const hostDefinitionServices = createHostDefinitionServices({
    appConfig: input.appConfig,
    bundleService: packages.bundleService,
  });
  let agentPackageDefinitionFeed: AgentPackageDefinitionFeed | null = null;
  try {
    agentPackageDefinitionFeed = await composeAgentPackageDefinitionFeed({ definitions: hostDefinitionServices });
  } catch (error) {
    await nativeShutdown.close(async () => { hostDefinitionServices.close(); });
    throw error;
  }
  // Startup logs unavailable definitions; it is never blocked by the agent package definitions (BEH-008).
  try {
    const definitionProblems = (await hostDefinitionServices.definitionAdmissionService.scan())
      .filter((result) => result.status === "unavailable");
    for (const diagnostic of definitionProblems) {
      console.warn(`DEFINITION_ADMISSION_UNAVAILABLE:${diagnostic.subjectKind}:${diagnostic.definitionId ?? "unknown"}:${diagnostic.code}:${diagnostic.definitionPath}`);
    }
  } catch (error) {
    console.warn("DEFINITION_ADMISSION_STARTUP_SCAN_FAILED", error);
  }
  let agentToolsMcpHost: AgentToolsMcpHost | null = null;
  let credentialProxyHost: CredentialProxyHost | null = null;
  let generalProcessAuthority: ScopedAgentToolMcpSessionAuthority | null = null;
  let generalProcessRunSupervisor: GeneralProcessRunSupervisor | null = null;
  let platformNotices: PlatformNoticeSources | null = null;
  let updateNotifications: UpdateNotifications | null = null;
  let studioApiHandle: StudioApiHandle | null = null;
  let agentRuntimeStatus: AgentRuntimeStatusHandle | null = null;
  let applicationRuntime: ApplicationPlatformRuntime | null = null;
  let releaseRemoteCollaboration: (() => void) | null = null;
  let collaboration: Collaboration | null = null;
  let nodeAccess: NodeAccess | null = null;
  let releaseModelRouting: (() => void) | null = null;
  let episodicCatalog: EpisodicCatalog | null = null;
  let processResourcesClosed = false;
  const closeProcessResources = async (): Promise<void> => {
    if (processResourcesClosed) return;
    processResourcesClosed = true;
    await episodicCatalog?.stop();
    if (episodicCatalog) releaseProcessEpisodicCatalog(episodicCatalog);
    await nodeAccess?.close();
    releaseRemoteCollaboration?.();
    collaboration?.release();
    releaseModelRouting?.();
    await closeStudioProcessResources({
      hostDefinitionServices,
      agentPackageDefinitionFeed,
      agentToolsMcpHost,
      credentialProxyHost,
      generalProcessAuthority,
      generalProcessRunSupervisor,
      platformNotices,
      updateNotifications,
      studioApiHandle,
      agentRuntimeStatus,
    });
  };

  const stopFileWatchesForProcessExit = (): void => stopStudioFileWatchesForProcessExit({ agentPackageDefinitionFeed, platformNotices });
  // The process-shutdown cleanup until the app exists: the process exits after it.
  input.onCleanupOwnershipTransferred?.(() => {
    stopFileWatchesForProcessExit();
    return nativeShutdown.close(async () => {
      try { await applicationRuntime?.lifecycle.stop(); } finally { await closeProcessResources(); }
    });
  });

  try {
    const workspaceManager = getWorkspaceManager();
    const contextFilePathEnvironment = createContextFilePathEnvironment({
      appDataDir: input.appConfig.getAppDataDir(),
      baseUrl: input.appConfig.getBaseUrl(),
    });
    const remote = createLateRemoteCollaborationBinding(); // FU-011: composed below, after the run services; read on use
    // autobyteus-587: the node's received files and the outgoing files of cross-node messages and delegations.
    const files = composeRemoteFiles({ appDataDir: input.appConfig.getAppDataDir(), memoryDir: input.appConfig.getMemoryDir(),
      channel: remote.channel, workspaces: workspaceManager });
    agentToolsMcpHost = createAgentToolsMcpHost({
      loggingConfig: input.loggingConfig,
      peerDiscovery: remote.discovery,
    });
    credentialProxyHost = createCredentialProxyHost({ agentDefinitions: hostDefinitionServices.agentDefinitionService });
    // Before it listens: the model catalog and runtime availability read it (discovery waits for the listener).
    setProcessProviderRelayAccess(credentialProxyHost.providerRelayAccess);
    const agentProviderFactoryBuilder = createProcessAgentProviderFactoryBuilder({
      workspaceManager, nativeCommandProcessScope: nativeShutdown.scope,
    });
    const modelCatalogService = getModelCatalogService();
    const modelSelectionValidator = new RunModelSelectionService(modelCatalogService, getModelAvailabilityService());
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
    // autobyteus-461 SR-047 steps 1–2: the Task records, the tree, the run side's records (steps 4–8 follow the run services).
    const taskSide = await composeTaskSide({ appDataDir: input.appConfig.getAppDataDir(), memoryDir: input.appConfig.getMemoryDir() });
    // autobyteus-493: the run services (steps 3–8) tell the episodic catalogs about deletes; they start after step 8.
    const currentEpisodicCatalog = episodicCatalog = createEpisodicCatalog({ memoryDir: input.appConfig.getMemoryDir(),
      journals: getWorkJournalService(), tasks: taskSide.tree });
    // autobyteus-554: the Memory page's explorer reads it per request (set before the HTTP server serves; released at close).
    setProcessEpisodicCatalog(currentEpisodicCatalog);
    platformNotices = createPlatformNoticeSources({
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      definitionChanges: hostDefinitionServices.agentDefinitionChanges,
      integrationRunAccess: credentialProxyHost.runAccess,
    });
    // autobyteus-448: the pending restart reminders, for the notice slot now and the restart resumer below.
    const restartReminders = new RestartReminderService({ recordPath: restartReminderRecordPath(input.appConfig.getAppDataDir()) });
    const runtimeHandoverNotices = new RuntimeHandoverNoticeService({
      journals: getWorkJournalService(),
      readPending: readPendingRuntimeHandover,
    });
    generalProcessRunSupervisor = createGeneralProcessRunSupervisor({
      memoryDir: input.appConfig.getMemoryDir(),
      contextFilePathEnvironment,
      agentDefinitionService: hostDefinitionServices.agentDefinitionService,
      agentTeamDefinitionService: hostDefinitionServices.agentTeamDefinitionService,
      agentOrgDefinitionService: hostDefinitionServices.agentOrgDefinitionService,
      definitionAdmissionService: hostDefinitionServices.definitionAdmissionService,
      workspaceManager,
      agentProviderFactoryBuilder,
      agentToolMcpSessionAuthority: generalProcessAuthority,
      integrationRunAccess: credentialProxyHost.runAccess,
      providerRelayAccess: credentialProxyHost.providerRelayAccess,
      runPasses: credentialProxyHost.runPasses,
      modelSelectionValidator,
      taskRecords: taskSide.taskRecords, delegationIndex: taskSide.tree, viewStreams: taskSide.viewStreams, episodicCatalog: currentEpisodicCatalog,
      // One notice slot: the agent runtime hand-over first (a pending tool list notice must not delay it by one input),
      // then the restart reminder, tool list updates, skill notices and background task notices (one notice per input).
      platformInputNotices: new AgentRunPlatformNotices([runtimeHandoverNotices, restartReminders, ...platformNotices.sources]),
      definitionChanges: hostDefinitionServices.agentDefinitionChanges, teamChangeNotices: platformNotices.teamChangeNotices,
      runtimeSwitching: { memory: new RuntimeSwitchRecorder() },
      remoteChannel: remote.channel, peerDiscovery: remote.discovery,
      remoteFiles: files.remoteFiles, receivedFiles: files.receivedFiles,
    });
    generalProcessAuthority = null;
    // One root resolution for inbound remote messages and restart resume (autobyteus-285 D5).
    const rootResolver = createCollaborationRootResolver({ standaloneRoots: getStandaloneAgentRunRootManager(),
      teamRuns: generalProcessRunSupervisor.teamRunService, orgRuns: generalProcessRunSupervisor.agentOrgRunService });
    // autobyteus-492: this node's running agents, used by the peer receiver and gateway and by messages between runs.
    const running = composeRunningAgents({ memoryDir: input.appConfig.getMemoryDir(), tempWorkspaceDir: input.appConfig.getTempWorkspaceDir(),
      activeRoots: getActiveCollaborationRootDirectory(), runs: generalProcessRunSupervisor, agentDefinitions: hostDefinitionServices.agentDefinitionService });
    const remoteCollaboration = composeStudioRemoteCollaboration({
      appDataDir: input.appConfig.getAppDataDir(), memoryDir: input.appConfig.getMemoryDir(),
      tempWorkspaceDir: input.appConfig.getTempWorkspaceDir(),
      agentRuns: generalProcessRunSupervisor.agentRunService,
      teamRuns: generalProcessRunSupervisor.teamRunService,
      orgRuns: generalProcessRunSupervisor.agentOrgRunService,
      rootResolver,
      running,
      receivedFiles: files.receivedFiles,
    });
    releaseRemoteCollaboration = remoteCollaboration.release;
    remote.bind(remoteCollaboration.services);
    // autobyteus-461 SR-047 steps 4–8: the Task service, delegation and messages between runs, the views' owners, their consumers.
    const currentCollaboration = collaboration = await composeCollaboration({ memoryDir: input.appConfig.getMemoryDir(), taskSide,
      runs: generalProcessRunSupervisor, rootResolver, activeRoots: getActiveCollaborationRootDirectory(), remoteChannel: remote.channel, episodicCatalog: currentEpisodicCatalog,
      remoteFiles: files.remoteFiles, running });
    // autobyteus-587 RF-10: the startup sweep of received files no run uses and of uploads abandoned for 24 hours.
    void files.receivedFiles.sweep().catch((error: unknown) =>
      console.warn(`Received files were not swept at startup: ${error instanceof Error ? error.message : String(error)}`));
    currentEpisodicCatalog.start({ taskTitles: currentCollaboration.tasks });
    // autobyteus-437: the node access gate (every request needs a credential) and its credential services.
    const currentNodeAccess = nodeAccess = await startNodeAccess({ appDataDir: input.appConfig.getAppDataDir(), remoteCollaboration: remoteCollaboration.services });
    const restartResume = composeRestartResume({ appDataDir: input.appConfig.getAppDataDir(), rootResolver, tree: taskSide.tree, closedTasks: taskSide.closedTasks,
      orgHistory: generalProcessRunSupervisor.agentOrgRunHistoryCatalogService, reminders: restartReminders });
    const applicationServices = createStudioApplicationServices({
      appConfig: input.appConfig, taskSide,
      packages,
      definitions: hostDefinitionServices,
      agentToolsMcpHost,
      agentProviderFactoryBuilder,
      workspaceManager,
      contextFilePathEnvironment,
      modelCatalogService,
      modelSelectionValidator,
      providerRelayAccess: credentialProxyHost.providerRelayAccess,
      runPasses: credentialProxyHost.runPasses,
      remote,
      remoteFiles: files.remoteFiles,
    });
    const currentApplicationRuntime = applicationServices.applicationRuntime;
    applicationRuntime = currentApplicationRuntime;
    const runModelConfigService = new StudioRunModelConfigService({
      modelSelectionService: modelSelectionValidator,
      applicationRunOwnership: currentApplicationRuntime.hostManagement.runOwnership,
      agentResumeConfigService: generalProcessRunSupervisor.agentRunResumeConfigService,
      teamResumeConfigService: generalProcessRunSupervisor.teamRunHistoryService,
      agentRunService: generalProcessRunSupervisor.agentRunService,
      teamRunService: generalProcessRunSupervisor.teamRunService,
      launchSaved: (run) => currentCollaboration.rowChanged(run),
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
      agentOrgDefinitionService: hostDefinitionServices.agentOrgDefinitionService,
      agentRunService: generalProcessRunSupervisor.agentRunService,
      teamRunService: generalProcessRunSupervisor.teamRunService,
      agentOrgRunService: generalProcessRunSupervisor.agentOrgRunService,
      definitionAdmissionService: hostDefinitionServices.definitionAdmissionService,
      collaborationRootHistoryService: generalProcessRunSupervisor.collaborationRootHistoryService,
      runModelConfigService,
      runTree: currentCollaboration.runTree, delegatedRunAgents: currentCollaboration.delegatedRunAgents,
      runViewStreams: taskSide.viewStreams,
    });
    agentRuntimeStatus = composeAgentRuntimeStatus({
      codexClientManager: getCodexAppServerClientManager(),
      applicationActiveAgentRuns: currentApplicationRuntime.hostManagement.activeAgentRuns,
    });
    // autobyteus-32: the node's Model Routing (it reads the runtime report composed just above).
    releaseModelRouting = composeModelRouting({ appDataDir: input.appConfig.getAppDataDir(), modelSelectionValidator }).close;
    // After the runtime status: the background pass checks and updates the runtimes through it (AR-006).
    updateNotifications = composeUpdateNotifications({ runtimes: agentRuntimeStatus.service });

    const app = fastify({
      logger: getFastifyLoggerOptions(input.loggingConfig),
      logController: new LogController({ disableRequestLogging: true }),
      routerOptions: { maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH },
    });
    nativeShutdown.install(app);
    app.addHook("onClose", async () => nativeShutdown.close(async () => {
      try {
        await currentApplicationRuntime.lifecycle.stop();
      } finally {
        await closeProcessResources();
      }
    }));
    try {
      registerHttpAccessLogPolicy(app, {
        mode: input.loggingConfig.httpAccessLogMode,
        includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
      });
      // First, so its onRequest hook marks every upgrade: only a marked upgrade's socket is destroyed when a
      // later hook refuses it.
      await app.register(websocket);
      // The node's first request rule: before the MCP gateway hook, CORS preflights and the origin/access hook.
      registerRemoteAccessHostGate(app);
      await registerMcpGatewayRoutes(app, { accessGate: currentNodeAccess.mcpGatewayAccess });
      // No plugin-wide limit: each multipart route passes its own `limits.fileSize`.
      await app.register(multipart);
      await registerNodeAccessPlugin(app, currentNodeAccess.gate);
      await registerMobileWebStaticRoutes(app);
      await app.register(
        async (restApp) => registerRestRoutes(restApp, {
          lifecycleReadiness: currentApplicationRuntime.lifecycle,
          application: currentApplicationRuntime.rest,
          nodeAccess: currentNodeAccess, remoteCollaboration: remoteCollaboration.services,
        }),
        { prefix: "/rest" },
      );
      await registerWebsocketRoutes(app, {
        lifecycleReadiness: currentApplicationRuntime.lifecycle,
        application: currentApplicationRuntime.realtime,
        agentOrgRunService: generalProcessRunSupervisor.agentOrgRunService,
        teamRunService: generalProcessRunSupervisor.teamRunService, standaloneRoots: generalProcessRunSupervisor.standaloneRootManager,
        agentPackageDefinitionChangeHub: agentPackageDefinitionFeed.hub,
        views: currentCollaboration.views,
        runStatus: currentCollaboration.runStatus,
        remoteChannel: remoteCollaboration.services.client,
        agentStreamHandler: createAgentStreamHandler(generalProcessRunSupervisor.agentRunCommandCoordinator),
      });
      await registerGraphql(app);
      // Last preClose hook: after the native drain and the WebSocket plugin's client close (AR-003).
      installClientConnectionClose(app);
      return Object.freeze({
        fastify: app,
        agentToolsMcpHost,
        credentialProxyHost,
        applicationRuntime: currentApplicationRuntime,
        packageRegistryService: packages.packageRegistryService,
        restartResume,
        stopFileWatchesForProcessExit,
      });
    } catch (error) {
      await app.close();
      throw error;
    }
  } catch (error) {
    await nativeShutdown.close(async () => {
      try { await applicationRuntime?.lifecycle.stop(); }
      finally { await closeProcessResources(); }
    });
    throw error;
  }
};
