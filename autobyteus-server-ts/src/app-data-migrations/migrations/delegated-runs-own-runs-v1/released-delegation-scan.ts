import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../frozen/server/agent-memory/store/agent-memory-layout.js";
import { getAgentOrgRunExecutionTreePath } from "../../frozen/server/run-history/store/agent-org-run-execution-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../frozen/server/run-history/store/team-run-execution-tree-path.js";
import { getStandaloneRootTreePath } from "../../frozen/server/standalone-agent-run-root/persistence/standalone-root-tree-path.js";

/**
 * The released shapes this migration reads (frozen here: the runtime reads only the target shapes). Every value is raw
 * JSON; nothing of the current runtime is imported (the sealed area).
 */
export type RawRecord = Record<string, unknown>;
export type RunRef = Readonly<{ kind: "agent" | "agent_team" | "agent_org"; runId: string }>;
/** A stored file read for this attempt: its content, absent, or why it cannot be read. */
export type RawFile = Readonly<{ kind: "present"; raw: RawRecord } | { kind: "missing" } | { kind: "unreadable"; reason: string }>;
/** A link to a run on a peer node, as stored: a `taskExecutions` entry with `nodeId` (469, autobyteus-278). */
export type StoredPeerLink = Readonly<{
  address: string; nodeId: string; members?: readonly Readonly<{ address: string; agentRunId: string }>[];
}>;
/** A tree that holds lists of delegated runs: a standalone run's `collaboration_tree.json`, a team or org run's tree. */
export type ScannedTree = Readonly<{ owner: RunRef; filePath: string; raw: RawRecord; isOwnFileOfDelegatedTeam: boolean }>;

export const RUN_METADATA_FILE = "run_metadata.json";
const LINK_KEYS = new Set(["address", "agentRunId", "teamRunId", "startedAt", "delegatorAgentRunId"]);

export const isRecord = (value: unknown): value is RawRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
export const runIdOfEntry = (entry: RawRecord): string | null =>
  text(entry.agentRunId) ? entry.agentRunId : text(entry.teamRunId) ? entry.teamRunId : null;
export const runRefOf = (value: unknown): RunRef | null =>
  isRecord(value) && (value.kind === "agent" || value.kind === "agent_team" || value.kind === "agent_org") && text(value.runId)
    ? { kind: value.kind, runId: value.runId } : null;

export const readRaw = async (filePath: string): Promise<RawFile> => {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!isRecord(parsed)) return { kind: "unreadable", reason: "It is not a JSON object." };
    return { kind: "present", raw: parsed };
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") return { kind: "missing" };
    return { kind: "unreadable", reason: error instanceof Error ? error.message : String(error) };
  }
};

export const folders = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") return [];
    throw error;
  });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
};

/** The agent run IDs of a list of configured members (agents, and teams with members), never of task lists. */
const memberAgentRunIds = (members: unknown): string[] => !Array.isArray(members) ? [] : members.flatMap((member) => !isRecord(member) ? []
  : text(member.agentRunId) ? [member.agentRunId] : memberAgentRunIds(member.members));

/** The `taskExecutions` lists of a tree, at every place a released shape keeps one (the root and each org team). */
const taskListsOf = (raw: RawRecord): unknown[][] => {
  const lists: unknown[][] = [];
  const visitHolder = (holder: unknown): void => {
    if (!isRecord(holder)) return;
    if (Array.isArray(holder.taskExecutions)) lists.push(holder.taskExecutions);
    if (Array.isArray(holder.members)) holder.members.forEach((member) => { if (isRecord(member) && text(member.teamRunId)) visitHolder(member); });
  };
  if (Array.isArray(raw.taskExecutions)) lists.push(raw.taskExecutions);
  visitHolder(raw.rootTeam);
  visitHolder(raw.rootOrg);
  return lists;
};

