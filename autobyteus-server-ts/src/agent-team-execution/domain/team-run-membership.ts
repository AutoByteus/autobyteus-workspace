import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { FlatAgentExecutionContext } from "../local/flat-team-execution-context.js";
import { buildTeamRunConfigFromExecutionTree, fromConfiguredAgent } from "../services/team-run-execution-tree-builder.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "./team-run-config.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";

/** Where an agent run of the team stands: in the definition, removed while finishing its turn, or removed and stopped. */
export type TeamMemberState = "current" | "leaving" | "former";

/**
 * The one in-memory execution view of a team run's membership: its current members (the launch nodes), coordinator and
 * handoff rules, the members still finishing their turn after a removal (leaving), and each member's runtime context
 * (runtime kind, provider binding), which it alone creates. A retained member keeps its context object across a change.
 * It changes only by `replace(committedTree)` (SR-010): a member is leaving while the tree marks it so, and its context
 * goes when the release write makes it former. A team mounted in an Org run is built from its fixed node and never
 * changes.
 */
export class TeamRunMembership {
  private current: TeamRunAgentTeamNode;
  private currentHandoffs: readonly CollaborationHandoff[];
  /** Leaving members by agent run ID (the tree's `leaving` markers): their launch nodes. */
  private readonly leaving = new Map<string, TeamRunAgentNode>();
  /** Members that came back from former members: their next start resumes their conversation. */
  private readonly rejoined = new Set<string>();
  /** The former members' run IDs of the last tree (a rejoin is a run ID moving from there to the members). */
  private formerIds: ReadonlySet<string> = new Set();
  private readonly contexts = new Map<string, FlatAgentExecutionContext>();

  constructor(input: Readonly<{ teamNode: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>) {
    this.current = input.teamNode;
    this.currentHandoffs = Object.freeze([...input.handoffs]);
    for (const node of input.teamNode.children) this.contexts.set(node.agentRunId, contextOf(node));
  }

  /** The membership of a team run's stored tree. */
  static ofTree(tree: TeamRunExecutionTreeSnapshot): TeamRunMembership {
    const config = buildTeamRunConfigFromExecutionTree(tree);
    const membership = new TeamRunMembership({ teamNode: config.rootTeam, handoffs: config.handoffs });
    membership.replace(tree);
    return membership;
  }

  get teamNode(): TeamRunAgentTeamNode { return this.current; }
  get handoffs(): readonly CollaborationHandoff[] { return this.currentHandoffs; }

  /**
   * The tree a change, a release or a provider binding change committed. Members keep their context objects; a new
   * member gets one; a former member marked `leaving` keeps its context (or gets one); any other agent run's context
   * goes. A former member back in `members` is current again: it continues its conversation (a rejoin while leaving
   * cancels the leave).
   */
  replace(tree: TeamRunExecutionTreeSnapshot): void {
    const config = buildTeamRunConfigFromExecutionTree(tree);
    const former = tree.rootTeam.formerMembers ?? [];
    const leaving = new Map(former.filter((node) => node.leaving).map((node) => [node.agentRunId, fromConfiguredAgent(node)]));
    const kept = new Set([...config.rootTeam.children.map((node) => node.agentRunId), ...leaving.keys()]);
    for (const [agentRunId] of this.contexts) if (!kept.has(agentRunId)) this.drop(agentRunId);
    for (const node of config.rootTeam.children) {
      if (this.formerIds.has(node.agentRunId)) this.rejoined.add(node.agentRunId);
      if (!this.contexts.has(node.agentRunId)) this.contexts.set(node.agentRunId, contextOf(node));
    }
    this.leaving.clear();
    for (const [agentRunId, node] of leaving) {
      this.leaving.set(agentRunId, node);
      if (!this.contexts.has(agentRunId)) this.contexts.set(agentRunId, contextOf(node));
    }
    this.formerIds = new Set(former.map((node) => node.agentRunId));
    this.current = config.rootTeam;
    this.currentHandoffs = Object.freeze([...config.handoffs]);
  }

  stateOf(agentRunId: string): TeamMemberState | null {
    if (this.current.children.some((node) => node.agentRunId === agentRunId)) return "current";
    return this.leaving.has(agentRunId) ? "leaving" : null;
  }

  isLeaving(agentRunId: string): boolean { return this.leaving.has(agentRunId); }
  leavingAgentRunIds(): readonly string[] { return Object.freeze([...this.leaving.keys()]); }

  /** The runtime contexts of the current members, in definition order, then of the leaving ones. */
  memberContexts(): readonly FlatAgentExecutionContext[] {
    return Object.freeze([...this.current.children.map((node) => node.agentRunId), ...this.leaving.keys()]
      .map((agentRunId) => this.contexts.get(agentRunId)!));
  }

  memberContext(agentRunId: string): FlatAgentExecutionContext | null {
    return this.stateOf(agentRunId) ? this.contexts.get(agentRunId) ?? null : null;
  }

  /** The launch node of a current or leaving member. */
  agentNode(agentRunId: string): TeamRunAgentNode | null {
    return this.current.children.find((node) => node.agentRunId === agentRunId) ?? this.leaving.get(agentRunId) ?? null;
  }

  /** Whether a current member came back from the former members (its conversation continues). */
  wasRejoined(agentRunId: string): boolean { return this.rejoined.has(agentRunId); }

  /** The outgoing handoff rules of a current member; none for any other agent run. */
  handoffsOf(agentRunId: string): readonly CollaborationHandoff[] {
    const node = this.current.children.find((candidate) => candidate.agentRunId === agentRunId);
    return node ? Object.freeze(this.currentHandoffs.filter((handoff) => handoff.from === node.address)) : Object.freeze([]);
  }

  private drop(agentRunId: string): void {
    this.contexts.delete(agentRunId);
    this.leaving.delete(agentRunId);
    this.rejoined.delete(agentRunId);
  }
}

const contextOf = (node: TeamRunAgentNode): FlatAgentExecutionContext => new FlatAgentExecutionContext({
  address: node.address, agentRunId: node.agentRunId, runtimeKind: node.runtimeKind, platformAgentRunId: node.platformAgentRunId,
});
