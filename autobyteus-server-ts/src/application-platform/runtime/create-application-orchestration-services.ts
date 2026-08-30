import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationAgentCommunicationService } from "../../application-agent-communication/services/application-agent-communication-service.js";
import { ApplicationAgentEventMapper } from "../../application-agent-streaming/services/application-agent-stream-event-mapper.js";
import { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
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
import type { ApplicationExecutionEventJournalStore } from "../../application-orchestration/stores/application-execution-event-journal-store.js";
import type { ApplicationLaunchOverrideStore } from "../../application-orchestration/stores/application-launch-override-store.js";
import type { ApplicationRunBindingStore } from "../../application-orchestration/stores/application-run-binding-store.js";
import type { ApplicationRunLookupStore } from "../../application-orchestration/stores/application-run-lookup-store.js";
import type { ApplicationStorageLifecycleService } from "../../application-storage/services/application-storage-lifecycle-service.js";
import type { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";
import { buildApplicationStorageLayout } from "../../application-storage/utils/application-storage-paths.js";
import type { AppConfig } from "../../config/app-config.js";
import type { LlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import type { ModelAvailabilityService } from "../../llm-management/services/model-availability-service.js";
import type { ModelCatalogService } from "../../llm-management/services/model-catalog-service.js";
import type { CodexAppServerClientManager } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type { SkillService } from "../../skills/services/skill-service.js";
import type {
  ApplicationAgentExecution,
  ApplicationExecutionMemoryLookup,
  ApplicationExecutionStreaming,
  ApplicationPublishedArtifactAccess,
  ApplicationTeamExecution,
} from "../execution/application-execution-scope-contracts.js";
import type { ApplicationAvailabilityStateRegistry } from "./application-availability-state-registry.js";
import { ApplicationDefinitionRuntimeReadiness } from "./application-definition-runtime-readiness.js";
import { ApplicationProviderCredentialReadinessAdapter } from "../launch-configuration/application-provider-credential-readiness-adapter.js";
import { ApplicationCurrentModelSelectionPolicy } from "../launch-configuration/application-current-model-selection-policy.js";
import { ApplicationLaunchConfigurationService } from "../launch-configuration/application-launch-configuration-service.js";
import { ApplicationLaunchHostCapabilityValidator } from "../launch-configuration/application-launch-host-capability-validator.js";
import { ApplicationLaunchResourceBaselineBuilder } from "../launch-configuration/application-launch-resource-baseline-builder.js";
import type { ApplicationAgentToolCatalog } from "../../application-agent-tools/services/application-agent-tool-catalog.js";
import type { ApplicationAgentToolCallLifecycle } from "../../application-agent-tools/services/application-agent-tool-call-lifecycle.js";

export type ApplicationOrchestrationAssemblyInput = Readonly<{
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
  storageLifecycleService: ApplicationStorageLifecycleService;
  platformStateStore: ApplicationPlatformStateStore;
  availabilityRegistry: ApplicationAvailabilityStateRegistry;
  engineController: ApplicationEngineController;
  eventDispatchQueue: ApplicationExecutionEventDispatchQueue;
  artifactDeliveryQueue: ApplicationPublishedArtifactDeliveryQueue;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  runLookupStore: ApplicationRunLookupStore;
  bindingStore: ApplicationRunBindingStore;
  overrideStore: ApplicationLaunchOverrideStore;
  journalStore: ApplicationExecutionEventJournalStore;
  agentExecution: ApplicationAgentExecution;
  teamExecution: ApplicationTeamExecution;
  streaming: ApplicationExecutionStreaming;
  artifacts: ApplicationPublishedArtifactAccess;
  memory: ApplicationExecutionMemoryLookup;
  runtimeAvailabilityService: RuntimeAvailabilityService;
  modelCatalogService: ModelCatalogService;
  modelAvailabilityService: ModelAvailabilityService;
  llmProviderService: LlmProviderService;
  codexClientManager: CodexAppServerClientManager;
  requireCurrentModelIdentifier: (modelIdentifier: string) => Promise<void>;
  skillService: SkillService;
  selectedApplicationIds?: ReadonlySet<string> | null;
  applicationAgentToolCatalog: ApplicationAgentToolCatalog;
  applicationAgentToolCallLifecycle: ApplicationAgentToolCallLifecycle;
  staticAdapterToolNames: ReadonlySet<string>;
}>;

export const createApplicationOrchestrationServices = (
  input: ApplicationOrchestrationAssemblyInput,
) => {
  const startupGate = new ApplicationOrchestrationStartupGate();
  const runOwnershipService = new ApplicationRunOwnershipService({
    startupGate,
    lookupStore: input.runLookupStore,
    bindingStore: input.bindingStore,
    teamExecution: input.teamExecution,
  });
  const availabilityService = new ApplicationAvailabilityService({
    applicationBundleService: input.bundleService,
    stateRegistry: input.availabilityRegistry,
  });
  const ingressService = new ApplicationExecutionEventIngressService({
    journalStore: input.journalStore,
    dispatchQueue: input.eventDispatchQueue,
  });
  const lifecycleHub = new ApplicationRunBindingLifecycleHub();
  const terminalTransitionService = new ApplicationRunBindingTerminalTransitionService({
    bindingStore: input.bindingStore,
    lookupStore: input.runLookupStore,
    ingressService,
    lifecycleHub,
  });
  const lifecycleGateway = new ApplicationBoundRunLifecycleGateway({
    agentExecution: input.agentExecution,
    teamExecution: input.teamExecution,
  });
  const runObserverService = new ApplicationRunObserverService({
    lifecycleGateway,
    bindingStore: input.bindingStore,
    lookupStore: input.runLookupStore,
    ingressService,
    terminalTransitionService,
  });
  const recoveryService = new ApplicationOrchestrationRecoveryService({
    applicationBundleService: input.bundleService,
    platformStateStore: input.platformStateStore,
    bindingStore: input.bindingStore,
    lookupStore: input.runLookupStore,
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
      input.modelAvailabilityService.ensureModelAvailable(modelIdentifier, "LLM", "autobyteus"),
    requireCurrentAutoByteusModelIdentifier: input.requireCurrentModelIdentifier,
  });
  const configurationService = new ApplicationLaunchConfigurationService({
    applicationBundleService: input.bundleService,
    overrideStore: input.overrideStore,
    baselineBuilder,
    currentModelSelectionPolicy,
    resolveWorkspaceRootPath: (applicationId) =>
      buildApplicationStorageLayout(input.appConfig, applicationId).runtimeDir,
    hostCapabilityValidator: new ApplicationLaunchHostCapabilityValidator({
      runtimeAvailabilityService: input.runtimeAvailabilityService,
      modelCatalogService: input.modelCatalogService,
      currentModelSelectionPolicy,
      providerCredentialReadiness: new ApplicationProviderCredentialReadinessAdapter({
        llmProviderService: input.llmProviderService,
        codexClientManager: input.codexClientManager,
      }),
    }),
  });
  const launchService = new ApplicationRunBindingLaunchService({
    executionResourceResolver,
    bindingStore: input.bindingStore,
    lookupStore: input.runLookupStore,
    agentExecution: input.agentExecution,
    teamExecution: input.teamExecution,
    agentDefinitionService: input.agentDefinitionService,
    currentModelSelectionPolicy,
  });
  const targetAuthorizationService = new ApplicationAgentTargetAuthorizationService({
    startupGate,
    availabilityService,
    bindingStore: input.bindingStore,
    lifecycleHub,
  });
  const orchestrationHostService = new ApplicationOrchestrationHostService({
    startupGate,
    availabilityService,
    executionResourceResolver,
    launchConfigurationService: configurationService,
    runBindingLaunchService: launchService,
    bindingStore: input.bindingStore,
    lookupStore: input.runLookupStore,
    runObserverService,
    agentExecution: input.agentExecution,
    teamExecution: input.teamExecution,
    artifacts: input.artifacts,
    memory: input.memory,
    ingressService,
    agentTargetAuthorizationService: targetAuthorizationService,
    terminalTransitionService,
  });
  const agentStreamingService = new ApplicationAgentStreamingService({
    orchestrationHostService,
    runtimeSource: input.streaming,
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
    journalStore: input.journalStore,
    eventQueue: input.eventDispatchQueue,
    engineLauncher,
    engineController: input.engineController,
  });
  const artifactDeliveryService = new ApplicationPublishedArtifactDeliveryService({
    queue: input.artifactDeliveryQueue,
    launcher: engineLauncher,
    controller: input.engineController,
  });
  const definitionRuntimeReadiness = new ApplicationDefinitionRuntimeReadiness({
    bundleService: input.bundleService,
    agentDefinitionService: input.agentDefinitionService,
    agentTeamDefinitionService: input.agentTeamDefinitionService,
    configurationService,
    executionResourceResolver,
    skillService: input.skillService,
    activeApplicationIds: input.selectedApplicationIds,
    applicationAgentToolCatalog: input.applicationAgentToolCatalog,
    staticAdapterToolNames: input.staticAdapterToolNames,
  });
  const reentryService = new ApplicationReentryService({
    availabilityService,
    recoveryService,
    eventDispatchService,
    engineLauncher,
    applicationAgentToolCallLifecycle: input.applicationAgentToolCallLifecycle,
  });
  return Object.freeze({
    startupGate,
    runOwnershipService,
    eventDispatchService,
    artifactDeliveryService,
    runObserverService,
    recoveryService,
    availabilityService,
    definitionRuntimeReadiness,
    orchestrationHostService,
    agentStreamingService,
    agentCommunicationService,
    engineLauncher,
    reentryService,
  });
};
