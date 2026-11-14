import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { RunViewChildren } from "../../../../../src/services/agent-streaming/run-view-children.js";

const io = vi.hoisted(() => ({ children: null as unknown, roots: new Map<string, { isHostLive(): boolean }>(), history: null as unknown }));
vi.mock("../../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioRunViewChildren: () => io.children,
  getStudioCollaborationRootHistoryService: () => io.history,
}));
vi.mock("../../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js", () => ({
  getStandaloneAgentRunRootManager: () => ({ getActive: (id: string) => io.roots.get(id) ?? null }),
}));

import { CollaborationRootHistoryResolver } from "../../../../../src/api/graphql/types/collaboration-root-history.js";
import { withTeamRows } from "../../../../../src/api/graphql/types/listed-team-rows.js";
import { agentChildRow } from "../../../../helpers/child-rows-feed.js";
import { projectAgentCollaborationView } from "../../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";

/**
 * autobyteus-461 SR-061 rule 1 (SR-068): the run list's reads return in base's shapes, filled from the collaboration tree:
 * the listed agent runs' poll with its closed-set digest, and an Org's history with its delegated rows and closed set.
 */
const placed = (run: Record<string, string>, nodeId?: string) => ({ row: { run, ...(nodeId ? { nodeId } : {}) }, host: { hostKind: "root", hostRunId: "x" } });

describe("the run list's reads", () => {
  it("CR-461-071 (F-52, rule 7): a delegated run whose own file became unreadable after its parts were read is left out with its agents; the delegator's view opens", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const row = (agentRunId: string) => ({ row: { run: { agentRunId }, recipientAddress: `/${agentRunId}` }, host: { hostKind: "root", hostRunId: "host" } });
    const children = new RunViewChildren({
      feed: { rowsOf: () => ({ open: [row("writer"), row("helper")], closed: [] }) } as never,
      projection: { rowOf: async (child: { run: { agentRunId: string } }) => {
        if (child.run.agentRunId === "helper") throw new Error("Unterminated string in JSON at position 527");
        return { kind: "local" as const, row: agentChildRow("writer") };
      } } as never });
    const { rows } = await children.read({ rootSubjectKind: "agent", rootRunId: "host" });
    expect(rows.taskExecutions.map((execution) => (execution as { agentRunId: string }).agentRunId)).toEqual(["writer"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("The run 'helper' delegated under agent run 'host' was left out of its view"));
    // The contract accepts the view; its rows' statuses are each run's own (SR-083), not in it.
    expect(() => projectAgentCollaborationView({ hostRunId: "host", isActive: true, baseChangeSequence: 0, liveSequenceId: "live", lastMessageChangeSequence: 0,
      snapshot: { host: { address: "/manager", agentRunId: "host", agentDefinitionId: "manager" }, createdAt: "2026-11-01T00:00:00.000Z", statuses: [], inputStates: [] } as never,
      rows })).not.toThrow();
    warn.mockRestore();
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
