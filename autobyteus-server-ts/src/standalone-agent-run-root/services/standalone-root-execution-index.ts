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
import type {
  TaskAgentExecution,
  TaskExecution,
  TaskTeamExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import { placementForAgentChain, type AgentRunMemoryPlacement } from "../../agent-memory/domain/agent-run-memory-placement.js";

export type StandaloneRootAgentKind = "host" | "task" | "task_team_member";

/** One message target: the receiving Agent of an Agent address, or a Team's coordinator. */
export type StandaloneRootMessagePlacement = CollaborationMessagePlacement;

export type StandaloneRootIndexedAgent = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  /** The task host of this agent: the root for the host and root-level task Agents, else its task Team. */
  host: TaskExecutionHostIdentity;
  executionKind: StandaloneRootAgentKind;
  platformAgentRunId: string | null;
  startedAt: string | null;
}>;

export type StandaloneRootIndexedTeam = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  /** Every team of an Agent root is a task agent team (teams are flat: no team is a member of a team). */
  executionKind: "task";
  startedAt: string | null;
  source: TaskTeamExecution;
}>;

export type StandaloneRootIndexedTaskExecution =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; agentRunId: string; source: TaskAgentExecution }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; host: TaskExecutionHostIdentity; teamRunId: string; source: TaskTeamExecution }>;

/** Immutable lookup over one Agent-root collaboration tree: the host plus its delegated children. */
export class StandaloneRootExecutionIndex implements MessageRecipientIndexPort, MentionViewerIndexPort {
  readonly root: RootExecutionIdentity;
  private readonly rootHost: TaskExecutionHostIdentity;
  private readonly agentsByRunId = new Map<string, StandaloneRootIndexedAgent>();
  private readonly teamsByRunId = new Map<string, StandaloneRootIndexedTeam>();
  private readonly tasksByRunId = new Map<string, StandaloneRootIndexedTaskExecution>();

