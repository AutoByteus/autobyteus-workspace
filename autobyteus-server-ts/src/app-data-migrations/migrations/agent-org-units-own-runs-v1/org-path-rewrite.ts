import fs from "node:fs/promises";
import path from "node:path";
import {
  listContextFileRecordSources, transformContextFileRecordLocators, type ContextFileRecordSource,
} from "../../frozen/server/context-files/services/context-file-record-locators.js";
import { isReleasedTeamNode, type ReleasedOrgTreeV1 } from "./released-org-tree-v1.js";
import { AGENT_LOG, exists, memoryLayout, writeFileAtomic } from "./org-unit-targets.js";

/**
 * The typed path rewrite of the conversion (org-teams-follow-definition SR-017, SR-018; storage contract §1, §7, §9),
 * frozen with this migration. A unit's folder moves from `<memoryDir>/agent_orgs/<orgRunId>/<runId>/` to
 * `<memoryDir>/agent_teams/<runId>/` (a Team unit) or `<memoryDir>/agents/<runId>/` (an agent unit). Stored absolute paths
 * into a moved folder (a file another node sent, autobyteus-587; a member's own file it named) follow it, in app-owned
 * typed path fields only, as the released context-file locator migrations decided ("Only app-owned raw attachment and
 * formal sidecar fields, never prose or provider history"):
 * - message log lines' `referenceFiles` (every run's log: active and sealed files; the released JSON logs too);
 * - the released Task delegation records' `referenceFiles` and `updates[].referenceFiles`;
 * - ad-hoc Tasks' `referenceFiles` (and a comment's `referenceFiles`, when one has them);
 * - raw traces of every agent folder (active, rotated and archived): `media.images/audio/video`, `file_attachments[].uri`.
 *
 * Not rewritten: trace prose (a received message's "Reference files:" block included), work journals, provider sessions,
 * and the Org's own released log (inert residue, never visited). No stored record keeps a reference ID or a path hash:
 * the Org route and the Team projection compute them from the path when read (`agent-org-reference-content-service.ts`
 * `referenceId`, `buildTeamCommunicationReferenceId`), so nothing else names a moved path.
 *
 * Idempotent by structure: a rewritten file names no old prefix, and a file that names no moved folder is not parsed (byte
 * pre-check). The pre-check looks for each move's resolved old folder exactly, both as stored raw and JSON-encoded (every
 * candidate is JSON or JSON Lines, where a Windows path's separators are escaped: `C:\\…\\agent_orgs\\<org>\\…`). The
 * design's `agent_orgs/<orgRunId>/` is POSIX shorthand for the same intent (CRR-009 CR-008: on Windows that literal never
 * matches). Paths are compared with the platform's own `path` (`path.resolve`, `path.sep`). Changed files are written whole (temporary sibling, then a rename);
 * unchanged bytes of unchanged lines are kept (the frozen visitor). A sealed file is changed at most once, as the
 * precedent states (DEC-008 there).
 */
type Json = Record<string, unknown>;

/** One moved unit folder: the exact old prefix and its new place, both resolved. */
export type FolderMove = Readonly<{ orgRunId: string; from: string; to: string }>;

const moveOf = (memoryDir: string, orgRunId: string, kind: "agent" | "agent_team", runId: string): FolderMove => {
  const layout = memoryLayout(path.resolve(memoryDir));
  return Object.freeze({ orgRunId, from: path.join(layout.orgDir(orgRunId), runId), to: kind === "agent_team" ? layout.teamDir(runId) : layout.agentDir(runId) });
};

/**
 * SR-018: an unconverted Org's moves, from its released tree (not from what this attempt did): every unit whose rename is
 * committed (its new folder present, its old one gone), so no path is pointed at a folder that does not exist yet.
 */
export const committedMovesOf = async (memoryDir: string, tree: ReleasedOrgTreeV1): Promise<FolderMove[]> => {
  const moves: FolderMove[] = [];
  for (const member of tree.rootOrg.members) {
    const move = isReleasedTeamNode(member)
      ? moveOf(memoryDir, tree.rootOrg.orgRunId, "agent_team", member.teamRunId)
      : moveOf(memoryDir, tree.rootOrg.orgRunId, "agent", member.agentRunId);
    if (await exists(move.to) && !await exists(move.from)) moves.push(move);
  }
  return moves;
};

