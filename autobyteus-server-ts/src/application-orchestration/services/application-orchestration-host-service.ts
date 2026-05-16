import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type {
  ApplicationConfiguredExecutionResource,
  ApplicationRunBindingListFilter,
  ApplicationRunBindingSummary,
  ApplicationRuntimeInput,
  ApplicationRuntimeInputContextFile,
  ApplicationExecutionResourceSummary,
  ApplicationStartRunInput,
} from "@autobyteus/application-sdk-contracts";
import { AgentRunService, getAgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { TeamRunService, getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { ApplicationExecutionEventIngressService } from "./application-execution-event-ingress-service.js";
import {
  ApplicationOrchestrationStartupGate,
  getApplicationOrchestrationStartupGate,
} from "./application-orchestration-startup-gate.js";
import { ApplicationExecutionResourceResolver } from "./application-execution-resource-resolver.js";
import { ApplicationRunBindingLaunchService } from "./application-run-binding-launch-service.js";
import { ApplicationAvailabilityService, getApplicationAvailabilityService } from "./application-availability-service.js";
import { ApplicationExecutionResourceConfigurationService } from "./application-execution-resource-configuration-service.js";
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
import { getTeamRunLeafAgentMetadata } from "../../run-history/services/team-run-metadata-flattener.js";
import { selectorFromMemberRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";

const cloneBinding = (binding: ApplicationRunBindingSummary): ApplicationRunBindingSummary => structuredClone(binding);

const normalizeContextFiles = (
  contextFiles: ApplicationRuntimeInputContextFile[] | null | undefined,
): ContextFile[] =>
  (contextFiles ?? []).map(
    (contextFile) =>
      new ContextFile(
        contextFile.uri,
        (contextFile.fileType ?? undefined) as ContextFileType | undefined,
        contextFile.fileName ?? null,
        contextFile.metadata ?? {},
      ),
  );

const buildRuntimeInputMessage = (input: ApplicationRuntimeInput): AgentInputUserMessage =>
  new AgentInputUserMessage(
    input.text,
    SenderType.USER,
    normalizeContextFiles(input.contextFiles),
    input.metadata ?? {},
  );

export class ApplicationOrchestrationHostService {
  private static instance: ApplicationOrchestrationHostService | null = null;
  private readonly teamMemberMemoryLayout: TeamMemberMemoryLayout;

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
      executionResourceConfigurationService?: ApplicationExecutionResourceConfigurationService;
      runBindingLaunchService?: ApplicationRunBindingLaunchService;
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      runObserverService?: ApplicationRunObserverService;
      agentRunService?: AgentRunService;
      teamRunService?: TeamRunService;
      teamRunMetadataService?: TeamRunMetadataService;
      ingressService?: ApplicationExecutionEventIngressService;
      publishedArtifactProjectionService?: PublishedArtifactProjectionService;
    } = {},
  ) {
    this.teamMemberMemoryLayout = new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());
  }

  private get startupGate(): ApplicationOrchestrationStartupGate {
    return this.dependencies.startupGate ?? getApplicationOrchestrationStartupGate();
  }

  private get availabilityService(): ApplicationAvailabilityService {
    return this.dependencies.availabilityService ?? getApplicationAvailabilityService();
  }

  private get executionResourceResolver(): ApplicationExecutionResourceResolver {
    return this.dependencies.executionResourceResolver ?? new ApplicationExecutionResourceResolver();
  }

  private get executionResourceConfigurationService(): ApplicationExecutionResourceConfigurationService {
    return this.dependencies.executionResourceConfigurationService ?? new ApplicationExecutionResourceConfigurationService({
      executionResourceResolver: this.executionResourceResolver,
    });
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

  async getConfiguredExecutionResource(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationConfiguredExecutionResource | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.executionResourceConfigurationService.getConfiguredExecutionResource(applicationId, slotKey);
  }

  async startRun(
    applicationId: string,
    input: ApplicationStartRunInput,
  ): Promise<ApplicationRunBindingSummary> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);

    const binding = await this.runBindingLaunchService.startRunBinding(applicationId, input);
    const attached = await this.runObserverService.attachBinding(binding, { emitAttachedEvent: true });
    if (!attached) {
      throw new Error(`Runtime observer could not attach to application run binding '${binding.bindingId}'.`);
    }
    if (input.initialInput) {
      await this.postRunInputInternal(binding, input.initialInput);
    }
    return cloneBinding(binding);
  }

  async getRunBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationRunBindingSummary | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.bindingStore.getBinding(applicationId, bindingId);
  }

  async getRunBindingByIntentId(
    applicationId: string,
    bindingIntentId: string,
  ): Promise<ApplicationRunBindingSummary | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.bindingStore.getBindingByIntentId(applicationId, bindingIntentId);
  }

  async listRunBindings(
    applicationId: string,
    filter?: ApplicationRunBindingListFilter | null,
  ): Promise<ApplicationRunBindingSummary[]> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    return this.bindingStore.listBindings(applicationId, filter);
  }

  async getRunPublishedArtifacts(
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

  async getPublishedArtifactRevisionText(
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

  async postRunInput(
    applicationId: string,
    input: {
      bindingId: string;
      text: string;
      targetMemberName?: string | null;
      contextFiles?: ApplicationRuntimeInputContextFile[] | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ApplicationRunBindingSummary> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);
    const binding = await this.requireBinding(applicationId, input.bindingId);
    await this.postRunInputInternal(binding, input);
    return cloneBinding(binding);
  }

  async terminateRunBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationRunBindingSummary | null> {
    await this.startupGate.awaitReady();
    await this.requireApplicationActive(applicationId);

    const binding = await this.bindingStore.getBinding(applicationId, bindingId);
    if (!binding) {
      return null;
    }
    if (binding.status === "TERMINATED" || binding.status === "ORPHANED") {
      return cloneBinding(binding);
    }

    await this.runObserverService.detachBinding(binding.bindingId);
    if (binding.runtime.subject === "AGENT_RUN") {
      await this.agentRunService.terminateAgentRun(binding.runtime.runId);
    } else {
      await this.teamRunService.terminateTeamRun(binding.runtime.runId);
    }

    const terminatedAt = new Date().toISOString();
    const terminatedBinding: ApplicationRunBindingSummary = {
      ...binding,
      status: "TERMINATED",
      updatedAt: terminatedAt,
      terminatedAt,
    };
    await this.bindingStore.persistBinding(terminatedBinding);
    this.lookupStore.removeBindingLookups(applicationId, binding.bindingId);
    await this.ingressService.appendBindingLifecycleEvent({
      family: "RUN_TERMINATED",
      binding: terminatedBinding,
      payload: { reason: "explicit_terminate" },
    });
    return cloneBinding(terminatedBinding);
  }

  private async requireBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationRunBindingSummary> {
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
  ): Promise<ApplicationRunBindingSummary> {
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
    binding: ApplicationRunBindingSummary,
    runId: string,
  ): Promise<string | null> {
    if (!binding.runtime.members.some((member) => member.runId === runId)) {
      return null;
    }

    const metadata = await this.teamRunMetadataService.readMetadata(binding.runtime.runId);
    const memberMetadata =
      metadata ? getTeamRunLeafAgentMetadata(metadata).find((member) => member.memberRunId === runId) ?? null : null;
    if (!memberMetadata) {
      return null;
    }

    return this.teamMemberMemoryLayout.getMemberDirPath(
      binding.runtime.runId,
      memberMetadata.memberRunId,
    );
  }

  private async postRunInputInternal(
    binding: ApplicationRunBindingSummary,
    input: ApplicationRuntimeInput,
  ): Promise<void> {
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
    const targetMemberName = input.targetMemberName?.trim() || null;
    const result = await run.postMessage(
      message,
      targetMemberName ? selectorFromMemberRouteKey(targetMemberName) : null,
    );
    if (!result.accepted) {
      throw new Error(result.message ?? "Application runtime rejected the input.");
    }
  }
}

let cachedApplicationOrchestrationHostService: ApplicationOrchestrationHostService | null = null;

export const getApplicationOrchestrationHostService = (): ApplicationOrchestrationHostService => {
  if (!cachedApplicationOrchestrationHostService) {
    cachedApplicationOrchestrationHostService = ApplicationOrchestrationHostService.getInstance();
  }
  return cachedApplicationOrchestrationHostService;
};
