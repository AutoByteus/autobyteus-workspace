import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { FlatTeamExecutionContext, FlatTeamMemberExecutionContext } from "../flat-team-execution-context.js";
import { FlatTeamAgentExecutionHandle } from "../flat-team-agent-execution-handle.js";
import { FlatTeamMemberConfigResolver } from "./flat-team-member-config-resolver.js";
import type { RootedAgentMemoryLocator } from "../../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "../flat-team-execution-callbacks.js";

export type ConfiguredMemberRegistryAccess = {
  getOrCreate(context: FlatTeamMemberExecutionContext): FlatTeamAgentExecutionHandle;
};

export class ConfiguredAgentExecutionRegistry implements ConfiguredMemberRegistryAccess {
  private readonly handles = new Map<AgentTeamAddress, FlatTeamAgentExecutionHandle>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    configResolver: FlatTeamMemberConfigResolver;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    callbacks: FlatTeamExecutionCallbacks;
  }) {}

  listHandles(): FlatTeamAgentExecutionHandle[] { return [...this.handles.values()]; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  remove(address: AgentTeamAddress): boolean {
    const handle = this.handles.get(address);
    if (!handle) return false;
    handle.dispose();
    return this.handles.delete(address);
  }

  getOrCreate(context: FlatTeamMemberExecutionContext): FlatTeamAgentExecutionHandle {
    const existing = this.handles.get(context.address);
    if (existing) return existing;
    if (!this.materializationOpen) {
      throw new Error(`Configured member '${context.address}' cannot materialize after TeamRun freeze.`);
    }
    const node = this.options.configResolver.resolve(context);
    if (context.kind !== "agent" || node.kind !== "agent") {
      throw new Error(`Flat Team configured member '${context.address}' must be an Agent.`);
    }
    const handle = new FlatTeamAgentExecutionHandle({
      teamContext: this.options.teamContext,
      context,
      config: node,
      activationMode: this.options.teamContext.runtimeContext.configuredMemberActivationMode,
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
      callbacks: this.options.callbacks,
    });
    this.handles.set(context.address, handle);
    return handle;
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
  }
}
