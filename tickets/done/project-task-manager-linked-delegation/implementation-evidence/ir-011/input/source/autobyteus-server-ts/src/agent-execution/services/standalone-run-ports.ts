import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunInputOptions } from "../input/agent-run-input-contract.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { StandaloneAgentRunActivationResult } from "./standalone-agent-run-lifecycle-service.js";

/**
 * The ports through which `agent-execution` reaches the owner of an eligible standalone run
 * (its `StandaloneAgentRunRoot`) without importing it. The process supervisor wires both to the
 * root manager. Every method answers `null` for a run that is not a collaboration-eligible
 * standalone run, so the caller keeps its plain path for helpers and application-owned runs.
 */

export type StandaloneHostTerminationResult = Readonly<{
  /** `terminated`: the live host stopped and was recorded; `not_active`: nothing was running; `rejected`: it did not stop. */
  outcome: "terminated" | "not_active" | "rejected";
  runtimeKind: RuntimeKind | null;
}>;

export type StandaloneRootStopResult = Readonly<{
  /** A registered root existed and ended (children first). */
  rootEnded: boolean;
  host: StandaloneHostTerminationResult;
}>;

export type StandaloneRunLifecyclePort = Readonly<{
  /** Create, activate, restore and resolve: the run's root, then its host made ready with its member context. */
  resolveRootAndEnsureHost(runId: string): Promise<StandaloneAgentRunActivationResult | null>;
  /** Explicit Stop: children, then the host. */
  stopRoot(runId: string): Promise<StandaloneRootStopResult | null>;
}>;

export type StandaloneRunPostInput = Readonly<{
  runId: string;
  message: AgentInputUserMessage;
  mentions?: readonly CollaboratorMention[];
  /** Passed through to `AgentRun.postUserMessage` unchanged (e.g. the command `lifecycleObserver`). */
  postOptions: AgentRunInputOptions;
  /** Called with the live host before anything is admitted or posted (e.g. to bind the host stream). */
  onActiveRunReady?: (run: AgentRun) => void;
}>;

export type StandaloneRunPostResult =
  | Readonly<{ kind: "posted"; run: AgentRun; post: AgentOperationResult }>
  | Readonly<{ kind: "admission_rejected"; run: AgentRun; admission: Extract<RootCollaboratorAdmissionResult, { admitted: false }> }>
  | Readonly<{ kind: "admission_failed"; run: AgentRun; message: string }>;

export type StandaloneRunCommandPort = Readonly<{
  /** In the root's gate: host ready, `onActiveRunReady`, mention admission, then the post. */
  postUserMessage(input: StandaloneRunPostInput): Promise<StandaloneRunPostResult | null>;
}>;

let processCommandPort: StandaloneRunCommandPort | null = null;

export const bindProcessStandaloneRunCommandPort = (port: StandaloneRunCommandPort): void => {
  if (!port) throw new Error("A process StandaloneRunCommandPort is required.");
  if (processCommandPort) throw new Error("The process StandaloneRunCommandPort is already initialized.");
  processCommandPort = port;
};

export const releaseProcessStandaloneRunCommandPort = (port: StandaloneRunCommandPort): void => {
  if (processCommandPort === port) processCommandPort = null;
};

/** The process port, or null in a process that hosts no eligible standalone runs. */
export const getProcessStandaloneRunCommandPort = (): StandaloneRunCommandPort | null => processCommandPort;
