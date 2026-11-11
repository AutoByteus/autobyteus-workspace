import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { isMessageOfView } from "./task-agent-message-logs.js";
import type { RemoteTaskExecution, TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "./agent-run-metadata-types.js";
import type { TaskAgentCoordinatingRun } from "./agent-run-metadata-types.js";
import type { TaskAgentRunMetadataReadState } from "./agent-run-metadata-store.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";
import { isRemoteTaskExecutionEntry, objectRecord } from "./run-execution-tree-shared-record-schemas.js";
import { appendRemoteLinks, attachRemoteLinks } from "./remote-task-execution-links.js";
import { ROOT_TASK_LIST_KEY } from "./coordinating-tree-shapes.js";
import type { OpenDelegatedRun } from "./open-delegated-run-source.js";
import type { TaskAgentOwnFiles, TaskAgentTeamTreeReadState } from "./task-agent-own-files.js";
import { parseTaskAgentRunMetadata } from "./task-agent-own-file-schema.js";
import {
  composeTaskAgentRecord,
  composeTaskTeamRecord,
  isTaskExecutionLinkEntry,
  taskAgentOwnMetadata,
  taskAgentTeamOwnTree,
  taskExecutionRunId,
} from "./task-agent-own-records.js";
import { validateTaskAgentTeamTreePayload } from "./task-agent-team-tree-schema.js";

/**
 * Compose at load, split at save for the three coordinating tree families (design D-1 … D-3, CM-8). A coordinating
 * run stores nothing of a local delegated run: its tree file holds its own parts and its links to runs on another
 * node. Which local delegated runs are in its tree is asked of the Task records (`OpenDelegatedRunSource`); each one's
 * record is composed from its own file. In memory every caller keeps today's composed records.
 *
 * - One delegated run never fails a load: one whose own file is missing (when it started), unreadable, or names
 *   another coordinating run is left out and reported (DESIGN.md rule 7).
 * - Local entries that an older tree file still lists are ignored, and the next save leaves them out (D-3).
 * - Remote links (entries with `nodeId`, CM-10) have no own file: they are loaded into the root's own
 *   `remoteTaskExecutions` list, never composed, and written back whole (`remote-task-execution-links.ts`).
 */

/** Where one family's tree keeps task executions; `key` names one list stably (the root, or a configured team). */
export type TaskExecutionListKey = string;

export type CoordinatingTreeShape<TTree> = Readonly<{
  coordinatingRun(tree: TTree): TaskAgentCoordinatingRun;
  coordinatingRunOfRaw(raw: Record<string, unknown>): TaskAgentCoordinatingRun;
  /** The in-memory task lists (composed records). */
  taskLists(tree: TTree): ReadonlyMap<TaskExecutionListKey, readonly TaskExecution[]>;
  /** The on-disk task lists of a parsed tree file. */
  rawTaskLists(raw: Record<string, unknown>): ReadonlyMap<TaskExecutionListKey, readonly unknown[]>;
  /** A copy of the tree file object with the given lists put back at their keys. */
  withRawTaskLists(raw: Record<string, unknown>, lists: ReadonlyMap<TaskExecutionListKey, readonly unknown[]>): Record<string, unknown>;
  /** AgentRun ids of the coordinating run's own parts (host, members, configured agents). */
  ownAgentRunIdsOfRaw(raw: Record<string, unknown>): readonly string[];
  /** The in-memory remote links (loaded from the root list's entries with `nodeId`). */
  remoteLinks(tree: TTree): readonly RemoteTaskExecution[];
  /** A copy of a tree object with the in-memory remote links set, or removed (`null`) for writing. */
  withRemoteLinks(raw: Record<string, unknown>, links: readonly RemoteTaskExecution[] | null): Record<string, unknown>;
  /** The back-link a tree of this kind stores itself (a peer-started Team run), or `null`. */
  storedBackLink(tree: TTree): DelegatedFrom | null;
}>;

type OwnFileState = TaskAgentRunMetadataReadState | TaskAgentTeamTreeReadState;

const sameRun = (left: TaskAgentCoordinatingRun, right: TaskAgentCoordinatingRun): boolean =>
  left.kind === right.kind && left.runId === right.runId;

const reportUnavailable = (coordinating: TaskAgentCoordinatingRun, runId: string, reason: string): void => {
  console.warn(`Task agent '${runId}' of ${coordinating.kind} run '${coordinating.runId}' is not available: ${reason}`);
};

const readOwnFile = (files: TaskAgentOwnFiles, run: TaskExecutionReference): Promise<OwnFileState> =>
  "agentRunId" in run ? files.readAgent(run.agentRunId) : files.readTeam(run.teamRunId);
const readOwnFileSync = (files: TaskAgentOwnFiles, run: TaskExecutionReference): OwnFileState =>
  "agentRunId" in run ? files.readAgentSync(run.agentRunId) : files.readTeamSync(run.teamRunId);

/**
 * One delegated run's record from its own file (the one mapping for a load and for adding a run back, D-4), or why it
 * is not available. A missing own file is expected while the run's start is pending or after it failed.
 */
export type ComposedTaskExecution =
  | Readonly<{ kind: "composed"; record: TaskExecution }>
  | Readonly<{ kind: "unavailable"; reason: string; expected: boolean }>;

export const composeTaskExecution = (
  coordinating: TaskAgentCoordinatingRun,
  run: TaskExecutionReference,
  state: OwnFileState,
): ComposedTaskExecution => {
  if (state.kind === "missing") return { kind: "unavailable", reason: "its own file is missing.", expected: true };
  if (state.kind === "unreadable") return { kind: "unavailable", reason: state.error.message, expected: false };
  const own = "metadata" in state ? state.metadata : state.tree;
  if (!sameRun(own.taskAgent.coordinatingRun, coordinating)) {
    const named = own.taskAgent.coordinatingRun;
    return { kind: "unavailable", reason: `its own file names ${named.kind} run '${named.runId}'.`, expected: false };
  }
  return { kind: "composed", record: "metadata" in state ? composeTaskAgentRecord(state.metadata) : composeTaskTeamRecord(state.tree) };
};

/**
 * Composes a tree file with its open delegated runs (D-2): the file's local entries are dropped, every composed record
 * goes into the root list sorted by start, and one whose delegator is not in the composed tree is left out too, so the
 * tree stays consistent. The result is the tree file object with composed lists, for the family's validator.
 */
const composeTaskExecutions = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  open: readonly OpenDelegatedRun[],
  states: readonly OwnFileState[],
): Record<string, unknown> => {
  const coordinating = shape.coordinatingRunOfRaw(raw);
  let records: TaskExecution[] = [];
  open.forEach(({ run, started }, index) => {
    const composed = composeTaskExecution(coordinating, run, states[index]!);
    if (composed.kind === "composed") records.push(composed.record);
    else if (started || !composed.expected) reportUnavailable(coordinating, taskExecutionRunId(run), composed.reason);
  });
  records.sort((left, right) => left.startedAt.localeCompare(right.startedAt)
    || taskExecutionRunId(left).localeCompare(taskExecutionRunId(right)));
  // A task whose delegator is not loaded is left out too, until the tree is consistent.
  for (let changed = true; changed;) {
    const known = new Set(shape.ownAgentRunIdsOfRaw(raw));
    for (const record of records) {
      if ("agentRunId" in record) known.add(record.agentRunId);
      else record.members.forEach((member) => known.add(member.agentRunId));
    }
    const kept = records.filter((record) => record.delegatorAgentRunId === undefined || known.has(record.delegatorAgentRunId));
    records.filter((record) => !kept.includes(record)).forEach((record) =>
      reportUnavailable(coordinating, taskExecutionRunId(record), `its delegator '${record.delegatorAgentRunId}' is not available.`));
    changed = kept.length !== records.length;
    records = kept;
  }
  const lists = new Map<TaskExecutionListKey, readonly unknown[]>([...shape.rawTaskLists(raw).keys()].map((key) => [key, []]));
  lists.set(ROOT_TASK_LIST_KEY, records);
  return shape.withRawTaskLists(raw, lists);
};

