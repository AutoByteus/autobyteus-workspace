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
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";

export type AgentOrgIndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  host: TaskExecutionHostIdentity;
  executionKind: "configured" | "task" | "task_team_member";
  source: ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution;
}>;
export type AgentOrgIndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: "configured" | "task" | "task_team_member";
  source: ConfiguredTeamExecutionNode | TaskTeamExecution | TaskTeamNestedTeamExecution;
}>;
export type AgentOrgIndexedTaskExecution =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; agentRunId: string; source: TaskAgentExecution }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; teamRunId: string; source: TaskTeamExecution }>;

/** Immutable fixed-depth lookup over one strict AgentOrg V1 tree. */
export class AgentOrgExecutionIndex {
  readonly root;
  private readonly agentsByRunId = new Map<string, AgentOrgIndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, AgentOrgIndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredExecutionNode>();
  private readonly tasksByRunId = new Map<string, AgentOrgIndexedTaskExecution>();
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
  isLiveAgent(agentRunId: string): boolean {
    const agent = this.getAgent(agentRunId);
    if (!agent || "settledAt" in agent.source && agent.source.settledAt !== null) return false;
    return agent.host.hostKind === "root" || this.isLiveTeam(agent.host.hostRunId);
  }
  isLiveTeam(teamRunId: string): boolean {
    let team: AgentOrgIndexedTeamExecution | null = this.requireTeam(teamRunId);
    while (team) {
      if ("settledAt" in team.source && team.source.settledAt !== null) return false;
      team = team.parentTeamRunId ? this.requireTeam(team.parentTeamRunId) : null;
    }
    return true;
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
    source: ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution,
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
    source: ConfiguredTeamExecutionNode | TaskTeamExecution | TaskTeamNestedTeamExecution,
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
