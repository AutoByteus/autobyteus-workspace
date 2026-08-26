import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import type { AgentToolMcpSessionManager } from "../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AutoByteusAgentRunBackendFactory } from "../backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { ClaudeAgentRunBackendFactory } from "../backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../backends/claude/session/claude-session-manager.js";
import { CodexAgentRunBackendFactory } from "../backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import { AgentRunIdentityAllocator } from "../services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../services/agent-run-manager.js";
import { AgentRunStatusProjectionService } from "../services/agent-run-status-projection-service.js";
import { AgentRunProvisioningService } from "../services/agent-run-provisioning-service.js";
import {
  AgentRunService,
  bindProcessAgentRunService,
  releaseProcessAgentRunService,
} from "../services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../services/standalone-agent-run-lifecycle-service.js";
import { MixedTeamRunBackendFactory } from "../../agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../agent-team-execution/backends/mixed/mixed-team-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { MemberTeamContextBuilder } from "../../agent-team-execution/services/member-team-context-builder.js";
import {
  TeamRunService,
  bindProcessTeamRunService,
  releaseProcessTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { AgentRunResumeConfigService } from "../../run-history/services/agent-run-resume-config-service.js";
import {
  TeamRunExecutionTreeLocationService,
  createStoredTeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { TeamRunHistoryService } from "../../run-history/services/team-run-history-service.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";

export type GeneralProcessRunSupervisorInput = Readonly<{
  appConfig: AppConfig;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentToolsSessionManager: AgentToolMcpSessionManager;
}>;

const requireGeneralProcessRunSupervisorInput = (
  input: GeneralProcessRunSupervisorInput | null | undefined,
): GeneralProcessRunSupervisorInput => {
  if (
    !input
    || !input.appConfig
    || typeof input.appConfig.getMemoryDir !== "function"
    || !input.agentDefinitionService
    || !input.agentTeamDefinitionService
    || !input.agentToolsSessionManager
  ) {
    throw new Error("Complete GeneralProcessRunSupervisor input is required.");
  }
  return input;
};

export class GeneralProcessRunSupervisor {
  readonly agentRunService: AgentRunService;
  readonly teamRunService: TeamRunService;
  readonly agentRunResumeConfigService: AgentRunResumeConfigService;
  readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private closePromise: Promise<void> | null = null;

  constructor(input: GeneralProcessRunSupervisorInput) {
    input = requireGeneralProcessRunSupervisorInput(input);
    const memoryDir = input.appConfig.getMemoryDir();
    const workspaceManager = getWorkspaceManager();
    const storedTeamLocations = createStoredTeamRunExecutionTreeLocationService(memoryDir);
    let agentRunManager: AgentRunManager | null = null;
    let agentTeamRunManager: AgentTeamRunManager | null = null;
    let agentRunService: AgentRunService | null = null;
    let teamRunService: TeamRunService | null = null;
    let agentRunServiceBound = false;
    let teamRunServiceBound = false;

    try {
      const codexThreadBootstrapper = new CodexThreadBootstrapper(
        undefined,
        undefined,
        input.agentDefinitionService,
        undefined,
        undefined,
        input.agentToolsSessionManager,
      );
      const claudeSessionManager = new ClaudeSessionManager(
        undefined,
        undefined,
        input.agentToolsSessionManager,
      );
      const claudeSessionBootstrapper = new ClaudeSessionBootstrapper(
        undefined,
        undefined,
        input.agentDefinitionService,
      );
      agentRunManager = AgentRunManager.initializeProcessInstance({
        autoByteusBackendFactory: new AutoByteusAgentRunBackendFactory({
          agentDefinitionService: input.agentDefinitionService,
        }),
        codexBackendFactory: new CodexAgentRunBackendFactory(
          undefined,
          codexThreadBootstrapper,
        ),
        claudeBackendFactory: new ClaudeAgentRunBackendFactory(
          claudeSessionManager,
          claudeSessionBootstrapper,
        ),
        runFileChangeService: new RunFileChangeService({
          memoryDir,
          workspaceManager,
          teamLocations: storedTeamLocations,
        }),
        agentToolMcpSessionManager: input.agentToolsSessionManager,
      });

      const memberTeamContextBuilder = new MemberTeamContextBuilder(
        input.agentTeamDefinitionService,
      );
      const generalAgentRunManager = agentRunManager;
      agentTeamRunManager = AgentTeamRunManager.initializeProcessInstance({
        memoryDir,
        mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
          createTeamManager: (context, subTeamRunFactory, callbacks) =>
            new MixedTeamManager(context, {
              subTeamRunFactory,
              taskRootResolver: callbacks.taskRootResolver,
              agentRunManager: generalAgentRunManager,
              agentToolMcpSessionManager: input.agentToolsSessionManager,
              memberTeamContextBuilder,
              workspaceManager,
              publish: callbacks.publish,
              deliverInterAgentMessage: callbacks.deliverInterAgentMessage,
              acceptPlatformBinding: callbacks.acceptPlatformBinding,
            }),
        }),
      });
      const teamLocations = new TeamRunExecutionTreeLocationService({
        memoryDir,
        manager: agentTeamRunManager,
      });
      const metadataService = new AgentRunMetadataService(memoryDir);
      const historyCatalogService = new AgentRunHistoryCatalogService(memoryDir, {
        agentDefinitionService: input.agentDefinitionService,
        agentRunManager,
      });
      const agentRunIdentityAllocator = new AgentRunIdentityAllocator({
        agentDefinitionService: input.agentDefinitionService,
        agentRunManager,
        agentRunMetadataService: metadataService,
        teamRunExecutionTreeLocationService: teamLocations,
        memoryDir,
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
      });
      agentRunService = new AgentRunService(memoryDir, {
        agentRunManager,
        metadataService,
        historyCatalogService,
        workspaceManager,
        agentRunIdentityAllocator,
        provisioningService,
        lifecycleService,
      });
      const memoryLocationService = new AgentMemoryLocationService({
        memoryDir,
        locationService: teamLocations,
      });
      const teamRunHistoryCatalogService = new TeamRunHistoryCatalogService(memoryDir, {
        teamRunManager: agentTeamRunManager,
      });
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
      });

      bindProcessAgentRunService(agentRunService);
      agentRunServiceBound = true;
      bindProcessTeamRunService(teamRunService);
      teamRunServiceBound = true;

      this.agentRunManager = agentRunManager;
      this.agentTeamRunManager = agentTeamRunManager;
      this.agentRunService = agentRunService;
      this.teamRunService = teamRunService;
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
    } catch (error) {
      if (teamRunServiceBound && teamRunService) {
        releaseProcessTeamRunService(teamRunService);
      }
      if (agentRunServiceBound && agentRunService) {
        releaseProcessAgentRunService(agentRunService);
      }
      if (agentTeamRunManager) {
        AgentTeamRunManager.releaseProcessInstance(agentTeamRunManager);
      }
      if (agentRunManager) {
        AgentRunManager.releaseProcessInstance(agentRunManager);
      }
      throw error;
    }
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    try {
      await this.agentTeamRunManager.stopAllTeamRuns();
    } finally {
      try {
        await this.agentRunManager.stopAllAgentRuns();
      } finally {
        releaseProcessTeamRunService(this.teamRunService);
        releaseProcessAgentRunService(this.agentRunService);
        AgentTeamRunManager.releaseProcessInstance(this.agentTeamRunManager);
        AgentRunManager.releaseProcessInstance(this.agentRunManager);
      }
    }
  }
}

export const createGeneralProcessRunSupervisor = (
  input: GeneralProcessRunSupervisorInput,
): GeneralProcessRunSupervisor => new GeneralProcessRunSupervisor(input);