export type SplitTreeResult =
  | Readonly<{ kind: "unchanged" }>
  | Readonly<{ kind: "write"; treeFile: Record<string, unknown> }>
  | Readonly<{ kind: "own_file_failed"; result: Exclude<RunPackageFileWriteResult, { outcome: "committed" }> }>;

/**
 * Splits a composed tree for saving, computed against the files on disk (inside the coordinating run's persistence
 * lock, D-3): each loaded task agent's own file is written only when it differs from the file on disk (a new one at
 * its activation); the tree file keeps its links to runs on another node, the stored ones unchanged and in place, new
 * ones appended. A local entry an older file still lists is left out only when it is a link and its run's own file
 * exists (its facts are there); every other one is kept byte-for-byte and in place, so a save never deletes facts
 * stored nowhere else (an own-file migration not finished yet; DESIGN.md rule 7). Returns the tree file to write, or `unchanged` when it equals
 * the file on disk.
 */
export const splitTaskExecutions = async <TTree>(input: Readonly<{
  shape: CoordinatingTreeShape<TTree>;
  tree: TTree;
  treeFile: Record<string, unknown>;
  rawOnDisk: Record<string, unknown> | null;
  /** Built only when the tree has task agents (the memory root is derived from the coordinating directory). */
  files: () => TaskAgentOwnFiles;
}>): Promise<SplitTreeResult> => {
  const { shape, tree } = input;
  let ownFiles: TaskAgentOwnFiles | null = null;
  const files = (): TaskAgentOwnFiles => ownFiles ??= input.files();
  const coordinatingRun = shape.coordinatingRun(tree);
  const memoryLists = shape.taskLists(tree);
  for (const records of memoryLists.values()) {
    for (const record of records) {
      const write = "agentRunId" in record
        ? await writeAgentIfChanged(files(), record, coordinatingRun)
        : await writeTeamIfChanged(files(), record, coordinatingRun);
      if (write && write.outcome !== "committed") return { kind: "own_file_failed", result: write as Exclude<RunPackageFileWriteResult, { outcome: "committed" }> };
    }
  }
  const diskLists = input.rawOnDisk ? shape.rawTaskLists(input.rawOnDisk) : new Map<string, readonly unknown[]>();
  const lists = new Map<TaskExecutionListKey, unknown[]>();
  for (const key of memoryLists.keys()) {
    const stored: unknown[] = [];
    for (const entry of diskLists.get(key) ?? []) {
      if (isRemoteEntry(entry) || !await isLinkWithOwnFile(files, entry)) stored.push(entry);
    }
    lists.set(key, key === ROOT_TASK_LIST_KEY ? appendRemoteLinks(stored, shape.remoteLinks(tree)) : stored);
  }
  const treeFile = JSON.parse(JSON.stringify(
    shape.withRemoteLinks(shape.withRawTaskLists(input.treeFile, lists), null))) as Record<string, unknown>;
  return input.rawOnDisk && isDeepStrictEqual(treeFile, input.rawOnDisk) ? { kind: "unchanged" } : { kind: "write", treeFile };
};

