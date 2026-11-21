import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createAgentOrgRootExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTaskExecutionHostIdentity,
  type RootExecutionPhysicalScope,
  type TaskExecutionHostIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunExecutionTreeSnapshot, RootConfiguredAgentOrgExecutionNode } from "../domain/agent-org-run-execution-tree.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
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
import { runPartPlacement, type AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";

/** An Org run holds only its own agents and teams (autobyteus-461): a run one of them delegated to is its own run. */
export type AgentOrgExecutionKind = "configured";
export type AgentOrgTeamExecutionKind = "configured";
export type AgentOrgIndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  host: TaskExecutionHostIdentity;
  executionKind: AgentOrgExecutionKind;
  source: ConfiguredAgentExecutionNode;
}>;
export type AgentOrgIndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: AgentOrgTeamExecutionKind;
  source: ConfiguredTeamExecutionNode;
}>;
/** One message target: the receiving Agent run of an Agent address, or a Team's coordinator. */
export type AgentOrgMessagePlacement = CollaborationMessagePlacement;
/** Immutable fixed-depth lookup over one strict AgentOrg tree. */
export class AgentOrgExecutionIndex implements MessageRecipientIndexPort, MentionViewerIndexPort {
  readonly root;
  private readonly agentsByRunId = new Map<string, AgentOrgIndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, AgentOrgIndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredExecutionNode>();
  private readonly directAgentsByHost = new Map<string, string[]>();
  private readonly directTeamsByParent = new Map<string, string[]>();

  constructor(readonly tree: AgentOrgRunExecutionTreeSnapshot) {
    this.root = createAgentOrgRootExecutionIdentity(tree.rootOrg.orgRunId);
    this.visitRoot(tree.rootOrg);
  }

  get orgRunId(): string { return this.root.rootRunId; }
  getAgent(agentRunId: string): AgentOrgIndexedAgentExecution | null { return this.agentsByRunId.get(agentRunId) ?? null; }
  requireAgent(agentRunId: string): AgentOrgIndexedAgentExecution {
    const value = this.getAgent(agentRunId);
    if (!value) throw new Error(`AgentRun '${agentRunId}' is not in AgentOrg '${this.orgRunId}'.`);
    return value;
  }
  getTeam(teamRunId: string): AgentOrgIndexedTeamExecution | null { return this.teamsByRunId.get(teamRunId) ?? null; }
  requireTeam(teamRunId: string): AgentOrgIndexedTeamExecution {
    const value = this.getTeam(teamRunId);
    if (!value) throw new Error(`TeamRun '${teamRunId}' is not in AgentOrg '${this.orgRunId}'.`);
    return value;
  }
  getConfiguredPlacement(address: AgentTeamAddress | string): ConfiguredExecutionNode | null {
    return this.configuredByAddress.get(address as AgentTeamAddress) ?? null;
  }
  /**
   * The one standing execution a message to `address` reaches (REQ-003/005): a configured Agent or
   * a configured Team's coordinator. Delegated children are reached by run ID only.
   */
  getMessagePlacement(address: AgentTeamAddress | string): AgentOrgMessagePlacement | null {
    const placement = messagePlacement;
    const configured = this.configuredByAddress.get(address as AgentTeamAddress);
    if (configured) {
      if ("agentRunId" in configured) return placement("agent", configured.address, configured);
      const coordinator = configured.members.find((member) => member.address === configured.coordinatorAddress);
      return coordinator ? placement("agent_team", configured.address, coordinator) : null;
    }
    return null;
  }

  /**
   * CM-1 (DEC-008): the sender's own address, or any address inside the mounted Team that contains it. Org siblings are independent units.
   */
  /** An Org run's members do not follow their definitions: none ever left. */
  formerMemberAt(_address: AgentTeamAddress): null { return null; }

  isOwnTeamAddress(senderAgentRunId: string, address: AgentTeamAddress): boolean {
    const sender = this.getAgent(senderAgentRunId);
    return !!sender && isInsideSenderTeamInstances(this.teamInstancesOf(senderAgentRunId), sender.address, address);
  }

  /** REQ-007: the mounted Team containing the agent. */
  teamInstancesOf(agentRunId: string): readonly SenderTeamInstance[] {
    const agent = this.getAgent(agentRunId);
    if (!agent || agent.host.hostKind !== "team") return Object.freeze([]);
    return Object.freeze(this.listTeamAncestorsDeepestFirst(agent.host.hostRunId)
      .map((team) => Object.freeze({ teamRunId: team.teamRunId, address: team.address })));
  }

  instanceDefinitionsOf(teamRunId: string): InstanceDefinitions | null {
    const team = this.getTeam(teamRunId);
    return team ? instanceDefinitionsFromSource(team.source) : null;
  }

  agentAddressOf(agentRunId: string): AgentTeamAddress | null { return this.getAgent(agentRunId)?.address ?? null; }

