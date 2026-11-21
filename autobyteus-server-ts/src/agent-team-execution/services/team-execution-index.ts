import { createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import {
  isInsideSenderTeamInstances,
  messagePlacement,
  type CollaborationMessagePlacement,
  type MessageRecipientIndexPort,
  type SenderTeamInstance,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import {
  instanceDefinitionsFromSource,
  type InstanceDefinitions,
  type MentionViewerIndexPort,
} from "../../agent-collaboration/collaborators/mention-viewer.js";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runPartPlacement, type AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";

/** A team run holds only its own members (autobyteus-461): a run one of them delegated to is its own run. */
export type AgentExecutionKind = "configured";
export type TeamExecutionKind = "configured";

export type IndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  containingTeamRunId: string;
  executionKind: AgentExecutionKind;
  source: ConfiguredAgentExecutionNode;
}>;

/** One message target: the receiving Agent of an Agent address, or a Team's coordinator. */
export type TeamMessagePlacement = CollaborationMessagePlacement;

export type IndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: TeamExecutionKind;
  source: RootConfiguredTeamExecutionNode;
}>;

/**
 * Immutable derived lookup/ancestry view over one validated execution tree. Its current members answer every lookup;
 * its former members (removed from the definition) answer only by name: `formerMemberAt`, `formerMemberByRunId`, and
 * `getAgentForOwnCommand` for one still finishing its turn (`isLeaving`, the live run's membership).
 */
export class TeamExecutionIndex implements MessageRecipientIndexPort, MentionViewerIndexPort {
  private readonly agentsByRunId = new Map<string, IndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, IndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredAgentExecutionNode>();
  private readonly directAgentRunIdsByTeamRunId = new Map<string, string[]>();
  private readonly directTeamRunIdsByTeamRunId = new Map<string, string[]>();
  private readonly formerByRunId = new Map<string, IndexedAgentExecution>();
  /** The last former member at each address. */
  private readonly formerByAddress = new Map<AgentTeamAddress, IndexedAgentExecution>();

  constructor(
    readonly tree: TeamRunExecutionTreeSnapshot,
    private readonly isLeaving: (agentRunId: string) => boolean = () => false,
  ) {
    const rootAddress = createAgentTeamAddress([]);
    this.addTeam({
      teamRunId: tree.rootTeam.teamRunId,
      address: rootAddress,
      parentTeamRunId: null,
      executionKind: "configured",
      source: tree.rootTeam,
    });
    this.visitConfiguredRoot(tree.rootTeam);
    for (const member of tree.rootTeam.formerMembers ?? []) {
      const former = Object.freeze({ agentRunId: member.agentRunId, address: member.address, containingTeamRunId: tree.rootTeam.teamRunId,
        executionKind: "configured" as const, source: member });
      this.formerByRunId.set(member.agentRunId, former);
      this.formerByAddress.set(member.address, former);
    }
  }

  /** A current member, or a leaving one (its own approvals and interrupt only, while it finishes its turn). */
  getAgentForOwnCommand(agentRunId: string): IndexedAgentExecution | null {
    return this.getAgent(agentRunId) ?? (this.isLeaving(agentRunId) ? this.formerByRunId.get(agentRunId) ?? null : null);
  }

  /** A member removed from the team (leaving or stopped), by its run ID. */
  formerMemberByRunId(agentRunId: string): IndexedAgentExecution | null { return this.formerByRunId.get(agentRunId) ?? null; }

  /** The member that was at `address` and was removed from the team; null when a current member has the address. */
  formerMemberAt(address: AgentTeamAddress | string): IndexedAgentExecution | null {
    return this.configuredByAddress.has(address as AgentTeamAddress) ? null : this.formerByAddress.get(address as AgentTeamAddress) ?? null;
  }

  get rootTeamRunId(): string {
    return this.tree.rootTeam.teamRunId;
  }

