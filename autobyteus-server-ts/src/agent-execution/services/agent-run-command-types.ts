import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentStatusPayload } from "../domain/agent-status-payload.js";
import type { CollaboratorMention } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";

export type AgentRunCommandState =
  | "STARTING"
  | "ADMITTED"
  | "FORWARDED"
  | "HELD"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED";

export type AgentRunCommandAckState =
  | "accepted"
  | "duplicate_in_progress"
  | "duplicate_completed"
  | "duplicate_failed"
  | "duplicate_rejected"
  | "duplicate_cancelled"
  | "rejected"
  | "failed";

export type AgentRunCommandErrorCode =
  | "INVALID_COMMAND_ID"
  | "RUN_NOT_FOUND"
  | "ACTIVATION_FAILED"
  | "RUNTIME_REJECTED"
  | "AGENT_RUN_TERMINATED_BEFORE_INPUT_FORWARD"
  | "COLLABORATOR_MENTION_INVALID"
  | "COLLABORATOR_MENTION_UNAVAILABLE"
  | "COLLABORATOR_ADMISSION_FAILED"
  | "COLLABORATOR_ADD_FAILED"
  /** DS-15: the run's Task is closed; only its assigner continues it. */
  | "TASK_AGENT_RESOURCE_CLOSED"
  /** CR-461-051 (autobyteus-469 DEC-010): a delegated run while Task data cannot be read fails closed. */
  | "TASK_AGENT_RESOURCES_UNAVAILABLE"
  /** CR-461-070: a delegated run whose entry agent's saved conversation cannot continue (base's refusal). */
  | "TASK_EXECUTION_CONTEXT_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export type SendMessageCommandAckPayload = {
  command_type: "SEND_MESSAGE";
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state: AgentRunCommandAckState;
  accepted: boolean;
  duplicate: boolean;
  code?: AgentRunCommandErrorCode;
  message?: string;
  /** With `COLLABORATOR_ADD_FAILED`: the collaborator that could not be added (the message is the reason). */
  collaborator_name?: string;
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
  collaboratorName?: string;
  turnId: string | null;
};

export type AgentRunCommandCoordinatorInput = {
  runId: string;
  messageId: string;
  dedupeKey: string;
  message: AgentInputUserMessage;
  summary?: string | null;
  /** Shared definitions the user mentioned with `@`; admitted by the run's Agent root before posting. */
  mentions?: readonly CollaboratorMention[];
  onActiveRunReady?: (run: AgentRun) => void;
};

export type AgentRunCommandCoordinatorResult = {
  ack: SendMessageCommandAckPayload;
  turnId: string | null;
};
