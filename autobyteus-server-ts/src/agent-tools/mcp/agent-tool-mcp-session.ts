import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { RuntimeAgentToolExposure } from "../../agent-execution/shared/runtime-agent-tool-exposure.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  PublishedArtifactPublisher,
} from "../../services/published-artifacts/published-artifact-publisher.js";
import type { ConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";
import type { AgentToolMcpToolRouteTable } from "./agent-tool-mcp-tool-route.js";
import type { TeamMemberExecutionIdentity } from "../../agent-team-execution/domain/team-member-execution-identity.js";
import { cloneTeamMemberExecutionIdentity } from "../../agent-team-execution/domain/team-member-execution-identity.js";

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
  teamIdentity?: TeamMemberExecutionIdentity | null;
  displayName?: string | null;
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

export type AgentToolMcpSessionExecutionCapabilities = Readonly<{
  publishedArtifactPublisher: PublishedArtifactPublisher;
}>;

export type AgentToolMcpSession = {
  sessionId: string;
  tokenHash: Buffer;
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  runtimeKind: RuntimeKind | string | null;
  runtimeExposure: RuntimeAgentToolExposure;
  executionContext: AgentToolMcpExecutionContext;
  executionCapabilities: AgentToolMcpSessionExecutionCapabilities | null;
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
  configuredMcpToolSources: ConfiguredMcpAgentToolSource[];
  createdAt: Date;
  revokedAt: Date | null;
  toolExecutionObserver: AgentToolMcpToolExecutionObserver | null;
};

export type AgentToolMcpCreateSessionInput = {
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  runtimeExposure: RuntimeAgentToolExposure;
  executionContext?: AgentToolMcpExecutionContext | null;
  executionCapabilities?: AgentToolMcpSessionExecutionCapabilities | null;
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
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
  teamIdentity: owner.teamIdentity ? cloneTeamMemberExecutionIdentity(owner.teamIdentity) : null,
  displayName: owner.displayName ?? null,
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