  constructor(readonly tree: StandaloneRootTreeSnapshot) {
    this.root = createAgentRootExecutionIdentity(tree.host.agentRunId);
    this.rootHost = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "root", hostRunId: tree.host.agentRunId, hostAddress: "/",
    });
    this.addAgent({
      agentRunId: tree.host.agentRunId, address: tree.host.address, host: this.rootHost,
      executionKind: "host", platformAgentRunId: null, startedAt: null,
    });
    tree.taskExecutions.forEach((task) => this.visitTask(task, this.rootHost));
  }

  get hostRunId(): string { return this.tree.host.agentRunId; }
  get hostAddress(): AgentTeamAddress { return this.tree.host.address; }

  getAgent(agentRunId: string): StandaloneRootIndexedAgent | null { return this.agentsByRunId.get(agentRunId) ?? null; }
  requireAgent(agentRunId: string): StandaloneRootIndexedAgent {
    const agent = this.getAgent(agentRunId);
    if (!agent) throw new Error(`AgentRun '${agentRunId}' is not in Agent root '${this.hostRunId}'.`);
    return agent;
  }
  getTeam(teamRunId: string): StandaloneRootIndexedTeam | null { return this.teamsByRunId.get(teamRunId) ?? null; }
  requireTeam(teamRunId: string): StandaloneRootIndexedTeam {
    const team = this.getTeam(teamRunId);
    if (!team) throw new Error(`TeamRun '${teamRunId}' is not in Agent root '${this.hostRunId}'.`);
    return team;
  }
  getTaskExecution(reference: TaskExecutionReference): StandaloneRootIndexedTaskExecution | null {
    return this.tasksByRunId.get("agentRunId" in reference ? reference.agentRunId : reference.teamRunId) ?? null;
  }
  listAgents(): readonly StandaloneRootIndexedAgent[] { return Object.freeze([...this.agentsByRunId.values()]); }
  listTaskExecutions(): readonly StandaloneRootIndexedTaskExecution[] { return Object.freeze([...this.tasksByRunId.values()]); }
  /** Every child AgentRun (task Agents and task-Team members); the host is excluded. */
  listChildAgents(): readonly StandaloneRootIndexedAgent[] {
    return Object.freeze(this.listAgents().filter((agent) => agent.executionKind !== "host"));
  }
  listTeams(): readonly StandaloneRootIndexedTeam[] { return Object.freeze([...this.teamsByRunId.values()]); }
  /** The one standing execution a message to `address` reaches: the run's own agent (host). Delegated children are reached by run ID only. */
  getMessagePlacement(address: string): StandaloneRootMessagePlacement | null {
    const placement = messagePlacement;
    return address === this.hostAddress ? placement("agent", address, { agentRunId: this.hostRunId, address }) : null;
  }

  /** CM-1 (DEC-008): the sender's own address, or any address inside a Team instance that contains it (at any depth). */
  isOwnTeamAddress(senderAgentRunId: string, address: AgentTeamAddress): boolean {
    const sender = this.getAgent(senderAgentRunId);
    return !!sender && isInsideSenderTeamInstances(this.teamInstancesOf(senderAgentRunId), sender.address, address);
  }

  /** REQ-007: the Team instances containing the agent, deepest first (task Team copies). */
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
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): StandaloneRootMessagePlacement | null {
    const team = this.getTeam(teamRunId);
    if (!team) return null;
    if (address !== team.address) {
      const member = this.findInstanceAgent(teamRunId, address);
      return member ? messagePlacement("agent", member.address, member) : null;
    }
    const coordinator = this.findInstanceAgent(teamRunId, team.source.source.coordinatorAddress);
    return coordinator ? messagePlacement("agent_team", team.address, coordinator) : null;
  }

  private findInstanceAgent(teamRunId: string, address: string): StandaloneRootIndexedAgent | null {
    return this.listAgents().find((agent) => agent.host.hostKind === "team" && agent.host.hostRunId === teamRunId
      && agent.executionKind !== "task" && agent.address === address) ?? null;
  }

  listTeamAncestorsDeepestFirst(teamRunId: string): readonly StandaloneRootIndexedTeam[] {
    const result: StandaloneRootIndexedTeam[] = [];
    let current: StandaloneRootIndexedTeam | null = this.requireTeam(teamRunId);
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

  /** Where a child's memory directory is (contract L1), from its task execution chain. */
  getMemoryPlacementForAgent(agentRunId: string): AgentRunMemoryPlacement {
    return placementForAgentChain(agentRunId, this.listTaskExecutionChainForAgent(agentRunId), this.getPhysicalScopeForAgent(agentRunId));
  }

  getPhysicalScopeForTeam(teamRunId: string): RootExecutionPhysicalScope {
    const chain = [...this.listTeamAncestorsDeepestFirst(teamRunId)].reverse().map((team) => team.teamRunId);
    return createRootExecutionPhysicalScope({ root: this.root, ancestorTeamRunIds: chain });
  }

  /** The agent's own task execution (task Agent), then each enclosing task Team outward. */
  listTaskExecutionChainForAgent(agentRunId: string): readonly StandaloneRootIndexedTaskExecution[] {
    const agent = this.getAgent(agentRunId);
    if (!agent || agent.executionKind === "host") return Object.freeze([]);
    const chain: StandaloneRootIndexedTaskExecution[] = [];
    if (agent.executionKind === "task") chain.push(this.requireTask(agent.agentRunId));
    if (agent.host.hostKind === "team") {
      for (const team of this.listTeamAncestorsDeepestFirst(agent.host.hostRunId)) chain.push(this.requireTask(team.teamRunId));
    }
    return Object.freeze(chain);
  }

  private requireTask(runId: string): StandaloneRootIndexedTaskExecution {
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

  private visitTeamContents(team: TaskTeamExecution): void {
    const host = createTaskExecutionHostIdentity({
      root: this.root, hostKind: "team", hostRunId: team.teamRunId, hostAddress: team.address,
    });
    for (const member of team.members) {
      this.addAgent({
        agentRunId: member.agentRunId, address: member.address, host, executionKind: "task_team_member",
        platformAgentRunId: member.platformAgentRunId, startedAt: null,
      });
    }
    team.taskExecutions.forEach((task) => this.visitTask(task, host));
  }

  private addAgent(agent: StandaloneRootIndexedAgent): void {
    if (this.agentsByRunId.has(agent.agentRunId)) throw new Error(`Duplicate AgentRun '${agent.agentRunId}'.`);
    this.agentsByRunId.set(agent.agentRunId, Object.freeze(agent));
  }

  private addTeam(
    source: StandaloneRootIndexedTeam["source"],
    parentTeamRunId: string | null,
    executionKind: StandaloneRootIndexedTeam["executionKind"],
    startedAt: string | null,
  ): void {
    if (this.teamsByRunId.has(source.teamRunId)) throw new Error(`Duplicate TeamRun '${source.teamRunId}'.`);
    this.teamsByRunId.set(source.teamRunId, Object.freeze({
      teamRunId: source.teamRunId, address: source.address, parentTeamRunId, executionKind, startedAt, source,
    }));
  }
}
