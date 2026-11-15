import type { CollaborationLaunchConfigurationSourceDto, CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { RemoteAgentLaunchDto, RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../execution/task/task-execution-resource-port.js";
import { openTargetOf, type SubtreeRow } from "./collaboration-tree.js";
import type { ChildRowProjection, ChildRowRecord } from "./child-rows-feed.js";
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
  /** The agent run IDs whose statuses the row shows (`/ws/run-status`); the tree holds no status. */
  statusIds: readonly string[];
  /** A run it delegated, or its member: its launch as the run has it now. */
  launch?: RunTreeLaunch;
  /** A peer's run: its node, and what the node answered about it (`null` while not answered). */
  peer?: Readonly<{ nodeId: string; nodeName: string; title: string | null; reachable: boolean | null }>;
}>;

/** A run's own parts, from its own file (`RunOwnAgentsReader.ownTreeOf`). */
export type RunOwnMember = Readonly<{ address: string; agentRunId: string }>;
export type RunOwnTree =
  | Readonly<{ kind: "agent"; agentRunId: string; address: string | null }>
  | Readonly<{ kind: "agent_team"; teamRunId: string; coordinatorAddress: string; members: readonly RunOwnMember[] }>
  | Readonly<{ kind: "agent_org"; orgRunId: string; parts: readonly (
    | Readonly<{ kind: "agent"; address: string; agentRunId: string }>
    | Readonly<{ kind: "team"; address: string; teamRunId: string; coordinatorAddress: string; members: readonly RunOwnMember[] }>)[] }>;

export type RunTreeSources = Readonly<{
  tree: Pick<DelegationIndex, "collaborationTreeOf">;
  ownTreeOf(run: RootExecutionIdentity): Promise<RunOwnTree | null>;
  /** The rows' records, as the views read them (a run's own file; a peer's run from its Task entry and its node's answer). */
  projection: ChildRowProjection;
}>;

/** The one name rule of every view (the address's last segment, `_` and `-` as spaces). */
export const rowNameOf = (address: string | null, fallback: string): string => {
  const leaf = (address ?? "").split("/").filter(Boolean).at(-1) ?? "";
  return leaf.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || address || fallback;
};

export const runTreeRowKey = (kind: RunTreeRowKind, runId: string, agentRunId?: string): string =>
  agentRunId === undefined ? `${kind}:${runId}` : `${kind}:${runId}:${agentRunId}`;

type Draft = Omit<RunTreeRow, "depth">;

const launchOf = (
  launch: Readonly<{ runtimeKind: string; llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null; autoExecuteTools: boolean; workspaceRootPath: string | null }>,
  source: CollaborationLaunchConfigurationSourceDto | null | undefined,
  ownSource: boolean,
): RunTreeLaunch => Object.freeze({
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig ?? null,
  autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath ?? null, source: source ?? null, ownSource,
});

const peerSourceOf = (source: RemoteAgentLaunchDto["source"]): CollaborationLaunchConfigurationSourceDto => {
  const fallbacks = source.fallbacks.map((fallback) => ({ layer: fallback.layer, runtimeKind: fallback.runtime_kind,
    llmModelIdentifier: fallback.llm_model_identifier, reason: fallback.reason, detail: fallback.detail }));
  return (source.origin === "model_router"
    ? { origin: source.origin, fallbacks, choiceReason: source.choice_reason, taskKind: source.task_kind }
    : { origin: source.origin, fallbacks }) as CollaborationLaunchConfigurationSourceDto;
};
const peerLaunchOf = (launches: readonly RemoteAgentLaunchDto[] | undefined, address: string): RunTreeLaunch | undefined => {
  const launch = launches?.find((candidate) => candidate.address === address);
  return launch ? Object.freeze({ runtimeKind: launch.runtime_kind, llmModelIdentifier: launch.llm_model_identifier, llmConfig: null,
    autoExecuteTools: null, workspaceRootPath: null, source: peerSourceOf(launch.source), ownSource: true }) : undefined;
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

  async rowsOf(run: RootExecutionIdentity): Promise<readonly RunTreeRow[]> {
    const own = await this.sources.ownTreeOf(run);
    if (!own) return [];
    const drafts: Draft[] = [];
    /** Where a run's delegations hang: by the run and its delegating agent run ID. */
    const anchors = new Map<string, string>();
    const anchor = (holder: RootExecutionIdentity, agentRunId: string, key: string) => anchors.set(`${rootExecutionIdentityKey(holder)}|${agentRunId}`, key);
    const fallbackParent = this.ownParts(run, own, drafts, anchor);

    const subtree = this.sources.tree.collaborationTreeOf(run).rows();
    const records = await Promise.all(subtree.map(async (row) => ({ row, record: await this.recordOf(run, row) })));
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
        openTarget: openTargetOf({ teamRunId: own.teamRunId }, own), statusIds: Object.freeze(own.members.map((member) => member.agentRunId)) }));
      for (const member of own.members) {
        const memberKey = runTreeRowKey("team_member", own.teamRunId, member.agentRunId);
        drafts.push(Object.freeze({ key: memberKey, parentKey: key, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
          openTarget: Object.freeze({ runKind: "agent_team" as const, runId: own.teamRunId, agentRunId: member.agentRunId }), statusIds: Object.freeze([member.agentRunId]) }));
        anchor(run, member.agentRunId, memberKey);
      }
      return key;
    }
    const inOrg = (agentRunId: string): RunTreeOpenTarget => Object.freeze({ runKind: "agent_org", runId: own.orgRunId, agentRunId });
    for (const part of own.parts) {
      if (part.kind === "agent") {
        const key = runTreeRowKey("org_agent", own.orgRunId, part.agentRunId);
        drafts.push(Object.freeze({ key, parentKey: null, kind: "org_agent", name: rowNameOf(part.address, part.agentRunId), address: part.address,
          openTarget: inOrg(part.agentRunId), statusIds: Object.freeze([part.agentRunId]) }));
        anchor(run, part.agentRunId, key);
        continue;
      }
      const teamKey = runTreeRowKey("org_team", part.teamRunId);
      const coordinator = part.members.find((member) => member.address === part.coordinatorAddress);
      if (!coordinator) console.warn(`Row error: the org's mounted team at '${part.address}' has no coordinator among its members; its row has no open target.`);
      drafts.push(Object.freeze({ key: teamKey, parentKey: null, kind: "org_team", name: rowNameOf(part.address, part.teamRunId), address: part.address,
        openTarget: coordinator ? inOrg(coordinator.agentRunId) : null, statusIds: Object.freeze(part.members.map((member) => member.agentRunId)) }));
      for (const member of part.members) {
        const memberKey = runTreeRowKey("team_member", part.teamRunId, member.agentRunId);
        drafts.push(Object.freeze({ key: memberKey, parentKey: teamKey, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
          openTarget: inOrg(member.agentRunId), statusIds: Object.freeze([member.agentRunId]) }));
        anchor(run, member.agentRunId, memberKey);
      }
    }
    return null;
  }

  /** A delegated run's rows (its own row first, then its members), and where its own delegations hang. */
  private delegatedRows(row: SubtreeRow, record: ChildRowRecord, anchor: (holder: RootExecutionIdentity, agentRunId: string, key: string) => void): Draft[] {
    if (record.kind === "peer") return peerRows(record.row, record.summary);
    const execution: CollaborationTaskExecutionDto = record.row;
    const holder = runIdentityOf(row.run);
    if ("agentRunId" in execution && execution.source.kind === "agent") {
      const key = runTreeRowKey("agent", execution.agentRunId);
      anchor(holder, execution.agentRunId, key);
      return [Object.freeze({ key, parentKey: null, kind: "agent", name: rowNameOf(execution.address, execution.agentRunId), address: execution.address,
        openTarget: execution.openTarget ?? null, statusIds: Object.freeze([execution.agentRunId]),
        launch: launchOf(execution.source.launchConfiguration, execution.source.launchSource, true) })];
    }
    if (!("teamRunId" in execution) || execution.source.kind !== "agent_team") return [];
    const source = execution.source;
    const key = runTreeRowKey("team", execution.teamRunId);
    const rows: Draft[] = [Object.freeze({ key, parentKey: null, kind: "team", name: rowNameOf(execution.address, execution.teamRunId), address: execution.address,
      openTarget: execution.openTarget ?? null, statusIds: Object.freeze(execution.members.map((member) => member.agentRunId)),
      launch: launchOf(source.defaultLaunchConfiguration, source.defaultLaunchSource, true) })];
    for (const member of execution.members) {
      const memberKey = runTreeRowKey("team_member", execution.teamRunId, member.agentRunId);
      const recorded = source.members.find((candidate) => candidate.address === member.address);
      anchor(holder, member.agentRunId, memberKey);
      rows.push(Object.freeze({ key: memberKey, parentKey: key, kind: "team_member", name: rowNameOf(member.address, member.agentRunId), address: member.address,
        openTarget: Object.freeze({ runKind: "agent_team" as const, runId: execution.teamRunId, agentRunId: member.agentRunId }), statusIds: Object.freeze([member.agentRunId]),
        ...(recorded ? { launch: launchOf(recorded.launchConfiguration, recorded.launchSource ?? source.defaultLaunchSource, Boolean(recorded.launchSource)) } : {}) }));
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

const peerRows = (execution: RemoteTaskExecutionDto, summary: Readonly<{ title: string | null; reachable: boolean }> | null): Draft[] => {
  const peer = Object.freeze({ nodeId: execution.node_id, nodeName: execution.node_name, title: summary?.title ?? null, reachable: summary?.reachable ?? null });
  const target = execution.open_target ? Object.freeze({ runKind: execution.open_target.run_kind, runId: execution.open_target.run_id,
    agentRunId: execution.open_target.agent_run_id, nodeId: execution.open_target.node_id }) : null;
  if (execution.kind === "agent") {
    const launch = peerLaunchOf(execution.launches, execution.address);
    return [Object.freeze({ key: runTreeRowKey("peer_agent", execution.agent_run_id), parentKey: null, kind: "peer_agent" as const,
      name: rowNameOf(execution.address, execution.agent_run_id), address: execution.address, openTarget: target,
      statusIds: Object.freeze([execution.agent_run_id]), peer, ...(launch ? { launch } : {}) })];
  }
  const key = runTreeRowKey("peer_team", execution.team_run_id);
  return [Object.freeze({ key, parentKey: null, kind: "peer_team" as const, name: rowNameOf(execution.address, execution.team_run_id), address: execution.address,
    openTarget: target, statusIds: Object.freeze(execution.members.map((member) => member.agent_run_id)), peer }),
  ...execution.members.map((member) => {
    const launch = peerLaunchOf(execution.launches, member.address);
    return Object.freeze({ key: runTreeRowKey("peer_member", execution.team_run_id, member.agent_run_id), parentKey: key, kind: "peer_member" as const,
      name: rowNameOf(member.address, member.agent_run_id), address: member.address,
      openTarget: Object.freeze({ runKind: "agent_team" as const, runId: execution.team_run_id, agentRunId: member.agent_run_id, nodeId: execution.node_id }),
      statusIds: Object.freeze([member.agent_run_id]), peer, ...(launch ? { launch } : {}) });
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
