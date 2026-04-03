export type CodexApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  itemId: string;
  approvalId: string | null;
  responseMode: "decision" | "mcp_server_elicitation";
  toolName: string | null;
};
