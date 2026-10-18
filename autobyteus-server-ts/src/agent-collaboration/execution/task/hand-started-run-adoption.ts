import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { TaskExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskAgentSection } from "../../../run-history/store/agent-run-metadata-types.js";
import { composeTaskAgentRecord, composeTaskTeamRecord } from "../../../run-history/store/task-agent-own-records.js";
import { TaskAgentOwnFiles } from "../../../run-history/store/task-agent-own-files.js";
import { readRawTreeFile } from "../../../run-history/store/task-execution-tree-split.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { getStandaloneRootTreePath } from "../../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { canonicalizeWorkspaceRootPath } from "../../../run-history/utils/workspace-path-normalizer.js";
import { sameRootExecutionIdentity, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionActivationCommitResult, TaskExecutionTarget } from "./root-task-execution-adapter.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import { ProcessHandStartedRuns, type HandStartedRuns } from "./hand-started-runs.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { TaskExecutionResourcePort } from "./task-execution-resource-port.js";

const refuse = (message: string) => new TaskDelegationError("TASK_COPY_NOT_ASSIGNABLE", message);
const unfinished = (reason: string) => new TaskDelegationError("TASK_ADOPTION_NOT_FINISHED",
  `The run was not taken over yet (${reason}). Its files are unchanged apart from what was already done; call delegate_task again with the same run id and task_id to finish.`);

/** The delegator's root, as adoption needs it (an Agent root; its host is the delegator, DEC-108). */
export type AdoptionDelegatorRoot = Readonly<{
  root: RootExecutionIdentity;
  /** The delegator's workspace (the host run's). */
  workspaceRootPath: string | null;
  /** The address under which the catalog offers this definition to the delegator; `null` when it is not offered. */
  catalogAddressOf(kind: "agent" | "agent_team", definitionId: string): Promise<AgentTeamAddress | null>;
  /** The run is a task agent in the root's current tree (its link exists). */
  containsTaskExecution(execution: TaskExecutionReference): boolean;
  /** Adds the composed record to the tree (the split write writes only its link) and publishes it started. */
  commitAdopted(record: TaskExecution): Promise<TaskExecutionActivationCommitResult>;
}>;

export type AdoptionRequest = Readonly<{ delegatorAgentRunId: string; execution: TaskExecutionReference; taskId: string }>;

/**
 * Adoption of a run the user started (design SR-008, DS-001): the owner of its eligibility, its steps 1–4 and the
 * resumption of a partial adoption, and of the undo of an unfinished one. Steps (1) the Task entry `starting`, (2) the
 * hand-off from the run's own session, (3) its own file gains `taskAgent` (a team: rebased to the catalog address),
 * then the link, (4) its history row leaves. Every step is recognized from the files, so the same delegator's retry
 * continues at the first missing one. Delivery and `started` (steps 5–6) are the caller's existing follow-up path.
 */
export class HandStartedRunAdoption {
  constructor(private readonly deps: Readonly<{
    delegator: AdoptionDelegatorRoot;
    runs: HandStartedRuns;
    ownFiles: TaskAgentOwnFiles;
  }>) {}

  /** The run is one the user started (listed in its history, without a `taskAgent` section). */
  async isHandStarted(execution: TaskExecutionReference): Promise<boolean> {
    return (await this.deps.runs.find(execution)).found;
  }

