import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type { RootedAgentMemoryLocator } from "../../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { TeamRunAgentNode } from "../../domain/team-run-config.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import { FlatTeamAgentExecutionHandle } from "../flat-team-agent-execution-handle.js";
import type { FlatTeamExecutionCallbacks } from "../flat-team-execution-callbacks.js";
import {
  FlatAgentExecutionContext,
  type ConfiguredMemberActivationMode,
  type FlatTeamExecutionContext,
} from "../flat-team-execution-context.js";

type CollaboratorAgentEntry = Readonly<{
  node: TeamRunAgentNode;
  mode: ConfiguredMemberActivationMode;
  context: FlatAgentExecutionContext;
}>;

/**
 * Collaborator Agents of a Team root: direct Agents of the root TeamRun that the root added
 * after launch (`@`, a first `send_message_to`, or a restore). They sit beside the configured
 * members, never inside their structures; each keeps the activation mode it was added with
 * and gets its handle lazily on first use, so nothing starts a runtime until a message does.
 */
export class TeamRootCollaboratorAgentRegistry {
  private readonly entries = new Map<string, CollaboratorAgentEntry>();
  private readonly handles = new Map<string, FlatTeamAgentExecutionHandle>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<FlatTeamExecutionContext>;
    callbacks: FlatTeamExecutionCallbacks;
    agentRunManager?: AgentRunManager;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  }) {}

  /** Reserves nothing; `commit` (after the tree write is durable) publishes the collaborator. */
  prepare(node: TeamRunAgentNode, mode: ConfiguredMemberActivationMode): Readonly<{ commit(): void }> {
    this.assertUnused(node);
    return Object.freeze({
      commit: () => {
        this.assertUnused(node);
        this.entries.set(node.agentRunId, Object.freeze({
          node,
          mode,
          context: new FlatAgentExecutionContext({
            address: node.address,
            agentRunId: node.agentRunId,
            runtimeKind: node.runtimeKind,
            platformAgentRunId: node.platformAgentRunId,
          }),
        }));
      },
    });
  }

  has(agentRunId: string): boolean { return this.entries.has(agentRunId); }

  /** The collaborator's handle, created on first use; null for an AgentRun that is not a collaborator. */
  get(agentRunId: string): FlatTeamAgentExecutionHandle | null {
    const existing = this.handles.get(agentRunId);
    if (existing) return existing;
    const entry = this.entries.get(agentRunId);
    if (!entry) return null;
    if (!this.materializationOpen) {
      throw new Error(`Collaborator Agent '${entry.node.address}' cannot materialize after TeamRun freeze.`);
    }
    const handle = new FlatTeamAgentExecutionHandle({
      teamContext: this.options.teamContext,
      context: entry.context,
      config: entry.node,
      activationMode: entry.mode,
      agentRunManager: this.options.agentRunManager,
      memoryLocator: this.options.memoryLocator,
      activityInspector: this.options.activityInspector,
      workspaceManager: this.options.workspaceManager,
      callbacks: this.options.callbacks,
    });
    this.handles.set(agentRunId, handle);
    return handle;
  }

  /** Every collaborator in the order it was added, with its handle when one exists. */
  list(): readonly Readonly<{ address: AgentTeamAddress; agentRunId: string; handle: FlatTeamAgentExecutionHandle | null }>[] {
    return [...this.entries.values()].map((entry) => Object.freeze({
      address: entry.node.address,
      agentRunId: entry.node.agentRunId,
      handle: this.handles.get(entry.node.agentRunId) ?? null,
    }));
  }

  listHandles(): FlatTeamAgentExecutionHandle[] { return [...this.handles.values()]; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
    this.entries.clear();
  }

  private assertUnused(node: TeamRunAgentNode): void {
    const configured = this.options.teamContext.runtimeContext.memberContexts.some((member) =>
      member.address === node.address || member.agentRunId === node.agentRunId);
    const collaborator = [...this.entries.values()].some((entry) =>
      entry.node.address === node.address || entry.node.agentRunId === node.agentRunId);
    if (configured || collaborator) {
      throw new Error(`TeamRun '${this.options.teamContext.teamRunId}' already has an Agent at '${node.address}'.`);
    }
  }
}
