import fs from "node:fs/promises";
import path from "node:path";

type Gql = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, any>>;

/**
 * The run an agent belongs to, from the memory folder: a run of its own (`agents/<id>`), or a member of a team run
 * (`agent_teams/<team>/<id>`). Since autobyteus-461 a delegated run is a run of its own; a team or org view's member reads
 * answer only that run's own members (CR-461-014), so a delegated agent is read through its own run.
 */
export const ownRunOfAgent = async (memoryDir: string, agentRunId: string): Promise<{ kind: "agent" } | { kind: "team"; teamRunId: string } | null> => {
  if (await fs.stat(path.join(memoryDir, "agents", agentRunId)).then(() => true, () => false)) return { kind: "agent" };
  const teams = await fs.readdir(path.join(memoryDir, "agent_teams")).catch(() => [] as string[]);
  for (const teamRunId of teams) {
    if (await fs.stat(path.join(memoryDir, "agent_teams", teamRunId, agentRunId)).then(() => true, () => false)) return { kind: "team", teamRunId };
  }
  return null;
};

/** An agent's projection (`conversation activities`) read through its own run; `null` when no run holds it yet. */
export const projectionByOwnRun = async (gql: Gql, memoryDir: string, agentRunId: string): Promise<Record<string, any> | null> => {
  const run = await ownRunOfAgent(memoryDir, agentRunId);
  if (!run) return null;
  if (run.kind === "agent") return (await gql(`query($id:String!){getRunProjection(runId:$id){conversation activities}}`, { id: agentRunId })).getRunProjection ?? null;
  return (await gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation activities}}`,
    { id: run.teamRunId, a: agentRunId })).getTeamMemberRunProjection ?? null;
};

export type RunKind = "agent" | "agent_team" | "agent_org";
/** A run another run delegated to, as the listed-runs poll gives it (autobyteus-461 SR-055 … SR-057), in the shape the suites use. */
export type ChildRun = Readonly<{
  kind: "agent" | "agent_team";
  /** An agent run's ID; undefined for a team run. */
  agentRunId?: string;
  teamRunId?: string;
  coordinatorAgentRunId?: string;
  address: string;
  delegatorAgentRunId?: string;
  /** The run that delegated to it, one hop. */
  parent: Readonly<{ kind: RunKind; runId: string }>;
  members: Array<{ address: string; agentRunId: string }>;
  statuses: Array<{ agentRunId: string; memberAddress: string; status: string }>;
  /** The peer node it runs on; null on this node. */
  node: Readonly<{ nodeId: string; nodeName: string }> | null;
}>;

/**
 * The runs a run delegated to, one hop, from `runCollaborationStatuses` (the listed-runs poll; it never restores a run).
 * Since autobyteus-461 a delegated run is a run of its own: it is not inside the delegating run's tree.
 */
export const childRunsOf = async (gql: Gql, run: Readonly<{ kind: RunKind; runId: string }>): Promise<ChildRun[]> => {
  const answer = (await gql(`query($runs:[ListedRunInput!]!){runCollaborationStatuses(runs:$runs)}`, { runs: [{ kind: run.kind, runId: run.runId }] }))
    .runCollaborationStatuses as Array<Record<string, any>>;
  return (answer?.[0]?.children ?? []).map((child: Record<string, any>): ChildRun => {
    const row = child.row as Record<string, any>;
    return {
      kind: row.kind, ...(row.kind === "agent" ? { agentRunId: row.agentRunId } : { teamRunId: row.teamRunId, coordinatorAgentRunId: row.coordinatorAgentRunId }),
      address: row.address, delegatorAgentRunId: row.delegatorAgentRunId, parent: { kind: run.kind, runId: run.runId },
      members: row.kind === "agent_team" ? (row.members as Array<Record<string, any>>).map((m) => ({ address: m.address, agentRunId: m.agentRunId })) : [],
      statuses: child.statuses ?? [], node: child.node ?? null,
    };
  });
};

/** Every run delegated from a run, one hop at a time (each local child's own children in turn; a peer's are not asked). */
export const descendantRunsOf = async (gql: Gql, run: Readonly<{ kind: RunKind; runId: string }>): Promise<ChildRun[]> => {
  const out: ChildRun[] = [];
  const queue: Array<Readonly<{ kind: RunKind; runId: string }>> = [run];
  const seen = new Set<string>([`${run.kind}:${run.runId}`]);
  while (queue.length) {
    for (const child of await childRunsOf(gql, queue.shift()!)) {
      out.push(child);
      const ref = child.kind === "agent" ? { kind: "agent" as const, runId: child.agentRunId! } : { kind: "agent_team" as const, runId: child.teamRunId! };
      if (child.node === null && !seen.has(`${ref.kind}:${ref.runId}`)) { seen.add(`${ref.kind}:${ref.runId}`); queue.push(ref); }
    }
  }
  return out;
};
