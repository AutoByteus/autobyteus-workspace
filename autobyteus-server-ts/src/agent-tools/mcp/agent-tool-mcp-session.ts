import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { RuntimeAgentToolExposure } from "../../agent-execution/shared/runtime-agent-tool-exposure.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  PublishedArtifactPublisher,
} from "../../services/published-artifacts/published-artifact-publisher.js";
import type { ConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";
import type { AgentToolMcpToolRouteTable } from "./agent-tool-mcp-tool-route.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { cloneCollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCommandCapability } from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import type { AgentToolMcpRunSessionId } from "./agent-tool-mcp-run-session-id.js";
import type { ApplicationAgentToolCapability } from "../../application-agent-tools/services/application-agent-tool-capability.js";

export const AGENT_TOOLS_MCP_SERVER_NAME = "autobyteus_agent_tools";
export const AGENT_TOOLS_MCP_TRANSPORT = "streamable_http";

export type AgentToolMcpTransport = typeof AGENT_TOOLS_MCP_TRANSPORT;

export type AgentToolMcpDescriptor = {
  name: typeof AGENT_TOOLS_MCP_SERVER_NAME;
  transport: AgentToolMcpTransport;
  serverUrl: string;
  enabledTools: string[];
};

export type AgentToolMcpSessionOwnerIdentity = {
  runId: string;
  collaborationIdentity?: CollaborationMemberExecutionIdentity | null;
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

export type AgentToolMcpSessionBaseExecutionCapabilities = Readonly<{
  publishedArtifactPublisher: PublishedArtifactPublisher;
  applicationAgentTools: ApplicationAgentToolCapability | null;
}>;

export type AgentSessionExecutionCapabilities = Readonly<{
  kind: "agent";
  publishedArtifactPublisher: PublishedArtifactPublisher;
  applicationAgentTools: ApplicationAgentToolCapability | null;
}>;

export type CollaborationMemberSessionExecutionCapabilities = Readonly<{
  kind: "collaboration_member";
  publishedArtifactPublisher: PublishedArtifactPublisher;
  applicationAgentTools: ApplicationAgentToolCapability | null;
  taskDelegation: Readonly<{
    identity: CollaborationMemberExecutionIdentity;
    commands: MemberTaskCommandCapability;
  }>;
}>;

export type AgentToolMcpSessionExecutionCapabilities =
  | AgentSessionExecutionCapabilities
  | CollaborationMemberSessionExecutionCapabilities;

export type AgentToolMcpSession = {
  sessionId: AgentToolMcpRunSessionId;
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  runtimeKind: RuntimeKind | string | null;
  runtimeExposure: RuntimeAgentToolExposure;
  executionContext: AgentToolMcpExecutionContext;
  executionCapabilities: AgentToolMcpSessionExecutionCapabilities;
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
  configuredMcpToolSources: ConfiguredMcpAgentToolSource[];
  createdAt: Date;
  toolExecutionObserver: AgentToolMcpToolExecutionObserver | null;
};

export type AgentToolMcpActivateSessionInput = {
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: AgentRunMessageSenderContext;
  runtimeExposure: RuntimeAgentToolExposure;
  executionContext?: AgentToolMcpExecutionContext | null;
  executionCapabilities: AgentToolMcpSessionExecutionCapabilities;
  enabledTools: string[];
  toolRoutes: AgentToolMcpToolRouteTable;
  configuredMcpToolSources?: ConfiguredMcpAgentToolSource[];
  runtimeKind?: RuntimeKind | string | null;
  toolExecutionObserver?: AgentToolMcpToolExecutionObserver | null;
};

export type AgentToolMcpSessionResolveFailureReason = "missing_session";

export type AgentToolMcpSessionResolveResult =
  | { ok: true; session: AgentToolMcpSession }
  | { ok: false; reason: AgentToolMcpSessionResolveFailureReason };

export const cloneAgentToolMcpSessionOwnerIdentity = (
  owner: AgentToolMcpSessionOwnerIdentity,
): AgentToolMcpSessionOwnerIdentity => ({
  runId: owner.runId,
  collaborationIdentity: owner.collaborationIdentity
    ? cloneCollaborationMemberExecutionIdentity(owner.collaborationIdentity)
    : null,
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

export const cloneAgentToolMcpSessionExecutionCapabilities = (
  capabilities: AgentToolMcpSessionExecutionCapabilities,
): AgentToolMcpSessionExecutionCapabilities => {
  if (capabilities.kind === "agent") {
    return Object.freeze({
      kind: "agent",
      publishedArtifactPublisher: capabilities.publishedArtifactPublisher,
      applicationAgentTools: capabilities.applicationAgentTools,
    });
  }
  return Object.freeze({
    kind: "collaboration_member",
    publishedArtifactPublisher: capabilities.publishedArtifactPublisher,
    applicationAgentTools: capabilities.applicationAgentTools,
    taskDelegation: Object.freeze({
      identity: cloneCollaborationMemberExecutionIdentity(capabilities.taskDelegation.identity),
      commands: capabilities.taskDelegation.commands,
    }),
  });
};
