import type { CollaborationLaunchConfigurationSourceDto } from "@autobyteus/collaboration-stream-contracts";
import type { RemoteAgentLaunch } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../execution/task/task-execution-resource-port.js";
import { displayNameOf, openTargetOf, slotNameOf, type SubtreeRow } from "./collaboration-tree.js";
import { launchSourceDtoOf, type ChildRowProjection, type ChildRowRecord, type RunLaunchRecord } from "./run-tree-records.js";
import type { DelegationIndex } from "./delegation-index.js";

/** What a row is: a run's own parts (an agent run, a team and its members, an org's agents and mounted teams), a run it delegated, a peer's run. */
export type RunTreeRowKind = "agent" | "team" | "team_member" | "org_agent" | "org_team" | "peer_agent" | "peer_team" | "peer_member";

/** Where a row opens (SR-083's `openTargetOf`): the run and the agent to focus; an org's own parts open in the org; a peer's run on its node. */
export type RunTreeOpenTarget = Readonly<{ runKind: "agent" | "agent_team" | "agent_org"; runId: string; agentRunId: string; nodeId?: string }>;

/** A row's launch as its run has it now (CR-461-086, folded in): what it runs with and where that came from. */
export type RunTreeLaunch = Readonly<{
  runtimeKind: string;
  llmModelIdentifier: string;
  /** `null` for a peer row: its node keeps them. */
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean | null;
  workspaceRootPath: string | null;
  source: CollaborationLaunchConfigurationSourceDto | null;
  /** The source is the row's own (a member's own; else its team's applies). */
  ownSource: boolean;
}>;

/**
 * One row of a run's tree (autobyteus-461 SR-082, SR-084). `key` is built from identities only (kind and run ID, plus
 * the agent run ID for a member row: `team_member`, `org_agent`, `peer_member`), never position or depth, so a refresh
 * that adds or removes other rows keeps it; `parentKey` is its parent's.
 */
export type RunTreeRow = Readonly<{
  key: string;
  parentKey: string | null;
  depth: number;
  kind: RunTreeRowKind;
  name: string;
  address: string | null;
  openTarget: RunTreeOpenTarget | null;
  /**
   * The IDs whose statuses the row shows (`/ws/run-status`); the tree holds no status. An agent or member row names its
   * agent run; a team row its team run, whose own status its root computes (SR-086 G-A4); an Org's mounted team its
   * members, whose statuses the Org's own stream has.
   */
  statusIds: readonly string[];
  /** A run it delegated, or its member: its launch as the run has it now. */
  launch?: RunTreeLaunch;
  /** A peer's run: its node, and what the node answered about it (`null` while not answered). */
  peer?: Readonly<{ nodeId: string; nodeName: string; title: string | null; reachable: boolean | null }>;
  /** A team member removed from its team that is still finishing its turn (SR-009): shown "Leaving", still opens. */
  leaving?: true;
}>;

/** A run's own parts, from its own file (`RunOwnAgentsReader.ownTreeOf`); `leaving`: a former member marked so (SR-010). */
export type RunOwnMember = Readonly<{ address: string; agentRunId: string; leaving?: true }>;
export type RunOwnTree =
  | Readonly<{ kind: "agent"; agentRunId: string; address: string | null }>
  | Readonly<{ kind: "agent_team"; teamRunId: string; coordinatorAddress: string; members: readonly RunOwnMember[] }>
  | Readonly<{ kind: "agent_org"; orgRunId: string; parts: readonly (
    | Readonly<{ kind: "agent"; address: string; agentRunId: string; leaving?: true }>
    | Readonly<{ kind: "team"; address: string; teamRunId: string; coordinatorAddress: string; members: readonly RunOwnMember[]; leaving?: true }>)[];
    /** An Org container (org-teams-follow-definition): each part is a unit run of its own, the delegating run of its agents' delegations. */
    container?: true }>;

/** A run's delegated rows as read at a view's base (`RunTreeView.readAtBase`); their records are read after. */
export type RunTreeBase = Readonly<{ subtree: readonly SubtreeRow[] }>;

