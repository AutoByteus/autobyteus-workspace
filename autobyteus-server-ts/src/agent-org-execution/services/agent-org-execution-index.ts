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
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
  CollaboratorTeamMember,
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

export type AgentOrgExecutionKind = "configured" | "task" | "task_team_member" | "collaborator" | "collaborator_team_member";
export type AgentOrgIndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  host: TaskExecutionHostIdentity;
  executionKind: AgentOrgExecutionKind;
  source: ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution | CollaboratorAgentEntry | CollaboratorTeamMember;
}>;
export type AgentOrgIndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: Exclude<AgentOrgExecutionKind, "collaborator_team_member">;
  source: ConfiguredTeamExecutionNode | TaskTeamExecution | TaskTeamNestedTeamExecution | CollaboratorTeamEntry;
}>;
/** One message target: the receiving Agent run of an Agent address, or a Team's coordinator. */
export type AgentOrgMessagePlacement = Readonly<{
  kind: "agent" | "agent_team";
  address: AgentTeamAddress;
  receiver: Readonly<{ agentRunId: string; address: AgentTeamAddress }>;
}>;
export type AgentOrgIndexedTaskExecution =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; agentRunId: string; source: TaskAgentExecution }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; teamRunId: string; source: TaskTeamExecution }>;

/** Immutable fixed-depth lookup over one strict AgentOrg tree. */
export class AgentOrgExecutionIndex {
  readonly root;
  private readonly agentsByRunId = new Map<string, AgentOrgIndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, AgentOrgIndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredExecutionNode>();
  private readonly tasksByRunId = new Map<string, AgentOrgIndexedTaskExecution>();
  private readonly directAgentsByHost = new Map<string, string[]>();
  private readonly directTeamsByParent = new Map<string, string[]>();
  private readonly collaboratorsByAddress = new Map<string, CollaboratorEntry>();
  private readonly collaboratorMembersByAddress = new Map<string, CollaboratorTeamMember>();

