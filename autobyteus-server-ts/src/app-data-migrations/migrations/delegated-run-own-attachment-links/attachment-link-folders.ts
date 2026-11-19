import fs from "node:fs/promises";
import path from "node:path";
import type { LinkOwnerFolder } from "./attachment-link-conversion.js";

/**
 * The run folders whose traces may hold a delegated run's host-scoped attachment link (design M-1), by exact place:
 * - `memory/agents/{runId}/` itself: an agent run's own folder. Nothing below it is scanned: a delegated run still
 *   preserved under its delegator (`agents/{run}/collaboration/…`, `20261017_task_agent_own_run_v1` unfinished) is
 *   left for the follow-up, so no link is rewritten to an own link before its file is in its own folder.
 * - a team member's folder: a folder under `memory/agent_teams/` that directly holds a raw trace file, whose parent is
 *   its containing team run (`agent_teams/{root}/{ancestorTeamRunIds…}/{agentRunId}`).
 * Never `memory/imports/` (memory sync's mirror) or `memory/agent_orgs/` (the link names no org member).
 */

const RAW_TRACE_FILE = /^raw_traces_(active|\d{6,})\.jsonl$/;
/** A run folder's own subfolders: never a member folder, never a team folder. */
const RUN_OWN_SUBFOLDERS = new Set(["raw_traces_archive", "context_files", "work_journal"]);

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const entriesOf = async (directory: string) => fs.readdir(directory, { withFileTypes: true }).catch((error: unknown) => {
  if (isMissing(error)) return [];
  throw error;
});

const agentRunFolders = async (memoryDir: string): Promise<LinkOwnerFolder[]> => {
  const root = path.join(memoryDir, "agents");
  return (await entriesOf(root)).filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => Object.freeze({ kind: "agent_run" as const, folder: path.join(root, entry.name), runId: entry.name }));
};

const teamMemberFolders = async (memoryDir: string): Promise<LinkOwnerFolder[]> => {
  const found: LinkOwnerFolder[] = [];
  const walk = async (folder: string, parentName: string | null): Promise<void> => {
    const entries = await entriesOf(folder);
    if (parentName && entries.some((entry) => entry.isFile() && RAW_TRACE_FILE.test(entry.name))) {
      found.push(Object.freeze({ kind: "team_member" as const, folder, teamRunId: parentName, agentRunId: path.basename(folder) }));
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".") && !RUN_OWN_SUBFOLDERS.has(entry.name)) {
        await walk(path.join(folder, entry.name), path.basename(folder));
      }
    }
  };
  for (const entry of await entriesOf(path.join(memoryDir, "agent_teams"))) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) await walk(path.join(memoryDir, "agent_teams", entry.name), null);
  }
  return found;
};

/** Every scanned folder, agent runs first, each in path order. */
export const listAttachmentLinkFolders = async (memoryDir: string): Promise<LinkOwnerFolder[]> => [
  ...(await agentRunFolders(memoryDir)).sort((a, b) => a.folder.localeCompare(b.folder)),
  ...(await teamMemberFolders(memoryDir)).sort((a, b) => a.folder.localeCompare(b.folder)),
];
