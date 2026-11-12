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