const isRemoteEntry = (entry: unknown): boolean =>
  Boolean(entry) && typeof entry === "object" && isRemoteTaskExecutionEntry(entry as Record<string, unknown>);

/**
 * Whether a save may leave out a stored local entry (D-3, SR-008): it is a link by its exact key set, and its run's own
 * file exists at the standard place, so every fact of the entry is on disk outside the tree file. An existence check by
 * the link's run ID; the own file is not read. Any other entry (a full record, possibly holding nested runs) is kept.
 */
const isLinkWithOwnFile = async (files: () => TaskAgentOwnFiles, entry: unknown): Promise<boolean> => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const record = entry as Record<string, unknown>;
  if (!isTaskExecutionLinkEntry(record)) return false;
  if (typeof record.agentRunId === "string") return files().exists({ agentRunId: record.agentRunId });
  if (typeof record.teamRunId === "string") return files().exists({ teamRunId: record.teamRunId });
  return false;
};

const writeAgentIfChanged = async (
  files: TaskAgentOwnFiles,
  record: Extract<TaskExecution, { agentRunId: string }>,
  coordinatingRun: TaskAgentCoordinatingRun,
): Promise<RunPackageFileWriteResult | null> => {
  const state = await files.readAgent(record.agentRunId);
  const existing = state.kind === "present" ? state.metadata : null;
  const candidate = parseTaskAgentRunMetadata(taskAgentOwnMetadata({
    record, coordinatingRun, memoryDir: files.agentMemoryDir(record.agentRunId),
  }), record.agentRunId);
  return existing && isDeepStrictEqual(candidate, existing) ? null : files.writeAgent(candidate);
};

const writeTeamIfChanged = async (
  files: TaskAgentOwnFiles,
  record: Extract<TaskExecution, { teamRunId: string }>,
  coordinatingRun: TaskAgentCoordinatingRun,
): Promise<RunPackageFileWriteResult | null> => {
  const state = await files.readTeam(record.teamRunId);
  const existing = state.kind === "present" ? state.tree : null;
  const candidate = validateTaskAgentTeamTreePayload(taskAgentTeamOwnTree({ record, coordinatingRun }), record.teamRunId);
  return existing && isDeepStrictEqual(candidate, existing) ? null : files.writeTeam(candidate);
};

const isMissingFile = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** A tree file as parsed JSON, or `null` when it does not exist. */
export const readRawTreeFile = async (filePath: string): Promise<Record<string, unknown> | null> => {
  try { return objectRecord(JSON.parse(await fsPromises.readFile(filePath, "utf8")), filePath); }
  catch (error) { if (isMissingFile(error)) return null; throw error; }
};

export const readRawTreeFileSync = (filePath: string): Record<string, unknown> | null => {
  try { return objectRecord(JSON.parse(fs.readFileSync(filePath, "utf8")), filePath); }
  catch (error) { if (isMissingFile(error)) return null; throw error; }
};

