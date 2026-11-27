import type { AgentLaunchHistoryEntry } from "../../model-routing/domain/runtime-switch-types.js";

/** How far back an agent's launches count (C-8). */
export const AGENT_LAUNCH_HISTORY_DAYS = 30;

type Launch = Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;

/**
 * One agent definition's launches in the last 30 days (autobyteus-646 C-8), derived from the run files the node already
 * has, never stored: its standalone and delegated Agent runs (their catalog row's creation time, their metadata's
 * runtime and model) and its members of Team runs (the Team's creation time, the member's launch in the Team tree).
 * Org units are runs of their own, so they are among these. Computed when a switch or a delegation needs it.
 */
export class AgentLaunchHistory {
  constructor(private readonly dependencies: Readonly<{
    agentRows(): Promise<readonly Readonly<{ runId: string; agentDefinitionId: string; createdAt: string }>[]>;
    agentLaunch(runId: string): Promise<Launch | null>;
    teamRows(): Promise<readonly Readonly<{ teamRunId: string; createdAt: string }>[]>;
    teamMembers(teamRunId: string): Promise<readonly Readonly<{ agentDefinitionId: string } & Launch>[]>;
    now?: () => Date;
  }>) {}

  /** Each runtime and model with its runs and last use, most runs first (ties: the most recent). */
  async launchesOf(agentDefinitionId: string): Promise<readonly AgentLaunchHistoryEntry[]> {
    const since = (this.dependencies.now?.() ?? new Date()).getTime() - AGENT_LAUNCH_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    const recent = (createdAt: string) => Date.parse(createdAt) >= since;
    const launches: Array<Launch & Readonly<{ at: string }>> = [];
    const agentRows = (await this.dependencies.agentRows()).filter((row) => row.agentDefinitionId === agentDefinitionId && recent(row.createdAt));
    for (const row of agentRows) {
      const launch = await this.dependencies.agentLaunch(row.runId).catch(() => null);
      if (launch) launches.push({ ...launch, at: row.createdAt });
    }
    for (const row of (await this.dependencies.teamRows()).filter((team) => recent(team.createdAt))) {
      const members = await this.dependencies.teamMembers(row.teamRunId).catch(() => []);
      for (const member of members) if (member.agentDefinitionId === agentDefinitionId) launches.push({ ...member, at: row.createdAt });
    }
    const entries = new Map<string, { runtimeKind: string; llmModelIdentifier: string; runs: number; lastUsedAt: string }>();
    for (const launch of launches) {
      const key = `${launch.runtimeKind}\u0000${launch.llmModelIdentifier}`;
      const entry = entries.get(key) ?? { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, runs: 0, lastUsedAt: launch.at };
      entry.runs += 1;
      if (launch.at > entry.lastUsedAt) entry.lastUsedAt = launch.at;
      entries.set(key, entry);
    }
    return Object.freeze([...entries.values()].map((entry) => Object.freeze({ ...entry }))
      .sort((left, right) => right.runs - left.runs || right.lastUsedAt.localeCompare(left.lastUsedAt)));
  }
}
