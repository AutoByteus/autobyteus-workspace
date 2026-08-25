import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AutoByteusAgentRunBackendFactory } from "../../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { ClaudeAgentRunBackendFactory } from "../../agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../agent-execution/backends/claude/session/claude-session-manager.js";
import { CodexAgentRunBackendFactory } from "../../agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { AgentRunActivationRegistry } from "../../agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentRunProvisioningService } from "../../agent-execution/services/agent-run-provisioning-service.js";
import { AgentRunResourceManager } from "../../agent-execution/services/agent-run-resource-manager.js";
import { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunActivationService } from "../../agent-execution/services/standalone-agent-run-activation-service.js";
import { isConfiguredAgentExecution, type ConfiguredExecutionNode } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { ApplicationAgentStreamRuntimeSource } from "../../application-agent-streaming/services/application-agent-stream-runtime-source.js";
import { ApplicationPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { PublishedArtifactProjectionService } from "../../run-history/services/published-artifact-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { PublishedArtifactProjectionStore } from "../../services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactSnapshotStore } from "../../services/published-artifacts/published-artifact-snapshot-store.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import { ApplicationExecutionShutdownCoordinator } from "./application-execution-shutdown-coordinator.js";
import type {
  ApplicationAgentExecution,
  ApplicationAgentLaunchResult,
  ApplicationExecutionInputDisposition,
  ApplicationExecutionLifecycle,
  ApplicationExecutionMemoryLookup,
  ApplicationExecutionScopeBuildInput,
  ApplicationExecutionStreaming,
  ApplicationExecutionToolReadiness,
  ApplicationPublishedArtifactAccess,
  ApplicationTeamExecution,
  ApplicationTeamLaunchMember,
  ApplicationTeamLaunchResult,
} from "./application-execution-scope-contracts.js";

type ScopeState = "OPEN" | "QUIESCED" | "CLOSED";
type ScopedSessionManager = ReturnType<
  ApplicationExecutionScopeBuildInput["agentToolsSessionFactory"]["createApplicationSessionManager"]
>;

const ACCEPTED = Object.freeze({ kind: "ACCEPTED" } as const);
const NOT_AVAILABLE = Object.freeze({ kind: "NOT_AVAILABLE" } as const);

export class ApplicationExecutionScope {
  readonly agentExecution: ApplicationAgentExecution;
  readonly teamExecution: ApplicationTeamExecution;
  readonly streaming: ApplicationExecutionStreaming;
  readonly artifacts: ApplicationPublishedArtifactAccess;
  readonly memory: ApplicationExecutionMemoryLookup;
  readonly toolReadiness: ApplicationExecutionToolReadiness;
  readonly lifecycle: ApplicationExecutionLifecycle;

  private state: ScopeState = "OPEN";
  private closePromise: Promise<void> | null = null;

