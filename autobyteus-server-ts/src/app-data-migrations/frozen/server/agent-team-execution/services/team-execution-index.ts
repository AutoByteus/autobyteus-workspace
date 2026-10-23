import { createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredAgentExecutionNode,
  RootConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../domain/team-run-execution-tree.js";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type AgentExecutionKind = "configured" | "task" | "task_team_member";
/** A team in a team run: the configured root, or a task agent team (teams are flat: no team is a member of a team). */
export type TeamExecutionKind = "configured" | "task";

export type IndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  containingTeamRunId: string;
  executionKind: AgentExecutionKind;
  source: ConfiguredAgentExecutionNode | TaskAgentExecution | TaskTeamAgentExecution;
}>;

export type IndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: TeamExecutionKind;
  source: RootConfiguredTeamExecutionNode | TaskTeamExecution;
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
export class TeamExecutionIndex {
  private readonly agentsByRunId = new Map<string, IndexedAgentExecution>();
  private readonly teamsByRunId = new Map<string, IndexedTeamExecution>();
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredAgentExecutionNode>();
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

  listTeamAncestorsDeepestFirst(teamRunId: string): readonly IndexedTeamExecution[] {
    const result: IndexedTeamExecution[] = [];
    let current: IndexedTeamExecution | null = this.requireTeam(teamRunId);
    while (current) {
      result.push(current);
      current = current.parentTeamRunId ? this.requireTeam(current.parentTeamRunId) : null;
    }
    return Object.freeze(result);
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
    team.taskExecutions.forEach((task) => this.visitTaskExecution(task, team.teamRunId));
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
    for (const member of task.members) {
      this.addAgent({
        agentRunId: member.agentRunId,
        address: member.address,
        containingTeamRunId: task.teamRunId,
        executionKind: "task_team_member",
        source: member,
      });
    }
    task.taskExecutions.forEach((child) => this.visitTaskExecution(child, task.teamRunId));
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
