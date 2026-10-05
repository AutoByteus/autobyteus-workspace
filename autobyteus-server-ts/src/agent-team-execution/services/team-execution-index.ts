import { createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
  CollaboratorTeamMember,
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import type { TaskTeamExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import {
  messagePlacement,
  type CollaborationMessagePlacement,
  type MessageRecipientIndexPort,
  type SenderTeamInstance,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type AgentExecutionKind = "configured" | "task" | "task_team_member" | "collaborator" | "collaborator_team_member";
export type TeamExecutionKind = "configured" | "task" | "task_team_member" | "collaborator";

export type IndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  containingTeamRunId: string;
  executionKind: AgentExecutionKind;
  source: ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution | CollaboratorAgentEntry | CollaboratorTeamMember;
}>;

/** One message target: the receiving Agent of an Agent address, or a Team's coordinator. */
export type TeamMessagePlacement = CollaborationMessagePlacement;

export type IndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: TeamExecutionKind;
  source:
    | RootConfiguredTeamExecutionNode
    | TaskTeamExecution
    | TaskTeamNestedTeamExecution
    | CollaboratorTeamEntry;
}>;

export type IndexedTaskExecution =
  | Readonly<{
      kind: "agent";
      address: AgentTeamAddress;
      ownerTeamRunId: string;
      agentRunId: string;
      source: TaskAgentExecution;
    }>
  | Readonly<{
      kind: "team";
      address: AgentTeamAddress;
      ownerTeamRunId: string;
      teamRunId: string;
      source: TaskTeamExecution;
    }>;

/** Immutable derived lookup/ancestry view over one validated execution tree. */
export class TeamExecutionIndex implements MessageRecipientIndexPort {
  private readonly agentsByRunId = new Map<string, IndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, IndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredAgentExecutionNode>();
  private readonly collaboratorsByAddress = new Map<string, CollaboratorEntry>();
  private readonly collaboratorMembersByAddress = new Map<string, CollaboratorTeamMember>();
  private readonly taskExecutionsByRunId = new Map<string, IndexedTaskExecution>();
  private readonly directAgentRunIdsByTeamRunId = new Map<string, string[]>();
  private readonly directTeamRunIdsByTeamRunId = new Map<string, string[]>();

  constructor(readonly tree: TeamRunExecutionTreeSnapshot) {
    const rootAddress = createAgentTeamAddress([]);
    this.addTeam({
      teamRunId: tree.rootTeam.teamRunId,
      address: rootAddress,
      parentTeamRunId: null,
      executionKind: "configured",
      source: tree.rootTeam,
    });
    this.visitConfiguredRoot(tree.rootTeam);
    tree.rootTeam.collaborators.forEach((entry) => this.visitCollaborator(entry, tree.rootTeam.teamRunId));
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

  /** A collaborator entry of the run (one hosted instance). */
  getCollaborator(address: AgentTeamAddress | string): CollaboratorEntry | null {
    return this.collaboratorsByAddress.get(address) ?? null;
  }

  /**
   * The one execution a message to `address` reaches (REQ-003/005): a configured Agent, a
   * collaborator Agent, a collaborator Team's coordinator or a collaborator Team member.
   */
  getMessagePlacement(address: AgentTeamAddress | string): TeamMessagePlacement | null {
    const placement = messagePlacement;
    const configured = this.configuredByAddress.get(address as AgentTeamAddress);
    if (configured) return placement("agent", configured.address, configured);
    const collaborator = this.collaboratorsByAddress.get(address);
    if (collaborator?.kind === "agent") return placement("agent", collaborator.address, collaborator);
    if (collaborator?.kind === "agent_team") {
      const coordinator = collaborator.members.find((member) => member.address === collaborator.coordinatorAddress);
      return coordinator ? placement("agent_team", collaborator.address, coordinator) : null;
    }
    const member = this.collaboratorMembersByAddress.get(address);
    return member ? placement("agent", member.address, member) : null;
  }

  /** REQ-007: the Team instances containing the agent, deepest first; the root Team is not one. */
  teamInstancesOf(agentRunId: string): readonly SenderTeamInstance[] {
    const agent = this.getAgent(agentRunId);
    if (!agent) return Object.freeze([]);
    return Object.freeze(this.listTeamAncestorsDeepestFirst(agent.containingTeamRunId)
      .filter((team) => team.address !== "/")
      .map((team) => Object.freeze({ teamRunId: team.teamRunId, address: team.address })));
  }

  /** The recorded catalog source of a task Team copy; null for every other Team instance. */
  instanceCatalogSource(teamRunId: string): TaskTeamExecutionSource | null {
    const team = this.getTeam(teamRunId);
    return team && "source" in team.source && team.source.source ? team.source.source : null;
  }

  /** Inside one Team instance: its coordinator for its own address, else its member Agent. */
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): TeamMessagePlacement | null {
    const team = this.getTeam(teamRunId);
    if (!team) return null;
    if (address !== team.address) {
      const member = this.findInstanceAgent(teamRunId, address);
      return member ? messagePlacement("agent", member.address, member) : null;
    }
    const coordinatorAddress = this.instanceCoordinatorAddress(team);
    const coordinator = coordinatorAddress ? this.findInstanceAgent(teamRunId, coordinatorAddress) : null;
    return coordinator ? messagePlacement("agent_team", team.address, coordinator) : null;
  }

  private findInstanceAgent(teamRunId: string, address: string): IndexedAgentExecution | null {
    const direct = this.listDirectAgentExecutions(teamRunId)
      .find((agent) => agent.executionKind !== "task" && agent.address === address);
    if (direct) return direct;
    for (const team of this.listDirectTeamExecutions(teamRunId)) {
      if (team.executionKind === "task") continue;
      const nested = this.findInstanceAgent(team.teamRunId, address);
      if (nested) return nested;
    }
    return null;
  }

  /** A collaborator Team's own; a task copy's catalog source, else its collaborator's at the same address. */
  private instanceCoordinatorAddress(team: IndexedTeamExecution): AgentTeamAddress | null {
    if ("coordinatorAddress" in team.source) return team.source.coordinatorAddress;
    if ("source" in team.source && team.source.source) return team.source.source.coordinatorAddress;
    const collaborator = this.getCollaborator(team.address);
    return collaborator?.kind === "agent_team" ? collaborator.coordinatorAddress : null;
  }

  getTaskExecution(reference: TaskExecutionReference): IndexedTaskExecution | null {
    const runId = "agentRunId" in reference ? reference.agentRunId : reference.teamRunId;
    return this.taskExecutionsByRunId.get(runId) ?? null;
  }

  listAgentExecutions(): readonly IndexedAgentExecution[] {
    return Object.freeze([...this.agentsByRunId.values()]);
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
    return this.listTeamAncestorsDeepestFirst(this.requireAgent(agentRunId).containingTeamRunId);
  }

  getTeamRunPhysicalScope(teamRunId: string): RootExecutionPhysicalScope {
    const chain = [...this.listTeamAncestorsDeepestFirst(teamRunId)].reverse();
    return createRootExecutionPhysicalScope({
      root: createTeamRootExecutionIdentity(this.rootTeamRunId),
      ancestorTeamRunIds: chain.slice(1).map((team) => team.teamRunId),
    });
  }

  /**
   * Task executions containing the agent: the agent's own execution when it is
   * a task Agent, then each enclosing task Team outward. Empty for agents outside
   * any task execution (for example configured members of the root).
   */
  listTaskExecutionChainForAgent(agentRunId: string): readonly IndexedTaskExecution[] {
    const agent = this.getAgent(agentRunId);
    if (!agent) return Object.freeze([]);
    const chain: IndexedTaskExecution[] = [];
    if (agent.executionKind === "task") chain.push(this.requireTaskExecution(agent.agentRunId));
    for (const team of this.listTeamAncestorsDeepestFirst(agent.containingTeamRunId)) {
      if (team.executionKind === "task") chain.push(this.requireTaskExecution(team.teamRunId));
    }
    return Object.freeze(chain);
  }

  private requireTaskExecution(runId: string): IndexedTaskExecution {
    const execution = this.taskExecutionsByRunId.get(runId);
    if (!execution) throw new Error(`Task execution '${runId}' is not in root '${this.rootTeamRunId}'.`);
    return execution;
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
    team.taskExecutions.forEach((task) => this.visitTaskExecution(task, team.teamRunId));
  }

  /**
   * A collaborator Agent is a direct execution of the root TeamRun; a collaborator Team is
   * one TeamRun under the root that hosts its members and their delegations.
   */
  private visitCollaborator(entry: CollaboratorEntry, rootTeamRunId: string): void {
    this.collaboratorsByAddress.set(entry.address, entry);
    if (entry.kind === "agent") {
      this.addAgent({
        agentRunId: entry.agentRunId,
        address: entry.address as AgentTeamAddress,
        containingTeamRunId: rootTeamRunId,
        executionKind: "collaborator",
        source: entry,
      });
      return;
    }
    this.addTeam({
      teamRunId: entry.teamRunId,
      address: entry.address as AgentTeamAddress,
      parentTeamRunId: rootTeamRunId,
      executionKind: "collaborator",
      source: entry,
    });
    for (const member of entry.members) {
      this.collaboratorMembersByAddress.set(member.address, member);
      this.addAgent({
        agentRunId: member.agentRunId,
        address: member.address as AgentTeamAddress,
        containingTeamRunId: entry.teamRunId,
        executionKind: "collaborator_team_member",
        source: member,
      });
    }
    entry.taskExecutions.forEach((task) => this.visitTaskExecution(task, entry.teamRunId));
  }

  private visitTaskExecution(task: TaskExecution, ownerTeamRunId: string): void {
    if ("agentRunId" in task) {
      const indexed: IndexedTaskExecution = Object.freeze({
        kind: "agent",
        address: task.address,
        ownerTeamRunId,
        agentRunId: task.agentRunId,
        source: task,
      });
      this.addAgent({
        agentRunId: task.agentRunId,
        address: task.address,
        containingTeamRunId: ownerTeamRunId,
        executionKind: "task",
        source: task,
      });
      this.taskExecutionsByRunId.set(task.agentRunId, indexed);
      return;
    }
    const indexed: IndexedTaskExecution = Object.freeze({
      kind: "team",
      address: task.address,
      ownerTeamRunId,
      teamRunId: task.teamRunId,
      source: task,
    });
    this.addTeam({
      teamRunId: task.teamRunId,
      address: task.address,
      parentTeamRunId: ownerTeamRunId,
      executionKind: "task",
      source: task,
    });
    this.taskExecutionsByRunId.set(task.teamRunId, indexed);
    this.visitTaskTeamContents(task, task.teamRunId);
  }

  private visitTaskTeamContents(
    team: TaskTeamExecution | TaskTeamNestedTeamExecution,
    teamRunId: string,
  ): void {
    team.members.forEach((member) => this.visitTaskTeamMember(member, teamRunId));
    team.taskExecutions.forEach((task) => this.visitTaskExecution(task, teamRunId));
  }

  private visitTaskTeamMember(member: TaskTeamMemberExecution, ownerTeamRunId: string): void {
    if ("agentRunId" in member) {
      this.addAgent({
        agentRunId: member.agentRunId,
        address: member.address,
        containingTeamRunId: ownerTeamRunId,
        executionKind: "task_team_member",
        source: member,
      });
      return;
    }
    this.addTeam({
      teamRunId: member.teamRunId,
      address: member.address,
      parentTeamRunId: ownerTeamRunId,
      executionKind: "task_team_member",
      source: member,
    });
    this.visitTaskTeamContents(member, member.teamRunId);
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
