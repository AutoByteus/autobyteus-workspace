import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentStatusPayload } from "../domain/agent-status-payload.js";

export type AgentRunCommandState =
  | "STARTING"
  | "FORWARDED"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export type AgentRunCommandAckState =
  | "accepted"
  | "duplicate_in_progress"
  | "duplicate_completed"
  | "duplicate_failed"
  | "duplicate_rejected"
  | "rejected"
  | "failed";

export type AgentRunCommandErrorCode =
  | "RUN_COMMAND_IN_PROGRESS"
  | "INVALID_COMMAND_ID"
  | "RUN_NOT_FOUND"
  | "ACTIVATION_FAILED"
  | "RUNTIME_REJECTED"
  | "UNKNOWN_ERROR";

export type AgentCommandAckPayload = {
  command_type: "SEND_MESSAGE";
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state: AgentRunCommandAckState;
  accepted: boolean;
  duplicate: boolean;
  code?: AgentRunCommandErrorCode;
  message?: string;
  status?: AgentStatusPayload;
};

export type AgentRunCommandRecord = {
  runId: string;
  messageId: string;
  dedupeKey: string;
  state: AgentRunCommandState;
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
  code?: AgentRunCommandErrorCode;
  message?: string;
  turnId?: string | null;
};

export type AgentRunCommandCoordinatorInput = {
  runId: string;
  messageId: string;
  dedupeKey: string;
  message: AgentInputUserMessage;
  summary?: string | null;
  onActiveRunReady?: (run: AgentRun) => void;
};

export type AgentRunCommandCoordinatorResult = {
  ack: AgentCommandAckPayload;
  turnId: string | null;
};
