import type { RemoteTaskAgentExecution, TaskExecution } from "../domain/run-execution-tree-shared-records.js";
import {
  isRemoteTaskExecutionEntry,
  objectRecord,
  parseRemoteTaskAgentExecution,
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
  const links: RemoteTaskAgentExecution[] = [];
  for (const [key, entries] of shape.rawTaskLists(raw)) {
    entries.forEach((entry, index) => {
      if (!isRemote(entry)) return;
      const record = objectRecord(entry, `${key}[${index}]`);
      if (key !== ROOT_TASK_LIST_KEY) { report(record.agentRunId, "it is not recorded by the topmost coordinating run."); return; }
      let link: RemoteTaskAgentExecution;
      try { link = parseRemoteTaskAgentExecution(record, `${key}[${index}]`); }
      catch (error) { report(record.agentRunId, error instanceof Error ? error.message : String(error)); return; }
      if (!known.has(link.delegatorAgentRunId)) { report(link.agentRunId, `its delegator '${link.delegatorAgentRunId}' is not available.`); return; }
      links.push(link);
    });
  }
  return shape.withRemoteLinks(composed, links);
};

/** The stored form of a remote link: the same exact keys as in memory. */
const remoteLinkEntryOf = (link: RemoteTaskAgentExecution): Record<string, unknown> => ({
  address: link.address,
  agentRunId: link.agentRunId,
  nodeId: link.nodeId,
  delegatorAgentRunId: link.delegatorAgentRunId,
  startedAt: link.startedAt,
});

const remoteKey = (nodeId: unknown, agentRunId: unknown): string => `${String(nodeId)}\0${String(agentRunId)}`;

/**
 * The root list for saving: the entries already computed (on-disk entries kept in place, remote ones
 * included unchanged) plus each in-memory remote link not yet on disk, appended.
 */
export const appendRemoteLinks = (output: readonly unknown[], links: readonly RemoteTaskAgentExecution[]): unknown[] => {
  const stored = new Set(output.filter(isRemote).map((entry) => {
    const record = entry as Record<string, unknown>;
    return remoteKey(record.nodeId, record.agentRunId);
  }));
  return [...output, ...links.filter((link) => !stored.has(remoteKey(link.nodeId, link.agentRunId))).map(remoteLinkEntryOf)];
};