  private constructor(
    private readonly agentRunService: AgentRunService,
    private readonly teamRunService: TeamRunService,
    private readonly sessionManager: ScopedSessionManager,
    private readonly shutdownCoordinator: ApplicationExecutionShutdownCoordinator,
    streamSource: ApplicationAgentStreamRuntimeSource,
    publicationService: PublishedArtifactPublicationService,
    projectionService: PublishedArtifactProjectionService,
    memoryLocationService: AgentMemoryLocationService,
  ) {
    this.agentExecution = Object.freeze<ApplicationAgentExecution>({
      createAgentRun: async (input) => {
        this.assertAcceptingRuns();
        const result = await this.agentRunService.createAgentRun(input);
        return Object.freeze({ runId: result.runId });
      },
      postAgentInput: (runId, message) => this.postAgentInput(runId, message),
      terminateAgentRun: (runId) => this.agentRunService.terminateAgentRun(runId),
      observeAgentRunLifecycle: (runId, listener) =>
        this.agentRunService.observeAgentRunLifecycle(runId, listener),
    });
    this.teamExecution = Object.freeze<ApplicationTeamExecution>({
      createTeamRun: async (input) => {
        this.assertAcceptingRuns();
        return this.projectTeamLaunch(await this.teamRunService.createTeamRun(input));
      },
      createTeamRunFromRootConfig: async (input) => {
        this.assertAcceptingRuns();
        return this.projectTeamLaunch(
          await this.teamRunService.createTeamRunFromRootConfig(input),
        );
      },
      postTeamInput: (teamRunId, message, targetAgentRunId) =>
        this.postTeamInput(teamRunId, message, targetAgentRunId),
      terminateTeamRun: (teamRunId) => this.teamRunService.terminateTeamRun(teamRunId),
      observeTeamRunLifecycle: (teamRunId, listener) =>
        this.teamRunService.observeTeamRunLifecycle(teamRunId, listener),
    });
    this.streaming = Object.freeze<ApplicationExecutionStreaming>({
      attach: (descriptor, listener) => streamSource.attach(descriptor, listener),
    });
    this.artifacts = Object.freeze<ApplicationPublishedArtifactAccess>({
      getRunPublishedArtifacts: (runId) => projectionService.getRunPublishedArtifacts(runId),
      getPublishedArtifactsFromMemoryDir: (memoryDir) =>
        projectionService.getPublishedArtifactsFromMemoryDir(memoryDir),
      getPublishedArtifactRevisionText: (input) =>
        projectionService.getPublishedArtifactRevisionText(input),
      getPublishedArtifactRevisionTextFromMemoryDir: (input) =>
        projectionService.getPublishedArtifactRevisionTextFromMemoryDir(input),
    });
    this.memory = Object.freeze<ApplicationExecutionMemoryLookup>({
      resolveTeamMemberLocation: (input) =>
        memoryLocationService.resolveTeamMemberLocation(input),
    });
    this.toolReadiness = Object.freeze<ApplicationExecutionToolReadiness>({
      publishedArtifactPublisher: publicationService,
      assertReady: () => this.sessionManager.assertReady(),
    });
    this.lifecycle = Object.freeze<ApplicationExecutionLifecycle>({
      quiesce: () => this.quiesce(),
      close: () => this.close(),
    });
  }

