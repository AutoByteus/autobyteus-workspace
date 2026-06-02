import type { JsonObject } from "../codex-app-server-json.js";

export type CodexApprovalResponseMode =
  | "decision"
  | "mcp_server_elicitation"
  | "dynamic_tool_call"
  | "permission_request";

type CodexBaseApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  approvalId: string | null;
  toolName: string | null;
};

export type CodexDecisionApprovalRecord = CodexBaseApprovalRecord & {
  responseMode: "decision";
};

export type CodexMcpServerElicitationApprovalRecord = CodexBaseApprovalRecord & {
  responseMode: "mcp_server_elicitation";
};

export type CodexDynamicToolCallApprovalRecord = Omit<CodexBaseApprovalRecord, "toolName"> & {
  responseMode: "dynamic_tool_call";
  threadId: string;
  turnId: string | null;
  callId: string;
  toolName: string;
  arguments: JsonObject;
};

export type CodexPermissionRequestApprovalRecord = Omit<CodexBaseApprovalRecord, "toolName"> & {
  responseMode: "permission_request";
  threadId: string | null;
  turnId: string | null;
  cwd: string | null;
  reason: string | null;
  permissions: JsonObject;
  toolName: string;
};

export type CodexApprovalRecord =
  | CodexDecisionApprovalRecord
  | CodexMcpServerElicitationApprovalRecord
  | CodexDynamicToolCallApprovalRecord
  | CodexPermissionRequestApprovalRecord;
