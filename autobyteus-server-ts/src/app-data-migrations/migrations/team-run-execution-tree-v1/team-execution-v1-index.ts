import { createAgentTeamAddress, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredAgentExecution,
  ConfiguredMemberExecution,
  ConfiguredTeamExecution,
  RootConfiguredTeamExecution,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "./team-run-execution-tree-v1-types.js";
import type { TaskExecutionReference } from "../../../agent-team-execution/task-delegation/task-delegation-record-v1.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "../../../agent-team-execution/domain/team-run-physical-scope.js";

export type AgentExecutionKind = "configured" | "task" | "task_team_member";
export type TeamExecutionKind = "configured" | "task" | "task_team_member";

export type IndexedAgentExecution = Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  containingTeamRunId: string;
  executionKind: AgentExecutionKind;
  source: ConfiguredAgentExecution | TaskAgentExecution | TaskTeamAgentExecution;
}>;

export type IndexedTeamExecution = Readonly<{
  teamRunId: string;
  address: AgentTeamAddress;
  parentTeamRunId: string | null;
  executionKind: TeamExecutionKind;
  source:
    | RootConfiguredTeamExecution
    | ConfiguredTeamExecution
    | TaskTeamExecution
    | TaskTeamNestedTeamExecution;
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
  private readonly configuredByAddress = new Map<AgentTeamAddress, ConfiguredMemberExecution>();
  private readonly configuredTeamRunIdByAddress = new Map<AgentTeamAddress, string>();
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
    this.configuredTeamRunIdByAddress.set(rootAddress, tree.rootTeam.teamRunId);
    this.visitConfiguredTeam(tree.rootTeam, rootAddress, tree.rootTeam.teamRunId);
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

  getConfiguredPlacement(address: AgentTeamAddress | string): ConfiguredMemberExecution | null {
    return this.configuredByAddress.get(address as AgentTeamAddress) ?? null;
  }

  getConfiguredTeamRunId(address: AgentTeamAddress | string): string | null {
    return this.configuredTeamRunIdByAddress.get(address as AgentTeamAddress) ?? null;
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

  getTeamRunPhysicalScope(teamRunId: string): TeamRunPhysicalScope {
    const chain = [...this.listTeamAncestorsDeepestFirst(teamRunId)].reverse();
    let scope = createRootTeamRunPhysicalScope(this.rootTeamRunId);
    for (const team of chain.slice(1)) {
      scope = createChildTeamRunPhysicalScope(scope, team.teamRunId);
    }
    return scope;
  }

  isLiveAgent(agentRunId: string): boolean {
    const agent = this.getAgent(agentRunId);
    if (!agent) return false;
    return this.listTeamAncestorsDeepestFirst(agent.containingTeamRunId).every((team) =>
      !("settledAt" in team.source) || team.source.settledAt === null) &&
      (!("settledAt" in agent.source) || agent.source.settledAt === null);
  }

  isLiveTeam(teamRunId: string): boolean {
    return this.listTeamAncestorsDeepestFirst(teamRunId).every((team) =>
      !("settledAt" in team.source) || team.source.settledAt === null);
  }

  /** Exact configured TeamRun chain from root to the target persistent placement. */
  getConfiguredTeamRunChain(targetTeamRunId: string): readonly string[] {
    const target = this.requireTeam(targetTeamRunId);
    if (target.executionKind !== "configured") {
      throw new Error(`TeamRun '${targetTeamRunId}' is not a configured Team execution.`);
    }
    const chain = [...this.listTeamAncestorsDeepestFirst(targetTeamRunId)].reverse();
    if (chain.some((team) => team.executionKind !== "configured")) {
      throw new Error(`Configured TeamRun '${targetTeamRunId}' has non-configured ancestry.`);
    }
    return Object.freeze(chain.map((team) => team.teamRunId));
  }

  private visitConfiguredTeam(
    team: RootConfiguredTeamExecution | ConfiguredTeamExecution,
    teamAddress: AgentTeamAddress,
    teamRunId: string,
  ): void {
    for (const member of team.members) {
      this.configuredByAddress.set(member.address, member);
      if ("agentRunId" in member) {
        this.addAgent({
          agentRunId: member.agentRunId,
          address: member.address,
          containingTeamRunId: teamRunId,
          executionKind: "configured",
          source: member,
        });
      } else {
        this.configuredTeamRunIdByAddress.set(member.address, member.teamRunId);
        this.addTeam({
          teamRunId: member.teamRunId,
          address: member.address,
          parentTeamRunId: teamRunId,
          executionKind: "configured",
          source: member,
        });
        this.visitConfiguredTeam(member, member.address, member.teamRunId);
      }
    }
    void teamAddress;
    team.taskExecutions.forEach((task) => this.visitTaskExecution(task, teamRunId));
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