  static create(input: ApplicationExecutionScopeBuildInput): ApplicationExecutionScope {
    assertBuildInput(input);
    const rawSessionScope = input.agentToolsSessionFactory
      .createApplicationSessionScope(input.scopeIdentity);
    let sessionManager: ScopedSessionManager | null = null;
    try {
      const memoryLocationService = new AgentMemoryLocationService({ memoryDir: input.memoryDir });
      const runFileChangeService = new RunFileChangeService({
        memoryDir: input.memoryDir,
        workspaceManager: input.workspaceManager,
      });
      const relay = new ApplicationPublishedArtifactRelayService({
        bindingReader: input.bindingReader,
        artifactDeliverySink: input.artifactDeliverySink,
      });
      const memoryRecorder = new AgentRunMemoryRecorder();
      const resourceManager = new AgentRunResourceManager({
        sessionScope: rawSessionScope,
        runFileChangeService,
        publishedArtifactRelayService: relay,
        memoryRecorder,
      });
      const activationRegistry = new AgentRunActivationRegistry(resourceManager);
      const projectionStore = new PublishedArtifactProjectionStore();
      const snapshotStore = new PublishedArtifactSnapshotStore();
      const publicationService = new PublishedArtifactPublicationService({
        activeRunReader: activationRegistry,
        workspaceManager: input.workspaceManager,
        publishedArtifactRelayService: relay,
        projectionStore,
        snapshotStore,
      });
      sessionManager = input.agentToolsSessionFactory.createApplicationSessionManager({
        scope: rawSessionScope,
        executionCapabilities: { publishedArtifactPublisher: publicationService },
        assertExecutionCapabilitiesReady: () => undefined,
      });
      const codexBootstrapper = new CodexThreadBootstrapper(
        undefined,
        undefined,
        input.agentDefinitionService,
        undefined,
        undefined,
        sessionManager,
      );
      const claudeSessionManager = new ClaudeSessionManager(
        input.workspaceManager,
        undefined,
        sessionManager,
      );
      const agentRunManager = new AgentRunManager({
        autoByteusBackendFactory: new AutoByteusAgentRunBackendFactory({
          agentDefinitionService: input.agentDefinitionService,
        }),
        codexBackendFactory: new CodexAgentRunBackendFactory(undefined, codexBootstrapper),
        claudeBackendFactory: new ClaudeAgentRunBackendFactory(
          claudeSessionManager,
          new ClaudeSessionBootstrapper(undefined, undefined, input.agentDefinitionService),
        ),
        activationRegistry,
        memoryRecorder,
      });
      const memberTeamContextBuilder = new MemberTeamContextBuilder(
        input.agentTeamDefinitionService,
      );
      const activityInspector = new AgentConversationActivityInspector();
      const teamRunManager = new AgentTeamRunManager({
        memoryDir: input.memoryDir,
        mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
          createTeamManager: (context, subTeamRunFactory, callbacks) =>
            new MixedTeamManager(context, {
              subTeamRunFactory,
              taskRootResolver: callbacks.taskRootResolver,
              agentRunManager,
              agentToolMcpSessionManager: sessionManager!,
              memoryLocationService,
              activityInspector,
              memberTeamContextBuilder,
              workspaceManager: input.workspaceManager,
              publish: callbacks.publish,
              deliverInterAgentMessage: callbacks.deliverInterAgentMessage,
              acceptPlatformBinding: callbacks.acceptPlatformBinding,
            }),
        }),
        executionTreeStore: new TeamRunExecutionTreeStore(),
        taskRecordsStore: new TaskDelegationRecordsV1Store(),
        communicationStore: new TeamCommunicationV1Store(),
      });
      return new ApplicationExecutionScope(...buildScope(input, {
        sessionManager,
        memoryLocationService,
        activationRegistry,
        publicationService,
        projectionStore,
        snapshotStore,
        agentRunManager,
        teamRunManager,
      }));
    } catch (error) {
      try {
        if (sessionManager) sessionManager.close();
        else rawSessionScope.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Application execution scope construction failed.",
        );
      }
      throw error;
    }
  }

  abortConstruction(): void {
    if (this.state === "CLOSED") return;
    this.state = "CLOSED";
    this.sessionManager.close();
  }

  private assertAcceptingRuns(): void {
    if (this.state !== "OPEN") {
      throw new Error("Application execution is not accepting new runs.");
    }
  }

  private async postAgentInput(
    runId: string,
    message: Parameters<ApplicationAgentExecution["postAgentInput"]>[1],
  ): Promise<ApplicationExecutionInputDisposition> {
    const run = await this.agentRunService.resolveAgentRun(runId);
    if (!run) return NOT_AVAILABLE;
    return mapInputDisposition(await run.postUserMessage(message));
  }

  private async postTeamInput(
    teamRunId: string,
    message: Parameters<ApplicationTeamExecution["postTeamInput"]>[1],
    targetAgentRunId: string | null,
  ): Promise<ApplicationExecutionInputDisposition> {
    const run = await this.teamRunService.resolveActiveTeamRun(teamRunId);
    if (!run) return NOT_AVAILABLE;
    return mapInputDisposition(await run.postMessage(message, targetAgentRunId));
  }

  private projectTeamLaunch(
    run: Awaited<ReturnType<TeamRunService["createTeamRun"]>>,
  ): ApplicationTeamLaunchResult {
    const members: ApplicationTeamLaunchMember[] = [];
    const visit = (nodes: readonly ConfiguredExecutionNode[]): void => {
      for (const node of nodes) {
        if (isConfiguredAgentExecution(node)) {
          members.push(Object.freeze({
            memberAddress: node.address,
            agentRunId: node.agentRunId,
          }));
        } else {
          visit(node.members);
        }
      }
    };
    visit(run.getExecutionTreeSnapshot().rootTeam.members);
    return Object.freeze({ teamRunId: run.teamRunId, members: Object.freeze(members) });
  }

  private quiesce(): void {
    if (this.state !== "OPEN") return;
    this.state = "QUIESCED";
    this.sessionManager.blockNewSessions();
  }

  private close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    const errors: unknown[] = [];
    this.quiesce();
    try {
      await this.shutdownCoordinator.stopAllRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      this.sessionManager.close();
    } catch (error) {
      errors.push(error);
    }
    this.state = "CLOSED";
    if (errors.length) throw new AggregateError(errors, "Application execution scope close failed.");
  }
}