/**
 * The notice in a run's view stream that its tree may have changed (SR-084): a delegated run started, closed or came
 * back at any depth (`ChildRowsFeed`), or a peer run's node answered about it (`PeerChildObservation`). Numbered like
 * every frame of the view; each view session reads the tree again when it sends it and sends what changed.
 */
export type RunTreeChangedEvent = Readonly<{ kind: "run_tree_changed" }>;
export const RUN_TREE_CHANGED_EVENT: RunTreeChangedEvent = Object.freeze({ kind: "run_tree_changed" });
export const isRunTreeChangedEvent = (event: { kind?: unknown }): event is RunTreeChangedEvent => event.kind === "run_tree_changed";

export type RunTreeSources = Readonly<{
  tree: Pick<DelegationIndex, "collaborationTreeOf">;
  ownTreeOf(run: RootExecutionIdentity): Promise<RunOwnTree | null>;
  /** The rows' records, as the views read them (a run's own file; a peer's run from its Task entry and its node's answer). */
  projection: ChildRowProjection;
  /** Whether a team run is live now (registered in the active root directory): only then is a member leaving (SR-010). */
  isLiveTeamRun(teamRunId: string): boolean;
  /** An Org container's unit runs, read synchronously (its delegated rows are its units'); `null` for any other run. */
  unitRunsOf?(orgRunId: string): readonly RootExecutionIdentity[] | null;
  /** Reads a stored Org container once, so `unitRunsOf` answers for it (a live container is always known). */
  loadContainer?(orgRunId: string): Promise<unknown>;
}>;

/**
 * SR-010 (AR-007, AR-009): the member rows of one team run, for every path (the run's own rows, and a delegated Team
 * copy's rows under its delegating run). A former member marked `leaving` is a member row tagged leaving only while the
 * run is live; outside a live run nothing executes, so it reads as former and has no row.
 */
export const teamMemberRowsOf = <T extends RunOwnMember>(members: readonly T[], isLive: boolean): readonly T[] =>
  members.filter((member) => !member.leaving || isLive);

/** The one name rule of every view (the address's last segment, `_` and `-` as spaces). */
export const rowNameOf = (address: string | null, fallback: string): string => slotNameOf(address) || address || fallback;

export const runTreeRowKey = (kind: RunTreeRowKind, runId: string, agentRunId?: string): string =>
  agentRunId === undefined ? `${kind}:${runId}` : `${kind}:${runId}:${agentRunId}`;

type Draft = Omit<RunTreeRow, "depth">;

/** A row's launch, from its run's record (CR-461-086). */
const launchOf = (launch: RunLaunchRecord): RunTreeLaunch => Object.freeze({
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig,
  autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath,
  source: launch.source ? launchSourceDtoOf(launch.source) : null, ownSource: launch.ownSource,
});

/** A peer row's launch, from its node's latest answer: its node keeps the rest. */
const peerLaunchOf = (launches: readonly RemoteAgentLaunch[] | null, address: string): RunTreeLaunch | undefined => {
  const launch = launches?.find((candidate) => candidate.address === address);
  return launch ? Object.freeze({ runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: null,
    autoExecuteTools: null, workspaceRootPath: null, source: launchSourceDtoOf(launch.source), ownSource: true }) : undefined;
};

/**
 * A run's tree, built once on the server (autobyteus-461 SR-082, SR-084; ARCH-REV-054, -055, -057): the run's own parts
 * from its own file, then its open subtree at every depth, each delegated run nested under the agent or member that
 * delegated it, with its peer rows. Every view, the run list's expanded runs, the phone, the Task card and Settings show
 * these rows; clients derive nothing about a run. Statuses are each run's own (`/ws/run-status`); the rows only name
 * their IDs. A row whose record cannot be read is left out with a warning; the rows it delegated stay, under the run.
 */
export class RunTreeView {
  constructor(private readonly sources: RunTreeSources) {}

  /**
   * What `readAtBase` needs read first: an Org container's file (its units hold its delegated rows), read once; a stored
   * Org's view and every read without a given base call it before the synchronous step.
   */
  async prepare(run: RootExecutionIdentity): Promise<void> {
    if (run.rootSubjectKind === "agent_org") await this.sources.loadContainer?.(run.rootRunId);
  }

