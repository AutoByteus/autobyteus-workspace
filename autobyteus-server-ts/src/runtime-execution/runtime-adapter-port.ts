import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../runtime-management/runtime-kind.js";

export type RuntimeMode = "agent" | "team";
export type TeamRuntimeExecutionMode = "native_team" | "member_runtime";

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
  senderAgentRunId: string;
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

export interface RuntimeInterAgentRelayRequest {
  senderRunId: string;
  senderTeamRunId: string | null;
  senderMemberName: string | null;
  senderTurnId?: string | null;
  toolArguments: Record<string, unknown>;
}

export interface RuntimeInterAgentRelayResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

export type RuntimeInterAgentRelayHandler = (
  request: RuntimeInterAgentRelayRequest,
) => Promise<RuntimeInterAgentRelayResult>;

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
  runtimeReference?: RuntimeRunReference | null;
  turnId?: string | null;
}

export interface RuntimeReferenceHint {
  sessionId?: string | null;
  threadId?: string | null;
}

export interface RuntimeEventInterpretation {
  normalizedMethod?: string | null;
  statusHint?: "ACTIVE" | "IDLE" | "ERROR" | null;
  runtimeReferenceHint?: RuntimeReferenceHint | null;
}

export type RuntimeEventUnsubscribe = () => void;

export type RuntimeEventListener = (event: unknown) => void;

export interface RuntimeAdapter {
  readonly runtimeKind: RuntimeKind;
  readonly teamExecutionMode?: TeamRuntimeExecutionMode;
  createAgentRun?: (input: RuntimeCreateAgentRunInput) => Promise<RuntimeCreateResult>;
  restoreAgentRun?: (input: RuntimeRestoreAgentRunInput) => Promise<RuntimeCreateResult>;
  getRunRuntimeReference?: (runId: string) => RuntimeRunReference | null;
  getRunStatus?: (runId: string) => string | null;
  isRunActive?: (runId: string) => boolean;
  subscribeToRunEvents?: (
    runId: string,
    onEvent: RuntimeEventListener,
  ) => RuntimeEventUnsubscribe;
  interpretRuntimeEvent?: (event: unknown) => RuntimeEventInterpretation | null;
  sendTurn: (input: RuntimeSendTurnInput) => Promise<RuntimeCommandResult>;
  relayInterAgentMessage?: (
    input: RuntimeRelayInterAgentMessageInput,
  ) => Promise<RuntimeCommandResult>;
  bindInterAgentRelayHandler?: (handler: RuntimeInterAgentRelayHandler) => RuntimeEventUnsubscribe;
  approveTool: (input: RuntimeApproveToolInput) => Promise<RuntimeCommandResult>;
  interruptRun: (input: RuntimeInterruptRunInput) => Promise<RuntimeCommandResult>;
  terminateRun?: (input: RuntimeTerminateRunInput) => Promise<RuntimeCommandResult>;
}