  /**
   * Eligibility, in order (refusals change nothing), then step 1 (the Task entry `starting`). A partial adoption by
   * this delegator for this Task is recognized first, before any refusal an open entry would trigger, and admitted.
   */
  async admit(request: AdoptionRequest, resources: TaskExecutionResourcePort): Promise<void> {
    const { delegator } = this.deps;
    if (request.delegatorAgentRunId !== delegator.root.rootRunId) {
      throw refuse("Only a standalone agent run can give a Task to a run the user started.");
    }
    if (await this.isInProgress(request, resources)) return;
    const current = resources.currentAssignmentOf(request.execution);
    const found = await this.deps.runs.find(request.execution);
    if (!found.found) throw refuse(found.message);
    const run = found.run;
    const own = delegator.workspaceRootPath === null ? null : canonicalizeWorkspaceRootPath(delegator.workspaceRootPath);
    if (!own || run.workspaces.some((workspace) => workspace === null || canonicalizeWorkspaceRootPath(workspace) !== own)) {
      throw refuse("This run works in another workspace; only runs in your own workspace can be given a Task.");
    }
    if (run.ownTaskExecutions > 0) {
      throw refuse("This run has delegated runs of its own, so it can't be given a Task yet. Delegate the Task to a new task agent with recipient_address.");
    }
    if (run.applicationBound) throw refuse("This run belongs to an application and can't be given a Task.");
    if (run.archived) throw refuse("This run is archived; unarchive it first, then call delegate_task again.");
    const address = await delegator.catalogAddressOf(run.kind, run.definitionId);
    if (!address) throw refuse("This run's agent or team definition is no longer in the catalog, so it can't be given a Task.");
    if (current?.open) throw refuse("This run already works on a Task; it can be given a new Task only after that one is DONE or CANCELLED.");
    if (await this.deps.runs.isBusy(request.execution)) throw refuse("This run is in the middle of a turn; try again when it is idle.");
    await resources.assignAdoptedRun({
      hostRoot: delegator.root, execution: request.execution, taskId: request.taskId, assignedBy: request.delegatorAgentRunId,
      recipientAddress: address, ...(run.kind === "agent_team" ? { teamCoordinatorAgentRunId: run.ingressAgentRunId } : {}),
    });
  }

  /**
   * Steps 2–4 from the first missing one (run on the delegator root's queue). The entry stays `starting`: a failure
   * here refuses with "not finished, retry" and is never recorded as `failed`. Returns the run as a task agent.
   */
  async complete(request: AdoptionRequest): Promise<TaskExecutionTarget> {
    const { delegator, ownFiles, runs } = this.deps;
    const named = await ownFiles.coordinatingRunOf(request.execution);
    if (named && !(named.kind === "agent" && named.runId === delegator.root.rootRunId)) {
      throw unfinished(`its own file names ${named.kind} run '${named.runId}'`);
    }
    if (!named) {
      const found = await runs.find(request.execution);
      if (!found.found) throw unfinished(found.message);
      if (await runs.release(request.execution) === "busy") throw unfinished("it is in the middle of a turn; retry when it is idle");
      const address = await delegator.catalogAddressOf(found.run.kind, found.run.definitionId);
      if (!address) throw unfinished("its definition is no longer in the catalog");
      const section: TaskAgentSection = {
        coordinatingRun: { kind: "agent", runId: delegator.root.rootRunId },
        delegatorAgentRunId: request.delegatorAgentRunId, address, origin: "catalog",
      };
      const written = await ownFiles.adoptOwnFile(request.execution, section);
      if (written.outcome !== "committed") throw unfinished(`its own file was not written: ${written.cause.message}`);
    }
    const record = await this.readBack(request);
    if (!delegator.containsTaskExecution(request.execution)) {
      const committed = await delegator.commitAdopted(record);
      if (!committed.committed) throw unfinished(committed.message);
    }
    if (await runs.isListed(request.execution)) await runs.removeFromHistory(request.execution);
    return Object.freeze({ root: delegator.root, execution: request.execution, ingressAgentRunId: ingressOf(record) });
  }

  /**
   * Undo of an unfinished adoption after its Task was closed or deleted: the own file names this root, the tree has no
   * link and the run is still in its history index (a new copy never is) → the file as it was, and the run admitted
   * again. Otherwise nothing. Run on the root's queue when the root is active.
   */
  async revertUnfinished(execution: TaskExecutionReference): Promise<boolean> {
    return revertUnfinishedAdoption({ root: this.deps.delegator.root, execution, ownFiles: this.deps.ownFiles, runs: this.deps.runs,
      linkPresent: () => this.deps.delegator.containsTaskExecution(execution) });
  }

