import type { ChannelBinding } from "../domain/models.js";
import type { ChannelBindingService } from "../services/channel-binding-service.js";
import {
  getTeamRunHistoryService,
  type TeamRunHistoryService,
} from "../../run-history/services/team-run-history-service.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import {
  getRuntimeCompositionService,
  type RuntimeCompositionService,
} from "../../runtime-execution/runtime-composition-service.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import {
  getWorkspaceManager,
  type WorkspaceManager,
} from "../../workspaces/workspace-manager.js";
import {
  ChannelRunHistoryBootstrapper,
  type ChannelRunHistoryBootstrapperDependencies,
} from "./channel-run-history-bootstrapper.js";
import {
  getTeamRunLaunchService,
  type TeamRunLaunchService,
} from "../../agent-team-execution/services/team-run-launch-service.js";

export type ChannelBindingRuntimeLauncherDependencies = {
  bindingService: Pick<
    ChannelBindingService,
    "upsertBindingAgentRunId" | "upsertBindingTeamRunId"
  >;
  bindingRunRegistry?: ChannelBindingLiveRunRegistry;
  runtimeCompositionService?: RuntimeCompositionService;
  runtimeCommandIngressService?: RuntimeCommandIngressService;
  runtimeAdapterRegistry?: RuntimeAdapterRegistry;
  workspaceManager?: WorkspaceManager;
  teamRunHistoryService?: Pick<TeamRunHistoryService, "getTeamRunResumeConfig">;
  teamRunLaunchService?: Pick<
    TeamRunLaunchService,
    "buildMemberConfigsFromLaunchPreset" | "ensureTeamRun"
  >;
  runHistoryBootstrapper?: ChannelRunHistoryBootstrapper;
  runHistoryBootstrapperDeps?: ChannelRunHistoryBootstrapperDependencies;
};

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

export class ChannelBindingRuntimeLauncher {
  private readonly bindingRunRegistry: ChannelBindingLiveRunRegistry;
  private readonly runtimeCompositionService: RuntimeCompositionService;
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;
  private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry;
  private readonly workspaceManager: WorkspaceManager;
  private readonly teamRunHistoryService: Pick<TeamRunHistoryService, "getTeamRunResumeConfig">;
  private readonly teamRunLaunchService: Pick<
    TeamRunLaunchService,
    "buildMemberConfigsFromLaunchPreset" | "ensureTeamRun"
  >;
  private readonly runHistoryBootstrapper: ChannelRunHistoryBootstrapper;

  constructor(
    private readonly deps: ChannelBindingRuntimeLauncherDependencies,
  ) {
    this.bindingRunRegistry =
      deps.bindingRunRegistry ?? new InMemoryChannelBindingLiveRunRegistry();
    this.runtimeCompositionService =
      deps.runtimeCompositionService ?? getRuntimeCompositionService();
    this.runtimeCommandIngressService =
      deps.runtimeCommandIngressService ?? getRuntimeCommandIngressService();
    this.runtimeAdapterRegistry =
      deps.runtimeAdapterRegistry ?? getRuntimeAdapterRegistry();
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.teamRunHistoryService =
      deps.teamRunHistoryService ?? getTeamRunHistoryService();
    this.teamRunLaunchService =
      deps.teamRunLaunchService ?? getTeamRunLaunchService();
    this.runHistoryBootstrapper =
      deps.runHistoryBootstrapper ??
      new ChannelRunHistoryBootstrapper(deps.runHistoryBootstrapperDeps);
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

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
      launchTarget.launchPreset.workspaceRootPath,
    );
    const session = await this.runtimeCompositionService.createAgentRun({
      runtimeKind: launchTarget.launchPreset.runtimeKind,
      agentDefinitionId: launchTarget.agentDefinitionId,
      llmModelIdentifier: launchTarget.launchPreset.llmModelIdentifier,
      autoExecuteTools: launchTarget.launchPreset.autoExecuteTools,
      workspaceId: workspace.workspaceId,
      llmConfig: launchTarget.launchPreset.llmConfig,
      skillAccessMode: launchTarget.launchPreset.skillAccessMode,
    });
    this.runtimeCommandIngressService.bindRunSession(session);
    await this.runHistoryBootstrapper.bootstrapNewRun({
      agentDefinitionId: launchTarget.agentDefinitionId,
      launchPreset: launchTarget.launchPreset,
      session,
      initialSummary: options.initialSummary ?? null,
    });
    await this.deps.bindingService.upsertBindingAgentRunId(binding.id, session.runId);
    this.bindingRunRegistry.claimAgentRun(binding.id, session.runId);
    return session.runId;
  }

  async resolveOrStartTeamRun(
    binding: ChannelBinding,
    options: { initialSummary?: string | null } = {},
  ): Promise<string> {
    const launchTarget = normalizeTeamLaunchTarget(binding);
    const cachedTeamRunId = normalizeNullableString(binding.teamRunId);

    if (
      cachedTeamRunId &&
      this.bindingRunRegistry.ownsTeamRun(binding.id, cachedTeamRunId)
    ) {
      try {
        const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(cachedTeamRunId);
        if (resumeConfig.isActive) {
          return cachedTeamRunId;
        }
      } catch {
        // Fall through to lazy-create a fresh team run for this binding.
      }
    }

    const memberConfigs = await this.teamRunLaunchService.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: launchTarget.teamDefinitionId,
      launchPreset: launchTarget.teamLaunchPreset,
    });
    const { teamRunId } = await this.teamRunLaunchService.ensureTeamRun({
      teamDefinitionId: launchTarget.teamDefinitionId,
      memberConfigs,
      initialSummary: options.initialSummary ?? null,
    });
    await this.deps.bindingService.upsertBindingTeamRunId(binding.id, teamRunId);
    this.bindingRunRegistry.claimTeamRun(binding.id, teamRunId);
    return teamRunId;
  }

  private isRunActive(runId: string): boolean {
    const session = this.runtimeCompositionService.getRunSession(runId);
    if (!session) {
      return false;
    }

    const adapter = this.runtimeAdapterRegistry.resolveAdapter(session.runtimeKind);
    if (!adapter.isRunActive) {
      return true;
    }
    return adapter.isRunActive(runId);
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
