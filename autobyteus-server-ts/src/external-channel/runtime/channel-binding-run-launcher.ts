import type { ChannelBinding } from "../domain/models.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";

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
  private readonly agentRunService: AgentRunService;
  private readonly teamRunService: TeamRunService;

  constructor(
    deps: {
      bindingService?: ChannelBindingService;
      agentRunService?: AgentRunService;
      bindingRunRegistry?: ChannelBindingLiveRunRegistry;
      teamRunService?: TeamRunService;
    } = {},
  ) {
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.bindingRunRegistry =
      deps.bindingRunRegistry ?? new InMemoryChannelBindingLiveRunRegistry();
    this.agentRunService =
      deps.agentRunService ?? getAgentRunService();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
  }

  async resolveOrStartAgentRun(
    binding: ChannelBinding,
  ): Promise<string> {
    const launchTarget = normalizeAgentLaunchTarget(binding);
    const cachedAgentRunId = normalizeNullableString(binding.agentRunId);

    if (
      cachedAgentRunId &&
      this.bindingRunRegistry.ownsAgentRun(binding.id, cachedAgentRunId) &&
      this.agentRunService.getAgentRun(cachedAgentRunId)
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

    const { runId } = await this.agentRunService.createAgentRun({
      runtimeKind: launchTarget.launchPreset.runtimeKind,
      agentDefinitionId: launchTarget.agentDefinitionId,
      workspaceRootPath: launchTarget.launchPreset.workspaceRootPath,
      llmModelIdentifier: launchTarget.launchPreset.llmModelIdentifier,
      autoExecuteTools: launchTarget.launchPreset.autoExecuteTools,
      llmConfig: launchTarget.launchPreset.llmConfig,
      skillAccessMode: launchTarget.launchPreset.skillAccessMode,
    });
    await this.bindingService.upsertBindingAgentRunId(binding.id, runId);
    this.bindingRunRegistry.claimAgentRun(binding.id, runId);
    return runId;
  }

  async resolveOrStartTeamRun(
    binding: ChannelBinding,
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