  /** The run's delegated rows now, read synchronously: a view's snapshot reads them in the step that takes its base (SR-063). */
  readAtBase(run: RootExecutionIdentity): RunTreeBase {
    // An Org container delegates nothing itself: its rows under its parts are its unit runs' delegations.
    const units = run.rootSubjectKind === "agent_org" ? this.sources.unitRunsOf?.(run.rootRunId) ?? [] : [];
    return Object.freeze({ subtree: Object.freeze([run, ...units].flatMap((holder) => this.sources.tree.collaborationTreeOf(holder).rows())) });
  }

  /** The run's rows: its own parts, then its delegated rows as read at `atBase` (now, when not given), their records read after. */
  async rowsOf(run: RootExecutionIdentity, base?: RunTreeBase): Promise<readonly RunTreeRow[]> {
    let atBase: RunTreeBase;
    if (base) atBase = base;
    else { await this.prepare(run); atBase = this.readAtBase(run); }
    const own = await this.sources.ownTreeOf(run);
    if (!own) return [];
    const drafts: Draft[] = [];
    /** Where a run's delegations hang: by the run and its delegating agent run ID. */
    const anchors = new Map<string, string>();
    const anchor = (holder: RootExecutionIdentity, agentRunId: string, key: string) => anchors.set(`${rootExecutionIdentityKey(holder)}|${agentRunId}`, key);
    const fallbackParent = this.ownParts(run, own, drafts, anchor);

    const records = await Promise.all(atBase.subtree.map(async (row) => ({ row, record: await this.recordOf(run, row) })));
    // Anchors first (a row's delegations may be listed before it is read), then the rows under their delegators.
    const placed = records.map(({ row, record }) => ({ row, rows: record ? this.delegatedRows(row, record, anchor) : [] }));
    for (const { row, rows } of placed) {
      const parentKey = anchors.get(`${rootExecutionIdentityKey(row.parent)}|${row.delegatorAgentRunId}`) ?? null;
      if (!parentKey && rows.length) {
        console.warn(`Run tree of ${run.rootSubjectKind} run '${run.rootRunId}': the delegator '${row.delegatorAgentRunId}' of '${runIdentityOf(row.run).rootRunId}' is not in the tree; it is shown under the run.`);
      }
      for (const [index, draft] of rows.entries()) drafts.push(index === 0 ? Object.freeze({ ...draft, parentKey: parentKey ?? fallbackParent }) : draft);
    }
    return depthFirst(drafts);
  }