type BuiltKernel = {
  sessionManager: ScopedSessionManager;
  memoryLocationService: AgentMemoryLocationService;
  activationRegistry: AgentRunActivationRegistry;
  publicationService: PublishedArtifactPublicationService;
  projectionStore: PublishedArtifactProjectionStore;
  snapshotStore: PublishedArtifactSnapshotStore;
  agentRunManager: AgentRunManager;
  teamRunManager: AgentTeamRunManager;
};

const buildScope = (input: ApplicationExecutionScopeBuildInput, kernel: BuiltKernel) => {
  const metadata = new AgentRunMetadataService(input.memoryDir);
  const history = new AgentRunHistoryCatalogService(input.memoryDir, {
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager: kernel.agentRunManager,
  });
  const allocator = new AgentRunIdentityAllocator({
    agentDefinitionService: input.agentDefinitionService,
    agentRunManager: kernel.agentRunManager,
    agentRunMetadataService: metadata,
    teamRunExecutionTreeLocationService: new TeamRunExecutionTreeLocationService({
      memoryDir: input.memoryDir,
    }),
    memoryDir: input.memoryDir,
  });
  const readiness = new TokenUsageMigrationReadiness();
  const provisioning = new AgentRunProvisioningService(input.memoryDir, {
    agentRunManager: kernel.agentRunManager,
    metadataService: metadata,
    historyCatalogService: history,
    workspaceManager: input.workspaceManager,
    agentRunIdentityAllocator: allocator,
  });
  const activation = new StandaloneAgentRunActivationService(input.memoryDir, {
    agentRunManager: kernel.agentRunManager,
    metadataService: metadata,
    historyCatalogService: history,
    workspaceManager: input.workspaceManager,
    tokenUsageReadiness: readiness,
  });
  const agentRunService = new AgentRunService(input.memoryDir, {
    agentRunManager: kernel.agentRunManager,
    metadataService: metadata,
    historyCatalogService: history,
    workspaceManager: input.workspaceManager,
    agentRunIdentityAllocator: allocator,
    provisioningService: provisioning,
    activationService: activation,
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager: kernel.teamRunManager,
    teamDefinitionService: input.agentTeamDefinitionService,
    agentRunIdentityAllocator: allocator,
    teamRunIdentityAllocator: new TeamRunIdentityAllocator(),
    teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(input.memoryDir, {
      teamRunManager: kernel.teamRunManager,
    }),
    workspaceManager: input.workspaceManager,
    memoryDir: input.memoryDir,
    memoryLocationService: kernel.memoryLocationService,
    tokenUsageReadiness: readiness,
  });
  return [
    agentRunService,
    teamRunService,
    kernel.sessionManager,
    new ApplicationExecutionShutdownCoordinator(
      kernel.teamRunManager,
      kernel.agentRunManager,
    ),
    new ApplicationAgentStreamRuntimeSource({
      agentRunManager: kernel.agentRunManager,
      teamRunManager: kernel.teamRunManager,
    }),
    kernel.publicationService,
    new PublishedArtifactProjectionService({
      activeRunReader: kernel.activationRegistry,
      metadataService: metadata,
      projectionStore: kernel.projectionStore,
      snapshotStore: kernel.snapshotStore,
    }),
    kernel.memoryLocationService,
  ] as const;
};

const mapInputDisposition = (
  result: { accepted: boolean; message?: string },
): ApplicationExecutionInputDisposition => result.accepted
  ? ACCEPTED
  : Object.freeze({ kind: "REJECTED", message: result.message ?? null });

const assertBuildInput = (input: ApplicationExecutionScopeBuildInput): void => {
  if (!input || typeof input !== "object") {
    throw new Error("Application execution scope input is required.");
  }
  if (typeof input.scopeIdentity !== "string" || !input.scopeIdentity.trim()) {
    throw new Error("Application execution scope identity is required.");
  }
  if (typeof input.memoryDir !== "string" || !input.memoryDir.trim()) {
    throw new Error("Application execution memory directory is required.");
  }
  for (const field of [
    "agentDefinitionService",
    "agentTeamDefinitionService",
    "agentToolsSessionFactory",
    "workspaceManager",
    "bindingReader",
    "artifactDeliverySink",
  ] as const) {
    if (input[field] == null) {
      throw new Error(`Application execution scope ${field} is required.`);
    }
  }
};
