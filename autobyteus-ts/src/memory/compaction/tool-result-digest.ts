export type ToolResultDigestStatus = 'success' | 'error' | 'unknown';

export type ToolResultDigest = {
  traceId: string;
  toolCallId: string | null;
  toolName: string | null;
  status: ToolResultDigestStatus;
  summary: string;
};
