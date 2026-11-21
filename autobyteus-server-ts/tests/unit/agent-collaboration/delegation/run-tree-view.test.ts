import { describe, expect, it, vi } from "vitest";
import { RunTreeView, type RunOwnTree } from "../../../../src/agent-collaboration/delegation/run-tree-view.js";
import type { ChildRowRecord } from "../../../../src/agent-collaboration/delegation/run-tree-records.js";
import type { SubtreeRow } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import { createAgentRootExecutionIdentity, createRootExecutionIdentity, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-082, SR-084 (ARCH-REV-054, -055, -057): a run's tree, built once on the server, for agent, team and
 * org runs, with local and peer rows at two depths; each row's key from identities only; a team's target its coordinator.
 */
const launch = (llmModelIdentifier: string, llmConfig: Record<string, unknown> | null = null) => ({
  runtimeKind: "claude_agent_sdk", llmModelIdentifier, llmConfig, autoExecuteTools: false, workspaceRootPath: "/w" });
const settings = { origin: "settings" as const, fallbacks: [] };
const configured = { origin: "configured" as const, fallbacks: [] };
const teamRun = (id: string) => createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: id });
const orgRun = (id: string) => createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: id });

const row = (parent: RootExecutionIdentity, run: SubtreeRow["run"], delegatorAgentRunId: string, extra: Partial<SubtreeRow> = {}): SubtreeRow => ({
  run, parent, delegatorAgentRunId, taskId: "t1", entryAgentRunId: "agentRunId" in run ? run.agentRunId : `${run.teamRunId}-lead`, started: true,
  linkedAt: "2026-11-15T00:00:00.000Z", recipientAddress: "/x", ...extra,
} as SubtreeRow);

/** Each delegated run's record, as `RunTreeView` reads it from the run's own files (stage C). */
const launchRecord = (value: ReturnType<typeof launch>, source: Record<string, unknown> | null, ownSource: boolean) =>
  ({ ...value, source: source as never, ownSource });
const agentRecord = (agentRunId: string, address: string, source: Record<string, unknown> | undefined = undefined): ChildRowRecord =>
  ({ kind: "agent", agentRunId, address, launch: launchRecord(launch("opus", { reasoning_effort: "xhigh" }), source ?? null, true) });