  getAgent(agentRunId: string): IndexedAgentExecution | null {
    return this.agentsByRunId.get(agentRunId) ?? null;
  }

  requireAgent(agentRunId: string): IndexedAgentExecution {
    const agent = this.getAgent(agentRunId);
    if (!agent) throw new Error(`AgentRun '${agentRunId}' is not in root '${this.rootTeamRunId}'.`);
    return agent;
  }

  getTeam(teamRunId: string): IndexedTeamExecution | null {
    return this.teamsByRunId.get(teamRunId) ?? null;
  }

  requireTeam(teamRunId: string): IndexedTeamExecution {
    const team = this.getTeam(teamRunId);
    if (!team) throw new Error(`TeamRun '${teamRunId}' is not in root '${this.rootTeamRunId}'.`);
    return team;
  }

  getConfiguredPlacement(address: AgentTeamAddress | string): ConfiguredAgentExecutionNode | null {
    return this.configuredByAddress.get(address as AgentTeamAddress) ?? null;
  }

  /** The one standing execution a message to `address` reaches (REQ-003/005): a configured Agent. */
  getMessagePlacement(address: AgentTeamAddress | string): TeamMessagePlacement | null {
    const placement = messagePlacement;
    const configured = this.configuredByAddress.get(address as AgentTeamAddress);
    return configured ? placement("agent", configured.address, configured) : null;
  }

  /** REQ-007: the Team instances containing the agent, deepest first; the root Team is not one. */
  teamInstancesOf(agentRunId: string): readonly SenderTeamInstance[] {
    const agent = this.getAgent(agentRunId);
    if (!agent) return Object.freeze([]);
    return Object.freeze(this.listTeamAncestorsDeepestFirst(agent.containingTeamRunId)
      .filter((team) => team.address !== "/")
      .map((team) => Object.freeze({ teamRunId: team.teamRunId, address: team.address })));
  }

  /**
   * CM-1 (DEC-008): the sender's own address, any address inside a Team instance that contains it
   * (at any depth), and, for a configured member of the root Team, every configured placement of
   * the root Team (`teamInstancesOf` excludes the root).
   */
  isOwnTeamAddress(senderAgentRunId: string, address: AgentTeamAddress): boolean {
    const sender = this.getAgent(senderAgentRunId);
    if (!sender) return false;
    if (isInsideSenderTeamInstances(this.teamInstancesOf(senderAgentRunId), sender.address, address)) return true;
    return sender.executionKind === "configured" && this.configuredByAddress.has(address);
  }

  instanceDefinitionsOf(teamRunId: string): InstanceDefinitions | null {
    const team = this.getTeam(teamRunId);
    return team ? instanceDefinitionsFromSource(team.source) : null;
  }

  agentAddressOf(agentRunId: string): AgentTeamAddress | null { return this.getAgent(agentRunId)?.address ?? null; }

