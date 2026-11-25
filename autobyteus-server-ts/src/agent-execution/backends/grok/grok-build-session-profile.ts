import { RequestError, type McpServer } from "@agentclientprotocol/sdk";
import type { AgentToolMcpDescriptor } from "../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type {
  AcpAgentSessionProfile,
  AcpSessionEffect,
  AcpSessionEffectContext,
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
import {
  GROK_QUEUE_CHANGED_METHOD,
  interpretGrokQueueChanged,
  interpretGrokTurnCompleted,
} from "./grok-build-prompt-signals.js";

const GROK_SESSION_NOTIFICATION_METHOD = "_x.ai/session_notification";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Grok Build session concerns: `_meta.rules` carries the composed AutoByteus prompt into
 * Grok's system prompt, `_meta.yoloMode` mirrors auto-execute, Agent Tools MCP attaches over
 * HTTP, and only per-call usage, context compaction, MCP readiness and Grok's prompt signals
 * (the prompt it runs, from `_x.ai/queue/changed`, and its end, `turn_completed`) are read from
 * `_x.ai/*` traffic. The prompt signals let the session show a turn Grok starts itself
 * (a provider-started turn, e.g. after a background command ended; autobyteus-517).
 */
export const grokBuildSessionProfile: AcpAgentSessionProfile = Object.freeze({
  newSessionMeta: (input: Readonly<{ composedPrompt: string; autoExecuteTools: boolean }>) => ({
    rules: input.composedPrompt,
    yoloMode: input.autoExecuteTools,
  }),

  mcpServers: (descriptor: AgentToolMcpDescriptor): McpServer[] => [
    { type: "http", name: descriptor.name, url: descriptor.serverUrl, headers: [] },
  ],

  mcpReadiness: (descriptor: AgentToolMcpDescriptor): AcpMcpReadinessRequirement | null => ({
    serverName: descriptor.name,
    timeoutMs: GROK_MCP_READY_TIMEOUT_MS,
  }),

  projectToolCall: projectGrokToolCall,

  interpretExtNotification: (
    method: string,
    params: Record<string, unknown>,
    context: AcpSessionEffectContext,
  ): AcpSessionEffect[] => {
    if (method === GROK_MCP_SERVER_STATUS_METHOD) {
      const effect = interpretGrokMcpServerStatus(params);
      return effect ? [effect] : [];
    }
    if (method === GROK_QUEUE_CHANGED_METHOD) {
      const effect = interpretGrokQueueChanged(params);
      return effect ? [effect] : [];
    }
    if (method === GROK_SESSION_NOTIFICATION_METHOD && isRecord(params.update)) {
      const completed = interpretGrokTurnCompleted(params.update);
      if (completed) return [completed];
      if (params.update.sessionUpdate === "response_completed") {
        const payload = buildGrokBuildCallUsagePayload(params.update.usage, context);
        return payload ? [{ kind: "usage", payload }] : [];
      }
      const compaction = interpretGrokCompactionUpdate(params.update, params);
      if (compaction) return [compaction];
    }
    // Announcements, settings, queue entries without a running prompt, session bookkeeping, turn summaries:
    // never chat content.
    return [];
  },

  // Model and effort reach Grok as launch arguments.
  configSelection: () => [],

  buildCompactionStatusPayload: buildGrokBuildCompactionStatusPayload,

  // Grok CLI 1.0.92 (PRB-005): `session/resume` of a session it has no file for answers `data.code` `FS_NOT_FOUND`. A present
  // session whose workspace folder was removed resumes normally (PRB-009), so the code alone is exact.
  isMissingSession: (error: unknown, _sessionId: string): boolean =>
    error instanceof RequestError && (error.data as { code?: unknown } | undefined)?.code === "FS_NOT_FOUND",
});
