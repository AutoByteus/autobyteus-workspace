import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";

export type AgentRunBackendInputCapabilities = Readonly<{
  activeTurnAppend: "supported" | "unsupported";
}>;

export type AgentRunBackendInputDispatch =
  | Readonly<{
      kind: "start_turn";
      message: AgentInputUserMessage;
    }>
  | Readonly<{
      kind: "append_to_active_turn";
      turnId: string;
      message: AgentInputUserMessage;
    }>;

export type AgentRunBackendInputDispatchResult = Readonly<{
  forwarded: boolean;
  code?: string;
  message?: string;
  turnId: string | null;
  platformAgentRunId?: string | null;
  /**
   * Only with `forwarded: false` on an `append_to_active_turn` dispatch, and only when the
   * backend guarantees nothing reached the provider (the turn it targeted is no longer
   * active). AgentRun requeues the input instead of failing it; it then starts the next
   * turn (or appends into a different later turn), never the same turn again.
   */
  undeliveredRetryAsStart?: true;
}>;

export type AgentRunInputRejectionCode =
  | "AGENT_RUN_INPUT_INVALID"
  | "AGENT_RUN_NOT_ACCEPTING_INPUT";

export type AgentRunInputLifecycle =
  | Readonly<{ kind: "admitted" }>
  | Readonly<{
      kind: "forwarded";
      dispatchKind: AgentRunBackendInputDispatch["kind"];
      turnId: string | null;
    }>
  | Readonly<{ kind: "turn_associated"; turnId: string }>
  | Readonly<{ kind: "completed"; turnId: string | null }>
  | Readonly<{ kind: "interrupted"; turnId: string | null }>
  | Readonly<{
      kind: "failed";
      code: string;
      message: string;
      turnId: string | null;
    }>
  | Readonly<{
      kind: "cancelled";
      code: "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD";
    }>;

export type AgentRunInputLifecycleObserver = (fact: AgentRunInputLifecycle) => void;

export type AgentRunInputOptions = Readonly<{
  lifecycleObserver?: AgentRunInputLifecycleObserver;
}>;

export type CommittedAgentRunInput = Readonly<{
  release(): void;
}>;

export type AgentRunInputReservation = Readonly<{
  agentRunId: string;
  commit(): CommittedAgentRunInput;
  cancel(): void;
}>;

export type AgentRunInputReservationResult =
  | Readonly<{ reserved: false; code: AgentRunInputRejectionCode; message: string }>
  | Readonly<{ reserved: true; reservation: AgentRunInputReservation }>;
