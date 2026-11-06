import type { McpServer, SessionConfigOption } from "@agentclientprotocol/sdk";
import type { AgentToolMcpDescriptor } from "../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { deepSeekHarnessModelEntries } from "../../../runtime-management/deepseek-harness/deepseek-harness-capability.js";
import { DSH_PROVIDER_ROUTE } from "../../../runtime-management/deepseek-harness/deepseek-harness-identity.js";
import type {
  AcpAgentSessionProfile,
  AcpConfigOptionValue,
  AcpConfigSelection,
} from "../acp/acp-agent-session-profile.js";
import { buildDeepSeekHarnessCompactionStatusPayload } from "./deepseek-harness-compaction-status-payload.js";
import { interpretDeepSeekHarnessProviderCall } from "./deepseek-harness-provider-calls.js";
import { projectDeepSeekHarnessToolCall } from "./deepseek-harness-tool-projection.js";

/**
 * The run's model and effort as dsh's standard config options, model first (the efforts belong to the model). A model
 * dsh does not offer is sent as its value on dsh's DeepSeek route, so dsh refuses it with its own message.
 */
export const deepSeekHarnessConfigSelection = (
  selection: AcpConfigSelection,
  configOptions: readonly SessionConfigOption[],
): AcpConfigOptionValue[] => {
  const values: AcpConfigOptionValue[] = [];
  if (selection.model) {
    const offered = deepSeekHarnessModelEntries(configOptions).find((entry) => entry.model === selection.model);
    values.push({ configId: "model", value: offered?.value ?? JSON.stringify([DSH_PROVIDER_ROUTE, selection.model]) });
  }
  if (selection.reasoningEffort) values.push({ configId: "reasoning_effort", value: selection.reasoningEffort });
  return values;
};

/**
 * DeepSeek Harness session concerns: no `_meta` (the instructions reach dsh through its home plugin at every launch),
 * Agent Tools MCP over HTTP (connected during `session/new`, RT-012, so no readiness wait), dsh's tool names mapped
 * to AutoByteus tools, model and effort as config options, and usage, compaction and liveness from the provider
 * relay's reports of dsh's model calls (dsh sends no extension notifications).
 */
export const deepSeekHarnessSessionProfile: AcpAgentSessionProfile = Object.freeze({
  newSessionMeta: () => undefined,

  mcpServers: (descriptor: AgentToolMcpDescriptor): McpServer[] => [
    { type: "http", name: descriptor.name, url: descriptor.serverUrl, headers: [] },
  ],

  mcpReadiness: () => null,

  projectToolCall: projectDeepSeekHarnessToolCall,

  interpretExtNotification: () => [],

  configSelection: deepSeekHarnessConfigSelection,

  interpretProviderCall: interpretDeepSeekHarnessProviderCall,

  buildCompactionStatusPayload: buildDeepSeekHarnessCompactionStatusPayload,
});
