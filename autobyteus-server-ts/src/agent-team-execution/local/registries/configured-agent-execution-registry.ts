import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { ConfiguredAgentExecutionFactory } from "../../../agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { FlatTeamExecutionContext, FlatTeamMemberExecutionContext } from "../flat-team-execution-context.js";
import { FlatTeamAgentExecutionHandle } from "../flat-team-agent-execution-handle.js";
import { FlatTeamMemberConfigResolver } from "./flat-team-member-config-resolver.js";
import type { AgentRunMemoryLocator } from "../../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "../flat-team-execution-callbacks.js";

export type ConfiguredMemberRegistryAccess = {
  getOrCreate(context: FlatTeamMemberExecutionContext): FlatTeamAgentExecutionHandle;
};

/**
 * The team's member handles, created on first use, by agent run ID: two runs can briefly share an address (a member that
 * took the place of one still finishing its turn), each with its own handle.
 */
export class ConfiguredAgentExecutionRegistry implements ConfiguredMemberRegistryAccess {
  private readonly handles = new Map<string, FlatTeamAgentExecutionHandle>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    configResolver: FlatTeamMemberConfigResolver;
    agentRunManager?: AgentRunManager;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    executionFactory: ConfiguredAgentExecutionFactory;
    callbacks: FlatTeamExecutionCallbacks;
  }) {}

  listHandles(): FlatTeamAgentExecutionHandle[] { return [...this.handles.values()]; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  /** A member's handle when it has one; never creates one. */
  find(agentRunId: string): FlatTeamAgentExecutionHandle | null { return this.handles.get(agentRunId) ?? null; }

  /** A member left the team and was stopped: its handle goes. */
  remove(agentRunId: string): boolean {
    const handle = this.handles.get(agentRunId);
    if (!handle) return false;
    handle.dispose();
    return this.handles.delete(agentRunId);
  }

  getOrCreate(context: FlatTeamMemberExecutionContext): FlatTeamAgentExecutionHandle {
    const existing = this.handles.get(context.agentRunId);
    if (existing) return existing;
    if (!this.materializationOpen) {
      throw new Error(`Configured member '${context.address}' cannot materialize after TeamRun freeze.`);
    }
    const node = this.options.configResolver.resolve(context);
    const handle = new FlatTeamAgentExecutionHandle({
      teamContext: this.options.teamContext,
      context,
      config: node,
      memoryPlacement: this.options.teamContext.memberMemoryPlacement,
      // A member back from the former members resumes its conversation, whatever the team's own mode.
      activationMode: this.options.teamContext.membership.wasRejoined(context.agentRunId)
        ? "restore" : this.options.teamContext.runtimeContext.configuredMemberActivationMode,
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
      executionFactory: this.options.executionFactory,
      callbacks: this.options.callbacks,
    });
    this.handles.set(context.agentRunId, handle);
    return handle;
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
  }
}
