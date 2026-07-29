import { toPublicApplicationAgentBinding, type ApplicationAgentBindingRecord } from "../domain/models.js";
import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationAgentBinding,
  ApplicationAgentInput,
  ApplicationAgentTeamBinding,
  ApplicationAgentTargetAddress,
  ApplicationAgentBindingListFilter,
  ApplicationRuntimeInput,
  ApplicationExecutionResourceSummary,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
} from "@autobyteus/application-sdk-contracts";
import { requireApplicationAgentInputWithinLimits } from "../domain/application-agent-input-validator.js";
import { AgentRunService, getAgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { TeamRunService, getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import {
  ApplicationOrchestrationStartupGate,
  getApplicationOrchestrationStartupGate,
} from "./application-orchestration-startup-gate.js";
import { ApplicationExecutionResourceResolver } from "./application-execution-resource-resolver.js";
import { ApplicationRunBindingLaunchService } from "./application-run-binding-launch-service.js";
import { ApplicationAvailabilityService, getApplicationAvailabilityService } from "./application-availability-service.js";
import { ApplicationLaunchConfigurationService } from "../../application-platform/launch-configuration/application-launch-configuration-service.js";
import { ApplicationRunObserverService, getApplicationRunObserverService } from "./application-run-observer-service.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import {
  PublishedArtifactProjectionService,
  getPublishedArtifactProjectionService,
} from "../../run-history/services/published-artifact-projection-service.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
import { selectorFromMemberRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";
import {
  ApplicationAgentTargetAuthorizationService,
  type ApplicationAgentTargetAuthorizationLease,
} from "./application-agent-target-authorization-service.js";
import {
  ApplicationRunBindingTerminalTransitionService,
  getApplicationRunBindingTerminalTransitionService,
} from "./application-run-binding-terminal-transition-service.js";
import {
  buildApplicationRuntimeInputTargetSelector,
  buildRuntimeInputMessage,
  rejectUnsupportedApplicationAgentInput,
  rejectUnsupportedApplicationRuntimeTargetName,
} from "./application-runtime-input-normalizer.js";

const cloneBinding = (binding: ApplicationAgentBindingRecord): ApplicationAgentBindingRecord => structuredClone(binding);

export class ApplicationOrchestrationHostService {
  private static instance: ApplicationOrchestrationHostService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationOrchestrationHostService>[0] = {},
  ): ApplicationOrchestrationHostService {
    if (!ApplicationOrchestrationHostService.instance) {
      ApplicationOrchestrationHostService.instance = new ApplicationOrchestrationHostService(dependencies);
    }
    return ApplicationOrchestrationHostService.instance;
  }

  static resetInstance(): void {
    ApplicationOrchestrationHostService.instance = null;
    cachedApplicationOrchestrationHostService = null;
  }

  constructor(
    private readonly dependencies: {
      startupGate?: ApplicationOrchestrationStartupGate;
      availabilityService?: ApplicationAvailabilityService;
      executionResourceResolver?: ApplicationExecutionResourceResolver;
      launchConfigurationService?: ApplicationLaunchConfigurationService;
      runBindingLaunchService?: ApplicationRunBindingLaunchService;
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      runObserverService?: ApplicationRunObserverService;
      agentRunService?: AgentRunService;
      teamRunService?: TeamRunService;
      teamRunMetadataService?: TeamRunMetadataService;
      ingressService?: ApplicationExecutionEventIngressService;
      publishedArtifactProjectionService?: PublishedArtifactProjectionService;
      memoryLocationService?: AgentMemoryLocationService;
      agentTargetAuthorizationService?: ApplicationAgentTargetAuthorizationService;
      terminalTransitionService?: ApplicationRunBindingTerminalTransitionService;
    } = {},
  ) {}

  private get startupGate(): ApplicationOrchestrationStartupGate {
    return this.dependencies.startupGate ?? getApplicationOrchestrationStartupGate();
  }

  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService ?? getApplicationAvailabilityService();
  }

  private get executionResourceResolver(): ApplicationExecutionResourceResolver {
    return this.dependencies.executionResourceResolver ?? new ApplicationExecutionResourceResolver();
  }

  private get launchConfigurationService(): ApplicationLaunchConfigurationService {
    if (!this.dependencies.launchConfigurationService) {
      throw new Error("Application launch configuration authority is not configured.");
    }
    return this.dependencies.launchConfigurationService;
  }

  private get runBindingLaunchService(): ApplicationRunBindingLaunchService {
    return this.dependencies.runBindingLaunchService ?? new ApplicationRunBindingLaunchService({
      executionResourceResolver: this.executionResourceResolver,
      bindingStore: this.bindingStore,
      lookupStore: this.lookupStore,
      agentRunService: this.agentRunService,
      teamRunService: this.teamRunService,
    });
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore ?? new ApplicationRunLookupStore();
  }

  private get runObserverService(): ApplicationRunObserverService {
    return this.dependencies.runObserverService ?? getApplicationRunObserverService();
  }

  private get agentRunService(): AgentRunService {
    return this.dependencies.agentRunService ?? getAgentRunService();
  }

  private get teamRunService(): TeamRunService {
    return this.dependencies.teamRunService ?? getTeamRunService();
  }

  private get teamRunMetadataService(): TeamRunMetadataService {
    return this.dependencies.teamRunMetadataService ?? getTeamRunMetadataService();
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService ?? new ApplicationExecutionEventIngressService();
  }

  private get publishedArtifactProjectionService(): PublishedArtifactProjectionService {
    return this.dependencies.publishedArtifactProjectionService ?? getPublishedArtifactProjectionService();
  }

  private get memoryLocationService(): AgentMemoryLocationService {
    return this.dependencies.memoryLocationService ?? getAgentMemoryLocationService();
  }

  private get agentTargetAuthorizationService(): ApplicationAgentTargetAuthorizationService {
    return this.dependencies.agentTargetAuthorizationService ?? new ApplicationAgentTargetAuthorizationService({
      startupGate: this.startupGate,
      availabilityService: this.availabilityService,
      bindingStore: this.bindingStore,
    });
  }

  private get terminalTransitionService(): ApplicationRunBindingTerminalTransitionService {
    if (this.dependencies.terminalTransitionService) return this.dependencies.terminalTransitionService;
    if (this.dependencies.bindingStore || this.dependencies.lookupStore || this.dependencies.ingressService) {
      return new ApplicationRunBindingTerminalTransitionService({
        bindingStore: this.bindingStore,
        lookupStore: this.lookupStore,
        ingressService: this.ingressService,
      });
    }
    return getApplicationRunBindingTerminalTransitionService();
  }

  private async requireApplicationActive(applicationId: string): Promise<void> {
    await this.availabilityService.requireApplicationActive(applicationId);
  }

  async listAvailableExecutionResources(
    applicationId: string,
    filter?: { source?: "bundle" | "shared" | null; kind?: "AGENT" | "AGENT_TEAM" | null } | null,
  ): Promise<ApplicationExecutionResourceSummary[]> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.executionResourceResolver.listAvailableExecutionResources(applicationId, filter);
  }

  async requireRunnableExecutionResource(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationEffectiveLaunchConfiguration> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.launchConfigurationService.requireRunnableConfiguration(applicationId, slotKey);
  }

  async getApplicationLaunchConfigurationView(applicationId: string) {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.launchConfigurationService.getApplicationLaunchConfigurationView(applicationId);
  }

  async upsertApplicationLaunchOverride(
    applicationId: string,
    slotKey: string,
    input: Parameters<
      ApplicationLaunchConfigurationService["upsertOverride"]
    >[2],
  ) {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.launchConfigurationService.upsertOverride(
      applicationId,
      slotKey,
      input,
    );
  }

  async removeApplicationLaunchOverride(
    applicationId: string,
    slotKey: string,
  ) {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.launchConfigurationService.removeOverride(applicationId, slotKey);
  }

  async startAgent(
    applicationId: string,
    input: ApplicationStartAgentInput,
  ): Promise<ApplicationAgentBinding> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.completeStartedBinding(
      await this.runBindingLaunchService.startAgentRunBinding(applicationId, input),
      input.initialInput,
    );
    const publicBinding = toPublicApplicationAgentBinding(binding);
    if (publicBinding.runtime.subject !== "AGENT_RUN") {
      throw new Error("Agent launch returned a non-agent binding.");
    }
    return publicBinding as ApplicationAgentBinding;
  }

  async startAgentTeam(
    applicationId: string,
    input: ApplicationStartAgentTeamInput,
  ): Promise<ApplicationAgentTeamBinding> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.completeStartedBinding(
      await this.runBindingLaunchService.startAgentTeamRunBinding(applicationId, input),
      input.initialInput,
    );
    const publicBinding = toPublicApplicationAgentBinding(binding);
    if (publicBinding.runtime.subject !== "TEAM_RUN") {
      throw new Error("Agent-team launch returned a non-team binding.");
    }
    return publicBinding as ApplicationAgentTeamBinding;
  }

  private async completeStartedBinding(
    binding: ApplicationAgentBindingRecord,
    initialInput: ApplicationRuntimeInput | null | undefined,
  ): Promise<ApplicationAgentBindingRecord> {
    const attached = await this.runObserverService.attachBinding(binding, { emitAttachedEvent: true });
    if (!attached) {
      throw new Error(`Runtime observer could not attach to application run binding '${binding.bindingId}'.`);
    }
    if (initialInput) {
      await this.postRunInputInternal(binding, initialInput);
    }
    return cloneBinding(binding);
  }

  async getRunBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.bindingStore.getBinding(applicationId, bindingId);
    return binding ? toPublicApplicationAgentBinding(binding) : null;
  }

  async findRunBindingByLaunchRequestId(
    applicationId: string,
    launchRequestId: string,
  ): Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.bindingStore.findBindingByLaunchRequestId(applicationId, launchRequestId);
    return binding ? toPublicApplicationAgentBinding(binding) : null;
  }

  async listRunBindings(
    applicationId: string,
    filter?: ApplicationAgentBindingListFilter | null,
  ): Promise<Array<ApplicationAgentBinding | ApplicationAgentTeamBinding>> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return (await this.bindingStore.listBindings(applicationId, filter)).map(toPublicApplicationAgentBinding);
  }

  async listRunPublishedArtifacts(
    applicationId: string,
    runId: string,
  ) {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.requireBindingForRun(applicationId, runId);
    const memberMemoryDir = await this.resolveBoundMemberMemoryDir(binding, runId);
    if (memberMemoryDir) {
      return this.publishedArtifactProjectionService.getPublishedArtifactsFromMemoryDir(memberMemoryDir);
    }
    return this.publishedArtifactProjectionService.getRunPublishedArtifacts(
      binding.runtime.members.some((member) => member.runId === runId) ? runId : binding.runtime.runId,
    );
  }

  async readPublishedArtifactRevision(
    applicationId: string,
    input: { runId: string; revisionId: string },
  ): Promise<string | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.requireBindingForRun(applicationId, input.runId);
    const memberMemoryDir = await this.resolveBoundMemberMemoryDir(binding, input.runId);
    if (memberMemoryDir) {
      return this.publishedArtifactProjectionService.getPublishedArtifactRevisionTextFromMemoryDir({
        memoryDir: memberMemoryDir,
        revisionId: input.revisionId,
      });
    }
    return this.publishedArtifactProjectionService.getPublishedArtifactRevisionText(input);
  }

  async sendRunInput(
    applicationId: string,
    input: {
      address: ApplicationAgentTargetAddress;
      input: ApplicationAgentInput;
    },
  ): Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding> {
    await this.startupGate.awaitReady();
    rejectUnsupportedApplicationAgentInput(input.input);
    requireApplicationAgentInputWithinLimits(input.input);
    const descriptor = await this.agentTargetAuthorizationService.authorizeTarget(applicationId, input.address);
    const binding = await this.requireBinding(applicationId, descriptor.address.bindingId);
    await this.postAddressedRunInputInternal(binding, input.address, input.input);
    return toPublicApplicationAgentBinding(binding);
  }

  async terminateRunBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);

    const binding = await this.bindingStore.getBinding(applicationId, bindingId);
    if (!binding) {
      return null;
    }
    if (binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      return toPublicApplicationAgentBinding(binding);
    }

    await this.runObserverService.detachBinding(binding.bindingId);
    if (binding.runtime.subject === "AGENT_RUN") {
      await this.agentRunService.terminateAgentRun(binding.runtime.runId);
    } else {
      await this.teamRunService.terminateTeamRun(binding.runtime.runId);
    }

    const transitioned = await this.terminalTransitionService.transition({
      applicationId,
      bindingId,
      status: "TERMINATED",
      reason: "explicit_terminate",
    });
    return transitioned ? toPublicApplicationAgentBinding(transitioned) : null;
  }

  async openAgentEventStreamLease(
    applicationId: string,
    address: ApplicationAgentTargetAddress,
    onBindingEnded: () => void,
  ): Promise<ApplicationAgentTargetAuthorizationLease> {
    return this.agentTargetAuthorizationService.openLease(applicationId, address, onBindingEnded);
  }

  private async requireBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBindingRecord> {
    const binding = await this.bindingStore.getBinding(applicationId, bindingId);
    if (!binding) {
      throw new Error(`Application run binding '${bindingId}' was not found.`);
    }
    if (binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      throw new Error(`Application run binding '${bindingId}' is not live.`);
    }
    return binding;
  }

  private async requireBindingForRun(
    applicationId: string,
    runId: string,
  ): Promise<ApplicationAgentBindingRecord> {
    const bindings = await this.bindingStore.listBindings(applicationId, null);
    const binding = bindings.find((candidate) =>
      candidate.runtime.runId === runId || candidate.runtime.members.some((member) => member.runId === runId),
    ) ?? null;
    if (!binding) {
      throw new Error(`Application runtime '${runId}' is not bound to application '${applicationId}'.`);
    }
    return binding;
  }

  private async resolveBoundMemberMemoryDir(
    binding: ApplicationAgentBindingRecord,
    runId: string,
  ): Promise<string | null> {
    if (!binding.runtime.members.some((member) => member.runId === runId)) {
      return null;
    }

    const metadata = await this.teamRunMetadataService.readMetadata(binding.runtime.runId);
    const target = metadata
      ? this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
          metadata,
          { memberRunId: runId },
          binding.runtime.runId,
        )
      : null;
    if (!target) {
      return null;
    }

    return target.memoryDir;
  }

  private async postRunInputInternal(
    binding: ApplicationAgentBindingRecord,
    input: ApplicationRuntimeInput,
  ): Promise<void> {
    rejectUnsupportedApplicationRuntimeTargetName(input);
    const message = buildRuntimeInputMessage(input);
    if (binding.runtime.subject === "AGENT_RUN") {
      const run = await this.agentRunService.resolveAgentRun(binding.runtime.runId);
      if (!run) {
        throw new Error(`Application runtime '${binding.runtime.runId}' is not available.`);
      }
      const result = await run.postUserMessage(message);
      if (!result.accepted) {
        throw new Error(result.message ?? "Application runtime rejected the input.");
      }
      return;
    }

    const run = await this.teamRunService.resolveTeamRun(binding.runtime.runId);
    if (!run) {
      throw new Error(`Application runtime '${binding.runtime.runId}' is not available.`);
    }
    const result = await run.postMessage(message, buildApplicationRuntimeInputTargetSelector(input));
    if (!result.accepted) {
      throw new Error(result.message ?? "Application runtime rejected the input.");
    }
  }

  private async postAddressedRunInputInternal(
    binding: ApplicationAgentBindingRecord,
    address: ApplicationAgentTargetAddress,
    input: ApplicationAgentInput,
  ): Promise<void> {
    rejectUnsupportedApplicationAgentInput(input);
    const message = buildRuntimeInputMessage(input);
    if (binding.runtime.subject === "AGENT_RUN") {
      if (address.target.kind !== "AGENT_RUN") {
        throw new Error("Application agent input target does not match the bound runtime.");
      }
      const run = await this.agentRunService.resolveAgentRun(binding.runtime.runId);
      if (!run) throw new Error(`Application runtime '${binding.runtime.runId}' is not available.`);
      const result = await run.postUserMessage(message);
      if (!result.accepted) throw new Error(result.message ?? "Application runtime rejected the input.");
      return;
    }
    if (address.target.kind === "AGENT_RUN") {
      throw new Error("Application agent input target does not match the bound runtime.");
    }
    const run = await this.teamRunService.resolveTeamRun(binding.runtime.runId);
    if (!run) throw new Error(`Application runtime '${binding.runtime.runId}' is not available.`);
    const targetMemberRouteKey = address.target.kind === "AGENT_TEAM_MEMBER"
      ? address.target.memberRouteKey
      : null;
    const selector = targetMemberRouteKey
      ? selectorFromMemberRouteKey(targetMemberRouteKey)
      : null;
    if (targetMemberRouteKey &&
        !binding.runtime.members.some((member) => member.memberRouteKey === targetMemberRouteKey)) {
      throw new Error("Application agent input target does not belong to the bound team runtime.");
    }
    const result = await run.postMessage(message, selector);
    if (!result.accepted) throw new Error(result.message ?? "Application runtime rejected the input.");
  }
}

let cachedApplicationOrchestrationHostService: ApplicationOrchestrationHostService | null = null;

export const getApplicationOrchestrationHostService = (): ApplicationOrchestrationHostService => {
  if (!cachedApplicationOrchestrationHostService) {
    cachedApplicationOrchestrationHostService = ApplicationOrchestrationHostService.getInstance();
  }
  return cachedApplicationOrchestrationHostService;
};
