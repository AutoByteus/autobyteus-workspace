import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import type { TaskAgentTeamTreeFile } from "../../agent-team-execution/domain/task-agent-team-tree.js";
import type { RemoteTaskExecution, TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "./agent-run-metadata-types.js";
import type { TaskAgentCoordinatingRun, TaskAgentRunMetadata } from "./agent-run-metadata-types.js";
import type { TaskAgentRunMetadataReadState } from "./agent-run-metadata-store.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";
import { isRemoteTaskExecutionEntry, objectRecord, parseTaskExecutionLink } from "./run-execution-tree-shared-record-schemas.js";
import { appendRemoteLinks, attachRemoteLinks, withoutRemoteEntries } from "./remote-task-execution-links.js";
import { ROOT_TASK_LIST_KEY } from "./coordinating-tree-shapes.js";
import type { TaskAgentOwnFiles, TaskAgentTeamTreeReadState } from "./task-agent-own-files.js";
import { parseTaskAgentRunMetadata } from "./task-agent-own-file-schema.js";
import {
  composeTaskAgentRecord,
  composeTaskTeamRecord,
  isTaskExecutionLinkEntry,
  taskAgentOwnMetadata,
  taskAgentTeamOwnTree,
  taskExecutionLinkOf,
  taskExecutionRunId,
} from "./task-agent-own-records.js";
import { validateTaskAgentTeamTreePayload } from "./task-agent-team-tree-schema.js";

/**
 * Compose at load, split at save (design D-1) for the three coordinating tree families. On disk a
 * coordinating tree holds links; each task agent's facts live in its own file. In memory every caller
 * keeps today's composed records.
 *
 * - L4: a record becomes a link only when its own file exists; any other record is written back unchanged.
 * - L5: one task agent never fails a load: one without a readable own file is left out and reported.
 * - L6: only available task agents are loaded; a save is computed against the files on disk and never
 *   removes what it did not load.
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

type OwnFileStates = Readonly<{
  agents: ReadonlyMap<string, TaskAgentRunMetadataReadState>;
  teams: ReadonlyMap<string, TaskAgentTeamTreeReadState>;
}>;

const entryRecord = (entry: unknown, label: string): Record<string, unknown> => objectRecord(entry, label);
const entryRunId = (entry: Record<string, unknown>): string =>
  typeof entry.agentRunId === "string" ? entry.agentRunId : String(entry.teamRunId);

/** Every task agent named by a tree file's lists, by kind, so their own files can be read (sync or async). */
export const listTaskAgentRunIds = <TTree>(shape: CoordinatingTreeShape<TTree>, raw: Record<string, unknown>) => {
  const agents: string[] = [];
  const teams: string[] = [];
  for (const [key, entries] of shape.rawTaskLists(raw)) {
    entries.forEach((entry, index) => {
      const record = entryRecord(entry, `${key}[${index}]`);
      // A remote link has no own file on this node.
      if (isRemoteTaskExecutionEntry(record)) return;
      if (typeof record.agentRunId === "string") agents.push(record.agentRunId);
      else if (typeof record.teamRunId === "string") teams.push(record.teamRunId);
      else throw new Error(`${key}[${index}] names no AgentRun or TeamRun.`);
    });
  }
  return { agents, teams };
};

export const readOwnFileStates = async (files: TaskAgentOwnFiles, ids: ReturnType<typeof listTaskAgentRunIds>): Promise<OwnFileStates> => ({
  agents: new Map(await Promise.all(ids.agents.map(async (id) => [id, await files.readAgent(id)] as const))),
  teams: new Map(await Promise.all(ids.teams.map(async (id) => [id, await files.readTeam(id)] as const))),
});

export const readOwnFileStatesSync = (files: TaskAgentOwnFiles, ids: ReturnType<typeof listTaskAgentRunIds>): OwnFileStates => ({
  agents: new Map(ids.agents.map((id) => [id, files.readAgentSync(id)] as const)),
  teams: new Map(ids.teams.map((id) => [id, files.readTeamSync(id)] as const)),
});

const sameRun = (left: TaskAgentCoordinatingRun, right: TaskAgentCoordinatingRun): boolean =>
  left.kind === right.kind && left.runId === right.runId;

const reportUnavailable = (coordinating: TaskAgentCoordinatingRun, runId: string, reason: string): void => {
  console.warn(`Task agent '${runId}' of ${coordinating.kind} run '${coordinating.runId}' is not available: ${reason}`);
};

/**
 * Composes a tree file's task lists into today's records from the task agents' own files. A link or
 * full record whose own file is missing, unreadable or names another coordinating run is left out
 * (L5, L6); so is one whose delegator is not in the composed tree, so the tree stays consistent. The
 * result is the tree file object with composed lists, for the family's validator.
 */
export const composeTaskExecutions = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  owns: OwnFileStates,
): Record<string, unknown> => {
  const coordinating = shape.coordinatingRunOfRaw(raw);
  const composed = new Map<TaskExecutionListKey, TaskExecution[]>();
  for (const [key, entries] of shape.rawTaskLists(raw)) {
    const records: TaskExecution[] = [];
    entries.forEach((entry, index) => {
      const record = entryRecord(entry, `${key}[${index}]`);
      if (isRemoteTaskExecutionEntry(record)) return;
      const runId = entryRunId(record);
      const link = parseTaskExecutionLink(isTaskExecutionLinkEntry(record) ? record : {
        address: record.address,
        ...("agentRunId" in record ? { agentRunId: record.agentRunId } : { teamRunId: record.teamRunId }),
        ...(record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: record.delegatorAgentRunId }),
        startedAt: record.startedAt,
      }, `${key}[${index}]`);
      const state = "agentRunId" in link ? owns.agents.get(runId) : owns.teams.get(runId);
      if (!state || state.kind === "missing") {
        // A full record whose migration has not finished is silently not loaded (L6); a link without its file is reported.
        if (isTaskExecutionLinkEntry(record)) reportUnavailable(coordinating, runId, "its own file is missing.");
        return;
      }
      if (state.kind === "unreadable") { reportUnavailable(coordinating, runId, state.error.message); return; }
      const own = "metadata" in state ? state.metadata : state.tree;
      if (!sameRun(own.taskAgent.coordinatingRun, coordinating)) {
        reportUnavailable(coordinating, runId, `its own file names ${own.taskAgent.coordinatingRun.kind} run '${own.taskAgent.coordinatingRun.runId}'.`);
        return;
      }
      records.push("agentRunId" in link
        ? composeTaskAgentRecord(link, own as TaskAgentRunMetadata)
        : composeTaskTeamRecord(link, own as TaskAgentTeamTreeFile));
    });
    composed.set(key, records);
  }
  // A task whose delegator is not loaded is left out too, until the tree is consistent.
  for (let changed = true; changed;) {
    changed = false;
    const known = new Set(shape.ownAgentRunIdsOfRaw(raw));
    for (const records of composed.values()) {
      for (const record of records) {
        if ("agentRunId" in record) known.add(record.agentRunId);
        else record.members.forEach((member) => known.add(member.agentRunId));
      }
    }
    for (const [key, records] of composed) {
      const kept = records.filter((record) => record.delegatorAgentRunId === undefined || known.has(record.delegatorAgentRunId));
      if (kept.length === records.length) continue;
      records.filter((record) => !kept.includes(record)).forEach((record) =>
        reportUnavailable(coordinating, taskExecutionRunId(record), `its delegator '${record.delegatorAgentRunId}' is not available.`));
      composed.set(key, kept);
      changed = true;
    }
  }
  return shape.withRawTaskLists(raw, composed);
};

