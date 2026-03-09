import type { ChannelBinding } from "../domain/models.js";
import type { ChannelBindingService } from "../services/channel-binding-service.js";
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

export type ChannelBindingRuntimeLauncherDependencies = {
  bindingService: Pick<ChannelBindingService, "upsertBindingAgentRunId">;
  runtimeCompositionService?: RuntimeCompositionService;
  runtimeCommandIngressService?: RuntimeCommandIngressService;
  runtimeAdapterRegistry?: RuntimeAdapterRegistry;
  workspaceManager?: WorkspaceManager;
  runHistoryBootstrapper?: ChannelRunHistoryBootstrapper;
  runHistoryBootstrapperDeps?: ChannelRunHistoryBootstrapperDependencies;
};

export class ChannelBindingRuntimeLauncher {
  private readonly runtimeCompositionService: RuntimeCompositionService;
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;
  private readonly runtimeAdapterRegistry: RuntimeAdapterRegistry;
  private readonly workspaceManager: WorkspaceManager;
  private readonly runHistoryBootstrapper: ChannelRunHistoryBootstrapper;

  constructor(
    private readonly deps: ChannelBindingRuntimeLauncherDependencies,
  ) {
    this.runtimeCompositionService =
      deps.runtimeCompositionService ?? getRuntimeCompositionService();
    this.runtimeCommandIngressService =
      deps.runtimeCommandIngressService ?? getRuntimeCommandIngressService();
    this.runtimeAdapterRegistry =
      deps.runtimeAdapterRegistry ?? getRuntimeAdapterRegistry();
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
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

    if (cachedAgentRunId && this.isRunActive(cachedAgentRunId)) {
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
    return session.runId;
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
