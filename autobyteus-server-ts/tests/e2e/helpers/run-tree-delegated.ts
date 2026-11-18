// autobyteus-461 SR-084: a run's delegated runs come from its tree as the server builds it (`runTree(kind, runId)`), the rows
// every view, the run list, the phone and the Task card show. A run's view and its resume config carry its own parts only, so a
// suite that read its delegated runs from them reads them here.
//
//   const tree = await readRunTree(graphql, "agent", runId);        // { kind, runId, rows: [...] }
//   const delegated = delegatedRunsOf(tree);                        // { taskExecutions: [record, ...] }
//
// Each delegated run is one record, nested under the run whose agent delegated it (a run delegated by a member of a delegated
// Team sits in that Team's `taskExecutions`):
//   { agentRunId | teamRunId + coordinatorAgentRunId, address, delegatorAgentRunId, members: [{ address, agentRunId, launch }],
//     launch, nodeId? (a peer's), startedAt: "listed", taskExecutions: [...] }
// `startedAt` marks the record as a delegated run for the suites' walkers, which found delegated runs by a recorded start; the
// tree lists the delegated runs it holds and carries no start time.

type Rec = Record<string, any>;
type Graphql = (query: string, variables?: Rec) => Promise<Rec>;

const KIND: Record<string, string> = { agent: "agent", team: "agent_team", agent_team: "agent_team", org: "agent_org", agent_org: "agent_org" };
const DELEGATED = new Set(["agent", "team", "peer_agent", "peer_team"]);
const MEMBER = new Set(["team_member", "peer_member"]);

export const readRunTree = async (graphql: Graphql, kind: string, runId: string): Promise<{ kind: string; runId: string; rows: Rec[] }> =>
  (await graphql(`query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}`, { k: KIND[kind] ?? kind, r: runId })).runTree;

export const delegatedRunsOf = (tree: { rows?: Rec[] } | null | undefined): { taskExecutions: Rec[] } => {
  const rows = tree?.rows ?? [];
  const byKey = new Map(rows.map((row) => [row.key as string, row]));
  // A delegated run's first row hangs under the row of the agent that delegated it; a run's own parts have no parent.
  const isDelegated = (row: Rec) => DELEGATED.has(row.kind) && row.parentKey !== null;
  /** The delegated run a row belongs to (itself, or the delegated Team it is a member of), or null for the run's own parts. */
  const delegatedOwnerOf = (row: Rec | undefined): Rec | null => {
    let current = row;
    while (current && !isDelegated(current)) current = byKey.get(current.parentKey);
    return current ?? null;
  };
  const recordOf = (row: Rec): Rec => {
    const team = row.kind === "team" || row.kind === "peer_team";
    const memberRows = team ? rows.filter((member) => member.parentKey === row.key && MEMBER.has(member.kind)) : [];
    const ownKeys = new Set([row.key, ...memberRows.map((member) => member.key)]);
    return {
      ...(team ? { teamRunId: row.openTarget?.runId ?? row.statusIds?.[0] ?? null, coordinatorAgentRunId: row.openTarget?.agentRunId ?? null }
        : { agentRunId: row.openTarget?.agentRunId ?? row.statusIds?.[0] ?? null }),
      address: row.address, name: row.name, kind: row.kind, startedAt: "listed",
      delegatorAgentRunId: byKey.get(row.parentKey)?.openTarget?.agentRunId ?? null,
      ...(row.peer ? { nodeId: row.peer.nodeId, nodeName: row.peer.nodeName } : {}),
      launch: row.launch ?? null,
      members: memberRows.map((member) => ({ address: member.address, agentRunId: member.openTarget?.agentRunId ?? member.statusIds?.[0] ?? null, launch: member.launch ?? null })),
      taskExecutions: rows.filter((child) => isDelegated(child) && ownKeys.has(child.parentKey)).map(recordOf),
    };
  };
  return { taskExecutions: rows.filter((row) => isDelegated(row) && delegatedOwnerOf(byKey.get(row.parentKey)) === null).map(recordOf) };
};

