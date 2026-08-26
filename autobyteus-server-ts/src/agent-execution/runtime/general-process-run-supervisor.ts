import type { AppConfig } from "../../config/app-config.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { AgentProviderFactoryBuilder } from "../providers/agent-provider-factory-builder.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentRunIdentityAllocator } from "../services/agent-run-identity-allocator.js";
import { AgentRunManager } from "../services/agent-run-manager.js";
import { AgentRunProvisioningService } from "../services/agent-run-provisioning-service.js";
import {
  AgentRunService,
  bindProcessAgentRunService,
  releaseProcessAgentRunService,
} from "../services/agent-run-service.js";
import { StandaloneAgentRunActivationService } from "../services/standalone-agent-run-activation-service.js";
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
import {
  TeamRunExecutionTreeLocationService,
  createStoredTeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { RunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";

export type GeneralProcessRunSupervisorInput = Readonly<{
  appConfig: AppConfig;
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  workspaceManager: WorkspaceManager;
  agentProviderFactoryBuilder: AgentProviderFactoryBuilder;
  agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
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
    || !input.workspaceManager
    || !input.agentProviderFactoryBuilder
    || !input.agentToolMcpSessionAuthority
  ) {
    throw new Error("Complete GeneralProcessRunSupervisor input is required.");
  }
  return input;
};

export class GeneralProcessRunSupervisor {
  readonly agentRunService: AgentRunService;
  readonly teamRunService: TeamRunService;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentTeamRunManager: AgentTeamRunManager;
  private readonly agentToolMcpSessionAuthority: ScopedAgentToolMcpSessionAuthority;
  private closePromise: Promise<void> | null = null;

  constructor(input: GeneralProcessRunSupervisorInput) {
    input = requireGeneralProcessRunSupervisorInput(input);
    const memoryDir = input.appConfig.getMemoryDir();
    const workspaceManager = input.workspaceManager;
    const storedTeamLocations = createStoredTeamRunExecutionTreeLocationService(memoryDir);
    let agentRunManager: AgentRunManager | null = null;
    let agentTeamRunManager: AgentTeamRunManager | null = null;
    let agentRunService: AgentRunService | null = null;
    let teamRunService: TeamRunService | null = null;
    let agentRunServiceBound = false;
    let teamRunServiceBound = false;

    try {
      const providerFactories = input.agentProviderFactoryBuilder.createForExecution({
        agentDefinitionService: input.agentDefinitionService,
        agentToolMcpSessionIssuer: input.agentToolMcpSessionAuthority.issuer,
      });
      agentRunManager = AgentRunManager.initializeProcessInstance({
        autoByteusBackendFactory: providerFactories.autoByteus,
        codexBackendFactory: providerFactories.codex,
        claudeBackendFactory: providerFactories.claude,
        runFileChangeService: new RunFileChangeService({
          memoryDir,
          workspaceManager,
          teamLocations: storedTeamLocations,
        }),
        agentToolMcpRunSessionReleaser:
          input.agentToolMcpSessionAuthority.runSessions,
      });

      const memberTeamContextBuilder = new MemberTeamContextBuilder(
        input.agentTeamDefinitionService,
      );
      const memoryLocationService = new AgentMemoryLocationService({
        memoryDir,
        locationService: storedTeamLocations,
      });
      const activityInspector = new AgentConversationActivityInspector();
      const generalAgentRunManager = agentRunManager;
      agentTeamRunManager = AgentTeamRunManager.initializeProcessInstance({
        memoryDir,
        mixedTeamRunBackendFactory: new MixedTeamRunBackendFactory({
          agentToolMcpRunSessionReleaser:
            input.agentToolMcpSessionAuthority.runSessions,
          createTeamManager: (managerInput) =>
            new MixedTeamManager(managerInput.context, {
              subTeamRunFactory: managerInput.subTeamRunFactory,
              taskRootResolver: managerInput.callbacks.taskRootResolver,
              agentRunManager: generalAgentRunManager,
              agentToolMcpRunSessionReleaser:
                managerInput.agentToolMcpRunSessionReleaser,
              memoryLocationService,
              activityInspector,
              memberTeamContextBuilder,
              workspaceManager,
              publish: managerInput.callbacks.publish,
              deliverInterAgentMessage:
                managerInput.callbacks.deliverInterAgentMessage,
              acceptPlatformBinding:
                managerInput.callbacks.acceptPlatformBinding,
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
      const activationService = new StandaloneAgentRunActivationService(memoryDir, {
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
        activationService,
      });
      teamRunService = new TeamRunService({
        agentTeamRunManager,
        teamDefinitionService: input.agentTeamDefinitionService,
        teamRunHistoryCatalogService: new TeamRunHistoryCatalogService(memoryDir, {
          teamRunManager: agentTeamRunManager,
        }),
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
      this.agentToolMcpSessionAuthority = input.agentToolMcpSessionAuthority;
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
    const errors: unknown[] = [];
    try {
      await this.agentTeamRunManager.stopAllTeamRuns();
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
      AgentTeamRunManager.releaseProcessInstance(this.agentTeamRunManager);
      AgentRunManager.releaseProcessInstance(this.agentRunManager);
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
