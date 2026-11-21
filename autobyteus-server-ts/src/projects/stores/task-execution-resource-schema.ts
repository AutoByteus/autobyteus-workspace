import { createRootExecutionIdentity, type RootSubjectKind } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import type { TaskExecutionResource, TaskExecutionResourceFile } from "../domain/task-execution-resources.js";

/**
 * Physical shape of `agent_run_resources.json` (contract §2.1). This module is the only one that knows the persisted
 * names: `agentRunResources` (in memory `executionResources`), `agentRun` (in memory `execution`),
 * `coordinatorAgentRunId` (in memory `teamCoordinatorAgentRunId`). The fields this release adds (`delegatedFrom`,
 * `nodeId`, `members`, and autobyteus-591's `peerNoticeOwed`) have the same names in memory (DESIGN.md rule 10; the older
 * mappings are FU-007). `peerNoticeOwed` is written only when true, on a peer's run only.
 */
type StoredRun = { kind: RootSubjectKind; runId: string };
type StoredDelegatedFrom = { delegatingRun: StoredRun; delegatorAgentRunId: string };
type StoredAgentRun = { kind: "agent"; agentRunId: string } | { kind: "team"; teamRunId: string; coordinatorAgentRunId: string };

const ROLES = new Set(["assigned", "subWork", "broughtIn"]);
const STARTS = new Set(["starting", "started", "failed"]);
const ROOT_KINDS = new Set(["agent", "agent_team", "agent_org"]);
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const invalid = (reason: string): never => { throw new Error(reason); };

const parseEntry = (value: unknown, index: number): TaskExecutionResource => {
  const at = `agentRunResources[${index}]`;
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== "object") invalid(`${at} is not an object`);
  const role = v!.role;
  if (typeof role !== "string" || !ROLES.has(role)) invalid(`${at}.role is invalid`);
  const from = v!.delegatedFrom as Partial<StoredDelegatedFrom> | null;
  const delegating = from?.delegatingRun as Partial<StoredRun> | undefined;
  if (!from || typeof from !== "object" || !delegating || !ROOT_KINDS.has(delegating.kind as string) || !text(delegating.runId)
    || !text(from.delegatorAgentRunId) || Object.keys(from).length !== 2 || Object.keys(delegating).length !== 2) invalid(`${at}.delegatedFrom is invalid`);
  const peer = v!.nodeId !== undefined;
  if (peer && !text(v!.nodeId)) invalid(`${at}.nodeId is invalid`);
  // The run's name under its delegating run, on every entry (contract §3.1; the migration fills older entries, E5).
  if (!text(v!.recipientAddress) || !v!.recipientAddress.trim()) invalid(`${at}.recipientAddress must be a nonblank address`);
  const run = v!.agentRun as Record<string, unknown> | null;
  let execution: TaskExecutionResource["execution"], teamCoordinatorAgentRunId: string | undefined;
  if (run?.kind === "agent" && text(run.agentRunId)) execution = { agentRunId: run.agentRunId };
  else if (run?.kind === "team" && text(run.teamRunId) && text(run.coordinatorAgentRunId)) {
    execution = { teamRunId: run.teamRunId }; teamCoordinatorAgentRunId = run.coordinatorAgentRunId;
  } else return invalid(`${at}.agentRun is invalid`);
  let members: { address: string; agentRunId: string }[] | undefined;
  if (v!.members !== undefined) {
    if (!peer || !teamCoordinatorAgentRunId || !Array.isArray(v!.members)) invalid(`${at}.members must be a list on a peer's team run only`);
    members = (v!.members as unknown[]).map((member, index) => {
      const m = member as Record<string, unknown> | null;
      if (!m || !text(m.address) || !text(m.agentRunId) || Object.keys(m).length !== 2) invalid(`${at}.members[${index}] is invalid`);
      return { address: m!.address as string, agentRunId: m!.agentRunId as string };
    });
  }
  if (!text(v!.linkedAt)) invalid(`${at}.linkedAt is invalid`);
  const start = v!.start;
  if (typeof start !== "string" || !STARTS.has(start)) invalid(`${at}.start is invalid`);
  const error = v!.startError as Record<string, unknown> | undefined;
  if ((start === "failed") !== (error !== undefined)) invalid(`${at}.startError must exist only when start is failed`);
  if (error !== undefined && (!text(error.code) || typeof error.message !== "string")) invalid(`${at}.startError is invalid`);
  if (v!.closedAt !== null && !text(v!.closedAt)) invalid(`${at}.closedAt is invalid`);
  const owed = v!.peerNoticeOwed;
  if (owed !== undefined && (owed !== true || !peer)) invalid(`${at}.peerNoticeOwed must be true on a peer's run only`);
  return {
    role: role as TaskExecutionResource["role"],
    delegatedFrom: {
      delegatingRun: createRootExecutionIdentity({ rootSubjectKind: delegating!.kind as RootSubjectKind, rootRunId: delegating!.runId as string }),
      delegatorAgentRunId: from!.delegatorAgentRunId as string,
    },
    recipientAddress: v!.recipientAddress as string,
    execution,
    ...(teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId } : {}),
    linkedAt: v!.linkedAt as string,
    start: start as TaskExecutionResource["start"],
    ...(error !== undefined ? { startError: { code: error.code as string, message: error.message as string } } : {}),
    closedAt: v!.closedAt as string | null,
    ...(peer ? { nodeId: v!.nodeId as string, ...(members ? { members } : {}), ...(owed ? { peerNoticeOwed: true as const } : {}) } : {}),
  };
};