/**
 * Composes a parsed tree file (DS-001): its own parts, its links to runs on another node, and the open delegated runs
 * the Task records name for it, from their own files. A tree without open delegated runs reads no own file.
 */
export const composeTreeFile = async <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  open: readonly OpenDelegatedRun[],
  files: () => TaskAgentOwnFiles,
): Promise<Record<string, unknown>> => {
  const states = open.length === 0 ? [] : await Promise.all(open.map(({ run }) => readOwnFile(files(), run)));
  return attachRemoteLinks(shape, raw, composeTaskExecutions(shape, raw, open, states));
};

export const composeTreeFileSync = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  open: readonly OpenDelegatedRun[],
  files: () => TaskAgentOwnFiles,
): Record<string, unknown> => {
  const states = open.length === 0 ? [] : open.map(({ run }) => readOwnFileSync(files(), run));
  return attachRemoteLinks(shape, raw, composeTaskExecutions(shape, raw, open, states));
};

/**
 * A root run's own parts (design D-11): the tree file with every list of delegated runs empty, local or on another
 * node. It reads nothing else and asks no Task record, so startup admission and the maintenance repair can use it.
 */
export const ownPartsOfTreeFile = <TTree>(shape: CoordinatingTreeShape<TTree>, raw: Record<string, unknown>): Record<string, unknown> =>
  shape.withRemoteLinks(shape.withRawTaskLists(raw, new Map([...shape.rawTaskLists(raw).keys()].map((key) => [key, []]))), null);

/** One delegated run's record for adding it back to a loaded tree (D-4); throws with the reason when it is not available. */
export const readTaskExecutionRecord = async (
  coordinating: TaskAgentCoordinatingRun,
  run: TaskExecutionReference,
  files: TaskAgentOwnFiles,
): Promise<TaskExecution> => {
  const composed = composeTaskExecution(coordinating, run, await readOwnFile(files, run));
  if (composed.kind === "composed") return composed.record;
  throw new Error(`Task agent '${"agentRunId" in run ? run.agentRunId : run.teamRunId}' of ${coordinating.kind} run '${coordinating.runId}' is not available: ${composed.reason}`);
};

/**
 * The tree's write outcome after a split: a task agent's own file that did not commit means the tree was
 * not written either (a link always points to files that exist); an unchanged tree is already durable.
 */
export const commitSplitTree = async <TFile extends string>(
  split: SplitTreeResult,
  file: TFile,
  writeTree: (payload: Record<string, unknown>) => Promise<RunPackageFileWriteResult<TFile>>,
): Promise<RunPackageFileWriteResult<TFile>> => {
  if (split.kind === "unchanged") return { outcome: "committed", file };
  if (split.kind === "write") return writeTree(split.treeFile);
  return {
    outcome: "not_committed",
    file,
    stage: "prepare_directory",
    cause: new Error(`A task agent's own file (${split.result.file}) did not commit: ${split.result.cause.message}`),
  };
};

/**
 * Every message endpoint of a composed tree (L6), the one rule for every store and validator (SR-017 of
 * slice 1): the coordinating run's own parts, its loaded task agents, its remote runs (an Agent link's run;
 * every member of a Team link) and the delegator of its back-link when a peer started it. The back-link is the
 * one the tree stores (a Team run), or the one given for a run that stores it elsewhere (a standalone run's
 * `run_metadata.json`).
 */
export const agentRunIdsOfTree = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  tree: TTree,
  backLink: DelegatedFrom | null = shape.storedBackLink(tree),
): Set<string> => {
  const ids = new Set(shape.ownAgentRunIdsOfRaw(tree as unknown as Record<string, unknown>));
  for (const link of shape.remoteLinks(tree)) {
    if (link.kind === "agent") ids.add(link.agentRunId);
    else link.members.forEach((member) => ids.add(member.agentRunId));
  }
  if (backLink) ids.add(backLink.delegatorAgentRunId);
  for (const tasks of shape.taskLists(tree).values()) {
    for (const task of tasks) {
      if ("agentRunId" in task) ids.add(task.agentRunId);
      else task.members.forEach((member) => ids.add(member.agentRunId));
    }
  }
  return ids;
};

/** The message view rule (`isMessageOfView`) bound to one composed or loaded tree: its own agents and its agents. */
export const messageViewOfTree = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  tree: TTree,
  backLink: DelegatedFrom | null = shape.storedBackLink(tree),
): ((message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">) => boolean) => {
  const own = new Set(shape.ownAgentRunIdsOfRaw(tree as unknown as Record<string, unknown>));
  const agents = agentRunIdsOfTree(shape, tree, backLink);
  return (message) => isMessageOfView(message, own, agents);
};
