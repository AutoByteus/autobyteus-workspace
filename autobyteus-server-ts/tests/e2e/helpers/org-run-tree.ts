import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Json = Record<string, any>;

/**
 * An Org run's tree as the settings page reads it, plus what that view leaves out, for a built-server E2E.
 *
 * Since the Org became a container of unit files (org-teams-follow-definition), the Org's own file holds no members: the
 * members are composed from the units' files. `getAgentOrgRunConfig.executionTree` is that composed tree, but it does not carry a
 * member's pending switch or launch source, which a switch E2E asserts. This reads those from the member's own record: a direct
 * Agent's `run_metadata.json`, or the member's entry in its Team unit's tree file. The returned tree has the shape the old Org
 * tree file had (`rootOrg.members`: agent nodes and Team nodes holding their member nodes).
 *
 * @param memoryRoot the server's `<data root>/memory` folder
 */
export const readOrgRunTree = async (
  gql: (query: string, variables?: Record<string, unknown>) => Promise<any>,
  memoryRoot: string,
  orgRunId: string,
): Promise<Json> => {
  const composed = (await gql("query($id: String!) { getAgentOrgRunConfig(orgRunId: $id) { executionTree } }", { id: orgRunId }))
    .getAgentOrgRunConfig.executionTree as Json;
  const readJson = (file: string): Json | null => existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Json : null;
  const overlay = (node: Json, record: Json | null | undefined): Json => {
    if (!record) return node;
    const { pendingRuntimeSwitch, launchSource } = record;
    return { ...node, ...(launchSource ? { launchSource } : {}), ...(pendingRuntimeSwitch ? { pendingRuntimeSwitch } : {}) };
  };
  const members = (composed.rootOrg.members as Json[]).map((member) => {
    if ("agentRunId" in member) return overlay(member, readJson(path.join(memoryRoot, "agents", member.agentRunId, "run_metadata.json")));
    const unit = readJson(path.join(memoryRoot, "agent_teams", member.teamRunId, "team_run_execution_tree.json"));
    const stored = new Map<string, Json>(((unit?.rootTeam?.members ?? []) as Json[]).map((entry) => [entry.agentRunId as string, entry]));
    return { ...member, members: (member.members as Json[]).map((agent) => overlay(agent, stored.get(agent.agentRunId))) };
  });
  return { ...composed, rootOrg: { ...composed.rootOrg, members } };
};