/** A team run; `coordinatorAgentRunId` null: its recorded coordinator is not among its members (a row error). */
const teamRecord = (teamRunId: string, address: string, coordinatorAgentRunId: string | null): ChildRowRecord => ({
  kind: "agent_team", teamRunId, address, coordinatorAddress: coordinatorAgentRunId ? "/lead" : "/gone",
  launch: launchRecord(launch("sonnet"), configured, true),
  members: [
    { address: "/lead", agentRunId: `${teamRunId}-lead`, launch: launchRecord(launch("sonnet"), configured, false) },
    { address: "/dev", agentRunId: `${teamRunId}-dev`, launch: launchRecord(launch("haiku", { reasoning_effort: "high" }), settings, true) },
  ],
});
const peerLaunch = (address: string) => ({ address, runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini", source: { origin: "agent_default" as const, fallbacks: [] } });
const peerAgentRecord = (agentRunId: string): ChildRowRecord => ({ kind: "peer", summary: { title: "Publish the draft.", reachable: true },
  launches: [peerLaunch("/publisher")],
  link: { kind: "agent", address: "/publisher", agentRunId, nodeId: "beta-id", nodeName: "beta-node", delegatorAgentRunId: "x", startedAt: "t", open: true } as never });
const peerTeamRecord = (teamRunId: string): ChildRowRecord => ({ kind: "peer", summary: null, launches: null,
  link: { kind: "agent_team", address: "/studio", teamRunId, nodeId: "beta-id", nodeName: "beta-node", coordinatorAddress: "/lead",
    members: [{ address: "/lead", agentRunId: `${teamRunId}-lead` }, { address: "/checker", agentRunId: `${teamRunId}-checker` }],
    delegatorAgentRunId: "x", startedAt: "t", open: true } as never });

const view = (input: Readonly<{ own: RunOwnTree; rows: SubtreeRow[]; records: Record<string, ChildRowRecord | Error>; notLive?: string[] }>) => {
  const state = { rows: input.rows };
  const runTree = new RunTreeView({
    tree: { collaborationTreeOf: () => ({ rows: () => state.rows }) } as never,
    ownTreeOf: async () => input.own,
    projection: { rowOf: async (subtreeRow) => {
      const id = "agentRunId" in subtreeRow.run ? subtreeRow.run.agentRunId : subtreeRow.run.teamRunId;
      const record = input.records[id];
      if (record instanceof Error) throw record;
      return record ?? null;
    } },
    isLiveTeamRun: (teamRunId) => !input.notLive?.includes(teamRunId),
  });
  return { runTree, state };
};
const shape = (rows: readonly { key: string; parentKey: string | null; depth: number }[]) => rows.map((r) => [r.key, r.parentKey, r.depth]);

describe("RunTreeView (SR-082, SR-084)", () => {
  const manager = createAgentRootExecutionIdentity("manager");
  const agentTree = () => view({
    own: { kind: "agent", agentRunId: "manager", address: "/manager" },
    rows: [
      row(manager, { agentRunId: "writer" }, "manager"),
      row(manager, { teamRunId: "squad" }, "manager", { members: undefined }),
      // Depth 2: the squad's dev delegates a helper; the writer delegates to a peer team.
      row(teamRun("squad"), { agentRunId: "helper" }, "squad-dev"),
      row(manager, { agentRunId: "publisher" }, "manager", { nodeId: "beta-id" }),
      row(createAgentRootExecutionIdentity("writer"), { teamRunId: "studio" }, "writer", { nodeId: "beta-id" }),
    ],
    records: { writer: agentRecord("writer", "/writer", settings), squad: teamRecord("squad", "/squad", "squad-lead"), helper: agentRecord("helper", "/helper"),
      publisher: peerAgentRecord("publisher"), studio: peerTeamRecord("studio") },
  });

  it("an agent run: its own agent, then its delegated runs nested under the agent or member that delegated them, local and peer, at two depths", async () => {
    const rows = await agentTree().runTree.rowsOf(manager);
    expect(shape(rows)).toEqual([
      ["agent:manager", null, 0],
      ["agent:writer", "agent:manager", 1],
      ["peer_team:studio", "agent:writer", 2],
      ["peer_member:studio:studio-lead", "peer_team:studio", 3],
      ["peer_member:studio:studio-checker", "peer_team:studio", 3],
      ["team:squad", "agent:manager", 1],
      ["team_member:squad:squad-lead", "team:squad", 2],
      ["team_member:squad:squad-dev", "team:squad", 2],
      ["agent:helper", "team_member:squad:squad-dev", 3],
      ["peer_agent:publisher", "agent:manager", 1],
    ]);
    const by = new Map(rows.map((r) => [r.key, r]));
    // A team's target is its coordinator; a member opens its team at itself; statuses are named, never held.
    expect(by.get("team:squad")!.openTarget).toEqual({ runKind: "agent_team", runId: "squad", agentRunId: "squad-lead" });
    expect(by.get("team_member:squad:squad-dev")!.openTarget).toEqual({ runKind: "agent_team", runId: "squad", agentRunId: "squad-dev" });
    // SR-086 G-A4: a team row shows its team run's own status, computed by its root.
    expect(by.get("team:squad")!.statusIds).toEqual(["squad"]);
    expect(by.get("peer_team:studio")!.statusIds).toEqual(["studio"]);
    expect(by.get("team_member:squad:squad-dev")!.name).toBe("dev");
    // Each row's launch as its run has it now (CR-461-086 folded in): an edit's "settings" origin, a member's own or its team's.
    expect(by.get("agent:writer")!.launch).toMatchObject({ llmModelIdentifier: "opus", llmConfig: { reasoning_effort: "xhigh" }, source: settings, ownSource: true });
    expect(by.get("team_member:squad:squad-dev")!.launch).toMatchObject({ llmModelIdentifier: "haiku", source: settings, ownSource: true });
    expect(by.get("team_member:squad:squad-lead")!.launch).toMatchObject({ llmModelIdentifier: "sonnet", source: configured, ownSource: false });
    // A peer row: its node, title, reachability, target on its node and launch from its node's answer (F-66).
    expect(by.get("peer_agent:publisher")).toMatchObject({ peer: { nodeId: "beta-id", nodeName: "beta-node", title: "Publish the draft.", reachable: true },
      openTarget: { runKind: "agent", runId: "publisher", agentRunId: "publisher", nodeId: "beta-id" },
      launch: { runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini", source: { origin: "agent_default", fallbacks: [] } } });
    expect(by.get("peer_member:studio:studio-checker")).toMatchObject({ peer: { reachable: null }, statusIds: ["studio-checker"] });
  });

  it("a row's key is its identities only: a refresh that adds and removes other rows keeps every other row's key and parent", async () => {
    const tree = agentTree();
    const before = await tree.runTree.rowsOf(manager);
    tree.state.rows = [row(manager, { agentRunId: "late" }, "manager"), ...tree.state.rows.filter((r) => !("agentRunId" in r.run && r.run.agentRunId === "publisher"))];
    const records = { late: agentRecord("late", "/late") };
    const refreshed = await new RunTreeView({ tree: { collaborationTreeOf: () => ({ rows: () => tree.state.rows }) } as never,
      ownTreeOf: async () => ({ kind: "agent", agentRunId: "manager", address: "/manager" }),
      projection: { rowOf: async (r) => (records as Record<string, ChildRowRecord>)[("agentRunId" in r.run ? r.run.agentRunId : r.run.teamRunId)] ?? (await agentTreeRecord(r)) },
      isLiveTeamRun: () => true }).rowsOf(manager);
    const kept = (rows: typeof before) => new Map(rows.filter((r) => r.key !== "agent:late" && r.key !== "peer_agent:publisher").map((r) => [r.key, r.parentKey]));
    expect(kept(refreshed)).toEqual(kept(before));
    expect(refreshed.some((r) => r.key === "agent:late")).toBe(true);
    expect(refreshed.some((r) => r.key === "peer_agent:publisher")).toBe(false);
  });

  it("a team run: its row and members, a delegation under the member that made it; a team whose coordinator is not a member is a row error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const team = teamRun("eng");
    const { runTree } = view({
      own: { kind: "agent_team", teamRunId: "eng", coordinatorAddress: "/missing", members: [{ address: "/lead", agentRunId: "eng-lead" }] },
      rows: [row(team, { teamRunId: "orphan" }, "eng-lead")],
      records: { orphan: teamRecord("orphan", "/orphan", null) },
    });
    const rows = await runTree.rowsOf(team);
    expect(shape(rows)).toEqual([
      ["team:eng", null, 0], ["team_member:eng:eng-lead", "team:eng", 1],
      ["team:orphan", "team_member:eng:eng-lead", 2], ["team_member:orphan:orphan-lead", "team:orphan", 3], ["team_member:orphan:orphan-dev", "team:orphan", 3],
    ]);
    expect(rows[0]!.openTarget).toBeNull();
    expect(rows.find((r) => r.key === "team:orphan")!.openTarget).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Row error: team run 'eng'"));
    warn.mockRestore();
  });

  it("SR-010: a member marked leaving is a row tagged leaving while its team run is live; when the run is not live it has no row", async () => {
    const team = teamRun("eng");
    const own: RunOwnTree = { kind: "agent_team", teamRunId: "eng", coordinatorAddress: "/lead",
      members: [{ address: "/lead", agentRunId: "eng-lead" }, { address: "/writer", agentRunId: "eng-writer", leaving: true }] };
    const live = await view({ own, rows: [], records: {} }).runTree.rowsOf(team);
    expect(live.map((r) => [r.key, r.leaving ?? false])).toEqual([["team:eng", false], ["team_member:eng:eng-lead", false], ["team_member:eng:eng-writer", true]]);
    expect(live.at(-1)!.openTarget).toEqual({ runKind: "agent_team", runId: "eng", agentRunId: "eng-writer" });
    const stopped = await view({ own, rows: [], records: {}, notLive: ["eng"] }).runTree.rowsOf(team);
    expect(stopped.map((r) => r.key)).toEqual(["team:eng", "team_member:eng:eng-lead"]);
  });

  it("SR-010 (AR-009): a delegated Team copy's leaving member is tagged under its delegating run while the copy is live, and absent when it is not", async () => {
    const manager = createAgentRootExecutionIdentity("manager");
    const copy: ChildRowRecord = { ...teamRecord("study", "/study", "study-lead") as Extract<ChildRowRecord, { kind: "agent_team" }>,
      members: [...(teamRecord("study", "/study", "study-lead") as Extract<ChildRowRecord, { kind: "agent_team" }>).members,
        { address: "/reviewer", agentRunId: "study-reviewer", leaving: true as const, launch: null }] };
    const input = { own: { kind: "agent" as const, agentRunId: "manager", address: "/manager" }, rows: [row(manager, { teamRunId: "study" }, "manager")], records: { study: copy } };
    const live = await view(input).runTree.rowsOf(manager);
    expect(live.find((r) => r.key === "team_member:study:study-reviewer")).toMatchObject({ parentKey: "team:study", leaving: true });
    const stopped = await view({ ...input, notLive: ["study"] }).runTree.rowsOf(manager);
    expect(stopped.find((r) => r.key === "team_member:study:study-reviewer")).toBeUndefined();
    expect(stopped.filter((r) => r.parentKey === "team:study").map((r) => r.key)).toEqual(["team_member:study:study-lead", "team_member:study:study-dev"]);
  });

  it("an org run: its agents and mounted teams with their members, opening in the org; a delegation under a mounted member; an unreadable row is left out, its own rows stay under the run", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const org = orgRun("org");
    const { runTree } = view({
      own: { kind: "agent_org", orgRunId: "org", parts: [
        { kind: "agent", address: "/planner", agentRunId: "planner" },
        { kind: "team", address: "/delivery", teamRunId: "delivery", coordinatorAddress: "/lead", members: [{ address: "/lead", agentRunId: "d-lead" }, { address: "/qa", agentRunId: "d-qa" }] },
      ] },
      rows: [
        row(org, { agentRunId: "changelog" }, "d-qa"),
        row(org, { agentRunId: "broken" }, "planner"),
        row(createAgentRootExecutionIdentity("broken"), { agentRunId: "below-broken" }, "broken"),
      ],
      records: { changelog: agentRecord("changelog", "/changelog_helper"), broken: new Error("unreadable"), "below-broken": agentRecord("below-broken", "/below") },
    });
    const rows = await runTree.rowsOf(org);
    expect(shape(rows)).toEqual([
      ["org_agent:org:planner", null, 0],
      ["org_team:delivery", null, 0],
      ["team_member:delivery:d-lead", "org_team:delivery", 1],
      ["team_member:delivery:d-qa", "org_team:delivery", 1],
      ["agent:changelog", "team_member:delivery:d-qa", 2],
      ["agent:below-broken", null, 0],
    ]);
    expect(rows[0]!.openTarget).toEqual({ runKind: "agent_org", runId: "org", agentRunId: "planner" });
    expect(rows[1]!.openTarget).toEqual({ runKind: "agent_org", runId: "org", agentRunId: "d-lead" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'broken' was left out"));
    warn.mockRestore();
  });
});

/** The first test's records, for the refresh test's second read. */
const agentTreeRecord = async (r: SubtreeRow): Promise<ChildRowRecord | null> => {
  const id = "agentRunId" in r.run ? r.run.agentRunId : r.run.teamRunId;
  const records: Record<string, ChildRowRecord> = { writer: agentRecord("writer", "/writer", settings), squad: teamRecord("squad", "/squad", "squad-lead"),
    helper: agentRecord("helper", "/helper"), publisher: peerAgentRecord("publisher"), studio: peerTeamRecord("studio") };
  return records[id] ?? null;
};
