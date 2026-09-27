import type { AcpExtEffect, AcpMcpServerStatus } from "../acp/acp-agent-session-profile.js";

/** Grok reports per-server MCP readiness only through this extension notification. */
export const GROK_MCP_SERVER_STATUS_METHOD = "_x.ai/mcp/server_status";
export const GROK_MCP_READY_TIMEOUT_MS = 15_000;

const toStatus = (value: unknown): AcpMcpServerStatus => {
  if (value === "ready") return "ready";
  if (value === "unavailable" || value === "failed" || value === "error" || value === "disabled") return "unavailable";
  return "pending";
};

/** `{name, status, reason}` of `_x.ai/mcp/server_status` as a typed readiness effect. */
export const interpretGrokMcpServerStatus = (params: Record<string, unknown>): AcpExtEffect | null => {
  const server = typeof params.name === "string" && params.name ? params.name : null;
  if (!server) return null;
  return {
    kind: "mcp_status",
    server,
    status: toStatus(params.status),
    detail: typeof params.reason === "string" ? params.reason : null,
  };
};
