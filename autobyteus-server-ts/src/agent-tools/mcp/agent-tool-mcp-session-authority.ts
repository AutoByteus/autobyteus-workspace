import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionBaseExecutionCapabilities,
  AgentToolMcpSessionOwnerIdentity,
  RedactedAgentToolMcpDescriptor,
} from "./agent-tool-mcp-session.js";

export type AgentToolMcpSessionIssueInput = Readonly<{
  owner: AgentToolMcpSessionOwnerIdentity;
  sender: import("../../agent-communication/domain/agent-run-message-sender.js")
    .AgentRunMessageSenderContext;
  runtimeExposure: import("../../agent-execution/shared/runtime-agent-tool-exposure.js")
    .RuntimeAgentToolExposure;
  executionContext?: import("./agent-tool-mcp-session.js")
    .AgentToolMcpExecutionContext | null;
  runtimeKind?: import("../../runtime-management/runtime-kind-enum.js")
    .RuntimeKind | string | null;
  toolExecutionObserver?: import("./agent-tool-mcp-session.js")
    .AgentToolMcpToolExecutionObserver | null;
}>;

export type IssuedAgentToolMcpSession = Readonly<{
  sessionId: string;
  owner: AgentToolMcpSessionOwnerIdentity;
  descriptor: AgentToolMcpDescriptor;
  redactedDescriptor: RedactedAgentToolMcpDescriptor;
}>;

export interface AgentToolMcpSessionIssuer {
  issueForRun(input: AgentToolMcpSessionIssueInput): IssuedAgentToolMcpSession;
}

export interface AgentToolMcpRunSessionReleaser {
  revokeForRun(runId: string): number;
  revokeForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number;
}

export interface ScopedAgentToolMcpSessionAuthorityAssembly {
  readonly scopeIdentity: string;
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  complete(input: Readonly<{
    executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }>): ScopedAgentToolMcpSessionAuthority;
  abort(): void;
}

export interface ScopedAgentToolMcpSessionAuthority {
  readonly scopeIdentity: string;
  readonly issuer: AgentToolMcpSessionIssuer;
  readonly runSessions: AgentToolMcpRunSessionReleaser;
  assertReady(): void;
  blockNewSessions(): void;
  close(): void;
}

export interface AgentToolMcpSessionAuthorityFactory {
  begin(input: Readonly<{
    scopeIdentity: string;
  }>): ScopedAgentToolMcpSessionAuthorityAssembly;
}