/** SR-018: a converted Org's moves, from its container file (its units and former units), for a writer's follow-up. */
export const containerMovesOf = (memoryDir: string, container: Json): FolderMove[] => {
  const root = container.rootOrg as Json | undefined;
  const orgRunId = typeof root?.orgRunId === "string" ? root.orgRunId : null;
  if (!orgRunId) return [];
  return [...((root!.units as Json[] | undefined) ?? []), ...((root!.formerUnits as Json[] | undefined) ?? [])]
    .filter((unit) => typeof unit.runId === "string" && (unit.kind === "agent" || unit.kind === "agent_team"))
    .map((unit) => moveOf(memoryDir, orgRunId, unit.kind as "agent" | "agent_team", String(unit.runId)));
};

/**
 * One stored path after the moves: an absolute path under a moved folder's old prefix (compared after `path.resolve`)
 * keeps its relative remainder under the new place; any other value is returned as it was, byte for byte.
 */
export const movedPath = (value: string, moves: readonly FolderMove[], paths: PathSemantics = path): string => {
  if (!paths.isAbsolute(value)) return value;
  const resolved = paths.resolve(value);
  for (const move of moves) {
    if (resolved === move.from) return move.to;
    if (resolved.startsWith(`${move.from}${paths.sep}`)) return `${move.to}${resolved.slice(move.from.length)}`;
  }
  return value;
};

/** The platform's path rules (`node:path`); a test passes `path.win32` to check the Windows shapes on any host. */
export type PathSemantics = Pick<typeof path, "isAbsolute" | "resolve" | "sep">;

/**
 * The byte pre-check's needles (CR-008): each move's resolved old folder, as stored raw and as JSON encodes it (a Windows
 * path's backslashes escaped). A file holding none of them names no moved path and is not parsed.
 */
export const moveNeedles = (moves: readonly FolderMove[]): ReadonlyArray<Readonly<{ orgRunId: string; bytes: readonly Buffer[] }>> => {
  const byOrg = new Map<string, Set<string>>();
  for (const move of moves) {
    const set = byOrg.get(move.orgRunId) ?? new Set<string>();
    set.add(move.from);
    set.add(JSON.stringify(move.from).slice(1, -1));
    byOrg.set(move.orgRunId, set);
  }
  return [...byOrg].map(([orgRunId, texts]) => Object.freeze({ orgRunId, bytes: [...texts].map((text) => Buffer.from(text)) }));
};

type Candidate = Readonly<{ filePath: string; read: "visitor"; source: ContextFileRecordSource } | { filePath: string; read: "ad_hoc_task" }>;

const subfolders = async (dir: string): Promise<string[]> => (await fs.readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return [];
  throw error;
})).filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => path.join(dir, entry.name)).sort();

const AGENT_LOG_FILE = new RegExp(`^${AGENT_LOG}_(active|\\d{6})\\.jsonl$`);

/**
 * Every candidate file on the node: each run folder's logs and released sidecars (`agents/*`, `agent_teams/*`), each
 * agent folder's traces (`agents/*`, a Team run's member folders `agent_teams/*\/*`), each ad-hoc Task. The Org folders
 * (`agent_orgs/*`) hold only released residue and are not visited.
 */
const candidateFiles = async (appDataDir: string, memoryDir: string): Promise<Candidate[]> => {
  const agentRuns = await subfolders(path.join(memoryDir, "agents"));
  const teamRuns = await subfolders(path.join(memoryDir, "agent_teams"));
  const memberFolders = (await Promise.all(teamRuns.map(subfolders))).flat();
  const sources = await listContextFileRecordSources({ rootDirectories: [...agentRuns, ...teamRuns], agentDirectories: [...agentRuns, ...memberFolders] });
  // An agent run's own log (`communication_messages_*`): the released visitor names only Team and Org logs.
  for (const dir of agentRuns) {
    for (const name of (await fs.readdir(dir).catch(() => [] as string[])).filter((entry) => AGENT_LOG_FILE.test(entry)).sort()) {
      sources.push({ kind: "message-lines", filePath: path.join(dir, name) });
    }
  }
  const tasks = (await subfolders(path.join(appDataDir, "ad-hoc-tasks"))).map((dir) => ({ filePath: path.join(dir, "task.json"), read: "ad_hoc_task" as const }));
  return [...sources.map((source) => ({ filePath: source.filePath, read: "visitor" as const, source })), ...tasks];
};

/** A trace file's complete lines and its unterminated tail (an append that never completed), kept as it is. */
const splitTail = (text: string): [string, string] => {
  const end = text.lastIndexOf("\n");
  return end === text.length - 1 ? [text, ""] : [text.slice(0, end + 1), text.slice(end + 1)];
};

