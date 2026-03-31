import type { ChannelBinding } from "../domain/models.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import { AgentRunConfig } from "../../agent-execution/domain/agent-run-config.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryIndexService,
  getAgentRunHistoryIndexService,
} from "../../run-history/services/agent-run-history-index-service.js";
import {
  getWorkspaceManager,
  type WorkspaceManager,
} from "../../workspaces/workspace-manager.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

const agentRunMemoryLayout = new AgentRunMemoryLayout(appConfigProvider.config.getMemoryDir());

export interface ChannelBindingLiveRunRegistry {
  claimAgentRun(bindingId: string, agentRunId: string): void;
  claimTeamRun(bindingId: string, teamRunId: string): void;
  ownsAgentRun(bindingId: string, agentRunId: string): boolean;
  ownsTeamRun(bindingId: string, teamRunId: string): boolean;
}

export class InMemoryChannelBindingLiveRunRegistry
  implements ChannelBindingLiveRunRegistry
{
  private readonly ownedAgentRunsByBindingId = new Map<string, string>();
  private readonly ownedTeamRunsByBindingId = new Map<string, string>();

  claimAgentRun(bindingId: string, agentRunId: string): void {
    this.ownedAgentRunsByBindingId.set(bindingId, agentRunId);
  }

  claimTeamRun(bindingId: string, teamRunId: string): void {
    this.ownedTeamRunsByBindingId.set(bindingId, teamRunId);
  }

  ownsAgentRun(bindingId: string, agentRunId: string): boolean {
    return this.ownedAgentRunsByBindingId.get(bindingId) === agentRunId;
  }

  ownsTeamRun(bindingId: string, teamRunId: string): boolean {
    return this.ownedTeamRunsByBindingId.get(bindingId) === teamRunId;
  }
}

export class ChannelBindingRunLauncher {
  private readonly bindingService: ChannelBindingService;
  private readonly bindingRunRegistry: ChannelBindingLiveRunRegistry;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentRunService: AgentRunService;
  private readonly agentRunMetadataService: AgentRunMetadataService;
  private readonly agentRunHistoryIndexService: AgentRunHistoryIndexService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly teamRunService: TeamRunService;

  constructor(
    deps: {
      bindingService?: ChannelBindingService;
      agentRunManager?: AgentRunManager;
      agentRunService?: AgentRunService;
      agentRunMetadataService?: AgentRunMetadataService;
      agentRunHistoryIndexService?: AgentRunHistoryIndexService;
      bindingRunRegistry?: ChannelBindingLiveRunRegistry;
      workspaceManager?: WorkspaceManager;
      teamRunService?: TeamRunService;
    } = {},
  ) {
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.bindingRunRegistry =
      deps.bindingRunRegistry ?? new InMemoryChannelBindingLiveRunRegistry();
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.agentRunService =
      deps.agentRunService ?? getAgentRunService();
    this.agentRunMetadataService =
      deps.agentRunMetadataService ?? getAgentRunMetadataService();
    this.agentRunHistoryIndexService =
      deps.agentRunHistoryIndexService ?? getAgentRunHistoryIndexService();
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
  }

