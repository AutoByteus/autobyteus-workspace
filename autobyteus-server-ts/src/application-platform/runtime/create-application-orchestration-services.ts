import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationStorageLifecycleService } from "../../application-storage/services/application-storage-lifecycle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationGlobalPlatformStateStore } from "../../application-storage/stores/application-global-platform-state-store.js";
import { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationAgentEventMapper } from "../../application-agent-streaming/services/application-agent-stream-event-mapper.js";
import { ApplicationAgentStreamRuntimeSource } from "../../application-agent-streaming/services/application-agent-stream-runtime-source.js";
import type { ApplicationAgentToolMcpSessionScope } from "../../agent-tools/mcp/application-agent-tool-mcp-session-scope.js";
import type { ApplicationAgentToolsSessionFactory } from "../../agent-tools/mcp/agent-tools-mcp-runtime.js";
import type { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import { ApplicationBoundRunLifecycleGateway } from "../../application-orchestration/services/application-bound-run-lifecycle-gateway.js";
import { ApplicationExecutionEventDispatchService } from "../../application-orchestration/services/application-execution-event-dispatch-service.js";
import type { ApplicationExecutionEventDispatchQueue } from "../../application-orchestration/services/application-execution-event-dispatch-queue.js";
import { ApplicationExecutionEventIngressService } from "../../application-orchestration/services/application-execution-event-ingress-service.js";
import { ApplicationPublishedArtifactDeliveryService } from "../../application-orchestration/services/application-published-artifact-delivery-service.js";
import type { ApplicationPublishedArtifactDeliveryQueue } from "../../application-orchestration/services/application-published-artifact-delivery-queue.js";
import { ApplicationReentryService } from "../../application-orchestration/services/application-reentry-service.js";
import { ApplicationLaunchConfigurationService } from "../launch-configuration/application-launch-configuration-service.js";
import { ApplicationLaunchHostCapabilityValidator } from "../launch-configuration/application-launch-host-capability-validator.js";
import { ApplicationLaunchResourceBaselineBuilder } from "../launch-configuration/application-launch-resource-baseline-builder.js";
import { ApplicationExecutionResourceResolver } from "../../application-orchestration/services/application-execution-resource-resolver.js";
import { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationOrchestrationRecoveryService } from "../../application-orchestration/services/application-orchestration-recovery-service.js";
import { ApplicationOrchestrationStartupGate } from "../../application-orchestration/services/application-orchestration-startup-gate.js";
import { ApplicationRunBindingLaunchService } from "../../application-orchestration/services/application-run-binding-launch-service.js";
import { ApplicationRunBindingLifecycleHub } from "../../application-orchestration/services/application-run-binding-lifecycle-hub.js";
import { ApplicationRunBindingTerminalTransitionService } from "../../application-orchestration/services/application-run-binding-terminal-transition-service.js";
import { ApplicationRunObserverService } from "../../application-orchestration/services/application-run-observer-service.js";
import { ApplicationRunOwnershipService } from "../../application-orchestration/services/application-run-ownership-service.js";
import { ApplicationAgentTargetAuthorizationService } from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import { ApplicationExecutionEventJournalStore } from "../../application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationLaunchOverrideStore } from "../../application-orchestration/stores/application-launch-override-store.js";
import { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../application-orchestration/stores/application-run-lookup-store.js";
import type { ApplicationAvailabilityStateRegistry } from "./application-availability-state-registry.js";
import { createApplicationRunServices } from "./create-application-run-services.js";
import { getRuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import { getModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import { getLlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import { getCodexAppServerClientManager } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { buildApplicationStorageLayout } from "../../application-storage/utils/application-storage-paths.js";
import { ApplicationProviderCredentialReadinessAdapter } from "../launch-configuration/application-provider-credential-readiness-adapter.js";
import { ApplicationCurrentModelSelectionPolicy } from "../launch-configuration/application-current-model-selection-policy.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { getModelAvailabilityService } from "../../llm-management/services/model-availability-service.js";

export const createApplicationOrchestrationServices = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  platformStateStore: ApplicationPlatformStateStore;
  globalPlatformStateStore: ApplicationGlobalPlatformStateStore;
  availabilityRegistry: ApplicationAvailabilityStateRegistry;
  engineController: ApplicationEngineController;
  eventDispatchQueue: ApplicationExecutionEventDispatchQueue;
  artifactDeliveryQueue: ApplicationPublishedArtifactDeliveryQueue;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionFactory: ApplicationAgentToolsSessionFactory;
  sessionScope: ApplicationAgentToolMcpSessionScope;
}) => {
  const runLookupStore = new ApplicationRunLookupStore({
    globalPlatformStateStore: input.globalPlatformStateStore,
  });
  const bindingStore = new ApplicationRunBindingStore({
    platformStateStore: input.platformStateStore,
  });
  const overrideStore = new ApplicationLaunchOverrideStore({
    platformStateStore: input.platformStateStore,
  });
  const journalStore = new ApplicationExecutionEventJournalStore({
    platformStateStore: input.platformStateStore,
  });
  const startupGate = new ApplicationOrchestrationStartupGate();
  const runOwnershipService = new ApplicationRunOwnershipService({
    startupGate,
    lookupStore: runLookupStore,
    bindingStore,
  });
  const availabilityService = new ApplicationAvailabilityService({
    applicationBundleService: input.bundleService,
    stateRegistry: input.availabilityRegistry,
  });
  const runServices = createApplicationRunServices({
    appConfig: input.appConfig,
    bindingStore,
    artifactDeliveryQueue: input.artifactDeliveryQueue,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    sessionScope: input.sessionScope,
    agentToolsSessionFactory: input.agentToolsSessionFactory,
  });
  const ingressService = new ApplicationExecutionEventIngressService({
    journalStore,
    dispatchQueue: input.eventDispatchQueue,
  });
  const lifecycleHub = new ApplicationRunBindingLifecycleHub();
  const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
    bindingStore,
    lookupStore: runLookupStore,
    ingressService,
    lifecycleHub,
  });
  const lifecycleGateway = new ApplicationBoundRunLifecycleGateway({
    agentRunService: runServices.agentRunService,
    teamRunService: runServices.teamRunService,
  });
  const runObserverService = new ApplicationRunObserverService({
    lifecycleGateway,
    bindingStore,
    lookupStore: runLookupStore,
    ingressService,
    terminalTransitionService,
  });
  const recoveryService = new ApplicationOrchestrationRecoveryService({
    applicationBundleService: input.bundleService,
    platformStateStore: input.platformStateStore,
    bindingStore,
    lookupStore: runLookupStore,
    runObserverService,
    ingressService,
    terminalTransitionService,
  });
  const executionResourceResolver = new ApplicationExecutionResourceResolver({
    applicationBundleService: input.bundleService,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
  });
  const baselineBuilder = new ApplicationLaunchResourceBaselineBuilder({
    executionResourceResolver,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
  });
  const currentModelSelectionPolicy = new ApplicationCurrentModelSelectionPolicy({
    ensureAutoByteusModelAvailable: (modelIdentifier) =>
      getModelAvailabilityService().ensureModelAvailable(
        modelIdentifier,
        "LLM",
        "autobyteus",
      ),
    requireCurrentAutoByteusModelIdentifier: (modelIdentifier) =>
      LLMFactory.requireCurrentModelIdentifier(modelIdentifier),
  });
  const configurationService = new ApplicationLaunchConfigurationService({
    applicationBundleService: input.bundleService,
    overrideStore,
    baselineBuilder,
    currentModelSelectionPolicy,
    resolveWorkspaceRootPath: (applicationId) =>
      buildApplicationStorageLayout(input.appConfig, applicationId).runtimeDir,
    hostCapabilityValidator: new ApplicationLaunchHostCapabilityValidator({
      runtimeAvailabilityService: getRuntimeAvailabilityService(),
      modelCatalogService: getModelCatalogService(),
      currentModelSelectionPolicy,
      providerCredentialReadiness: new ApplicationProviderCredentialReadinessAdapter({
        llmProviderService: getLlmProviderService(),
        codexClientManager: getCodexAppServerClientManager(),
      }),
    }),
  });
  const launchService = new ApplicationRunBindingLaunchService({
    executionResourceResolver,
    bindingStore,
    lookupStore: runLookupStore,
    agentRunService: runServices.agentRunService,
    teamRunService: runServices.teamRunService,
    agentDefinitionService: input.agentDefinitionService,
    currentModelSelectionPolicy,
  });
  const targetAuthorizationService = new ApplicationAgentTargetAuthorizationService({
    startupGate,
    availabilityService,
    bindingStore,
    lifecycleHub,
  });
  const orchestrationHostService = new ApplicationOrchestrationHostService({
    startupGate,
    availabilityService,
    executionResourceResolver,
    launchConfigurationService: configurationService,
    runBindingLaunchService: launchService,
    bindingStore,
    lookupStore: runLookupStore,
    runObserverService,
    agentRunService: runServices.agentRunService,
    teamRunService: runServices.teamRunService,
    publishedArtifactProjectionService: runServices.publishedArtifactProjectionService,
    memoryLocationService: runServices.memoryLocationService,
    ingressService,
    agentTargetAuthorizationService: targetAuthorizationService,
    terminalTransitionService,
  });
  const agentStreamingService = new ApplicationAgentStreamingService({
    orchestrationHostService,
    runtimeSource: new ApplicationAgentStreamRuntimeSource({
      agentRunManager: runServices.agentRunManager,
      teamRunManager: runServices.agentTeamRunManager,
    }),
    mapper: new ApplicationAgentEventMapper(),
  });
  const agentCommunicationService = new ApplicationAgentCommunicationService({
    streamingService: agentStreamingService,
    orchestrationService: orchestrationHostService,
  });
  const engineLauncher = new ApplicationEngineLauncher({
    applicationBundleService: input.bundleService,
    storageLifecycleService: input.storageLifecycleService,
    orchestrationHostService,
    agentStreamingService,
    controller: input.engineController,
  });
  const eventDispatchService = new ApplicationExecutionEventDispatchService({
    applicationBundleService: input.bundleService,
    availabilityReader: input.availabilityRegistry.reader,
    platformStateStore: input.platformStateStore,
    journalStore,
    eventQueue: input.eventDispatchQueue,
    engineLauncher,
    engineController: input.engineController,
  });
  const artifactDeliveryService = new ApplicationPublishedArtifactDeliveryService({
    queue: input.artifactDeliveryQueue,
    launcher: engineLauncher,
    controller: input.engineController,
  });
  const reentryService = new ApplicationReentryService({
    bundleService: input.bundleService,
    availabilityService,
    recoveryService,
    eventDispatchService,
    engineLauncher,
  });
  return {
    startupGate,
    runOwnershipService,
    eventDispatchService,
    artifactDeliveryService,
    runObserverService,
    runShutdownCoordinator: runServices.runShutdownCoordinator,
    recoveryService,
    availabilityService,
    configurationService,
    executionResourceResolver,
    publicationService: runServices.publicationService,
    agentToolsSessionManager: runServices.agentToolsSessionManager,
    orchestrationHostService,
    agentStreamingService,
    agentCommunicationService,
    engineLauncher,
    reentryService,
  };
};