/**
 * What the migration needs to know of every stored run before it converts anything (design DS-10): which run each
 * agent is a part of, each delegated run's delegator and origin, the peer links, and the items a predecessor left
 * unfinished. Read once; nothing is written.
 */
export class ReleasedDelegationScan {
  /** Agent run → the run it is a part of (a standalone run, a team run's member, an org run's agent). */
  readonly ownerOfAgent = new Map<string, RunRef>();
  /** Delegated run → its `taskAgent` section (own file). */
  readonly taskAgentOf = new Map<string, RawRecord>();
  /** Delegated run → the delegator recorded in a tree's entry (a link or a kept full record). */
  readonly recordedDelegatorOf = new Map<string, string>();
  /** Delegated run → the address recorded in a tree's entry (a link or a kept full record): its delegation address. */
  readonly recordedAddressOf = new Map<string, string>();
  readonly peerLinkOf = new Map<string, StoredPeerLink>();
  /** Runs a predecessor did not finish (`20261017_…`: a kept full record, or a link whose run has no own file). */
  readonly unfinishedRuns = new Set<string>();
  /** Trees that keep an unfinished item (`20261017_…` records, `20261015_…` non-empty `collaborators`), with the reason. */
  readonly unfinishedTrees = new Map<string, string>();
  readonly trees: ScannedTree[] = [];
  readonly agentRunFiles = new Map<string, RawFile>();
  readonly teamRunFiles = new Map<string, RawFile>();

  constructor(readonly layout: AgentMemoryLayout) {}

  agentFilePath(runId: string): string { return path.join(this.layout.getStandaloneRunDirPath(runId), RUN_METADATA_FILE); }
  teamFilePath(runId: string): string { return getTeamRunExecutionTreePath(this.layout.getTeamDirPath({ rootTeamRunId: runId, ancestorTeamRunIds: [] })); }
  standaloneTreePath(runId: string): string { return getStandaloneRootTreePath(this.layout.getAgentRunCollaborationDirPath(runId)); }