const movedList = (value: unknown, moves: readonly FolderMove[], paths: PathSemantics): { value: unknown; changed: boolean } => {
  if (!Array.isArray(value)) return { value, changed: false };
  const next = value.map((entry) => typeof entry === "string" ? movedPath(entry, moves, paths) : entry);
  return { value: next, changed: next.some((entry, index) => entry !== value[index]) };
};

/** An ad-hoc `task.json`: its `referenceFiles`, and any comment's `referenceFiles`; written in its store's shape when changed. */
const rewriteAdHocTask = (text: string, moves: readonly FolderMove[], paths: PathSemantics): string => {
  const task = JSON.parse(text) as Json;
  let changed = false;
  const files = movedList(task.referenceFiles, moves, paths);
  if (files.changed) { task.referenceFiles = files.value; changed = true; }
  for (const comment of Array.isArray(task.comments) ? task.comments as Json[] : []) {
    const commentFiles = comment && typeof comment === "object" ? movedList(comment.referenceFiles, moves, paths) : { value: null, changed: false };
    if (commentFiles.changed) { comment.referenceFiles = commentFiles.value; changed = true; }
  }
  return changed ? `${JSON.stringify(task, null, 2)}\n` : text;
};

const rewritten = async (candidate: Candidate, text: string, moves: readonly FolderMove[], paths: PathSemantics): Promise<string> => {
  if (candidate.read === "ad_hoc_task") return rewriteAdHocTask(text, moves, paths);
  const transform = async (locator: string) => movedPath(locator, moves, paths);
  if (candidate.source.kind !== "trace") return transformContextFileRecordLocators(candidate.source, text, transform);
  const [complete, tail] = splitTail(text);
  return `${await transformContextFileRecordLocators(candidate.source, complete, transform)}${tail}`;
};

export type FolderMovePassResult = Readonly<{
  /** Each Org whose part of the pass failed, with the reason (a file naming it could not be read or rewritten). */
  failed: ReadonlyMap<string, string>;
  filesVisited: number;
  filesParsed: number;
  filesRewritten: number;
}>;

/**
 * SR-018 step 3: one pass over every candidate file on the node with the union of every Org's moves. A file that fails is
 * a failure of each Org whose old prefix it names (its container file is then not written; the next attempt repeats the
 * pass); any other Org is not held back by it.
 */
export const rewriteMovedFolderPaths = async (input: Readonly<{ appDataDir: string; memoryDir: string; moves: readonly FolderMove[];
  /** Tests only: the stored paths' platform rules (the files are still read with this host's). */
  paths?: PathSemantics }>): Promise<FolderMovePassResult> => {
  const failed = new Map<string, string>();
  if (!input.moves.length) return { failed, filesVisited: 0, filesParsed: 0, filesRewritten: 0 };
  const paths = input.paths ?? path;
  const needles = moveNeedles(input.moves);
  let filesVisited = 0, filesParsed = 0, filesRewritten = 0;
  let candidates: Candidate[];
  try { candidates = await candidateFiles(input.appDataDir, input.memoryDir); }
  catch (error) {
    // The candidates cannot be listed: no Org's pass is complete.
    for (const needle of needles) failed.set(needle.orgRunId, `the node's files could not be listed: ${error instanceof Error ? error.message : String(error)}`);
    return { failed, filesVisited, filesParsed, filesRewritten };
  }
  for (const candidate of candidates) {
    let bytes: Buffer | null;
    try { bytes = await fs.readFile(candidate.filePath).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; }); }
    catch (error) {
      // Unreadable: whether it names an Org's old prefix is unknown, so no Org's pass is complete.
      for (const needle of needles) if (!failed.has(needle.orgRunId)) failed.set(needle.orgRunId, `'${candidate.filePath}' could not be read: ${(error as Error).message}`);
      continue;
    }
    if (!bytes) continue;
    filesVisited += 1;
    const named = needles.filter((needle) => needle.bytes.some((candidateBytes) => bytes!.includes(candidateBytes))).map((needle) => needle.orgRunId);
    if (!named.length) continue;
    filesParsed += 1;
    try {
      const text = bytes.toString("utf8");
      const next = await rewritten(candidate, text, input.moves, paths);
      if (next !== text) { await writeFileAtomic(candidate.filePath, next); filesRewritten += 1; }
    } catch (error) {
      const reason = `'${candidate.filePath}' could not be rewritten: ${error instanceof Error ? error.message : String(error)}`;
      for (const orgRunId of named) if (!failed.has(orgRunId)) failed.set(orgRunId, reason);
    }
  }
  return { failed, filesVisited, filesParsed, filesRewritten };
};