  /** The run's own parts; answers the key the run's delegations hang under when their delegator is not found. */
  private ownParts(run: RootExecutionIdentity, own: RunOwnTree, drafts: Draft[], anchor: (holder: RootExecutionIdentity, agentRunId: string, key: string) => void): string | null {
    if (own.kind === "agent") {
      const key = runTreeRowKey("agent", own.agentRunId);
      drafts.push(Object.freeze({ key, parentKey: null, kind: "agent", name: rowNameOf(own.address, own.agentRunId), address: own.address,
        openTarget: openTargetOf({ agentRunId: own.agentRunId }), statusIds: Object.freeze([own.agentRunId]) }));
      anchor(run, own.agentRunId, key);
      return key;
    }
    if (own.kind === "agent_team") {
      const key = runTreeRowKey("team", own.teamRunId);
      drafts.push(Object.freeze({ key, parentKey: null, kind: "team", name: rowNameOf(null, own.teamRunId), address: null,
        openTarget: openTargetOf({ teamRunId: own.teamRunId }, own), statusIds: Object.freeze([own.teamRunId]) }));
      for (const member of teamMemberRowsOf(own.members, this.sources.isLiveTeamRun(own.teamRunId))) {
        const memberKey = runTreeRowKey("team_member", own.teamRunId, member.agentRunId);
        drafts.push(Object.freeze({ key: memberKey, parentKey: key, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
          openTarget: Object.freeze({ runKind: "agent_team" as const, runId: own.teamRunId, agentRunId: member.agentRunId }), statusIds: Object.freeze([member.agentRunId]),
          ...(member.leaving ? { leaving: true as const } : {}) }));
        anchor(run, member.agentRunId, memberKey);
      }
      return key;
    }
    const inOrg = (agentRunId: string): RunTreeOpenTarget => Object.freeze({ runKind: "agent_org", runId: own.orgRunId, agentRunId });
    // A container's parts are unit runs: each holds its own agents' delegations (contract §6).
    const holderOf = (part: (typeof own.parts)[number]): RootExecutionIdentity => !own.container ? run
      : part.kind === "agent" ? { rootSubjectKind: "agent", rootRunId: part.agentRunId } : { rootSubjectKind: "agent_team", rootRunId: part.teamRunId };
    for (const part of own.parts) {
      if (part.kind === "agent") {
        const key = runTreeRowKey("org_agent", own.orgRunId, part.agentRunId);
        drafts.push(Object.freeze({ key, parentKey: null, kind: "org_agent", name: rowNameOf(part.address, part.agentRunId), address: part.address,
          openTarget: inOrg(part.agentRunId), statusIds: Object.freeze([part.agentRunId]), ...(part.leaving ? { leaving: true as const } : {}) }));
        anchor(holderOf(part), part.agentRunId, key);
        continue;
      }
      const teamKey = runTreeRowKey("org_team", part.teamRunId);
      const coordinator = part.members.find((member) => member.address === part.coordinatorAddress);
      if (!coordinator) console.warn(`Row error: the org's mounted team at '${part.address}' has no coordinator among its members; its row has no open target.`);
      drafts.push(Object.freeze({ key: teamKey, parentKey: null, kind: "org_team", name: rowNameOf(part.address, part.teamRunId), address: part.address,
        openTarget: coordinator ? inOrg(coordinator.agentRunId) : null, statusIds: Object.freeze(part.members.map((member) => member.agentRunId)),
        ...(part.leaving ? { leaving: true as const } : {}) }));
      // A member leaving its Team unit is a row tagged leaving only while that Team unit runs (SR-010, as a Team's own rows).
      for (const member of teamMemberRowsOf(part.members, this.sources.isLiveTeamRun(part.teamRunId))) {
        const memberKey = runTreeRowKey("team_member", part.teamRunId, member.agentRunId);
        drafts.push(Object.freeze({ key: memberKey, parentKey: teamKey, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
          openTarget: inOrg(member.agentRunId), statusIds: Object.freeze([member.agentRunId]), ...(part.leaving || member.leaving ? { leaving: true as const } : {}) }));
        anchor(holderOf(part), member.agentRunId, memberKey);
      }
    }
    return null;
  }

  /** A delegated run's rows (its own row first, then its members), and where its own delegations hang. */
  private delegatedRows(row: SubtreeRow, record: ChildRowRecord, anchor: (holder: RootExecutionIdentity, agentRunId: string, key: string) => void): Draft[] {
    if (record.kind === "peer") return peerRows(record);
    const holder = runIdentityOf(row.run);
    if (record.kind === "agent") {
      const key = runTreeRowKey("agent", record.agentRunId);
      anchor(holder, record.agentRunId, key);
      return [Object.freeze({ key, parentKey: null, kind: "agent", name: displayNameOf({ delegated: true, address: record.address }) ?? record.agentRunId, address: record.address,
        openTarget: openTargetOf({ agentRunId: record.agentRunId }), statusIds: Object.freeze([record.agentRunId]), launch: launchOf(record.launch) })];
    }
    const key = runTreeRowKey("team", record.teamRunId);
    // Its coordinator, by its own address in its own run (TC-12), among the members it lists.
    const rows: Draft[] = [Object.freeze({ key, parentKey: null, kind: "team", name: displayNameOf({ delegated: true, address: record.address }) ?? record.teamRunId, address: record.address,
      openTarget: openTargetOf({ teamRunId: record.teamRunId }, record), statusIds: Object.freeze([record.teamRunId]), launch: launchOf(record.launch) })];
    for (const member of teamMemberRowsOf(record.members, this.sources.isLiveTeamRun(record.teamRunId))) {
      const memberKey = runTreeRowKey("team_member", record.teamRunId, member.agentRunId);
      anchor(holder, member.agentRunId, memberKey);
      rows.push(Object.freeze({ key: memberKey, parentKey: key, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
        openTarget: Object.freeze({ runKind: "agent_team" as const, runId: record.teamRunId, agentRunId: member.agentRunId }), statusIds: Object.freeze([member.agentRunId]),
        ...(member.launch ? { launch: launchOf(member.launch) } : {}), ...(member.leaving ? { leaving: true as const } : {}) }));
    }
    return rows;
  }