  async scan(): Promise<this> {
    for (const runId of await folders(this.layout.getStandaloneRootDirPath())) {
      const file = await readRaw(this.agentFilePath(runId));
      this.agentRunFiles.set(runId, file);
      if (file.kind !== "present") continue;
      this.ownerOfAgent.set(runId, { kind: "agent", runId });
      if (isRecord(file.raw.taskAgent)) this.taskAgentOf.set(runId, file.raw.taskAgent);
      const tree = await readRaw(this.standaloneTreePath(runId));
      if (tree.kind === "present") this.trees.push({ owner: { kind: "agent", runId }, filePath: this.standaloneTreePath(runId), raw: tree.raw, isOwnFileOfDelegatedTeam: false });
    }
    for (const runId of await folders(this.layout.getTeamRootDirPath())) {
      const file = await readRaw(this.teamFilePath(runId));
      this.teamRunFiles.set(runId, file);
      if (file.kind !== "present") continue;
      const owner: RunRef = { kind: "agent_team", runId };
      for (const agentRunId of memberAgentRunIds(isRecord(file.raw.rootTeam) ? file.raw.rootTeam.members : undefined)) this.ownerOfAgent.set(agentRunId, owner);
      const delegated = isRecord(file.raw.taskAgent);
      if (delegated) this.taskAgentOf.set(runId, file.raw.taskAgent as RawRecord);
      this.trees.push({ owner, filePath: this.teamFilePath(runId), raw: file.raw, isOwnFileOfDelegatedTeam: delegated });
    }
    for (const runId of await folders(this.layout.getOrgRootDirPath())) {
      const filePath = getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(runId));
      const file = await readRaw(filePath);
      if (file.kind !== "present") continue;
      const owner: RunRef = { kind: "agent_org", runId };
      for (const agentRunId of memberAgentRunIds(isRecord(file.raw.rootOrg) ? file.raw.rootOrg.members : undefined)) this.ownerOfAgent.set(agentRunId, owner);
      this.trees.push({ owner, filePath, raw: file.raw, isOwnFileOfDelegatedTeam: false });
    }
    for (const tree of this.trees) this.scanLists(tree);
    return this;
  }

  /** The run a delegated run's own file is at (agent or team), for the link rule of 469 (an existence check). */
  private hasOwnFile(entry: RawRecord): boolean {
    const file = text(entry.agentRunId) ? this.agentRunFiles.get(entry.agentRunId) : text(entry.teamRunId) ? this.teamRunFiles.get(entry.teamRunId) : undefined;
    return file?.kind === "present";
  }

  private scanLists(tree: ScannedTree): void {
    const key = tree.filePath;
    const collaborators = [tree.raw.collaborators, isRecord(tree.raw.rootTeam) ? tree.raw.rootTeam.collaborators : undefined,
      isRecord(tree.raw.rootOrg) ? tree.raw.rootOrg.collaborators : undefined];
    if (collaborators.some((list) => Array.isArray(list) && list.length > 0)) {
      this.unfinishedTrees.set(key, "20261015_collaborators_to_delegated_runs_v1: it still holds collaborators");
    }
    const visit = (entries: unknown[], kept: boolean): void => {
      for (const entry of entries) {
        if (!isRecord(entry)) continue;
        const runId = runIdOfEntry(entry);
        if (!runId) continue;
        if (entry.nodeId !== undefined) {
          if (text(entry.nodeId) && text(entry.address)) {
            const members = Array.isArray(entry.members) ? entry.members.filter(isRecord)
              .filter((m) => text(m.address) && text(m.agentRunId)).map((m) => ({ address: m.address as string, agentRunId: m.agentRunId as string })) : undefined;
            this.peerLinkOf.set(runId, { address: entry.address, nodeId: entry.nodeId, ...(members?.length ? { members } : {}) });
          }
          continue;
        }
        if (text(entry.delegatorAgentRunId) && !this.recordedDelegatorOf.has(runId)) this.recordedDelegatorOf.set(runId, entry.delegatorAgentRunId);
        if (text(entry.address) && !this.recordedAddressOf.has(runId)) this.recordedAddressOf.set(runId, entry.address);
        const isLink = Object.keys(entry).every((field) => LINK_KEYS.has(field));
        if (!isLink || kept || !this.hasOwnFile(entry)) {
          this.unfinishedRuns.add(runId);
          this.unfinishedTrees.set(key, `20261017_task_agent_own_run_v1: ${isLink ? `the run '${runId}' has no own file` : `a full record of '${runId}' is kept`}`);
        }
        // A kept full team record holds its members' runs and its own nested lists.
        if (!isLink) {
          for (const agentRunId of memberAgentRunIds(entry.members)) if (!this.ownerOfAgent.has(agentRunId)) this.unfinishedRuns.add(agentRunId);
          if (Array.isArray(entry.taskExecutions)) visit(entry.taskExecutions, true);
        }
      }
    };
    for (const list of taskListsOf(tree.raw)) visit(list, false);
  }

  /** The delegator of a delegated run: its own file, else a tree's record of it; null when neither records one. */
  delegatorOf(runId: string): string | null {
    const own = this.taskAgentOf.get(runId)?.delegatorAgentRunId;
    return text(own) ? own : this.recordedDelegatorOf.get(runId) ?? null;
  }

  /** The address a run was delegated to (E5): its own file's `taskAgent.address`, else a tree's record of it. */
  delegationAddressOf(runId: string): string | null {
    const own = this.taskAgentOf.get(runId)?.address;
    return text(own) ? own : this.recordedAddressOf.get(runId) ?? null;
  }

  /** The stored run the delegator is a part of (one hop); `null` when that run is not stored. */
  delegatingRunOf(delegatorAgentRunId: string): RunRef | null {
    return this.ownerOfAgent.get(delegatorAgentRunId) ?? null;
  }
}
