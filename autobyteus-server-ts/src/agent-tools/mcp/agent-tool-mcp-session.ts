import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { ConfiguredAgentToolExposure } from "../../agent-execution/shared/configured-agent-tool-exposure.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { ConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";

export const AGENT_TOOLS_MCP_SERVER_NAME = "autobyteus_agent_tools";
export const AGENT_TOOLS_MCP_TRANSPORT = "streamable_http";

export type AgentToolMcpTransport = typeof AGENT_TOOLS_MCP_TRANSPORT;

export type AgentToolMcpDescriptor = {
  name: typeof AGENT_TOOLS_MCP_SERVER_NAME;
  transport: AgentToolMcpTransport;
  serverUrl: string;
  headers: {
    Authorization: string;
  };
  enabledTools: string[];
};

export type RedactedAgentToolMcpDescriptor = {
  name: typeof AGENT_TOOLS_MCP_SERVER_NAME;
  transport: AgentToolMcpTransport;
  serverUrl: string;
  headers: {
    Authorization: "Bearer <redacted>";
  };
  enabledTools: string[];
};

export type AgentToolMcpSessionOwnerIdentity = {
  runId: string;
  teamRunId?: string | null;
  memberRunId?: string | null;
  memberRouteKey?: string | null;
  memberName?: string | null;
};

export type AgentToolMcpToolExecutionEvent = {
  sessionId: string;
  toolName: string;
  senderRunId: string;
};

export type AgentToolMcpToolExecutionObserver = {
  onToolStart?: (event: AgentToolMcpToolExecutionEvent) => void | Promise<void>;
  onToolComplete?: (
    event: AgentToolMcpToolExecutionEvent & { accepted: boolean; code: string | null },
  ) => void | Promise<void>;
  onToolError?: (
    event: AgentToolMcpToolExecutionEvent & { message: string },
  ) => void | Promise<void>;
};

export type AgentToolMcpExecutionContext = {
  workingDirectory?: string | null;
  memoryDir?: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};

export type AgentToolMcpSession = {
  sessionId: string;
  tokenHash: Buffer;
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  runtimeKind: RuntimeKind | string | null;
  configuredExposure: ConfiguredAgentToolExposure;
  executionContext: AgentToolMcpExecutionContext;
  enabledTools: string[];
  configuredMcpToolSources: ConfiguredMcpAgentToolSource[];
  createdAt: Date;
  revokedAt: Date | null;
  toolExecutionObserver: AgentToolMcpToolExecutionObserver | null;
};

export type AgentToolMcpCreateSessionInput = {
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  configuredExposure: ConfiguredAgentToolExposure;
  executionContext?: AgentToolMcpExecutionContext | null;
  enabledTools: string[];
  configuredMcpToolSources?: ConfiguredMcpAgentToolSource[];
  runtimeKind?: RuntimeKind | string | null;
  toolExecutionObserver?: AgentToolMcpToolExecutionObserver | null;
};

export type AgentToolMcpSessionResolveInput = {
  sessionId: string;
  bearerToken: string;
};

export type AgentToolMcpSessionResolveFailureReason =
  | "missing_session"
  | "revoked"
  | "token_mismatch";

export type AgentToolMcpSessionResolveResult =
  | { ok: true; session: AgentToolMcpSession }
  | { ok: false; reason: AgentToolMcpSessionResolveFailureReason };

export const cloneAgentToolMcpSessionOwnerIdentity = (
  owner: AgentToolMcpSessionOwnerIdentity,
): AgentToolMcpSessionOwnerIdentity => ({
  runId: owner.runId,
  teamRunId: owner.teamRunId ?? null,
  memberRunId: owner.memberRunId ?? null,
  memberRouteKey: owner.memberRouteKey ?? null,
  memberName: owner.memberName ?? null,
});

export const cloneAgentToolMcpExecutionContext = (
  context: AgentToolMcpExecutionContext | null | undefined,
): AgentToolMcpExecutionContext => ({
  workingDirectory: context?.workingDirectory ?? null,
  memoryDir: context?.memoryDir ?? null,
  applicationExecutionContext: context?.applicationExecutionContext
    ? structuredClone(context.applicationExecutionContext)
    : null,
});

export const redactAgentToolMcpDescriptor = (
  descriptor: AgentToolMcpDescriptor,
): RedactedAgentToolMcpDescriptor => ({
  name: descriptor.name,
  transport: descriptor.transport,
  serverUrl: redactSessionUrl(descriptor.serverUrl),
  headers: { Authorization: "Bearer <redacted>" },
  enabledTools: [...descriptor.enabledTools],
});

const redactSessionUrl = (serverUrl: string): string => {
  try {
    const parsed = new URL(serverUrl);
    const pathParts = parsed.pathname.split("/");
    const lastSegmentIndex = pathParts.length - 1;
    if (lastSegmentIndex >= 0 && pathParts[lastSegmentIndex]) {
      pathParts[lastSegmentIndex] = "<redacted>";
      parsed.pathname = pathParts.join("/");
    } else {
      parsed.pathname = "/mcp/agent-tools/<redacted>";
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "<redacted>";
  }
};
