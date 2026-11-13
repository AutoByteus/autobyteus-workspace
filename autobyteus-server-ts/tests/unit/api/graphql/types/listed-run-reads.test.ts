import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { RunViewChildren } from "../../../../../src/services/agent-streaming/run-view-children.js";

const io = vi.hoisted(() => ({ children: null as unknown, roots: new Map<string, { isHostLive(): boolean }>(), history: null as unknown }));
vi.mock("../../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioRunViewChildren: () => io.children,
  getStudioCollaborationRootHistoryService: () => io.history,
}));
vi.mock("../../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js", () => ({
  getStandaloneAgentRunRootManager: () => ({ getActive: (id: string) => io.roots.get(id) ?? null }),
}));

import { AgentRunCollaborationResolver } from "../../../../../src/api/graphql/types/agent-run-collaboration.js";
import { CollaborationRootHistoryResolver } from "../../../../../src/api/graphql/types/collaboration-root-history.js";
import { withTeamRows } from "../../../../../src/api/graphql/types/listed-team-rows.js";
import { agentChildRow } from "../../../../helpers/child-rows-feed.js";

/**
 * autobyteus-461 SR-061 rule 1 (SR-068): the run list's reads return in base's shapes, filled from the collaboration tree:
 * the listed agent runs' poll with its closed-set digest, and an Org's history with its delegated rows and closed set.
 */
const placed = (run: Record<string, string>, nodeId?: string) => ({ row: { run, ...(nodeId ? { nodeId } : {}) }, host: { hostKind: "root", hostRunId: "x" } });

describe("the run list's reads", () => {
  it("RunViewChildren.poll: its rows' statuses and its local closed set, reading no row record", async () => {
    const projection = { rowOf: vi.fn() };
    const children = new RunViewChildren({ projection, followers: { statuses: async () => [{ agentRunId: "writer", memberAddress: "/writer", status: "running" }] },
      feed: { rowsOf: () => ({ open: [], closed: [placed({ agentRunId: "done" }), placed({ agentRunId: "far" }, "node-b")] }) } as never });
    await expect(children.poll({ rootSubjectKind: "agent", rootRunId: "host" })).resolves.toEqual({
      statuses: [{ agentRunId: "writer", memberAddress: "/writer", status: "running" }], closedTaskExecutions: [{ agentRunId: "done" }] });
    expect(projection.rowOf).not.toHaveBeenCalled();
  });

  it("agentRunCollaborationStatuses: each listed run's own activity, its delegated runs' statuses and its closed-set digest", async () => {
    io.roots.set("live-host", { isHostLive: () => true });
    io.children = { poll: async (run: { rootRunId: string }) => run.rootRunId === "live-host"
      ? { statuses: [{ agentRunId: "writer", memberAddress: "/writer", status: "running" }], closedTaskExecutions: [{ agentRunId: "done" }] }
      : { statuses: [], closedTaskExecutions: [] } };
    await expect(new AgentRunCollaborationResolver().agentRunCollaborationStatuses(["live-host", "stopped-host"])).resolves.toEqual([
      { runId: "live-host", isActive: true, closedTaskExecutionsDigest: closedTaskExecutionsDigest([{ agentRunId: "done" }]),
        statuses: [{ agentRunId: "writer", memberAddress: "/writer", status: "running", recoverableBlock: null }] },
      { runId: "stopped-host", isActive: false, closedTaskExecutionsDigest: closedTaskExecutionsDigest([]), statuses: [] },
    ]);
  });

  it("an Org's history read has its delegated rows placed in its tree and its closed set; a team's is as it was", async () => {
    const org = { root_subject_kind: "agent_org", root_run_id: "org-run", org: { rootOrg: { orgRunId: "org-run", taskExecutions: [], members: [
      { agentRunId: "ceo" }, { teamRunId: "dev-team", members: [{ agentRunId: "dev-lead" }], taskExecutions: [] }] } } };
    const team = { root_subject_kind: "agent_team", root_run_id: "team-run", team: {} };
    io.history = { list: async () => [team, org], getAgentOrg: async () => org };
    io.children = { read: async () => ({ statuses: [], rows: { taskExecutions: [{ agentRunId: "analyst", delegatorAgentRunId: "ceo" },
      { agentRunId: "qa", delegatorAgentRunId: "dev-lead" }], remoteTaskExecutions: [], closedTaskExecutions: [{ agentRunId: "done" }] } }) };
    const resolver = new CollaborationRootHistoryResolver();
    const [listedTeam, listedOrg] = await resolver.listCollaborationRootHistory();
    expect(listedTeam).toBe(team);
    // As at base: every new run an Org delegates sits in its root, a mounted team's member's too (rule 3, story 5.3).
    expect(listedOrg).toMatchObject({ org: { rootOrg: { taskExecutions: [{ agentRunId: "analyst" }, { agentRunId: "qa" }],
      members: [{ agentRunId: "ceo" }, { teamRunId: "dev-team", taskExecutions: [] }] } }, closed_task_executions: [{ agentRunId: "done" }] });
    await expect(resolver.getAgentOrgRootHistory("org-run")).resolves.toMatchObject({ closed_task_executions: [{ agentRunId: "done" }] });
  });

  it("a Team's history item (workspace and Project lists) has its rows in `rootTeam.task_executions`, as at base (rule 3, story 5.2)", async () => {
    const read = vi.fn(async () => ({ statuses: [], rows: { taskExecutions: [agentChildRow("reviewer", "/code_reviewer")], remoteTaskExecutions: [], closedTaskExecutions: [] } }));
    io.children = { read };
    const group = { workspaceRootPath: "/w", teamDefinitions: [{ teamDefinitionId: "se", runs: [{ teamRunId: "team-run", rootTeam: { address: "/", members: [], task_executions: [] } }] }] };
    const listed = await withTeamRows(group as never) as unknown as typeof group;
    expect(read).toHaveBeenCalledWith({ rootSubjectKind: "agent_team", rootRunId: "team-run" });
    expect(listed.teamDefinitions[0]!.runs[0]!.rootTeam).toMatchObject({ address: "/", members: [],
      task_executions: [{ kind: "task_agent", agent_run_id: "reviewer", address: "/code_reviewer" }] });
    expect(group.teamDefinitions[0]!.runs[0]!.rootTeam.task_executions).toEqual([]);
  });
});