  private async recordOf(run: RootExecutionIdentity, row: SubtreeRow): Promise<ChildRowRecord | null> {
    try { return await this.sources.projection.rowOf(row); }
    catch (error) {
      console.warn(`The run '${runIdentityOf(row.run).rootRunId}' was left out of the tree of ${run.rootSubjectKind} run '${run.rootRunId}': ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

/** A peer's run (autobyteus-278): its rows from its Task link, its launches and title from its node's latest answer. */
const peerRows = (record: Extract<ChildRowRecord, { kind: "peer" }>): Draft[] => {
  const { link, summary } = record;
  const peer = Object.freeze({ nodeId: link.nodeId, nodeName: link.nodeName, title: summary?.title ?? null, reachable: summary?.reachable ?? null });
  // Where it opens (SR-083): the run on its node and its own agent, or its coordinator among its members.
  const target = link.kind === "agent" ? openTargetOf({ agentRunId: link.agentRunId }) : openTargetOf({ teamRunId: link.teamRunId }, link);
  const openTarget = target ? Object.freeze({ ...target, nodeId: link.nodeId }) : null;
  if (link.kind === "agent") {
    const launch = peerLaunchOf(record.launches, link.address);
    return [Object.freeze({ key: runTreeRowKey("peer_agent", link.agentRunId), parentKey: null, kind: "peer_agent" as const,
      name: displayNameOf({ delegated: true, address: link.address }) ?? link.agentRunId, address: link.address, openTarget,
      statusIds: Object.freeze([link.agentRunId]), peer, ...(launch ? { launch } : {}) })];
  }
  const key = runTreeRowKey("peer_team", link.teamRunId);
  return [Object.freeze({ key, parentKey: null, kind: "peer_team" as const, name: displayNameOf({ delegated: true, address: link.address }) ?? link.teamRunId, address: link.address,
    openTarget, statusIds: Object.freeze([link.teamRunId]), peer }),
  ...link.members.map((member) => {
    const launch = peerLaunchOf(record.launches, member.address);
    return Object.freeze({ key: runTreeRowKey("peer_member", link.teamRunId, member.agentRunId), parentKey: key, kind: "peer_member" as const,
      name: rowNameOf(member.address, member.agentRunId), address: member.address,
      openTarget: Object.freeze({ runKind: "agent_team" as const, runId: link.teamRunId, agentRunId: member.agentRunId, nodeId: link.nodeId }),
      statusIds: Object.freeze([member.agentRunId]), peer, ...(launch ? { launch } : {}) });
  })];
};

/** The rows in display order (each row's children after it, in the order they came) with their depth. */
const depthFirst = (drafts: readonly Draft[]): readonly RunTreeRow[] => {
  const keys = new Set(drafts.map((draft) => draft.key));
  const children = new Map<string | null, Draft[]>();
  for (const draft of drafts) {
    const parent = draft.parentKey !== null && keys.has(draft.parentKey) ? draft.parentKey : null;
    children.set(parent, [...children.get(parent) ?? [], parent === draft.parentKey ? draft : Object.freeze({ ...draft, parentKey: null })]);
  }
  const rows: RunTreeRow[] = [];
  const visit = (parentKey: string | null, depth: number): void => {
    for (const draft of children.get(parentKey) ?? []) {
      rows.push(Object.freeze({ ...draft, depth }));
      visit(draft.key, depth + 1);
    }
  };
  visit(null, 0);
  return Object.freeze(rows);
};
