import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import type { ApplicationGlobalPlatformStateStore } from "../../application-storage/stores/application-global-platform-state-store.js";
import { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import { ApplicationBoundRunLifecycleGateway } from "../../application-orchestration/services/application-bound-run-lifecycle-gateway.js";
import { ApplicationExecutionEventDispatchService } from "../../application-orchestration/services/application-execution-event-dispatch-service.js";
import { ApplicationExecutionEventIngressService } from "../../application-orchestration/services/application-execution-event-ingress-service.js";
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
import { ApplicationAgentTargetAuthorizationService } from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import { ApplicationExecutionEventJournalStore } from "../../application-orchestration/stores/application-execution-event-journal-store.js";
import { ApplicationLaunchOverrideStore } from "../../application-orchestration/stores/application-launch-override-store.js";
import { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../application-orchestration/stores/application-run-lookup-store.js";
import type { ApplicationAvailabilityStateRegistry } from "./application-availability-state-registry.js";
import type { DeferredApplicationEngineEventHandlerPort } from "./deferred-application-engine-event-handler-port.js";
import { createApplicationRunAuthorities } from "./create-application-run-authorities.js";
import { getRuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import { getModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import { getLlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import {
  getCodexAppServerClientManager,
} from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { buildApplicationStorageLayout } from "../../application-storage/utils/application-storage-paths.js";
import {
  ApplicationProviderCredentialReadinessAdapter,
} from "../launch-configuration/application-provider-credential-readiness-adapter.js";
import type {
  ApplicationAgentToolsSessionAuthority,
} from "../../agent-tools/mcp/application-agent-tools-session-authority.js";

export const createApplicationOrchestrationAuthorities = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  platformStateStore: ApplicationPlatformStateStore;
  globalPlatformStateStore: ApplicationGlobalPlatformStateStore;
  availabilityRegistry: ApplicationAvailabilityStateRegistry;
  deferredEnginePort: DeferredApplicationEngineEventHandlerPort;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionAuthority: ApplicationAgentToolsSessionAuthority;
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
  const eventDispatchService = new ApplicationExecutionEventDispatchService({
    applicationBundleService: input.bundleService,
    availabilityReader: input.availabilityRegistry.reader as never,
    platformStateStore: input.platformStateStore,
    journalStore,
    engineHostService: input.deferredEnginePort as never,
  });
  const ingressService = new ApplicationExecutionEventIngressService({
    journalStore,
    dispatchService: eventDispatchService,
  });
  const lifecycleHub = new ApplicationRunBindingLifecycleHub();
  const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
    bindingStore,
    lookupStore: runLookupStore,
    ingressService,
    lifecycleHub,
  });
  const runAuthorities = createApplicationRunAuthorities({
    ...input,
    bindingStore,
  });
  const lifecycleGateway = new ApplicationBoundRunLifecycleGateway({
    agentRunService: runAuthorities.agentRunService,
    teamRunService: runAuthorities.teamRunService,
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
  const availabilityService = new ApplicationAvailabilityService({
    applicationBundleService: input.bundleService,
    engineHostService: input.deferredEnginePort as never,
    recoveryService,
    dispatchService: eventDispatchService,
    stateRegistry: input.availabilityRegistry,
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
  const configurationService = new ApplicationLaunchConfigurationService({
    applicationBundleService: input.bundleService,
    overrideStore,
    baselineBuilder,
    resolveWorkspaceRootPath: (applicationId) =>
      buildApplicationStorageLayout(input.appConfig, applicationId).runtimeDir,
    hostCapabilityValidator: new ApplicationLaunchHostCapabilityValidator({
      runtimeAvailabilityService: getRuntimeAvailabilityService(),
      modelCatalogService: getModelCatalogService(),
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
    agentRunService: runAuthorities.agentRunService,
    teamRunService: runAuthorities.teamRunService,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
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
    agentRunService: runAuthorities.agentRunService,
    teamRunService: runAuthorities.teamRunService,
    teamRunMetadataService: runAuthorities.teamRunMetadataService,
    publishedArtifactProjectionService: runAuthorities.publishedArtifactProjectionService,
    memoryLocationService: runAuthorities.memoryLocationService,
    ingressService,
    agentTargetAuthorizationService: targetAuthorizationService,
    terminalTransitionService,
  });
  const agentStreamingService = new ApplicationAgentStreamingService({
    orchestrationHostService,
  });
  const agentCommunicationService = new ApplicationAgentCommunicationService({
    streamingService: agentStreamingService,
    orchestrationService: orchestrationHostService,
  });

  return {
    runLookupStore,
    startupGate,
    eventDispatchService,
    runObserverService,
    runShutdownAuthority: runAuthorities.runShutdownAuthority,
    recoveryService,
    availabilityService,
    configurationService,
    executionResourceResolver,
    publicationService: runAuthorities.publicationService,
    orchestrationHostService,
    agentStreamingService,
    agentCommunicationService,
  };
};
