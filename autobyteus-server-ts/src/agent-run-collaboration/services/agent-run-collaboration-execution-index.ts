import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createAgentRootExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTaskExecutionHostIdentity,
  type RootExecutionIdentity,
  type RootExecutionPhysicalScope,
  type TaskExecutionHostIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type {
  CollaboratorEntry,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";

export type AgentRunCollaborationAgentKind = "host" | "task" | "task_team_member";

export type AgentRunCollaborationIndexedAgent = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  /** The task host of this agent: the root for the host and root-level task Agents, else its task Team. */
  host: TaskExecutionHostIdentity;
  executionKind: AgentRunCollaborationAgentKind;
  platformAgentRunId: string | null;
  startedAt: string | null;
}>;

export type AgentRunCollaborationIndexedTeam = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: "task" | "task_team_member";
  startedAt: string | null;
  source: TaskTeamExecution | TaskTeamNestedTeamExecution;
}>;

export type AgentRunCollaborationIndexedTaskExecution =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; agentRunId: string; source: TaskAgentExecution }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; teamRunId: string; source: TaskTeamExecution }>;

/** Immutable lookup over one Agent-root collaboration tree: the host plus its delegated children. */
export class AgentRunCollaborationExecutionIndex {
  readonly root: RootExecutionIdentity;
  private readonly rootHost: TaskExecutionHostIdentity;
  private readonly agentsByRunId = new Map<string, AgentRunCollaborationIndexedAgent>();
  private readonly teamsByRunId = new Map<string, AgentRunCollaborationIndexedTeam>();
  private readonly tasksByRunId = new Map<string, AgentRunCollaborationIndexedTaskExecution>();
  private readonly collaboratorsByAddress = new Map<string, CollaboratorEntry>();

