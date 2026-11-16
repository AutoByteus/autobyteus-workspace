import { isRecord, runIdOfEntry, runRefOf, type RawRecord, type ReleasedDelegationScan } from "./released-delegation-scan.js";

/**
 * Steps 1 … 3 for one Task's `agent_run_resources.json` (design DS-10; contract §13.2 E1 … E4):
 * - every entry gets `delegatedFrom { delegatingRun, delegatorAgentRunId }`, one hop, and loses `hostRoot` and
 *   `assignedBy`. The delegator is the run's own file's, else a tree's record of it, else `assignedBy`; the delegating
 *   run is the stored run the delegator is a part of, else today's `hostRoot` (the only stored value);
 * - role `delegated` becomes `subWork`;
 * - every entry carries `recipientAddress` (E5): an entry without one takes the run's `taskAgent.address`, else a
 *   tree's record of the run's address, else a peer link's address;
 * - a peer's run gains its link's `nodeId`, `members` (a team, by their team-local addresses: the link's prefix, the
 *   delegation address, is dropped, SR-030) and address.
 * Every entry is converted, also a preserved run's (its delegator from its kept record), so a Task file never mixes
 * shapes. An entry already in the target shape is kept. An entry whose delegator is recorded nowhere leaves the whole
 * file unchanged (reported).
 */
export type TaskRecordConversion =
  | Readonly<{ kind: "current" }>
  | Readonly<{ kind: "converted"; payload: RawRecord }>
  | Readonly<{ kind: "unconvertible"; reason: string }>;

const ENTRY_ORDER = ["role", "delegatedFrom", "recipientAddress", "agentRun", "nodeId", "members", "linkedAt", "start", "startError", "closedAt"];
const ordered = (entry: RawRecord): RawRecord => {
  const out: RawRecord = {};
  for (const key of ENTRY_ORDER) if (entry[key] !== undefined) out[key] = entry[key];
  for (const [key, value] of Object.entries(entry)) if (!(key in out)) out[key] = value;
  return out;
};

/** A peer team member's stored address (`/research_team/lead`) in the team's own space (`/lead`). */
const teamLocal = (address: string, mount: string): string => address.startsWith(`${mount}/`) ? address.slice(mount.length) : address;

const isCurrent = (entry: RawRecord): boolean => isRecord(entry.delegatedFrom) && entry.hostRoot === undefined
  && entry.assignedBy === undefined && entry.role !== "delegated" && typeof entry.recipientAddress === "string";

export const convertTaskRecord = (raw: RawRecord, scan: ReleasedDelegationScan): TaskRecordConversion => {
  const entries = raw.agentRunResources;
  if (!Array.isArray(entries)) return { kind: "unconvertible", reason: "agentRunResources is not a list." };
  if (entries.every((entry) => isRecord(entry) && isCurrent(entry))) return { kind: "current" };
  const converted: RawRecord[] = [];
  for (const [index, value] of entries.entries()) {
    if (!isRecord(value)) return { kind: "unconvertible", reason: `entry ${index} is not an object.` };
    if (isCurrent(value)) { converted.push(value); continue; }
    const run = isRecord(value.agentRun) ? value.agentRun : null;
    const runId = run ? runIdOfEntry(run) : null;
    if (!runId) return { kind: "unconvertible", reason: `entry ${index} names no run.` };
    const { hostRoot, assignedBy, ...rest } = value;
    let delegatedFrom = isRecord(value.delegatedFrom) ? value.delegatedFrom : null;
    if (!delegatedFrom) {
      const delegator = scan.delegatorOf(runId) ?? (typeof assignedBy === "string" && assignedBy.trim() ? assignedBy : null);
      if (!delegator) return { kind: "unconvertible", reason: `the delegator of run '${runId}' is recorded nowhere.` };
      const delegatingRun = scan.delegatingRunOf(delegator) ?? runRefOf(hostRoot);
      if (!delegatingRun) return { kind: "unconvertible", reason: `entry ${index} has no hostRoot and the run of '${delegator}' is not stored.` };
      delegatedFrom = { delegatingRun: { kind: delegatingRun.kind, runId: delegatingRun.runId }, delegatorAgentRunId: delegator };
    }
    const peer = scan.peerLinkOf.get(runId);
    const recipientAddress = typeof value.recipientAddress === "string" && value.recipientAddress.trim() ? value.recipientAddress
      : scan.delegationAddressOf(runId) ?? peer?.address ?? null;
    if (!recipientAddress) return { kind: "unconvertible", reason: `the address run '${runId}' was delegated to is recorded nowhere.` };
    converted.push(ordered({
      ...rest,
      role: value.role === "delegated" ? "subWork" : value.role,
      delegatedFrom,
      ...(peer ? {
        nodeId: peer.nodeId,
        ...(peer.members && run && run.kind === "team" ? { members: peer.members.map((m) => ({ address: teamLocal(m.address, peer.address), agentRunId: m.agentRunId })) } : {}),
      } : {}),
      recipientAddress,
    }));
  }
  return { kind: "converted", payload: { ...raw, agentRunResources: converted } };
};