  /** Inside one Team instance: its coordinator for its own address, else its member Agent. */
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): AgentOrgMessagePlacement | null {
    const team = this.getTeam(teamRunId);
    if (!team) return null;
    if (address !== team.address) {
      const member = this.findInstanceAgent(team, address);
      return member ? messagePlacement("agent", member.address, member) : null;
    }
    const coordinator = this.findInstanceAgent(team, this.instanceCoordinatorAddress(team));
    return coordinator ? messagePlacement("agent_team", team.address, coordinator) : null;
  }

  private findInstanceAgent(team: AgentOrgIndexedTeamExecution, address: string): AgentOrgIndexedAgentExecution | null {
    const host = createTaskExecutionHostIdentity({ root: this.root, hostKind: "team", hostRunId: team.teamRunId, hostAddress: team.address });
    return this.listDirectAgents(host).find((agent) => agent.address === address) ?? null;
  }

  private instanceCoordinatorAddress(team: AgentOrgIndexedTeamExecution): AgentTeamAddress {
    return team.source.coordinatorAddress;
  }

  listAgents(): readonly AgentOrgIndexedAgentExecution[] { return Object.freeze([...this.agentsByRunId.values()]); }
  listTeams(): readonly AgentOrgIndexedTeamExecution[] { return Object.freeze([...this.teamsByRunId.values()]); }
  listDirectAgents(host: TaskExecutionHostIdentity): readonly AgentOrgIndexedAgentExecution[] {
    return Object.freeze((this.directAgentsByHost.get(this.hostKey(host)) ?? []).map((id) => this.requireAgent(id)));
  }
  listDirectTeams(parentTeamRunId: string | null): readonly AgentOrgIndexedTeamExecution[] {
    return Object.freeze((this.directTeamsByParent.get(parentTeamRunId ?? this.orgRunId) ?? []).map((id) => this.requireTeam(id)));
  }
  listTeamAncestorsDeepestFirst(teamRunId: string): readonly AgentOrgIndexedTeamExecution[] {
    const result: AgentOrgIndexedTeamExecution[] = [];
    let current: AgentOrgIndexedTeamExecution | null = this.requireTeam(teamRunId);
    while (current) {
      result.push(current);
      current = current.parentTeamRunId ? this.requireTeam(current.parentTeamRunId) : null;
    }
    return Object.freeze(result);
  }
  getPhysicalScopeForAgent(agentRunId: string): RootExecutionPhysicalScope {
    const agent = this.requireAgent(agentRunId);
    return this.getPhysicalScopeForHost(agent.host);
  }
  /** Where the agent's memory directory is (contract L1): inside the Org run's folder. */
  getMemoryPlacementForAgent(agentRunId: string): AgentRunMemoryPlacement {
    return runPartPlacement(this.getPhysicalScopeForAgent(agentRunId));
  }
  getPhysicalScopeForTeam(teamRunId: string): RootExecutionPhysicalScope {
    const chain: string[] = [];
    let team: AgentOrgIndexedTeamExecution | null = this.requireTeam(teamRunId);
    while (team) {
      chain.unshift(team.teamRunId);
      team = team.parentTeamRunId ? this.requireTeam(team.parentTeamRunId) : null;
    }
    return createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: chain });
  }
  getPhysicalScopeForHost(host: TaskExecutionHostIdentity): RootExecutionPhysicalScope {
    if (host.root.rootRunId !== this.orgRunId || host.root.rootSubjectKind !== "agent_org") {
      throw new Error("Task host belongs to a different AgentOrg root.");
    }
    return host.hostKind === "root"
      ? createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: [] })
      : this.getPhysicalScopeForTeam(host.hostRunId);
  }

  private visitRoot(root: RootConfiguredAgentOrgExecutionNode): void {
    const rootHost = createTaskExecutionHostIdentity({ root: this.root, hostKind: "root", hostRunId: this.orgRunId, hostAddress: "/" });
    for (const member of root.members) {
      this.configuredByAddress.set(member.address, member);
      if ("agentRunId" in member) this.addAgent(member, rootHost, "configured");
      else this.visitConfiguredTeam(member);
    }
  }
  private visitConfiguredTeam(team: ConfiguredTeamExecutionNode): void {
    this.addTeam(team, null, "configured");
    const host = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "team", hostRunId: team.teamRunId, hostAddress: team.address,
    });
    for (const agent of team.members) {
      this.configuredByAddress.set(agent.address, agent);
      this.addAgent(agent, host, "configured");
    }
  }
  private addAgent(
    source: AgentOrgIndexedAgentExecution["source"],
    host: TaskExecutionHostIdentity,
    executionKind: AgentOrgIndexedAgentExecution["executionKind"],
  ): void {
    if (this.agentsByRunId.has(source.agentRunId)) throw new Error(`Duplicate AgentRun '${source.agentRunId}'.`);
    const agent = Object.freeze({ agentRunId: source.agentRunId, address: source.address, host, executionKind, source });
    this.agentsByRunId.set(source.agentRunId, agent);
    const direct = this.directAgentsByHost.get(this.hostKey(host)) ?? [];
    direct.push(source.agentRunId);
    this.directAgentsByHost.set(this.hostKey(host), direct);
  }
  private addTeam(
    source: AgentOrgIndexedTeamExecution["source"],
    parentTeamRunId: string | null,
    executionKind: AgentOrgIndexedTeamExecution["executionKind"],
  ): void {
    if (this.teamsByRunId.has(source.teamRunId)) throw new Error(`Duplicate TeamRun '${source.teamRunId}'.`);
    const team = Object.freeze({ teamRunId: source.teamRunId, address: source.address, parentTeamRunId, executionKind, source });
    this.teamsByRunId.set(source.teamRunId, team);
    const key = parentTeamRunId ?? this.orgRunId;
    const direct = this.directTeamsByParent.get(key) ?? [];
    direct.push(source.teamRunId);
    this.directTeamsByParent.set(key, direct);
  }
  private hostKey(host: TaskExecutionHostIdentity): string { return `${host.hostKind}:${host.hostRunId}:${host.hostAddress}`; }
}