  constructor(readonly tree: AgentOrgRunExecutionTreeSnapshot) {
    this.root = createAgentOrgRootExecutionIdentity(tree.rootOrg.orgRunId);
    this.visitRoot(tree.rootOrg);
    tree.rootOrg.collaborators.forEach((entry) => this.visitCollaborator(entry));
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
  /** A collaborator entry of the run (one hosted instance). */
  getCollaborator(address: AgentTeamAddress | string): CollaboratorEntry | null {
    return this.collaboratorsByAddress.get(address) ?? null;
  }
  /**
   * The one execution a message to `address` reaches (REQ-003/005): a configured Agent, a
   * configured Team's coordinator, a collaborator Agent, a collaborator Team's coordinator or
   * a collaborator Team member. Delegated children are reached by run ID only.
   */
  getMessagePlacement(address: AgentTeamAddress | string): AgentOrgMessagePlacement | null {
    const placement = (kind: AgentOrgMessagePlacement["kind"], target: string, receiver: { agentRunId: string; address: string }) =>
      Object.freeze({
        kind,
        address: target as AgentTeamAddress,
        receiver: Object.freeze({ agentRunId: receiver.agentRunId, address: receiver.address as AgentTeamAddress }),
      });
    const configured = this.configuredByAddress.get(address as AgentTeamAddress);
    if (configured) {
      if ("agentRunId" in configured) return placement("agent", configured.address, configured);
      const coordinator = configured.members.find((member) => member.address === configured.coordinatorAddress);
      return coordinator ? placement("agent_team", configured.address, coordinator) : null;
    }
    const collaborator = this.collaboratorsByAddress.get(address);
    if (collaborator?.kind === "agent") return placement("agent", collaborator.address, collaborator);
    if (collaborator?.kind === "agent_team") {
      const coordinator = collaborator.members.find((member) => member.address === collaborator.coordinatorAddress);
      return coordinator ? placement("agent_team", collaborator.address, coordinator) : null;
    }
    const member = this.collaboratorMembersByAddress.get(address);
    return member ? placement("agent", member.address, member) : null;
  }

  getTaskExecution(reference: TaskExecutionReference): AgentOrgIndexedTaskExecution | null {
    return this.tasksByRunId.get("agentRunId" in reference ? reference.agentRunId : reference.teamRunId) ?? null;
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
  /**
   * Task executions containing the agent: its own execution when it is a task
   * Agent, then each enclosing task Team outward. Empty outside any task execution.
   */
  listTaskExecutionChainForAgent(agentRunId: string): readonly AgentOrgIndexedTaskExecution[] {
    const agent = this.getAgent(agentRunId);
    if (!agent) return Object.freeze([]);
    const chain: AgentOrgIndexedTaskExecution[] = [];
    if (agent.executionKind === "task") chain.push(this.requireTaskExecution(agent.agentRunId));
    if (agent.host.hostKind === "team") {
      for (const team of this.listTeamAncestorsDeepestFirst(agent.host.hostRunId)) {
        if (team.executionKind === "task") chain.push(this.requireTaskExecution(team.teamRunId));
      }
    }
    return Object.freeze(chain);
  }
  private requireTaskExecution(runId: string): AgentOrgIndexedTaskExecution {
    const execution = this.tasksByRunId.get(runId);
    if (!execution) throw new Error(`Task execution '${runId}' is not in AgentOrg '${this.orgRunId}'.`);
    return execution;
  }

  private visitRoot(root: RootConfiguredAgentOrgExecutionNode): void {
    const rootHost = createTaskExecutionHostIdentity({ root: this.root, hostKind: "root", hostRunId: this.orgRunId, hostAddress: "/" });
    for (const member of root.members) {
      this.configuredByAddress.set(member.address, member);
      if ("agentRunId" in member) this.addAgent(member, rootHost, "configured");
      else this.visitConfiguredTeam(member);
    }
    root.taskExecutions.forEach((task) => this.visitTask(task, rootHost));
  }
  /** A collaborator is hosted by the root: an Agent at root level, or one TeamRun with its members. */
  private visitCollaborator(entry: CollaboratorEntry): void {
    this.collaboratorsByAddress.set(entry.address, entry);
    if (entry.kind === "agent") {
      this.addAgent(entry, createTaskExecutionHostIdentity({ root: this.root, hostKind: "root", hostRunId: this.orgRunId, hostAddress: "/" }), "collaborator");
      return;
    }
    this.addTeam(entry, null, "collaborator");
    const host = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "team", hostRunId: entry.teamRunId, hostAddress: entry.address,
    });
    for (const member of entry.members) {
      this.collaboratorMembersByAddress.set(member.address, member);
      this.addAgent(member, host, "collaborator_team_member");
    }
    entry.taskExecutions.forEach((task) => this.visitTask(task, host));
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
    team.taskExecutions.forEach((task) => this.visitTask(task, host));
  }
  private visitTask(task: TaskExecution, host: TaskExecutionHostIdentity): void {
    if ("agentRunId" in task) {
      this.addAgent(task, host, "task");
      this.tasksByRunId.set(task.agentRunId, Object.freeze({
        kind: "agent", address: task.address, host, agentRunId: task.agentRunId, source: task,
      }));
      return;
    }
    const parent = host.hostKind === "team" ? host.hostRunId : null;
    this.addTeam(task, parent, "task");
    this.tasksByRunId.set(task.teamRunId, Object.freeze({
      kind: "team", address: task.address, host, teamRunId: task.teamRunId, source: task,
    }));
    this.visitTaskTeamContents(task);
  }
  private visitTaskTeamContents(team: TaskTeamExecution | TaskTeamNestedTeamExecution): void {
    const host = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "team", hostRunId: team.teamRunId, hostAddress: team.address,
    });
    team.members.forEach((member) => this.visitTaskMember(member, host));
    team.taskExecutions.forEach((task) => this.visitTask(task, host));
  }
  private visitTaskMember(member: TaskTeamMemberExecution, host: TaskExecutionHostIdentity): void {
    if ("agentRunId" in member) this.addAgent(member, host, "task_team_member");
    else {
      this.addTeam(member, host.hostRunId, "task_team_member");
      this.visitTaskTeamContents(member);
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