export type SplitTreeResult =
  | Readonly<{ kind: "unchanged" }>
  | Readonly<{ kind: "write"; treeFile: Record<string, unknown> }>
  | Readonly<{ kind: "own_file_failed"; result: Exclude<RunPackageFileWriteResult, { outcome: "committed" }> }>;

/**
 * Splits a composed tree for saving, computed against the files on disk (inside the coordinating run's
 * persistence lock): each loaded task agent's own file is written only when it differs from the file on
 * disk (a new one at L1 before its link exists); the tree keeps links for loaded task agents, every
 * on-disk entry it did not load unchanged and in place, and new ones appended. Returns the tree file to
 * write, or `unchanged` when it equals the file on disk.
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
  for (const [key, records] of memoryLists) {
    const loaded = new Map(records.map((record) => [taskExecutionRunId(record), record]));
    const output: unknown[] = [];
    for (const entry of diskLists.get(key) ?? []) {
      const runId = entryRunId(entryRecord(entry, key));
      const record = loaded.get(runId);
      output.push(record ? taskExecutionLinkOf(record) : entry);
      loaded.delete(runId);
    }
    for (const record of loaded.values()) output.push(taskExecutionLinkOf(record));
    lists.set(key, key === ROOT_TASK_LIST_KEY ? appendRemoteLinks(output, shape.remoteLinks(tree)) : output);
  }
  const treeFile = JSON.parse(JSON.stringify(
    shape.withRemoteLinks(shape.withRawTaskLists(input.treeFile, lists), null))) as Record<string, unknown>;
  return input.rawOnDisk && isDeepStrictEqual(treeFile, input.rawOnDisk) ? { kind: "unchanged" } : { kind: "write", treeFile };
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

/** Composes a parsed tree file from its task agents' own files; a tree without task agents reads no own file. */
export const composeTreeFile = async <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  files: () => TaskAgentOwnFiles,
): Promise<Record<string, unknown>> => {
  const ids = listTaskAgentRunIds(shape, raw);
  const composed = ids.agents.length === 0 && ids.teams.length === 0
    ? withoutRemoteEntries(shape, raw)
    : composeTaskExecutions(shape, raw, await readOwnFileStates(files(), ids));
  return attachRemoteLinks(shape, raw, composed);
};

export const composeTreeFileSync = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  files: () => TaskAgentOwnFiles,
): Record<string, unknown> => {
  const ids = listTaskAgentRunIds(shape, raw);
  const composed = ids.agents.length === 0 && ids.teams.length === 0
    ? withoutRemoteEntries(shape, raw)
    : composeTaskExecutions(shape, raw, readOwnFileStatesSync(files(), ids));
  return attachRemoteLinks(shape, raw, composed);
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
    outcome: "not_renamed",
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
