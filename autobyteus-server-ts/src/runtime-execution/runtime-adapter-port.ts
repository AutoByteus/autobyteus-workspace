import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../runtime-management/runtime-kind.js";

export type RuntimeMode = "agent" | "team";

export type ApprovalTargetSource = "agent_name" | "target_member_name" | "agent_id";

export interface RuntimeRunReference {
  runtimeKind: RuntimeKind;
  sessionId?: string | null;
  threadId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RuntimeSessionRecord {
  runId: string;
  runtimeKind: RuntimeKind;
  mode: RuntimeMode;
  runtimeReference: RuntimeRunReference | null;
}

export interface RuntimeCreateAgentRunInput {
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode?: SkillAccessMode | null;
}

export interface RuntimeRestoreAgentRunInput extends RuntimeCreateAgentRunInput {
  runId: string;
  runtimeReference?: RuntimeRunReference | null;
}

export interface RuntimeCreateResult {
  runId: string;
  runtimeReference: RuntimeRunReference | null;
}

export interface RuntimeSendTurnInput {
  runId: string;
  mode: RuntimeMode;
  message: AgentInputUserMessage;
  targetMemberName?: string | null;
}

export interface RuntimeInterAgentEnvelope {
  senderAgentId: string;
  senderAgentName?: string | null;
  recipientName: string;
  messageType: string;
  content: string;
  teamRunId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RuntimeRelayInterAgentMessageInput {
  runId: string;
  envelope: RuntimeInterAgentEnvelope;
}

export interface RuntimeApproveToolInput {
  runId: string;
  mode: RuntimeMode;
  invocationId: string;
  approved: boolean;
  reason?: string | null;
  approvalTarget?: string | null;
  approvalTargetSource?: ApprovalTargetSource | null;
}

export interface RuntimeInterruptRunInput {
  runId: string;
  mode: RuntimeMode;
  turnId?: string | null;
}

export interface RuntimeTerminateRunInput {
  runId: string;
  mode: RuntimeMode;
}

export interface RuntimeCommandResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

export interface RuntimeAdapter {
  readonly runtimeKind: RuntimeKind;
  createAgentRun?: (input: RuntimeCreateAgentRunInput) => Promise<RuntimeCreateResult>;
  restoreAgentRun?: (input: RuntimeRestoreAgentRunInput) => Promise<RuntimeCreateResult>;
  sendTurn: (input: RuntimeSendTurnInput) => Promise<RuntimeCommandResult>;
  relayInterAgentMessage?: (
    input: RuntimeRelayInterAgentMessageInput,
  ) => Promise<RuntimeCommandResult>;
  approveTool: (input: RuntimeApproveToolInput) => Promise<RuntimeCommandResult>;
  interruptRun: (input: RuntimeInterruptRunInput) => Promise<RuntimeCommandResult>;
  terminateRun?: (input: RuntimeTerminateRunInput) => Promise<RuntimeCommandResult>;
}
