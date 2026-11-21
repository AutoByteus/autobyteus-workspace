import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * Neutral contract between collaboration runtime and the business Task side. "Task" means the
 * business Task; `taskId` is opaque to the runtime (equality/dedupe only). The runtime stores no
 * Task facts: it asks this port, which answers from the Task side's loaded agent run resources.
 */
/** Refusal text when someone other than the assigner tries to continue a closed task agent (wording §7.3). */
export const ASSIGNER_ONLY_REACTIVATION_MESSAGE = "This task agent's Task is closed. Only the agent that assigned the Task can continue it: "
  + "set the Task to TODO or IN_PROGRESS, then message the task agent's run id (for a task agent team, its coordinator's run id).";
/**
 * `assigned`: the run was given this Task as its own work by an agent that works on no Task. `subWork`: a run working on
 * this Task handed part of it to this run. `broughtIn`: older records only, never written (contract §2.1).
 */
export type TaskExecutionRole = "assigned" | "subWork" | "broughtIn";
/**
 * The one record of a delegation on this node (contract §2.1, P2, P3): the run the delegator is a part of, one hop, and
 * the delegator. Stored in the delegated run's Task entry; the same on every entry of one run.
 */
export type RunDelegatedFrom = Readonly<{ delegatingRun: RootExecutionIdentity; delegatorAgentRunId: string }>;
/** The Task an agent works on: its run's current Task entry (get_project_task's read scope, CM-6). */
export type TaskExecutionOwner = Readonly<{ taskId: string; execution: TaskExecutionReference; open: boolean }>;
/** A member of a team run on a peer node, as the peer answered at the delegation (only a peer's run). */
export type PeerRunMember = Readonly<{ address: string; agentRunId: string }>;
/**
 * What this node keeps of a run on a peer node (contract §2.1), under the stored names (DESIGN.md rule 10): the node,
 * and for a team its members. Absent `nodeId` means this node.
 */
export type PeerRunFields = Readonly<{ nodeId?: string; members?: readonly PeerRunMember[] }>;
/** The text of a Task with no Project that an assignment creates (description-only delegation by an unowned sender). */
export type AdHocTaskContent = Readonly<{ description: string; referenceFiles: readonly string[] }>;
/** What an assignment joins: an existing Task, or a new Task with no Project created by the link itself. */
export type TaskExecutionAssignmentTarget =
  | Readonly<{ taskId: string; adHocTask?: never }>
  | Readonly<{ adHocTask: AdHocTaskContent; taskId?: never }>;
/**
 * A new delegated run's first entry. `subWork` joins the newest open Task of the delegating run (CM-6). A peer's run
 * carries its node (and members), and its address on every role.
 */
export type NewTaskExecutionLinkInput = Readonly<{
  delegatedFrom: RunDelegatedFrom; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string;
  /** The address the run was delegated to: its name under its delegating run (contract §3.1, on every entry). */
  recipientAddress: string;
}> & PeerRunFields & (
  | (Readonly<{ role: "assigned" }>
    & TaskExecutionAssignmentTarget)
  | Readonly<{ role: "subWork" }>
);

/** A follow-up Task for a run (DS-6): the run, (for a team) its coordinator, the Task and who gives it. */
export type ExistingTaskExecutionAssignInput = Readonly<{
  delegatedFrom: RunDelegatedFrom; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string; taskId: string;
  /** A run no Task names any more (every Task of it was deleted, SR-072 F-24): its own address, from its own file. */
  recipientAddress?: string;
}>;

/**
 * One run's last entry in one Task, as the Task side holds it in memory: what `DelegationIndex` is built from (contract
 * §2.6). A run has at most one open entry per Task, and only its last entry can be open.
 */
export type TaskRunEntry = Readonly<{
  taskId: string;
  role: TaskExecutionRole;
  delegatedFrom: RunDelegatedFrom;
  run: TaskExecutionReference;
  /** The run's agent a message enters it through: the agent run itself, or a team's coordinator. */
  entryAgentRunId: string;
  open: boolean;
  start: "starting" | "started" | "failed";
  linkedAt: string;
  recipientAddress: string;
  nodeId?: string;
  members?: readonly PeerRunMember[];
}>;

/** Told synchronously after each committed change of a Task's entries, inside that Task's ordered change (AR-017). */
export interface TaskEntriesListener { entriesChanged(taskId: string): void }

