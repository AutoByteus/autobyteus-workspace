import { createRootExecutionIdentity, type RootSubjectKind } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskExecutionResource, TaskExecutionResourceFile } from "../domain/task-execution-resources.js";

/**
 * Physical shape of `agent_run_resources.json`. This module is the only one that knows the
 * persisted names: `agentRunResources` (in memory `executionResources`), `agentRun` (in memory
 * `execution`) and `coordinatorAgentRunId` (in memory `teamCoordinatorAgentRunId`).
 */
type StoredHostRoot = { kind: RootSubjectKind; runId: string };
type StoredAgentRun = { kind: "agent"; agentRunId: string } | { kind: "team"; teamRunId: string; coordinatorAgentRunId: string };

const ROLES = new Set(["assigned", "delegated", "broughtIn"]);
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
  const assigned = role === "assigned";
  if (assigned !== text(v!.assignedBy) || (!assigned && v!.assignedBy !== undefined)) invalid(`${at}.assignedBy must exist only for assigned`);
  // Optional (absent before it was recorded); nonblank and only on assigned when present.
  if (v!.recipientAddress !== undefined && (!assigned || !text(v!.recipientAddress) || !v!.recipientAddress.trim())) {
    invalid(`${at}.recipientAddress must be a nonblank address on assigned only`);
  }
  const host = v!.hostRoot as Partial<StoredHostRoot> | null;
  if (!host || !ROOT_KINDS.has(host.kind as string) || !text(host.runId)) invalid(`${at}.hostRoot is invalid`);
  const run = v!.agentRun as Record<string, unknown> | null;
  let execution: TaskExecutionResource["execution"], teamCoordinatorAgentRunId: string | undefined;
  if (run?.kind === "agent" && text(run.agentRunId)) execution = { agentRunId: run.agentRunId };
  else if (run?.kind === "team" && text(run.teamRunId) && text(run.coordinatorAgentRunId)) {
    execution = { teamRunId: run.teamRunId }; teamCoordinatorAgentRunId = run.coordinatorAgentRunId;
  } else return invalid(`${at}.agentRun is invalid`);
  if (!text(v!.linkedAt)) invalid(`${at}.linkedAt is invalid`);
  const start = v!.start;
  if (typeof start !== "string" || !STARTS.has(start)) invalid(`${at}.start is invalid`);
  const error = v!.startError as Record<string, unknown> | undefined;
  if ((start === "failed") !== (error !== undefined)) invalid(`${at}.startError must exist only when start is failed`);
  if (error !== undefined && (!text(error.code) || typeof error.message !== "string")) invalid(`${at}.startError is invalid`);
  if (v!.closedAt !== null && !text(v!.closedAt)) invalid(`${at}.closedAt is invalid`);
  return {
    role: role as TaskExecutionResource["role"],
    ...(assigned ? { assignedBy: v!.assignedBy as string } : {}),
    ...(v!.recipientAddress !== undefined ? { recipientAddress: v!.recipientAddress as string } : {}),
    hostRoot: createRootExecutionIdentity({ rootSubjectKind: host!.kind as RootSubjectKind, rootRunId: host!.runId as string }),
    execution,
    ...(teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId } : {}),
    linkedAt: v!.linkedAt as string,
    start: start as TaskExecutionResource["start"],
    ...(error !== undefined ? { startError: { code: error.code as string, message: error.message as string } } : {}),
    closedAt: v!.closedAt as string | null,
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
    ...(r.role === "assigned" ? { assignedBy: r.assignedBy } : {}),
    ...(r.role === "assigned" && r.recipientAddress ? { recipientAddress: r.recipientAddress } : {}),
    hostRoot: { kind: r.hostRoot.rootSubjectKind, runId: r.hostRoot.rootRunId } satisfies StoredHostRoot,
    agentRun: ("agentRunId" in r.execution ? { kind: "agent", agentRunId: r.execution.agentRunId }
      : { kind: "team", teamRunId: r.execution.teamRunId, coordinatorAgentRunId: r.teamCoordinatorAgentRunId! }) satisfies StoredAgentRun,
    linkedAt: r.linkedAt,
    start: r.start,
    ...(r.startError ? { startError: { code: r.startError.code, message: r.startError.message } } : {}),
    closedAt: r.closedAt,
  })),
});