  constructor(readonly tree: AgentRunCollaborationTreeSnapshot) {
    this.root = createAgentRootExecutionIdentity(tree.host.agentRunId);
    this.rootHost = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "root", hostRunId: tree.host.agentRunId, hostAddress: "/",
    });
    tree.collaborators.forEach((entry) => this.collaboratorsByAddress.set(entry.address, entry));
    this.addAgent({
      agentRunId: tree.host.agentRunId, address: tree.host.address, host: this.rootHost,
      executionKind: "host", platformAgentRunId: null, startedAt: null,
    });
    tree.taskExecutions.forEach((task) => this.visitTask(task, this.rootHost));
  }

  get hostRunId(): string { return this.tree.host.agentRunId; }
  get hostAddress(): AgentTeamAddress { return this.tree.host.address; }

  getAgent(agentRunId: string): AgentRunCollaborationIndexedAgent | null { return this.agentsByRunId.get(agentRunId) ?? null; }
  requireAgent(agentRunId: string): AgentRunCollaborationIndexedAgent {
    const agent = this.getAgent(agentRunId);
    if (!agent) throw new Error(`AgentRun '${agentRunId}' is not in Agent root '${this.hostRunId}'.`);
    return agent;
  }
  getTeam(teamRunId: string): AgentRunCollaborationIndexedTeam | null { return this.teamsByRunId.get(teamRunId) ?? null; }
  requireTeam(teamRunId: string): AgentRunCollaborationIndexedTeam {
    const team = this.getTeam(teamRunId);
    if (!team) throw new Error(`TeamRun '${teamRunId}' is not in Agent root '${this.hostRunId}'.`);
    return team;
  }
  getCollaborator(address: string): CollaboratorEntry | null { return this.collaboratorsByAddress.get(address) ?? null; }
  listCollaborators(): readonly CollaboratorEntry[] { return this.tree.collaborators; }
  getTaskExecution(reference: TaskExecutionReference): AgentRunCollaborationIndexedTaskExecution | null {
    return this.tasksByRunId.get("agentRunId" in reference ? reference.agentRunId : reference.teamRunId) ?? null;
  }
  listAgents(): readonly AgentRunCollaborationIndexedAgent[] { return Object.freeze([...this.agentsByRunId.values()]); }
  /** Every child AgentRun (task Agents and task-Team members); the host is excluded. */
  listChildAgents(): readonly AgentRunCollaborationIndexedAgent[] {
    return Object.freeze(this.listAgents().filter((agent) => agent.executionKind !== "host"));
  }
  listTeams(): readonly AgentRunCollaborationIndexedTeam[] { return Object.freeze([...this.teamsByRunId.values()]); }
  /** Whether a collaborator has at least one task execution (it is then "in the run"). */
  hasTaskExecutionAt(address: string): boolean {
    return [...this.tasksByRunId.values()].some((task) => task.address === address);
  }

  listTeamAncestorsDeepestFirst(teamRunId: string): readonly AgentRunCollaborationIndexedTeam[] {
    const result: AgentRunCollaborationIndexedTeam[] = [];
    let current: AgentRunCollaborationIndexedTeam | null = this.requireTeam(teamRunId);
    while (current) {
      result.push(current);
      current = current.parentTeamRunId ? this.requireTeam(current.parentTeamRunId) : null;
    }
    return Object.freeze(result);
  }

  /** Children only: the host's memory stays in its standalone run directory. */
  getPhysicalScopeForAgent(agentRunId: string): RootExecutionPhysicalScope {
    const agent = this.requireAgent(agentRunId);
    if (agent.executionKind === "host") throw new Error("The Agent-root host has no rooted memory scope.");
    return agent.host.hostKind === "root"
      ? createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: [] })
      : this.getPhysicalScopeForTeam(agent.host.hostRunId);
  }

  getPhysicalScopeForTeam(teamRunId: string): RootExecutionPhysicalScope {
    const chain = [...this.listTeamAncestorsDeepestFirst(teamRunId)].reverse().map((team) => team.teamRunId);
    return createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: chain });
  }

  /** The agent's own task execution (task Agent), then each enclosing task Team outward. */
  listTaskExecutionChainForAgent(agentRunId: string): readonly AgentRunCollaborationIndexedTaskExecution[] {
    const agent = this.getAgent(agentRunId);
    if (!agent || agent.executionKind === "host") return Object.freeze([]);
    const chain: AgentRunCollaborationIndexedTaskExecution[] = [];
    if (agent.executionKind === "task") chain.push(this.requireTask(agent.agentRunId));
    if (agent.host.hostKind === "team") {
      for (const team of this.listTeamAncestorsDeepestFirst(agent.host.hostRunId)) {
        if (team.executionKind === "task") chain.push(this.requireTask(team.teamRunId));
      }
    }
    return Object.freeze(chain);
  }

  private requireTask(runId: string): AgentRunCollaborationIndexedTaskExecution {
    const task = this.tasksByRunId.get(runId);
    if (!task) throw new Error(`Task execution '${runId}' is not in Agent root '${this.hostRunId}'.`);
    return task;
  }

  private visitTask(task: TaskExecution, host: TaskExecutionHostIdentity): void {
    if ("agentRunId" in task) {
      this.addAgent({
        agentRunId: task.agentRunId, address: task.address, host, executionKind: "task",
        platformAgentRunId: task.platformAgentRunId, startedAt: task.startedAt,
      });
      this.tasksByRunId.set(task.agentRunId, Object.freeze({ kind: "agent", address: task.address, host, agentRunId: task.agentRunId, source: task }));
      return;
    }
    this.addTeam(task, host.hostKind === "team" ? host.hostRunId : null, "task", task.startedAt);
    this.tasksByRunId.set(task.teamRunId, Object.freeze({ kind: "team", address: task.address, host, teamRunId: task.teamRunId, source: task }));
    this.visitTeamContents(task);
  }

  private visitTeamContents(team: TaskTeamExecution | TaskTeamNestedTeamExecution): void {
    const host = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "team", hostRunId: team.teamRunId, hostAddress: team.address,
    });
    team.members.forEach((member) => this.visitMember(member, host));
    team.taskExecutions.forEach((task) => this.visitTask(task, host));
  }

  private visitMember(member: TaskTeamMemberExecution, host: TaskExecutionHostIdentity): void {
    if ("agentRunId" in member) {
      this.addAgent({
        agentRunId: member.agentRunId, address: member.address, host, executionKind: "task_team_member",
        platformAgentRunId: member.platformAgentRunId, startedAt: null,
      });
      return;
    }
    this.addTeam(member, host.hostRunId, "task_team_member", null);
    this.visitTeamContents(member);
  }

  private addAgent(agent: AgentRunCollaborationIndexedAgent): void {
    if (this.agentsByRunId.has(agent.agentRunId)) throw new Error(`Duplicate AgentRun '${agent.agentRunId}'.`);
    this.agentsByRunId.set(agent.agentRunId, Object.freeze(agent));
  }

  private addTeam(
    source: TaskTeamExecution | TaskTeamNestedTeamExecution,
    parentTeamRunId: string | null,
    executionKind: AgentRunCollaborationIndexedTeam["executionKind"],
    startedAt: string | null,
  ): void {
    if (this.teamsByRunId.has(source.teamRunId)) throw new Error(`Duplicate TeamRun '${source.teamRunId}'.`);
    this.teamsByRunId.set(source.teamRunId, Object.freeze({
      teamRunId: source.teamRunId, address: source.address, parentTeamRunId, executionKind, startedAt, source,
    }));
  }
}
