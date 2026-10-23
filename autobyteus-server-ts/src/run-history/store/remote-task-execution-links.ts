import { remoteTaskExecutionRunId, type RemoteTaskExecution, type TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import {
  isRemoteTaskExecutionEntry,
  objectRecord,
  parseStoredRemoteTaskExecution,
  storedRemoteTaskExecution,
} from "./run-execution-tree-shared-record-schemas.js";
import { ROOT_TASK_LIST_KEY } from "./coordinating-tree-shapes.js";
import type { CoordinatingTreeShape } from "./task-execution-tree-split.js";

/**
 * Remote links in the three coordinating trees (design § Remote Links In Memory). On disk a link to a run on
 * a peer node is a `taskExecutions` entry with `nodeId`, in the topmost coordinating run's own list. In
 * memory it is never among the composed `taskExecutions`: the store loads it into the root's
 * `remoteTaskExecutions`, so every walker of local copies excludes it by construction. It is written once
 * (at the delegation's commit) and kept unchanged by every later save.
 */

const isRemote = (entry: unknown): boolean =>
  Boolean(entry) && typeof entry === "object" && !Array.isArray(entry) && isRemoteTaskExecutionEntry(entry as Record<string, unknown>);

/** The tree file object with every remote entry removed from its task lists (they are loaded separately). */
export const withoutRemoteEntries = <TTree>(shape: CoordinatingTreeShape<TTree>, raw: Record<string, unknown>): Record<string, unknown> => {
  const lists = new Map<string, readonly unknown[]>();
  for (const [key, entries] of shape.rawTaskLists(raw)) lists.set(key, entries.filter((entry) => !isRemote(entry)));
  return shape.withRawTaskLists(raw, lists);
};

/**
 * Loads the remote links of a tree file into `composed` (the tree with composed local lists). A remote entry
 * that cannot be read, sits in a list other than the root's, or whose delegator is not an AgentRun of the
 * composed tree is left out with a logged warning naming the run (DESIGN.md rule 7); the tree otherwise loads.
 */
export const attachRemoteLinks = <TTree>(
  shape: CoordinatingTreeShape<TTree>,
  raw: Record<string, unknown>,
  composed: Record<string, unknown>,
): Record<string, unknown> => {
  const coordinating = shape.coordinatingRunOfRaw(raw);
  const report = (runId: unknown, reason: string): void => {
    console.warn(`Remote run '${String(runId)}' of ${coordinating.kind} run '${coordinating.runId}' is not available: ${reason}`);
  };
  const known = new Set(shape.ownAgentRunIdsOfRaw(raw));
  for (const entries of shape.rawTaskLists(composed).values()) {
    for (const entry of entries as readonly TaskExecution[]) {
      if ("agentRunId" in entry) known.add(entry.agentRunId);
      else entry.members.forEach((member) => known.add(member.agentRunId));
    }
  }
  const links: RemoteTaskExecution[] = [];
  for (const [key, entries] of shape.rawTaskLists(raw)) {
    entries.forEach((entry, index) => {
      if (!isRemote(entry)) return;
      const record = objectRecord(entry, `${key}[${index}]`);
      const storedRunId = record.teamRunId ?? record.agentRunId;
      if (key !== ROOT_TASK_LIST_KEY) { report(storedRunId, "it is not recorded by the topmost coordinating run."); return; }
      let link: RemoteTaskExecution;
      try { link = parseStoredRemoteTaskExecution(record, `${key}[${index}]`); }
      catch (error) { report(storedRunId, error instanceof Error ? error.message : String(error)); return; }
      if (!known.has(link.delegatorAgentRunId)) {
        report(remoteTaskExecutionRunId(link), `its delegator '${link.delegatorAgentRunId}' is not available.`);
        return;
      }
      links.push(link);
    });
  }
  return shape.withRemoteLinks(composed, links);
};

const remoteKey = (nodeId: unknown, runId: unknown): string => `${String(nodeId)}\0${String(runId)}`;

/**
 * The root list for saving: the entries already computed (on-disk entries kept in place, remote ones
 * included unchanged) plus each in-memory remote link not yet on disk, appended.
 */
export const appendRemoteLinks = (output: readonly unknown[], links: readonly RemoteTaskExecution[]): unknown[] => {
  const stored = new Set(output.filter(isRemote).map((entry) => {
    const record = entry as Record<string, unknown>;
    return remoteKey(record.nodeId, record.teamRunId ?? record.agentRunId);
  }));
  return [...output, ...links.filter((link) => !stored.has(remoteKey(link.nodeId, remoteTaskExecutionRunId(link)))).map(storedRemoteTaskExecution)];
};