/** Strict current reader: invalid content is damage (never reset or treated as empty). */
export const parseTaskExecutionResourceFile = (raw: unknown, taskId: string): TaskExecutionResourceFile => {
  const v = raw as { taskId?: unknown; agentRunResources?: unknown } | null;
  if (!v || typeof v !== "object" || Array.isArray(v)) invalid("the file is not a JSON object");
  if (v!.taskId !== taskId) invalid(`taskId does not match its Task folder '${taskId}'`);
  if (!Array.isArray(v!.agentRunResources)) invalid("agentRunResources is not an array");
  const executionResources = (v!.agentRunResources as unknown[]).map(parseEntry);
  // One entry per assignment period: a copy may appear several times, but it has at most one open
  // entry and only its last entry in the file may be open (entries are only ever appended).
  const lastIndex = new Map<string, number>();
  executionResources.forEach((r, index) => lastIndex.set(taskExecutionReferenceKey(r.execution), index));
  executionResources.forEach((r, index) => {
    if (r.closedAt === null && lastIndex.get(taskExecutionReferenceKey(r.execution)) !== index) {
      invalid(`agentRunResources[${index}] is open but is not its agent run's last entry`);
    }
  });
  return { taskId, executionResources };
};

/** Exact writer. */
export const serializeTaskExecutionResourceFile = (file: TaskExecutionResourceFile) => ({
  taskId: file.taskId,
  agentRunResources: file.executionResources.map(r => ({
    role: r.role,
    delegatedFrom: {
      delegatingRun: { kind: r.delegatedFrom.delegatingRun.rootSubjectKind, runId: r.delegatedFrom.delegatingRun.rootRunId },
      delegatorAgentRunId: r.delegatedFrom.delegatorAgentRunId,
    } satisfies StoredDelegatedFrom,
    recipientAddress: r.recipientAddress,
    agentRun: ("agentRunId" in r.execution ? { kind: "agent", agentRunId: r.execution.agentRunId }
      : { kind: "team", teamRunId: r.execution.teamRunId, coordinatorAgentRunId: r.teamCoordinatorAgentRunId! }) satisfies StoredAgentRun,
    ...(r.nodeId !== undefined ? { nodeId: r.nodeId, ...(r.members ? { members: r.members.map((m) => ({ address: m.address, agentRunId: m.agentRunId })) } : {}) } : {}),
    linkedAt: r.linkedAt,
    start: r.start,
    ...(r.startError ? { startError: { code: r.startError.code, message: r.startError.message } } : {}),
    closedAt: r.closedAt,
    ...(r.nodeId !== undefined && r.peerNoticeOwed ? { peerNoticeOwed: true } : {}),
  })),
});
