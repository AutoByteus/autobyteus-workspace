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