export interface TaskExecutionResourcePort {
  /**
   * Saved work for a non-owned assignment of a Project Task named by `reference` (the agent's `task_id`: its key
   * or ID): its `taskId` (the only identity used afterwards), its agent-facing `taskReference` (for texts), and
   * its description and files. Unknown, DONE, CANCELLED or unreadable Tasks, and Tasks with no Project, reject.
   */
  resolveAssignment(reference: string): Promise<Readonly<{ taskId: string; taskReference: string;
    /** The Project the Task belongs to (it names the Task in the worker's first message). */ projectId: string;
    /** Its title (routing requests and decision records name the Task by it). */ title: string; description: string;
    /** The Task's comment texts, oldest first (they follow the description in the delegated work). */ comments: string[]; referenceFiles: string[] }>>;
  /**
   * Records the agent run `starting` before any of its resources are acquired; returns the Task it
   * joined. An `adHocTask` assignment first creates that Task (no Project) and returns its new ID.
   */
  linkNewTaskExecution(input: NewTaskExecutionLinkInput): Promise<Readonly<{ taskId: string }>>;
  /** A Task's identity by its ID (a task agent's own Task, when it delegates part of its work; autobyteus-32 D1). */
  describeTask(taskId: string): Promise<DelegatedTaskIdentityView>;
  /**
   * Where a new local copy of this Project's Task runs: its first linked folder, or `null` when it has none (the copy
   * inherits). Rejects `TASK_PROJECT_FOLDER_UNAVAILABLE` when that link is not an existing folder on this node.
   */
  projectFolderForNewDelegatedRun(projectId: string): Promise<string | null>;
  markStarted(execution: TaskExecutionReference): Promise<void>;
  markFailed(execution: TaskExecutionReference, error: Readonly<{ code: string; message: string }>): Promise<void>;
  /** Every readable Task that has entries (a damaged Task is left out; `load()` reported it). Throws before the records are loaded. */
  taskIdsWithEntries(): readonly string[];
  /** The Task's entries, each run's last one, in link order; `[]` when the Task has none, was deleted, or cannot be read. */
  entriesOf(taskId: string): readonly TaskRunEntry[];
  /** The authority for the gate-head re-check (AR-017): the run's current Task entry is open. */
  isOpen(execution: TaskExecutionReference): boolean;
  /** Rejects TASK_AGENT_RESOURCES_UNAVAILABLE while any Task's resource data is unreadable. */
  assertResourceDataReadable(): void;
  /**
   * Read-only, advisory reactivation eligibility of a copy's current assignment: its Task exists and is
   * not DONE or CANCELLED, `requestedBy` is the entry's assigner and the assignment started. When the
   * current Task is closed but an earlier Task of the copy was reopened, the refusal names the current
   * Task and points to `delegate_task` with the copy's ID. Rejects with a coded error (one of
   * TASK_REACTIVATION_REJECTION_CODES).
   */
  assertReopenable(input: TaskExecutionReopenInput): Promise<void>;
  /**
   * Reopens that one entry under the copy's and then the Task's ordering (DONE or CANCELLED is entirely
   * before or after), re-validating every condition. Never writes the Task status. `reopened: false`
   * when the entry was already open.
   */
  reopenAssignment(input: TaskExecutionReopenInput): Promise<TaskExecutionReopenResult>;
  /**
   * Read-only, advisory eligibility of assigning Task `taskId` to an existing copy (run before any
   * runtime step): all Task resource data readable; the Task exists, is unique and is not DONE or
   * CANCELLED; the copy's current entry is an `assigned` entry made by `requestedBy` (it may hold other open
   * Tasks); some entry of the copy ever started; and `taskId` is not its closed current Task. A run no Task names any
   * more is assignable by the delegator its own file names, `ownDelegatorAgentRunId` (SR-072 F-24). Rejects with a
   * coded error.
   */
  assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string; ownDelegatorAgentRunId?: string }>): Promise<void>;
  /** The agent-facing references of the copy's open Tasks other than `exceptTaskId`, oldest first (for the given-Task message). */
  openTaskReferencesOf(execution: TaskExecutionReference, exceptTaskId: string): Promise<string[]>;
  /**
   * The commit: re-checks every eligibility condition under the copy's and then the Task's ordering
   * and appends the copy's new `starting` assignment entry to the Task (earlier entries are kept).
   */
  assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void>;
}

