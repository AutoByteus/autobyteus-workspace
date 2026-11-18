import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunInputOptions } from "../input/agent-run-input-contract.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { ClosedTaskRefusal } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import type { DelegatedRunRestoreRefusal } from "../../agent-collaboration/execution/task/delegated-run-restorability.js";

/** Input refused where it enters: its Task is closed (DS-15), or the delegated run cannot be restored (CR-461-070). */
export type RunInputRefusal = ClosedTaskRefusal | DelegatedRunRestoreRefusal;
import type { StandaloneAgentRunActivationResult } from "./standalone-agent-run-lifecycle-service.js";

/**
 * The ports through which `agent-execution` reaches the owner of an eligible standalone run
 * (its `StandaloneAgentRunRoot`) without importing it. The process supervisor wires both to the
 * root manager. Every method answers `null` for a run that is not a collaboration-eligible
 * standalone run, so the caller keeps its plain path for helpers and application-owned runs.
 */

export type StandaloneRunAgentTerminationResult = Readonly<{
  /** `terminated`: the live agent stopped and was recorded; `not_active`: nothing was running; `rejected`: it did not stop. */
  outcome: "terminated" | "not_active" | "rejected";
  runtimeKind: RuntimeKind | null;
}>;

export type StandaloneRootStopResult = Readonly<{
  /** A registered root existed and ended (children first). */
  rootEnded: boolean;
  agent: StandaloneRunAgentTerminationResult;
}>;

export type StandaloneRunLifecyclePort = Readonly<{
  /** Create, activate, restore and resolve: the run's root, then its agent made ready with its member context. */
  resolveRootAndEnsureAgent(runId: string): Promise<StandaloneAgentRunActivationResult | null>;
  /** Explicit Stop: the run's own agent. */
  stopRoot(runId: string): Promise<StandaloneRootStopResult | null>;
  /**
   * A closed Task's stop (DS-5, CR-461-001): `stillClosed` is checked where the run's gate closes, so a reopen or a new
   * assignment committed while the stop waited keeps the run (`kept_open`) and nothing is stopped or recorded.
   */
  stopRootForTaskClosure(runId: string, stillClosed: () => boolean): Promise<StandaloneRootStopResult | "kept_open" | null>;
  /** After the run's saved selection changed: a registered (or loading) root follows it; none registered: nothing. */
  refreshInheritedLaunch(runId: string): Promise<void>;
}>;

export type StandaloneRunPostInput = Readonly<{
  runId: string;
  message: AgentInputUserMessage;
  mentions?: readonly CollaboratorMention[];
  /** Passed through to `AgentRun.postUserMessage` unchanged (e.g. the command `lifecycleObserver`). */
  postOptions: AgentRunInputOptions;
  /** Called with the live agent before anything is admitted or posted (e.g. to bind the agent's stream). */
  onActiveRunReady?: (run: AgentRun) => void;
}>;

export type StandaloneRunPostResult =
  | Readonly<{ kind: "posted"; run: AgentRun; post: AgentOperationResult }>
  | Readonly<{ kind: "admission_rejected"; run: AgentRun; admission: Extract<RootCollaboratorAdmissionResult, { admitted: false }> }>
  | Readonly<{ kind: "admission_failed"; run: AgentRun; message: string }>
  /** Its Task is closed (DS-15), or the delegated run cannot be restored (CR-461-070): nothing was restored, admitted or posted. */
  | Readonly<{ kind: "refused"; refusal: RunInputRefusal }>;

export type StandaloneRunCommandPort = Readonly<{
  /**
   * The refusal of input to the run, checked before anything is resolved, restored or shown: the closed-Task fence (DS-15,
   * SR-070), then whether a delegated run can be restored (CR-461-070); `null` when it takes input (or is not eligible).
   */
  inputRefusal(runId: string): Promise<RunInputRefusal | null>;
  /** In the root's gate: the fence again, agent ready, `onActiveRunReady`, mention admission, then the post. */
  postUserMessage(input: StandaloneRunPostInput): Promise<StandaloneRunPostResult | null>;
}>;

/**
 * The standalone runs of a process whose runs are never eligible (an application execution scope: its runs are
 * application-owned, `standalone-agent-run-eligibility.ts`). Every answer is "not eligible" (`null`), so the run is
 * stopped, activated and posted to directly, by the same branch an ineligible run takes in the studio. Passed by that
 * composition (autobyteus-500 FU-018), never decided by a missing collaborator.
 */
export const APPLICATION_HOST_STANDALONE_RUNS: StandaloneRunLifecyclePort & StandaloneRunCommandPort = Object.freeze({
  resolveRootAndEnsureAgent: async () => null,
  stopRoot: async () => null,
  stopRootForTaskClosure: async () => null,
  refreshInheritedLaunch: async () => undefined,
  inputRefusal: async () => null,
  postUserMessage: async () => null,
});