  /**
   * This delegator's adoption of this run for this Task stopped before it finished (DEC-109): its open, never started
   * entry, and the run not linked yet or still in its history index (a copy never is). After step 4 a stop before the
   * delivery is a linked task agent whose assignment stays `starting`, like a copy's (message its run id).
   */
  async isInProgress(request: AdoptionRequest, resources: TaskExecutionResourcePort): Promise<boolean> {
    const current = resources.currentAssignmentOf(request.execution);
    if (!current?.open || current.taskId !== request.taskId || current.role !== "assigned" || current.started
      || current.assignedBy !== request.delegatorAgentRunId || !sameRootExecutionIdentity(current.hostRoot, this.deps.delegator.root)) return false;
    return !this.deps.delegator.containsTaskExecution(request.execution) || await this.deps.runs.isListed(request.execution);
  }

  /** The composed record, read back through the task-agent reader; its link `startedAt` is the own file's, so nothing is rewritten. */
  private async readBack(request: AdoptionRequest): Promise<TaskExecution> {
    const { ownFiles } = this.deps;
    if ("agentRunId" in request.execution) {
      const state = await ownFiles.readAgent(request.execution.agentRunId);
      if (state.kind !== "present") throw unfinished(state.kind === "unreadable" ? state.error.message : "its own file is missing");
      const own = state.metadata;
      return composeTaskAgentRecord({ address: own.taskAgent.address, agentRunId: own.runId,
        delegatorAgentRunId: request.delegatorAgentRunId, startedAt: own.startedAt }, own);
    }
    const state = await ownFiles.readTeam(request.execution.teamRunId);
    if (state.kind !== "present") throw unfinished(state.kind === "unreadable" ? state.error.message : "its own file is missing");
    const own = state.tree;
    return composeTaskTeamRecord({ address: own.taskAgent.address, teamRunId: own.rootTeam.teamRunId,
      delegatorAgentRunId: request.delegatorAgentRunId, startedAt: own.createdAt }, own);
  }
}

const ingressOf = (record: TaskExecution): string => {
  if ("agentRunId" in record) return record.agentRunId;
  const coordinatorAddress = record.source?.coordinatorAddress;
  const coordinator = record.members.find((member) => member.address === coordinatorAddress);
  if (!coordinator) throw unfinished(`team run '${record.teamRunId}' has no coordinator agent run`);
  return coordinator.agentRunId;
};

/**
 * The undo itself, for an active root (called on its queue with its in-memory tree) and for one that is not active
 * (its tree read from disk). Only an Agent root ever adopts (DEC-108).
 */
export const revertUnfinishedAdoption = async (input: Readonly<{
  root: RootExecutionIdentity;
  execution: TaskExecutionReference;
  ownFiles: TaskAgentOwnFiles;
  runs: HandStartedRuns;
  linkPresent(): boolean | Promise<boolean>;
}>): Promise<boolean> => {
  if (input.root.rootSubjectKind !== "agent") return false;
  const named = await input.ownFiles.coordinatingRunOf(input.execution);
  if (!named || named.kind !== "agent" || named.runId !== input.root.rootRunId) return false;
  if (await input.linkPresent() || !await input.runs.isListed(input.execution)) return false;
  const restored = await input.ownFiles.restoreHandStartedFile(input.execution);
  if (restored.outcome !== "committed") throw new Error(`The run's own file was not restored: ${restored.cause.message}`);
  await input.runs.readmit(input.execution);
  return true;
};

/** The undo for a delegator root that is not active: no adoption step can be in flight, its tree is read from disk. */
export const revertUnfinishedAdoptionOffline = (memoryDir: string, root: RootExecutionIdentity, execution: TaskExecutionReference,
  runs: HandStartedRuns = new ProcessHandStartedRuns(memoryDir)): Promise<boolean> => {
  const runId = "agentRunId" in execution ? execution.agentRunId : execution.teamRunId;
  return revertUnfinishedAdoption({ root, execution, ownFiles: new TaskAgentOwnFiles(memoryDir), runs,
    linkPresent: async () => {
      const raw = await readRawTreeFile(getStandaloneRootTreePath(new AgentMemoryLayout(memoryDir).getAgentRunCollaborationDirPath(root.rootRunId)));
      return Array.isArray(raw?.taskExecutions) && raw.taskExecutions.some((entry) =>
        (entry as Record<string, unknown>).agentRunId === runId || (entry as Record<string, unknown>).teamRunId === runId);
    } });
};