/**
 * What a run and its root ask of the Task records by the run's own identity (autobyteus-461 SR-053): whether its entry
 * is open (the gate head and the work packet's check), and that its own live status may have changed (the Task page
 * re-reads it). Built from the loaded Task records before the run services; the delegation owners take the full port.
 */
export type RunTaskRecords = Readonly<{
  isOpen(execution: TaskExecutionReference): boolean;
  /** The first unreadable Task record's message, `null` when every one could be read (CR-461-051). Synchronous. */
  unreadable(): string | null;
  /** Synchronous; never throws and never reads files. */
  statusChanged(execution: TaskExecutionReference): void;
}>;

/** The run of a Task entry as the run's own identity (an agent run, or a team run). */
export const runIdentityOf = (run: TaskExecutionReference): RootExecutionIdentity => "agentRunId" in run
  ? Object.freeze({ rootSubjectKind: "agent" as const, rootRunId: run.agentRunId })
  : Object.freeze({ rootSubjectKind: "agent_team" as const, rootRunId: run.teamRunId });
/** A run identity as a Task entry's run; `null` for an org run, which is never delegated to. */
export const runReferenceOf = (run: RootExecutionIdentity): TaskExecutionReference | null =>
  run.rootSubjectKind === "agent" ? Object.freeze({ agentRunId: run.rootRunId })
    : run.rootSubjectKind === "agent_team" ? Object.freeze({ teamRunId: run.rootRunId }) : null;

/** A Task's key and Project (both null for a Task with no Project) and its title (else its description's first line). */
export type DelegatedTaskIdentityView = Readonly<{ taskKey: string | null; projectId: string | null; title: string }>;

/** A reactivation request: the assignment's agent run and the run asking for it. */
export type TaskExecutionReopenInput = Readonly<{ execution: TaskExecutionReference; requestedBy: string }>;
export type TaskExecutionReopenResult = Readonly<{ taskId: string; reopened: boolean }>;

/**
 * Task → runtime (DS-5): stop this run of a closed Task, by the run's own identity, in its own root. `null`: the run is
 * not active, so there is nothing to stop.
 */
export type TaskExecutionReleaseRequest = (run: TaskExecutionReference) => Promise<TaskExecutionReleaseResult> | null;
/**
 * Task → runtime (autobyteus-591 DN-1): a run on a peer node whose Task entries changed; its node is told the run's
 * delegation state (it stops a closed run). Never rejects.
 */
export type PeerRunStateNotice = (peerRun: Readonly<{ run: TaskExecutionReference; nodeId: string }>) => Promise<unknown>;
/** The closure stop of a run: `stopped`, or why not. */
export type TaskExecutionReleaseResult = Readonly<{
  execution: TaskExecutionReference; stopped: boolean; error?: Readonly<{ code: string; message: string }>;
}>;
/** A run on a peer node (AR-007): fenced by the closed Task, not stopped; `message` says where it keeps running. */

/** Coded port rejections; implementations throw errors carrying one of these `code`s. */
export const TASK_EXECUTION_RESOURCE_REJECTION_CODES = ["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT", "TASK_AGENT_RESOURCES_UNAVAILABLE", "TASK_AGENT_RESOURCE_OWNED_SENDER", "TASK_PROJECT_FOLDER_UNAVAILABLE"] as const;
export type TaskExecutionResourceRejectionCode = typeof TASK_EXECUTION_RESOURCE_REJECTION_CODES[number];
export const taskExecutionResourceRejectionCode = (error: unknown): TaskExecutionResourceRejectionCode | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return (TASK_EXECUTION_RESOURCE_REJECTION_CODES as readonly unknown[]).includes(code) ? code as TaskExecutionResourceRejectionCode : null;
};
/** Coded reactivation rejections: the port rejections plus a deleted Task and an assignment that never started. */
export const TASK_REACTIVATION_REJECTION_CODES = [...TASK_EXECUTION_RESOURCE_REJECTION_CODES, "TASK_NOT_FOUND", "TASK_REACTIVATION_UNAVAILABLE"] as const;
export type TaskReactivationRejectionCode = typeof TASK_REACTIVATION_REJECTION_CODES[number];
export const taskReactivationRejectionCode = (error: unknown): TaskReactivationRejectionCode | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return (TASK_REACTIVATION_REJECTION_CODES as readonly unknown[]).includes(code) ? code as TaskReactivationRejectionCode : null;
};
