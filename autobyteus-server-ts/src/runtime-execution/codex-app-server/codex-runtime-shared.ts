import type { CodexAppServerClient } from "./codex-app-server-client.js";
import type { JsonObject } from "./codex-runtime-json.js";

export type CodexRuntimeEvent = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};

export type CodexApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  itemId: string;
  approvalId: string | null;
};

export type CodexRunSessionState = {
  runId: string;
  client: CodexAppServerClient;
  threadId: string;
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  activeTurnId: string | null;
  approvalRecords: Map<string, CodexApprovalRecord>;
  listeners: Set<(event: CodexRuntimeEvent) => void>;
  unbindHandlers: Array<() => void>;
  teamRunId: string | null;
  memberName: string | null;
  sendMessageToEnabled: boolean;
};

export interface CodexInterAgentEnvelope {
  senderAgentRunId: string;
  senderAgentName?: string | null;
  recipientName: string;
  messageType: string;
  content: string;
  teamRunId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CodexInterAgentRelayRequest {
  senderRunId: string;
  senderTeamRunId: string | null;
  senderMemberName: string | null;
  toolArguments: Record<string, unknown>;
}

export interface CodexInterAgentRelayResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

export type CodexInterAgentRelayHandler = (
  request: CodexInterAgentRelayRequest,
) => Promise<CodexInterAgentRelayResult>;

export type SessionRuntimeOptions = {
  modelIdentifier: string | null;
  workingDirectory: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeMetadata?: Record<string, unknown> | null;
};
