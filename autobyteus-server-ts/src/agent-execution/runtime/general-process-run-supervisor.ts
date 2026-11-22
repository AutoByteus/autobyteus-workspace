import { getActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { composeAgentOrgContainers } from "../../agent-org-execution/container/compose-agent-org-containers.js";
import { createOrgContainerDirectory } from "../../agent-org-execution/container/org-container-directory.js";
import { createPeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import { ConfiguredAgentExecutionFactory } from "../../agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import { AgentRunCommandCoordinator } from "../services/agent-run-command-coordinator.js";
import { DelegatedWorkGuard } from "../../run-history/services/delegated-work-guard.js";
import { runOwnStatus } from "../../agent-collaboration/execution/task/task-run-control.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentRunIdentityAllocator } from "../services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../services/agent-run-manager.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { getAgentStreamSequences } from "../../services/agent-streaming/agent-stream-sequence.js";
import { WorkJournalRunUpdater } from "../../agent-work-journal/services/work-journal-run-updater.js";
import { getWorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { AgentRunResourceManager } from "../services/agent-run-resource-manager.js";
import { AgentRunActivationRegistry } from "../runtime/agent-run-activation-registry.js";
import { AgentRunProviderInputNormalizer } from "../input/agent-run-provider-input-normalizer.js";
import { ContextFileLayout } from "../../context-files/store/context-file-layout.js";
import { ContextFileOwnerResolver } from "../../context-files/services/context-file-owner-resolver.js";
import { ContextFileLocalPathResolver } from "../../context-files/services/context-file-local-path-resolver.js";
import { AgentRunStatusProjectionService } from "../services/agent-run-status-projection-service.js";
import { AgentRunProvisioningService } from "../services/agent-run-provisioning-service.js";
import {
  AgentRunService,
  bindProcessAgentRunService,
  releaseProcessAgentRunService,
} from "../services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../services/standalone-agent-run-lifecycle-service.js";
import { FlatTeamExecutionFactory } from "../../agent-team-execution/local/flat-team-execution-factory.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { MemberExecutionContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import {
  TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { AgentRunResumeConfigService } from "../../run-history/services/agent-run-resume-config-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunHistoryService } from "../../run-history/services/team-run-history-service.js";
import {
  RunFileChangeService,
  bindProcessRunFileChangeService,
  releaseProcessRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import { createGeneralProcessPublishedArtifactRelayService } from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { TokenUsageCapability } from "../../token-usage/providers/token-usage-capability.js";
import { AgentOrgRunHistoryCatalogService } from "../../run-history/services/agent-org-run-history-catalog-service.js";
import { CollaborationRootHistoryService } from "../../run-history/services/collaboration-root-history-service.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { CollaborationExecutionLocationService } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import {
  StandaloneAgentRunRootManager,
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import {
} from "../services/standalone-run-ports.js";
import { getRuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import {
  bindProcessCollaboratorAdmission,
  createCollaboratorAdmission,
  createCollaboratorDefinitionCatalog,
  releaseProcessCollaboratorAdmission,
} from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import {
  requireGeneralProcessRunSupervisorInput,
  type GeneralProcessRunSupervisorInput,
} from "./general-process-run-supervisor-input.js";
import { getInternalAgentVisibility } from "../../agent-definition/services/internal-agent-visibility.js";
import { PROCESS_MODEL_ROUTING } from "../../model-routing/services/model-routing-binding.js";
import { TeamMembershipPlanner } from "../../agent-team-execution/membership/team-membership-planner.js";
import { TeamDefinitionChangeListener } from "../../agent-team-execution/membership/team-definition-change-listener.js";
import { OrgDefinitionChangeListener } from "../../agent-org-execution/membership/org-definition-change-listener.js";
import { OrgMembershipPlanner } from "../../agent-org-execution/membership/org-membership-planner.js";
import { LaunchUsabilityCheck } from "../../launch-preferences/launch-usability-check.js";

export class GeneralProcessRunSupervisor {
  readonly agentRunService: AgentRunService;
  readonly teamRunService: TeamRunService;
  readonly agentOrgRunService: AgentOrgRunService;
  readonly agentRunResumeConfigService: AgentRunResumeConfigService;
  readonly teamRunHistoryService: TeamRunHistoryService;
  readonly agentOrgRunHistoryCatalogService: AgentOrgRunHistoryCatalogService;
  readonly collaborationRootHistoryService: CollaborationRootHistoryService;
  /** Archive and delete wait for the runs a run delegated to (REQ-007), by their own statuses (SR-047). */
  readonly delegatedWorkGuard: DelegatedWorkGuard;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private readonly agentOrgRunManager: AgentOrgRunManager;
  readonly standaloneRootManager: StandaloneAgentRunRootManager;
  /** Commands of the agent stream; eligible standalone runs go through their root (autobyteus-500 FU-011). */
  readonly agentRunCommandCoordinator: AgentRunCommandCoordinator;
  private readonly agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  private readonly collaboratorAdmission: CollaboratorAdmission;
  private readonly runFileChangeService: RunFileChangeService;
  private closePromise: Promise<void> | null = null;
  /** Stops the live Team runs following their definitions (before they stop). */
  private stopFollowingDefinitions: () => void = () => undefined;

  constructor(input: GeneralProcessRunSupervisorInput) {
    input = requireGeneralProcessRunSupervisorInput(input);
    const memoryDir = input.memoryDir.trim();
    const workspaceManager = input.workspaceManager;
    const storedTeamLocations = createStoredTeamRunExecutionTreeLocationService(memoryDir);
    const storedOrgLocations = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const collaborationLocations = new CollaborationExecutionLocationService({
      teams: storedTeamLocations,
      orgs: storedOrgLocations,
    });
    let agentRunManager: AgentRunManager | null = null;
    let standaloneRootManager: StandaloneAgentRunRootManager | null = null;
    let standaloneRootManagerBound = false;
    let agentTeamRunManager: AgentTeamRunManager | null = null;
    let agentOrgRunManager: AgentOrgRunManager | null = null;
    let agentRunService: AgentRunService | null = null;
    let teamRunService: TeamRunService | null = null;
    let agentRunServiceBound = false;
    // One admission coordinator over the injected definition services (no ambient definition getters).
    const collaboratorAdmission = createCollaboratorAdmission(createCollaboratorDefinitionCatalog({
      agents: input.agentDefinitionService,
      teams: input.agentTeamDefinitionService,
      visibility: getInternalAgentVisibility(),
    }), input.modelSelectionValidator, getRuntimeAvailabilityService(), PROCESS_MODEL_ROUTING);
    let collaboratorAdmissionBound = false;
    // The one process owner of live run file changes: it records FILE_CHANGE events and serves reads.
    const runFileChangeService = new RunFileChangeService({ workspaceManager });
    let runFileChangeServiceBound = false;

    try {
      bindProcessCollaboratorAdmission(collaboratorAdmission);
      collaboratorAdmissionBound = true;
      bindProcessRunFileChangeService(runFileChangeService);
      runFileChangeServiceBound = true;
      const contextFileLayout = new ContextFileLayout({
        appDataDir: input.contextFilePathEnvironment.appDataDir,
        memoryDir,
      });
      const contextFileOwnerResolver = new ContextFileOwnerResolver({
      memoryDir: memoryDir,
        locations: collaborationLocations,
      });
      const providerInputNormalizer = new AgentRunProviderInputNormalizer(
        new ContextFileLocalPathResolver({
          layout: contextFileLayout,
          ownerResolver: contextFileOwnerResolver,
          baseUrl: input.contextFilePathEnvironment.baseUrl,
        }),
      );
      const memoryRecorder = new AgentRunMemoryRecorder();
      const resourceManager = new AgentRunResourceManager({
        runSessions: input.agentToolMcpSessionAuthority.runSessions,
        runFileChangeService,
        publishedArtifactRelayService: createGeneralProcessPublishedArtifactRelayService(),
        memoryRecorder,
        streamSequences: getAgentStreamSequences(),
        workJournalUpdater: new WorkJournalRunUpdater({ memoryRecorder, journalService: getWorkJournalService() }),
        lifecycleObserver: input.platformInputNotices ?? null,
        mcpServerInstances: McpServerInstanceManager.getInstance(),
        runPasses: input.runPasses,
      });
      const activationRegistry = new AgentRunActivationRegistry(resourceManager);
      const providerFactories = input.agentProviderFactoryBuilder.createForExecution({
        agentDefinitionService: input.agentDefinitionService,
        agentToolMcpRunSessions: input.agentToolMcpSessionAuthority.runSessions,
        applicationAgentTools: null,
        integrationRunAccess: input.integrationRunAccess,
        providerRelayAccess: input.providerRelayAccess,
        peerDiscovery: input.peerDiscovery,
      });
      agentRunManager = AgentRunManager.initializeProcessInstance({
        autoByteusBackendFactory: providerFactories.autoByteus,
        codexBackendFactory: providerFactories.codex,
        claudeBackendFactory: providerFactories.claude,
        agyBackendFactory: providerFactories.antigravity,
        grokBackendFactory: providerFactories.grok,
        deepSeekHarnessBackendFactory: providerFactories.deepSeekHarness,
        activationRegistry,
        memoryRecorder,
        providerInputNormalizer,
        agentToolMcpRunSessionDeactivator:
          input.agentToolMcpSessionAuthority.runSessions,
        runPasses: input.runPasses,
        inputPreface: input.platformInputNotices ?? null,
        lifecycleObserver: input.platformInputNotices ?? null,
      });

      const metadataService = new AgentRunMetadataService(memoryDir);
      const historyCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
        agentDefinitionService: input.agentDefinitionService,
        agentRunManager,
      });
      const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
        agentDefinitionService: input.agentDefinitionService,
      });

      const memberExecutionContextBuilder = new MemberExecutionContextBuilder(
        input.agentTeamDefinitionService,
        input.delegationIndex,
      );
      const memoryLocationService = new AgentMemoryLocationService({
        memoryDir,
        locationService: storedTeamLocations,
      });
      const memoryLocator = new AgentRunMemoryLocator({ memoryDir });
      const activityInspector = new AgentConversationActivityInspector();
      const generalAgentRunManager = agentRunManager;
      // G-5: every agent of this host's roots checks its definition, then its stored model, before it starts.
      const storedModelChecks = { agentDefinitions: input.agentDefinitionService, storedModels: input.modelSelectionValidator };
      const executionFactory = new ConfiguredAgentExecutionFactory({ storedModelChecks });
      const flatTeamExecutionFactory = new FlatTeamExecutionFactory({
        executionFactory,
        agentRunManager: generalAgentRunManager,
        memoryLocator,
        activityInspector,
        workspaceManager,
      });
      const membershipPlanner = new TeamMembershipPlanner({
        teamDefinitions: input.agentTeamDefinitionService, agentDefinitions: input.agentDefinitionService, agentRunIds: agentRunIdentityAllocator,
        usability: new LaunchUsabilityCheck({ availability: getRuntimeAvailabilityService(), validator: input.modelSelectionValidator }),
      });
      agentTeamRunManager = AgentTeamRunManager.initializeProcessInstance({
        memoryDir,
        taskRecords: input.taskRecords,
        delegationIndex: input.delegationIndex,
        remoteChannel: input.remoteChannel,
        viewStreams: input.viewStreams,
        modelSelectionValidator: input.modelSelectionValidator,
        flatTeamExecutionFactory,
        memberExecutionContextBuilder,
        changeNotices: input.teamChangeNotices,
        membershipPlanner,
      });
      const teamRuns = agentTeamRunManager;
      // D-TRIGGER: every definition change, every live Team run follows its definition.
      this.stopFollowingDefinitions = new TeamDefinitionChangeListener({ liveRuns: () => teamRuns.listActiveTeamRuns(),
        planner: membershipPlanner }).listen(input.definitionChanges);
      const orgDirectory = input.orgContainers ?? createOrgContainerDirectory(memoryDir);
      // REQ-004: a Team unit's members as its live run has them; its membership change reaches its Org's rules and notices.
      orgDirectory.bindLiveTeams((teamRunId) => teamRuns.getActiveTeamRun(teamRunId)?.getExecutionTreeSnapshot() ?? null);
      input.teamChangeNotices?.bindOrgRules(orgDirectory);
      // New Orgs are containers of runs (org-teams-follow-definition); the run services are bound below.
      const orgContainers = composeAgentOrgContainers({ memoryDir, streams: input.viewStreams,
        directory: orgDirectory, registrations: getActiveCollaborationRootDirectory(),
        teamRuns: () => teamRunService!, agentRuns: () => agentRunService!, standaloneRoots: () => standaloneRootManager!,
        teamHistory: () => this.teamRunHistoryService });
      // REQ-009 (DS-006): every live Org follows its Org definition on every definition change, and when it reopens.
      orgContainers.bindFollowing({
        planner: new OrgMembershipPlanner({ orgDefinitions: input.agentOrgDefinitionService, teamDefinitions: input.agentTeamDefinitionService,
          agentDefinitions: input.agentDefinitionService }),
        notices: input.teamChangeNotices ?? null,
        runPartsChanged: (run) => input.delegationIndex.runPartsChanged(run),
      });
      const stopFollowingTeams = this.stopFollowingDefinitions;
      const stopFollowingOrgs = new OrgDefinitionChangeListener({ liveOrgRunIds: () => orgContainers.listLive().map((live) => live.orgRunId),
        follow: (orgRunId) => orgContainers.followDefinition(orgRunId) }).listen(input.definitionChanges);
      this.stopFollowingDefinitions = () => { stopFollowingTeams(); stopFollowingOrgs(); };
      agentOrgRunManager = AgentOrgRunManager.initializeProcessInstance({
        workspaces: workspaceManager,
        memoryDir,
        containers: orgContainers,
        delegationIndex: input.delegationIndex,
        modelSelectionValidator: input.modelSelectionValidator,
      });
      const tokenUsageReadiness = new TokenUsageCapability();
      const provisioningService = new AgentRunProvisioningService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        agentRunIdentityAllocator,
      });
      const lifecycleService = new StandaloneAgentRunLifecycleService(memoryDir, {
        storedModelChecks,
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        tokenUsageReadiness,
        modelSelectionValidator: input.modelSelectionValidator,
        switching: input.runtimeSwitching ?? null,
      });
      const activeAgentRuns = agentRunManager;
      // Each eligible standalone run is owned by its root; the lifecycle is its host's activation backend.
      standaloneRootManager = new StandaloneAgentRunRootManager({
        memoryDir,
        definitions: input.agentDefinitionService,
        orgInstruction: async (orgDefinitionId) => (await input.agentOrgDefinitionService.getDefinitionById(orgDefinitionId))?.instructions?.trim() || null,
        agentServices: {
          getActiveRun: (agentRunId) => activeAgentRuns.getActiveRun(agentRunId),
          activateRunAgent: (agentRunId, activation) => lifecycleService.activateRunAgent(agentRunId, activation),
          terminateRunAgent: (agentRunId) => lifecycleService.terminateRunAgent(agentRunId),
          readMetadata: (agentRunId) => metadataService.readMetadata(agentRunId),
        },
        rootDependencies: {
          taskRecords: input.taskRecords,
          delegationIndex: input.delegationIndex,
          remoteChannel: input.remoteChannel,
        viewStreams: input.viewStreams,
          agentRunManager: generalAgentRunManager,
          collaboratorAdmission,
        },
      });
      bindProcessStandaloneAgentRunRootManager(standaloneRootManager);
      standaloneRootManagerBound = true;
      // A run on a peer node, by its own ID, from the tree (SR-066).
      const peerRunOf = createPeerRunOf(input.delegationIndex, input.remoteChannel);
      agentRunService = new AgentRunService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        agentRunIdentityAllocator,
        provisioningService,
        lifecycleService,
        standaloneRuns: standaloneRootManager,
        peerRunOf,
      });
      const teamRunHistoryCatalogService = new TeamRunHistoryCatalogService(memoryDir, {
        teamRunManager: agentTeamRunManager,
      });
      const agentOrgRunHistoryCatalogService = new AgentOrgRunHistoryCatalogService(
        memoryDir,
        agentOrgRunManager,
      );
      teamRunService = new TeamRunService({
        agentTeamRunManager,
        teamDefinitionService: input.agentTeamDefinitionService,
        teamRunHistoryCatalogService,
        workspaceManager,
        memoryDir,
        memoryLocationService,
        agentRunIdentityAllocator,
        teamRunIdentityAllocator: new TeamRunIdentityAllocator(),
        tokenUsageReadiness,
        definitionAdmissionService: input.definitionAdmissionService,
        peerRunOf,
      });
      const delegatedWorkGuard = new DelegatedWorkGuard({ tree: input.delegationIndex,
        statusOf: (child) => runOwnStatus({ agentRuns: agentRunService!, teamRuns: teamRunService! }, child), peerRunOf });
      this.delegatedWorkGuard = delegatedWorkGuard;
      const agentOrgRunService = new AgentOrgRunService({
        workGuard: delegatedWorkGuard,
        episodicCatalog: input.episodicCatalog,
        manager: agentOrgRunManager,
        teamDefinitions: input.agentTeamDefinitionService,
        agentDefinitions: input.agentDefinitionService,
        agentIdentities: agentRunIdentityAllocator,
        teamIdentities: new TeamRunIdentityAllocator(),
        workspaces: workspaceManager,
        admission: input.definitionAdmissionService,
        modelSelectionValidator: input.modelSelectionValidator,
        modelSelectionOptions: input.modelSelectionValidator,
        history: agentOrgRunHistoryCatalogService,
      });

      bindProcessAgentRunService(agentRunService);
      agentRunServiceBound = true;

      this.agentRunManager = agentRunManager;
      this.agentTeamRunManager = agentTeamRunManager;
      this.agentOrgRunManager = agentOrgRunManager;
      this.standaloneRootManager = standaloneRootManager;
      this.agentRunCommandCoordinator = new AgentRunCommandCoordinator({ standaloneRuns: standaloneRootManager });
      this.agentRunService = agentRunService;
      this.teamRunService = teamRunService;
      this.agentOrgRunService = agentOrgRunService;
      this.agentOrgRunHistoryCatalogService = agentOrgRunHistoryCatalogService;
      this.agentToolMcpSessionAuthority = input.agentToolMcpSessionAuthority;
      this.collaboratorAdmission = collaboratorAdmission;
      this.runFileChangeService = runFileChangeService;
      this.agentRunResumeConfigService = new AgentRunResumeConfigService(memoryDir, {
        statusProjectionService: new AgentRunStatusProjectionService({
          agentRunManager,
          metadataService,
        }),
        historyCatalog: historyCatalogService,
        names: input.delegationIndex,
      });
      this.teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
        tree: input.delegationIndex,
        workGuard: delegatedWorkGuard,
        episodicCatalog: input.episodicCatalog,
        catalogService: teamRunHistoryCatalogService,
        teamRunManager: agentTeamRunManager,
      });
      this.collaborationRootHistoryService = new CollaborationRootHistoryService({
        memoryDir,
        tree: input.delegationIndex,
        teams: this.teamRunHistoryService,
        orgs: agentOrgRunHistoryCatalogService,
        orgRuns: agentOrgRunManager,
      });
    } catch (error) {
      if (agentRunServiceBound && agentRunService) {
        releaseProcessAgentRunService(agentRunService);
      }
      if (agentOrgRunManager) {
        AgentOrgRunManager.releaseProcessInstance(agentOrgRunManager);
      }
      if (standaloneRootManagerBound && standaloneRootManager) {
        releaseProcessStandaloneAgentRunRootManager(standaloneRootManager);
      }
      if (agentTeamRunManager) {
        AgentTeamRunManager.releaseProcessInstance(agentTeamRunManager);
      }
      if (agentRunManager) {
        AgentRunManager.releaseProcessInstance(agentRunManager);
      }
      if (runFileChangeServiceBound) {
        releaseProcessRunFileChangeService(runFileChangeService);
      }
      if (collaboratorAdmissionBound) {
        releaseProcessCollaboratorAdmission(collaboratorAdmission);
      }
      throw error;
    }
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    const errors: unknown[] = [];
    this.stopFollowingDefinitions();
    this.agentOrgRunManager.closeRootAdmission();
    this.agentTeamRunManager.closeRootAdmission();
    this.agentRunManager.closeActivationAdmission();
    try {
      await this.agentOrgRunManager.stopAllAgentOrgRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.agentTeamRunManager.stopAllTeamRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      // Standalone roots end (and stop their children) before their host runs stop.
      await this.standaloneRootManager.stopAll();
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.agentRunManager.stopAllAgentRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      releaseProcessAgentRunService(this.agentRunService);
      AgentOrgRunManager.releaseProcessInstance(this.agentOrgRunManager);
      releaseProcessStandaloneAgentRunRootManager(this.standaloneRootManager);
      AgentTeamRunManager.releaseProcessInstance(this.agentTeamRunManager);
      AgentRunManager.releaseProcessInstance(this.agentRunManager);
      releaseProcessRunFileChangeService(this.runFileChangeService);
      releaseProcessCollaboratorAdmission(this.collaboratorAdmission);
    } catch (error) {
      errors.push(error);
    }
    try {
      this.agentToolMcpSessionAuthority.close();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length) {
      throw new AggregateError(errors, "General process run supervisor close failed.");
    }
  }

}

export const createGeneralProcessRunSupervisor = (
  input: GeneralProcessRunSupervisorInput,
): GeneralProcessRunSupervisor => new GeneralProcessRunSupervisor(input);