/** A run's delegated runs at every depth, read from its tree. */
export const delegatedRunsTree = async (graphql: Graphql, kind: string, runId: string) => delegatedRunsOf(await readRunTree(graphql, kind, runId));

/**
 * The row keys each tree change in a view's frames removed (SR-084): `run_tree_changed` events on the agent and Org views,
 * `RUN_TREE_CHANGED` on the Team view. A Task's closure stops its copies, and a stopped copy of a closed Task leaves the tree
 * (autobyteus-469), so its row's removal is the closure as a view sees it. Keys are `agent:<agentRunId>`, `team:<teamRunId>`.
 */
export const removedRowKeysPerChange = (frames: ReadonlyArray<{ type: string; payload: Rec }>): string[][] => frames.flatMap((frame) =>
  frame.type === "ROOT_EXECUTION_EVENT" && frame.payload?.event?.kind === "run_tree_changed" ? [(frame.payload.event.removed ?? []) as string[]]
    : frame.type === "RUN_TREE_CHANGED" && Array.isArray(frame.payload?.removed) ? [frame.payload.removed as string[]] : []);
/** The runs whose rows the view's tree changes removed (an agent row's agent run ID, a team row's team run ID). */
export const removedRunIdsIn = (frames: ReadonlyArray<{ type: string; payload: Rec }>): string[] =>
  removedRowKeysPerChange(frames).flat().map((key) => key.split(":")[1]!).filter(Boolean);
/** The row keys each tree change in a view's frames added (a reopened Task's runs come back as added rows). */
export const addedRowKeysPerChange = (frames: ReadonlyArray<{ type: string; payload: Rec }>): string[][] => frames.flatMap((frame) =>
  frame.type === "ROOT_EXECUTION_EVENT" && frame.payload?.event?.kind === "run_tree_changed" ? [((frame.payload.event.added ?? []) as Rec[]).map((row) => row.key as string)]
    : frame.type === "RUN_TREE_CHANGED" && Array.isArray(frame.payload?.added) ? [(frame.payload.added as Rec[]).map((row) => row.key as string)] : []);
/** A delegated run's row key in a tree (`agent:<id>`, `team:<id>`); member rows (`team_member:…`) are not runs. */
export const isRunRowKey = (key: string) => /^(agent|team|peer_agent|peer_team):[^:]+$/.test(key);
/** Whether a view's frames hold its tree snapshot (SR-084: `RUN_TREE_SNAPSHOT` follows the view's own snapshot). */
export const hasTreeSnapshot = (frames: ReadonlyArray<{ type: string }>) => frames.some((frame) => frame.type === "RUN_TREE_SNAPSHOT");
/** The delegated runs in a view's latest tree snapshot. */
export const treeSnapshotRunsOf = (frames: ReadonlyArray<{ type: string; payload: Rec }>) =>
  delegatedRunsOf({ rows: [...frames].reverse().find((frame) => frame.type === "RUN_TREE_SNAPSHOT")?.payload.rows as Rec[] | undefined });

/**
 * autobyteus-461 SR-084: a tree row carries the launch its run recorded (`launch`: the configuration, its `source` and whether
 * the source is its own; a member that follows its team has `ownSource: false`). This gives each delegated record the
 * recorded snapshot in the shape this suite reads: an Agent copy's launch and source; a Team copy's default and source, and
 * each member's launch and own source (null when it follows the team).
 */
export const withRecordedSources = (tree: { taskExecutions: Rec[] }): { taskExecutions: Rec[] } => {
  const withSource = (record: Rec): Rec => ({ ...record,
    source: record.teamRunId
      ? { defaultLaunchConfiguration: record.launch, defaultLaunchSource: record.launch?.source ?? null,
        members: (record.members as Rec[]).map((member) => ({ address: member.address, launchConfiguration: member.launch,
          launchSource: member.launch?.ownSource ? member.launch.source : null })) }
      : { launchConfiguration: record.launch, launchSource: record.launch?.source ?? null },
    taskExecutions: (record.taskExecutions as Rec[]).map(withSource) });
  return { taskExecutions: tree.taskExecutions.map(withSource) };
};
