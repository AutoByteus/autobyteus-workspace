import { toPublicApplicationAgentBinding, type ApplicationAgentBindingRecord } from "../domain/models.js";
import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationAgentBinding,
  ApplicationAgentInput,
  ApplicationAgentTeamBinding,
  ApplicationAgentTargetAddress,
  ApplicationAgentBindingListFilter,
  ApplicationRuntimeInput,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
} from "@autobyteus/application-sdk-contracts";
import { requireApplicationAgentInputWithinLimits } from "../domain/application-agent-input-validator.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import type { ApplicationOrchestrationStartupGate } from "./application-orchestration-startup-gate.js";
import type { ApplicationExecutionResourceResolver } from "./application-execution-resource-resolver.js";
import type { ApplicationRunBindingLaunchService } from "./application-run-binding-launch-service.js";
import type { ApplicationAvailabilityService } from "./application-availability-service.js";
import type { ApplicationLaunchConfigurationService } from "../../application-platform/launch-configuration/application-launch-configuration-service.js";
import type { ApplicationRunObserverService } from "./application-run-observer-service.js";
import type { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import type { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import type { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  ApplicationAgentTargetAuthorizationService,
  type ApplicationAgentTargetAuthorizationLease,
} from "./application-agent-target-authorization-service.js";
import {
  ApplicationRunBindingTerminalTransitionService,
} from "./application-run-binding-terminal-transition-service.js";
import {
  buildApplicationRuntimeInputTargetSelector,
  buildRuntimeInputMessage,
  rejectUnsupportedApplicationAgentInput,
  rejectUnsupportedApplicationRuntimeTargetName,
} from "./application-runtime-input-normalizer.js";

const cloneBinding = (binding: ApplicationAgentBindingRecord): ApplicationAgentBindingRecord => structuredClone(binding);

export class ApplicationOrchestrationHostService {
  constructor(
    private readonly dependencies: {
      startupGate: ApplicationOrchestrationStartupGate;
      availabilityService: ApplicationAvailabilityService;
      executionResourceResolver: ApplicationExecutionResourceResolver;
      launchConfigurationService: ApplicationLaunchConfigurationService;
      runBindingLaunchService: ApplicationRunBindingLaunchService;
      bindingStore: ApplicationRunBindingStore;
      lookupStore: ApplicationRunLookupStore;
      runObserverService: ApplicationRunObserverService;
      agentRunService: AgentRunService;
      teamRunService: TeamRunService;
      ingressService: ApplicationExecutionEventIngressService;
      publishedArtifactProjectionService: PublishedArtifactProjectionService;
      memoryLocationService: AgentMemoryLocationService;
      agentTargetAuthorizationService: ApplicationAgentTargetAuthorizationService;
      terminalTransitionService: ApplicationRunBindingTerminalTransitionService;
    },
  ) {}

  private get startupGate(): ApplicationOrchestrationStartupGate {
    return this.dependencies.startupGate;
  }

  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService;
  }

  private get executionResourceResolver(): ApplicationExecutionResourceResolver {
    return this.dependencies.executionResourceResolver;
  }

  private get launchConfigurationService(): ApplicationLaunchConfigurationService {
    return this.dependencies.launchConfigurationService;
  }

  private get runBindingLaunchService(): ApplicationRunBindingLaunchService {
    return this.dependencies.runBindingLaunchService;
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore;
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore;
  }

  private get runObserverService(): ApplicationRunObserverService {
    return this.dependencies.runObserverService;
  }

  private get agentRunService(): AgentRunService {
    return this.dependencies.agentRunService;
  }

  private get teamRunService(): TeamRunService {
    return this.dependencies.teamRunService;
  }

  private get ingressService(): ApplicationExecutionEventIngressService {
    return this.dependencies.ingressService;
  }

  private get publishedArtifactProjectionService(): PublishedArtifactProjectionService {
    return this.dependencies.publishedArtifactProjectionService;
  }

  private get memoryLocationService(): AgentMemoryLocationService {
    return this.dependencies.memoryLocationService;
  }

  private get agentTargetAuthorizationService(): ApplicationAgentTargetAuthorizationService {
    return this.dependencies.agentTargetAuthorizationService;
  }

  private get terminalTransitionService(): ApplicationRunBindingTerminalTransitionService {
    return this.dependencies.terminalTransitionService;
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

  async previewSelectedApplicationResource(
    applicationId: string,
    slotKey: string,
    executionResourceRef: ApplicationExecutionResourceRef,
  ) {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.launchConfigurationService.previewSelectedResourceBaseline(
      applicationId,
      slotKey,
      executionResourceRef,
    );
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
      binding.runtime.members.some((member) => member.agentRunId === runId)
        ? runId
        : binding.runtime.subject === "AGENT_RUN" ? binding.runtime.agentRunId : binding.runtime.teamRunId,
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
      await this.agentRunService.terminateAgentRun(binding.runtime.agentRunId);
    } else {
      await this.teamRunService.terminateTeamRun(binding.runtime.teamRunId);
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
      (candidate.runtime.subject === "AGENT_RUN" ? candidate.runtime.agentRunId : candidate.runtime.teamRunId) === runId ||
        candidate.runtime.members.some((member) => member.agentRunId === runId),
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
    if (binding.runtime.subject !== "TEAM_RUN" || !binding.runtime.members.some((member) => member.agentRunId === runId)) {
      return null;
    }

    const target = await this.memoryLocationService.resolveTeamMemberLocation({
      teamRunId: binding.runtime.teamRunId,
      agentRunId: runId,
    });
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
      const run = await this.agentRunService.resolveAgentRun(binding.runtime.agentRunId);
      if (!run) {
        throw new Error(`Application runtime '${binding.runtime.agentRunId}' is not available.`);
      }
      const result = await run.postUserMessage(message);
      if (!result.accepted) {
        throw new Error(result.message ?? "Application runtime rejected the input.");
      }
      return;
    }

    const run = await this.teamRunService.resolveActiveTeamRun(binding.runtime.teamRunId);
    if (!run) {
      throw new Error(`Application runtime '${binding.runtime.teamRunId}' is not available.`);
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
      const run = await this.agentRunService.resolveAgentRun(binding.runtime.agentRunId);
      if (!run) throw new Error(`Application runtime '${binding.runtime.agentRunId}' is not available.`);
      const result = await run.postUserMessage(message);
      if (!result.accepted) throw new Error(result.message ?? "Application runtime rejected the input.");
      return;
    }
    if (address.target.kind === "AGENT_RUN") {
      throw new Error("Application agent input target does not match the bound runtime.");
    }
    const run = await this.teamRunService.resolveActiveTeamRun(binding.runtime.teamRunId);
    if (!run) throw new Error(`Application runtime '${binding.runtime.teamRunId}' is not available.`);
    const targetAgentRunId = address.target.kind === "AGENT_TEAM_MEMBER" ? address.target.agentRunId : null;
    const targetMember = targetAgentRunId
      ? binding.runtime.members.find((member) => member.agentRunId === targetAgentRunId) ?? null
      : null;
    if (address.target.kind === "AGENT_TEAM_MEMBER" && !targetMember) {
      throw new Error("Application agent input target does not belong to the bound team runtime.");
    }
    const targetMemberAddress = targetMember ? assertAgentTeamAddress(targetMember.memberAddress) : null;
    const result = await run.postMessage(message, targetMemberAddress);
    if (!result.accepted) throw new Error(result.message ?? "Application runtime rejected the input.");
  }
}