  /** Inside one Team instance: its coordinator for its own address, else its member Agent. */
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): TeamMessagePlacement | null {
    const team = this.getTeam(teamRunId);
    if (!team) return null;
    if (address !== team.address) {
      const member = this.findInstanceAgent(teamRunId, address);
      return member ? messagePlacement("agent", member.address, member) : null;
    }
    const coordinator = this.findInstanceAgent(teamRunId, this.instanceCoordinatorAddress(team));
    return coordinator ? messagePlacement("agent_team", team.address, coordinator) : null;
  }

  private findInstanceAgent(teamRunId: string, address: string): IndexedAgentExecution | null {
    return this.listDirectAgentExecutions(teamRunId)
      .find((agent) => agent.address === address) ?? null;
  }

  private instanceCoordinatorAddress(team: IndexedTeamExecution): AgentTeamAddress {
    return team.source.coordinatorAddress;
  }

  listAgentExecutions(): readonly IndexedAgentExecution[] {
    return Object.freeze([...this.agentsByRunId.values()]);
  }

  /** The members removed from the team (history: their memory and messages stay this run's). */
  listFormerAgentExecutions(): readonly IndexedAgentExecution[] {
    return Object.freeze([...this.formerByRunId.values()]);
  }

  listTeamExecutions(): readonly IndexedTeamExecution[] {
    return Object.freeze([...this.teamsByRunId.values()]);
  }

  listDirectAgentExecutions(teamRunId: string): readonly IndexedAgentExecution[] {
    return Object.freeze((this.directAgentRunIdsByTeamRunId.get(teamRunId) ?? [])
      .map((runId) => this.requireAgent(runId)));
  }

  listDirectTeamExecutions(teamRunId: string): readonly IndexedTeamExecution[] {
    return Object.freeze((this.directTeamRunIdsByTeamRunId.get(teamRunId) ?? [])
      .map((runId) => this.requireTeam(runId)));
  }

  listTeamAncestorsDeepestFirst(teamRunId: string): readonly IndexedTeamExecution[] {
    const result: IndexedTeamExecution[] = [];
    let current: IndexedTeamExecution | null = this.requireTeam(teamRunId);
    while (current) {
      result.push(current);
      current = current.parentTeamRunId ? this.requireTeam(current.parentTeamRunId) : null;
    }
    return Object.freeze(result);
  }

  listContainingTeamAncestorsForAgent(agentRunId: string): readonly IndexedTeamExecution[] {
    return this.listTeamAncestorsDeepestFirst(this.requireRunAgent(agentRunId).containingTeamRunId);
  }

  /** Where the agent's memory directory is (contract L1): inside its team run's folder (a former member's too). */
  getMemoryPlacementForAgent(agentRunId: string): AgentRunMemoryPlacement {
    return runPartPlacement(this.getTeamRunPhysicalScope(this.requireRunAgent(agentRunId).containingTeamRunId));
  }

  /** A current or former member: both keep their memory in this run. */
  private requireRunAgent(agentRunId: string): IndexedAgentExecution {
    return this.formerByRunId.get(agentRunId) ?? this.requireAgent(agentRunId);
  }

  getTeamRunPhysicalScope(teamRunId: string): RootExecutionPhysicalScope {
    const chain = [...this.listTeamAncestorsDeepestFirst(teamRunId)].reverse();
    return createRootExecutionPhysicalScope({
      root: createTeamRootExecutionIdentity(this.rootTeamRunId),
      ancestorTeamRunIds: chain.slice(1).map((team) => team.teamRunId),
    });
  }

  private visitConfiguredRoot(team: RootConfiguredTeamExecutionNode): void {
    for (const member of team.members) {
      this.configuredByAddress.set(member.address, member);
      this.addAgent({
        agentRunId: member.agentRunId,
        address: member.address,
        containingTeamRunId: team.teamRunId,
        executionKind: "configured",
        source: member,
      });
    }
  }

  private addAgent(agent: IndexedAgentExecution): void {
    if (this.agentsByRunId.has(agent.agentRunId)) throw new Error(`Duplicate AgentRun '${agent.agentRunId}'.`);
    this.agentsByRunId.set(agent.agentRunId, Object.freeze(agent));
    const direct = this.directAgentRunIdsByTeamRunId.get(agent.containingTeamRunId) ?? [];
    direct.push(agent.agentRunId);
    this.directAgentRunIdsByTeamRunId.set(agent.containingTeamRunId, direct);
  }

  private addTeam(team: IndexedTeamExecution): void {
    if (this.teamsByRunId.has(team.teamRunId)) throw new Error(`Duplicate TeamRun '${team.teamRunId}'.`);
    this.teamsByRunId.set(team.teamRunId, Object.freeze(team));
    if (team.parentTeamRunId) {
      const direct = this.directTeamRunIdsByTeamRunId.get(team.parentTeamRunId) ?? [];
      direct.push(team.teamRunId);
      this.directTeamRunIdsByTeamRunId.set(team.parentTeamRunId, direct);
    }
  }
}