  async resolveOrStartAgentRun(
    binding: ChannelBinding,
    options: { initialSummary?: string | null } = {},
  ): Promise<string> {
    const launchTarget = normalizeAgentLaunchTarget(binding);
    const cachedAgentRunId = normalizeNullableString(binding.agentRunId);

    if (
      cachedAgentRunId &&
      this.bindingRunRegistry.ownsAgentRun(binding.id, cachedAgentRunId) &&
      this.isRunActive(cachedAgentRunId)
    ) {
      return cachedAgentRunId;
    }

    if (cachedAgentRunId) {
      try {
        const restoreResult = await this.agentRunService.restoreAgentRun(
          cachedAgentRunId,
        );
        await this.bindingService.upsertBindingAgentRunId(binding.id, restoreResult.run.runId);
        this.bindingRunRegistry.claimAgentRun(binding.id, restoreResult.run.runId);
        return restoreResult.run.runId;
      } catch {
        // Fall through to lazy-create a fresh run for this binding.
      }
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
      launchTarget.launchPreset.workspaceRootPath,
    );
    const activeRun = await this.agentRunManager.createAgentRun(
      new AgentRunConfig({
        runtimeKind: launchTarget.launchPreset.runtimeKind,
        agentDefinitionId: launchTarget.agentDefinitionId,
        llmModelIdentifier: launchTarget.launchPreset.llmModelIdentifier,
        autoExecuteTools: launchTarget.launchPreset.autoExecuteTools,
        workspaceId: workspace.workspaceId,
        llmConfig: launchTarget.launchPreset.llmConfig,
        skillAccessMode: launchTarget.launchPreset.skillAccessMode,
      }),
    );
    const runId = activeRun.runId;
    const metadata: AgentRunMetadata = {
      runId,
      agentDefinitionId: launchTarget.agentDefinitionId,
      workspaceRootPath: normalizeRequiredString(
        launchTarget.launchPreset.workspaceRootPath,
        "launchPreset.workspaceRootPath",
      ),
      memoryDir: activeRun.config.memoryDir ?? agentRunMemoryLayout.getRunDirPath(runId),
      llmModelIdentifier: normalizeRequiredString(
        launchTarget.launchPreset.llmModelIdentifier,
        "launchPreset.llmModelIdentifier",
      ),
      llmConfig: launchTarget.launchPreset.llmConfig ?? null,
      autoExecuteTools: Boolean(launchTarget.launchPreset.autoExecuteTools),
      skillAccessMode: launchTarget.launchPreset.skillAccessMode,
      runtimeKind: activeRun.runtimeKind,
      platformAgentRunId: activeRun.getPlatformAgentRunId(),
      lastKnownStatus: "ACTIVE",
    };
    await this.agentRunMetadataService.writeMetadata(runId, metadata);
    await this.agentRunHistoryIndexService.recordRunCreated({
      runId,
      metadata,
      summary: options.initialSummary ?? "",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
    await this.bindingService.upsertBindingAgentRunId(binding.id, runId);
    this.bindingRunRegistry.claimAgentRun(binding.id, runId);
    return runId;
  }

  async resolveOrStartTeamRun(
    binding: ChannelBinding,
    options: { initialSummary?: string | null } = {},
  ): Promise<string> {
    const launchTarget = normalizeTeamLaunchTarget(binding);
    const cachedTeamRunId = normalizeNullableString(binding.teamRunId);

    if (
      cachedTeamRunId &&
      this.bindingRunRegistry.ownsTeamRun(binding.id, cachedTeamRunId) &&
      this.teamRunService.getTeamRun(cachedTeamRunId)
    ) {
      return cachedTeamRunId;
    }

    if (cachedTeamRunId) {
      try {
        const restoredRun = await this.teamRunService.restoreTeamRun(cachedTeamRunId);
        await this.bindingService.upsertBindingTeamRunId(binding.id, restoredRun.runId);
        this.bindingRunRegistry.claimTeamRun(binding.id, restoredRun.runId);
        return restoredRun.runId;
      } catch {
        // Fall through to lazy-create a fresh run for this binding.
      }
    }

    const memberConfigs = await this.teamRunService.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: launchTarget.teamDefinitionId,
      launchPreset: launchTarget.teamLaunchPreset,
    });
    const run = await this.teamRunService.createTeamRun({
      teamDefinitionId: launchTarget.teamDefinitionId,
      memberConfigs,
    });
    const teamRunId = run.runId;
    await this.bindingService.upsertBindingTeamRunId(binding.id, teamRunId);
    this.bindingRunRegistry.claimTeamRun(binding.id, teamRunId);
    return teamRunId;
  }

  private isRunActive(runId: string): boolean {
    return this.agentRunManager.getActiveRun(runId) !== null;
  }
}

const normalizeAgentLaunchTarget = (binding: ChannelBinding) => {
  if (binding.targetType !== "AGENT") {
    throw new Error(
      `Only AGENT bindings can auto-start runtimes. Received targetType '${binding.targetType}'.`,
    );
  }

  const agentDefinitionId = normalizeRequiredString(
    binding.agentDefinitionId,
    "binding.agentDefinitionId",
  );
  if (!binding.launchPreset) {
    throw new Error(`Binding '${binding.id}' is missing launchPreset.`);
  }

  return {
    agentDefinitionId,
    launchPreset: binding.launchPreset,
  };
};

const normalizeTeamLaunchTarget = (binding: ChannelBinding) => {
  if (binding.targetType !== "TEAM") {
    throw new Error(
      `Only TEAM bindings can resolve or start team runs. Received targetType '${binding.targetType}'.`,
    );
  }

  const teamDefinitionId = normalizeRequiredString(
    binding.teamDefinitionId,
    "binding.teamDefinitionId",
  );
  if (!binding.teamLaunchPreset) {
    throw new Error(`Binding '${binding.id}' is missing teamLaunchPreset.`);
  }

  return {
    teamDefinitionId,
    teamLaunchPreset: binding.teamLaunchPreset,
  };
};

const normalizeRequiredString = (
  value: string | null,
  field: string,
): string => {
  if (value === null) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
