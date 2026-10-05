import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRun } from "./team-run.js";
import type { TeamAgentPlatformBinding } from "./team-agent-platform-binding.js";

export type TaskExecutionBinding =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; agentRunId: string }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; teamRunId: string; coordinatorAgentRunId: string }>;

export type CommittedTaskExecution = Readonly<{
  releaseWork(assertOpen: () => void): Promise<AgentOperationResult>;
}>;

/** Opaque local preparation. No task lifecycle policy is retained here. */
export interface PreparedTaskExecution {
  readonly binding: TaskExecutionBinding;
  readonly preparedTeamRuns: readonly TeamRun[];
  readonly stagedPlatformBindings: readonly TeamAgentPlatformBinding[];
  sealForCommit(): void;
  commitAfterDurability(): CommittedTaskExecution;
  abort(): Promise<void>;
}

/** Registered before any asynchronous Agent/member acquisition. */
export interface TaskExecutionPreparationOperation {
  prepare(): Promise<PreparedTaskExecution>;
  cancel(): void;
  release(): Promise<AgentOperationResult>;
}

/** Aggregate sequencing; concrete registries retain handles/Team controls before their awaits. */
export function createTaskExecutionPreparation(input: {
  prepare(assertAccepting: () => void): Promise<PreparedTaskExecution>;
  cancel(): void;
  releaseResources(): Promise<AgentOperationResult>;
}): TaskExecutionPreparationOperation {
  let callbacks: typeof input | null = input;
  let cancelled = false;
  let settled = false;
  let released = false;
  let attempt: Promise<PreparedTaskExecution> | null = null;
  let releasing: Promise<AgentOperationResult> | null = null;
  const control: TaskExecutionPreparationOperation = Object.freeze({
    cancel: () => { cancelled = true; callbacks?.cancel(); },
    prepare: () => {
      if (attempt) return attempt;
      if (cancelled) return Promise.reject(new Error("Task execution preparation cancelled."));
      const assertAccepting = () => { if (cancelled) throw new Error("Task execution preparation cancelled."); };
      attempt = callbacks!.prepare(assertAccepting).finally(() => {
        settled = true;
        if (cancelled) void control.release().catch((error) => console.warn("TASK_PRIVATE_RELEASE_FAILED", error));
      });
      return attempt;
    },
    release: () => {
      control.cancel();
      if (released) return Promise.resolve({ accepted: true as const });
      if (releasing) return releasing;
      const release = (async () => {
        const result = await callbacks!.releaseResources();
        if (!result.accepted || (attempt && !settled)) return { accepted: false, code: "RUNTIME_RELEASE_PENDING" };
        released = true;
        callbacks = null; input = null as never; attempt = null;
        return { accepted: true };
      })();
      releasing = release;
      void release.finally(() => { if (releasing === release) releasing = null; }).catch(() => undefined);
      return release;
    },
  });
  return control;
}
