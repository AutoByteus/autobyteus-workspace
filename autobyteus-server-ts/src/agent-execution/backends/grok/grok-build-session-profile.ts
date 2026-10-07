import type { McpServer } from "@agentclientprotocol/sdk";
import type { AgentToolMcpDescriptor } from "../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type {
  AcpAgentSessionProfile,
  AcpExtEffect,
  AcpExtNotificationContext,
  AcpMcpReadinessRequirement,
} from "../acp/acp-agent-session-profile.js";
import { buildGrokBuildCallUsagePayload } from "./grok-build-call-usage.js";
import {
  buildGrokBuildCompactionStatusPayload,
  interpretGrokCompactionUpdate,
} from "./grok-build-compaction-status-payload.js";
import {
  GROK_MCP_READY_TIMEOUT_MS,
  GROK_MCP_SERVER_STATUS_METHOD,
  interpretGrokMcpServerStatus,
} from "./grok-build-mcp-readiness.js";
import { projectGrokToolCall } from "./grok-build-tool-projection.js";

const GROK_SESSION_NOTIFICATION_METHOD = "_x.ai/session_notification";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Grok Build session concerns: `_meta.rules` carries the composed AutoByteus prompt into
 * Grok's system prompt, `_meta.yoloMode` mirrors auto-execute, Agent Tools MCP attaches over
 * HTTP, and only per-call usage, context compaction and MCP readiness are read from
 * `_x.ai/*` traffic.
 */
export const grokBuildSessionProfile: AcpAgentSessionProfile = Object.freeze({
  newSessionMeta: (input: Readonly<{ composedPrompt: string; autoExecuteTools: boolean }>) => ({
    rules: input.composedPrompt,
    yoloMode: input.autoExecuteTools,
  }),

  mcpServers: (descriptor: AgentToolMcpDescriptor | null): McpServer[] => descriptor
    ? [{ type: "http", name: descriptor.name, url: descriptor.serverUrl, headers: [] }]
    : [],

  mcpReadiness: (descriptor: AgentToolMcpDescriptor | null): AcpMcpReadinessRequirement | null => descriptor
    ? { serverName: descriptor.name, timeoutMs: GROK_MCP_READY_TIMEOUT_MS }
    : null,

  projectToolCall: projectGrokToolCall,

  interpretExtNotification: (
    method: string,
    params: Record<string, unknown>,
    context: AcpExtNotificationContext,
  ): AcpExtEffect[] => {
    if (method === GROK_MCP_SERVER_STATUS_METHOD) {
      const effect = interpretGrokMcpServerStatus(params);
      return effect ? [effect] : [];
    }
    if (method === GROK_SESSION_NOTIFICATION_METHOD && isRecord(params.update)) {
      if (params.update.sessionUpdate === "response_completed") {
        const payload = buildGrokBuildCallUsagePayload(params.update.usage, context);
        return payload ? [{ kind: "usage", payload }] : [];
      }
      const compaction = interpretGrokCompactionUpdate(params.update, params);
      if (compaction) return [compaction];
    }
    // Announcements, settings, queue/session bookkeeping, turn totals: never chat content.
    return [];
  },

  buildCompactionStatusPayload: buildGrokBuildCompactionStatusPayload,
});
