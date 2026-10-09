import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { AgentProviderFactoryBuilder } from "../providers/agent-provider-factory-builder.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentRunIdentityAllocator } from "../services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../services/agent-run-manager.js";
import { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { AgentRunResourceManager } from "../services/agent-run-resource-manager.js";
import { AgentRunActivationRegistry } from "../runtime/agent-run-activation-registry.js";
import { AgentRunProviderInputNormalizer } from "../input/agent-run-provider-input-normalizer.js";
import { ContextFileLayout } from "../../context-files/store/context-file-layout.js";
import { ContextFileOwnerResolver } from "../../context-files/services/context-file-owner-resolver.js";
import { ContextFileLocalPathResolver } from "../../context-files/services/context-file-local-path-resolver.js";
import type { ContextFilePathEnvironment } from "../../context-files/domain/context-file-path-environment.js";
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
import { createTaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { MemberExecutionContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { AgentOrgExecutionScopeBuilder } from "../../agent-org-execution/services/agent-org-execution-scope-builder.js";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import {
  TeamRunService,
  bindProcessTeamRunService,
  releaseProcessTeamRunService,
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
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { RunModelSelectionValidator, RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import type { DefinitionAdmissionService } from "../../collaboration-definition-admission/services/definition-admission-service.js";
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
  bindProcessStandaloneRunCommandPort,
  releaseProcessStandaloneRunCommandPort,
} from "../services/standalone-run-ports.js";
import { StandaloneRootLocationService } from "../../standalone-agent-run-root/services/standalone-root-location-service.js";
import type { CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import {
  bindProcessCollaboratorAdmission,
  createCollaboratorAdmission,
  createCollaboratorDefinitionCatalog,
  releaseProcessCollaboratorAdmission,
} from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";

export type GeneralProcessRunSupervisorInput = Readonly<{
  memoryDir: string;
  contextFilePathEnvironment: ContextFilePathEnvironment;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  definitionAdmissionService: DefinitionAdmissionService;
  workspaceManager: WorkspaceManager;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  modelSelectionValidator: RunModelSelectionValidator & Pick<RunModelSelectionService, "listOptions" | "listOptionsMany">;
  /** Neutral Task agent resource port from the host composition, forwarded to every root builder. */
  taskExecutionResources: TaskExecutionResourcePort;
}>;

const requireGeneralProcessRunSupervisorInput = (
  input: GeneralProcessRunSupervisorInput | null | undefined,
): GeneralProcessRunSupervisorInput => {
  if (
    !input
    || typeof input.memoryDir !== "string"
    || !input.memoryDir.trim()
    || !input.contextFilePathEnvironment
    || typeof input.contextFilePathEnvironment.appDataDir !== "string"
    || !input.contextFilePathEnvironment.appDataDir.trim()
    || typeof input.contextFilePathEnvironment.baseUrl !== "string"
    || !input.contextFilePathEnvironment.baseUrl.trim()
    || !input.agentDefinitionService
    || !input.agentTeamDefinitionService
    || !input.agentOrgDefinitionService
    || !input.definitionAdmissionService
    || !input.workspaceManager
    || !input.agentProviderFactoryBuilder
    || !input.agentToolMcpSessionAuthority
    || !input.modelSelectionValidator
    || typeof input.modelSelectionValidator.validate !== "function"
    || typeof input.modelSelectionValidator.listOptions !== "function"
    || !input.taskExecutionResources
  ) {
    throw new Error("Complete GeneralProcessRunSupervisor input is required.");
  }
  return input;
};

export class GeneralProcessRunSupervisor {
  readonly agentRunService: AgentRunService;
  readonly teamRunService: TeamRunService;
  readonly agentOrgRunService: AgentOrgRunService;
  readonly agentRunResumeConfigService: AgentRunResumeConfigService;
  readonly teamRunHistoryService: TeamRunHistoryService;
  readonly agentOrgRunHistoryCatalogService: AgentOrgRunHistoryCatalogService;
  readonly collaborationRootHistoryService: CollaborationRootHistoryService;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private readonly agentOrgRunManager: AgentOrgRunManager;
  private readonly standaloneRootManager: StandaloneAgentRunRootManager;
  private readonly agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  private readonly collaboratorAdmission: CollaboratorAdmission;
  private readonly runFileChangeService: RunFileChangeService;
  private closePromise: Promise<void> | null = null;

  constructor(input: GeneralProcessRunSupervisorInput) {
    input = requireGeneralProcessRunSupervisorInput(input);
    const memoryDir = input.memoryDir.trim();
    const workspaceManager = input.workspaceManager;
    const storedTeamLocations = createStoredTeamRunExecutionTreeLocationService(memoryDir);
    const storedOrgLocations = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const collaborationLocations = new CollaborationExecutionLocationService({
      teams: storedTeamLocations,
      orgs: storedOrgLocations,
      agents: new StandaloneRootLocationService({
        memoryDir,
        roots: { getActiveTree: (hostRunId) => standaloneRootManager?.getActiveTree(hostRunId) ?? null },
      }),
    });
    let agentRunManager: AgentRunManager | null = null;
    let standaloneRootManager: StandaloneAgentRunRootManager | null = null;
    let standaloneRootManagerBound = false;
    let agentTeamRunManager: AgentTeamRunManager | null = null;
    let agentOrgRunManager: AgentOrgRunManager | null = null;
    let agentRunService: AgentRunService | null = null;
    let teamRunService: TeamRunService | null = null;
    let agentRunServiceBound = false;
    let teamRunServiceBound = false;
    // One admission coordinator over the injected definition services (no ambient definition getters).
    const collaboratorAdmission = createCollaboratorAdmission(createCollaboratorDefinitionCatalog({
      agents: input.agentDefinitionService,
      teams: input.agentTeamDefinitionService,
    }), input.modelSelectionValidator);
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
      });
      const activationRegistry = new AgentRunActivationRegistry(resourceManager);
      const providerFactories = input.agentProviderFactoryBuilder.createForExecution({
        agentDefinitionService: input.agentDefinitionService,
        agentToolMcpRunSessions: input.agentToolMcpSessionAuthority.runSessions,
        applicationAgentTools: null,
      });
      agentRunManager = AgentRunManager.initializeProcessInstance({
        autoByteusBackendFactory: providerFactories.autoByteus,
        codexBackendFactory: providerFactories.codex,
        claudeBackendFactory: providerFactories.claude,
        agyBackendFactory: providerFactories.antigravity,
        grokBackendFactory: providerFactories.grok,
        activationRegistry,
        memoryRecorder,
        providerInputNormalizer,
        agentToolMcpRunSessionDeactivator:
          input.agentToolMcpSessionAuthority.runSessions,
      });

      const metadataService = new AgentRunMetadataService(memoryDir);
      const historyCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
        agentDefinitionService: input.agentDefinitionService,
        agentRunManager,
      });
      const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
        agentDefinitionService: input.agentDefinitionService,
      });
      const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
        agentRunIdentityAllocator,
      );

      const memberExecutionContextBuilder = new MemberExecutionContextBuilder(
        input.agentTeamDefinitionService,
      );
      const memoryLocationService = new AgentMemoryLocationService({
        memoryDir,
        locationService: storedTeamLocations,
      });
      const memoryLocator = new RootedAgentMemoryLocator({ memoryDir });
      const activityInspector = new AgentConversationActivityInspector();
      const generalAgentRunManager = agentRunManager;
      const flatTeamExecutionFactory = new FlatTeamExecutionFactory({
        agentRunManager: generalAgentRunManager,
        memoryLocator,
        activityInspector,
        workspaceManager,
      });
      agentTeamRunManager = AgentTeamRunManager.initializeProcessInstance({
        memoryDir,
        taskExecutionIdentity,
        taskExecutionResources: input.taskExecutionResources,
        modelSelectionValidator: input.modelSelectionValidator,
        flatTeamExecutionFactory,
        memberExecutionContextBuilder,
      });
      agentOrgRunManager = AgentOrgRunManager.initializeProcessInstance({
        workspaces: workspaceManager,
        memoryDir,
        taskExecutionResources: input.taskExecutionResources,
        modelSelectionValidator: input.modelSelectionValidator,
        scopeBuilder: new AgentOrgExecutionScopeBuilder({
          flatTeamExecutionFactory,
          taskExecutionIdentity,
          taskExecutionResources: input.taskExecutionResources,
          orgDefinitions: input.agentOrgDefinitionService,
          teamDefinitions: input.agentTeamDefinitionService,
          agentRunManager: generalAgentRunManager,
          memoryLocator,
          activityInspector,
          workspaceManager,
        }),
      });
      const tokenUsageReadiness = new TokenUsageMigrationReadiness();
      const provisioningService = new AgentRunProvisioningService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        agentRunIdentityAllocator,
      });
      const lifecycleService = new StandaloneAgentRunLifecycleService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        tokenUsageReadiness,
        modelSelectionValidator: input.modelSelectionValidator,
      });
      const activeAgentRuns = agentRunManager;
      // Each eligible standalone run is owned by its root; the lifecycle is its host's activation backend.
      standaloneRootManager = new StandaloneAgentRunRootManager({
        memoryDir,
        definitions: input.agentDefinitionService,
        host: {
          getActiveRun: (hostRunId) => activeAgentRuns.getActiveRun(hostRunId),
          activateHost: (hostRunId, activation) => lifecycleService.activateHost(hostRunId, activation),
          terminateHost: (hostRunId) => lifecycleService.terminateHost(hostRunId),
          readMetadata: (hostRunId) => metadataService.readMetadata(hostRunId),
          recordCollaborationPackageCreated: (hostRunId) => historyCatalogService.recordCollaborationPackageCreated({ runId: hostRunId }),
        },
        taskExecutionResources: input.taskExecutionResources,
        rootDependencies: {
          flatTeamExecutionFactory,
          taskExecutionIdentity,
          taskExecutionResources: input.taskExecutionResources,
          teamDefinitions: input.agentTeamDefinitionService,
          agentRunManager: generalAgentRunManager,
          memoryLocator,
          activityInspector,
          workspaceManager,
          collaboratorAdmission,
        },
      });
      bindProcessStandaloneAgentRunRootManager(standaloneRootManager);
      bindProcessStandaloneRunCommandPort(standaloneRootManager);
      standaloneRootManagerBound = true;
      agentRunService = new AgentRunService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        agentRunIdentityAllocator,
        provisioningService,
        lifecycleService,
        standaloneRuns: standaloneRootManager,
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
      });
      const agentOrgRunService = new AgentOrgRunService({
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
      bindProcessTeamRunService(teamRunService);
      teamRunServiceBound = true;

      this.agentRunManager = agentRunManager;
      this.agentTeamRunManager = agentTeamRunManager;
      this.agentOrgRunManager = agentOrgRunManager;
      this.standaloneRootManager = standaloneRootManager;
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
      });
      this.teamRunHistoryService = new TeamRunHistoryService(memoryDir, {
        catalogService: teamRunHistoryCatalogService,
        teamRunManager: agentTeamRunManager,
      });
      this.collaborationRootHistoryService = new CollaborationRootHistoryService({
        memoryDir,
        teams: this.teamRunHistoryService,
        orgs: agentOrgRunHistoryCatalogService,
        orgRuns: agentOrgRunManager,
      });
    } catch (error) {
      if (teamRunServiceBound && teamRunService) {
        releaseProcessTeamRunService(teamRunService);
      }
      if (agentRunServiceBound && agentRunService) {
        releaseProcessAgentRunService(agentRunService);
      }
      if (agentOrgRunManager) {
        AgentOrgRunManager.releaseProcessInstance(agentOrgRunManager);
      }
      if (standaloneRootManagerBound && standaloneRootManager) {
        releaseProcessStandaloneRunCommandPort(standaloneRootManager);
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
      releaseProcessTeamRunService(this.teamRunService);
      releaseProcessAgentRunService(this.agentRunService);
      AgentOrgRunManager.releaseProcessInstance(this.agentOrgRunManager);
      releaseProcessStandaloneRunCommandPort(this.standaloneRootManager);
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
