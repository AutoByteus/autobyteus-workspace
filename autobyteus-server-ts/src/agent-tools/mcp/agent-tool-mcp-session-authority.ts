import type {
  AgentToolMcpDescriptor,
  AgentToolMcpSessionBaseExecutionCapabilities,
  AgentToolMcpSessionOwnerIdentity,
} from "./agent-tool-mcp-session.js";
import type { AgentToolMcpRunSessionId } from "./agent-tool-mcp-run-session-id.js";

export type AgentToolMcpRunSessionActivationInput = Readonly<{
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

export type ActiveAgentToolMcpRunSession = Readonly<{
  kind: "active";
  sessionId: AgentToolMcpRunSessionId;
  owner: AgentToolMcpSessionOwnerIdentity;
  descriptor: AgentToolMcpDescriptor;
}>;

export type AgentToolMcpRunSessionActivationResult =
  | ActiveAgentToolMcpRunSession
  | Readonly<{ kind: "not_exposed" }>;

export interface AgentToolMcpRunSessionActivator {
  activateForRun(
    input: AgentToolMcpRunSessionActivationInput,
  ): AgentToolMcpRunSessionActivationResult;
}

export interface AgentToolMcpRunSessionDeactivator {
  deactivateForRun(runId: string): number;
}

export interface AgentToolMcpRunSessionAuthority
  extends AgentToolMcpRunSessionActivator, AgentToolMcpRunSessionDeactivator {}

export interface ScopedAgentToolMcpSessionAuthorityAssembly {
  readonly scopeIdentity: string;
  readonly runSessions: AgentToolMcpRunSessionDeactivator;
  complete(input: Readonly<{
    executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }>): ScopedAgentToolMcpSessionAuthority;
  abort(): void;
}

export interface ScopedAgentToolMcpSessionAuthority {
  readonly scopeIdentity: string;
  readonly runSessions: AgentToolMcpRunSessionAuthority;
  assertReady(): void;
  blockNewSessions(): void;
  close(): void;
}

export interface AgentToolMcpSessionAuthorityFactory {
  begin(input: Readonly<{
    scopeIdentity: string;
  }>): ScopedAgentToolMcpSessionAuthorityAssembly;
}
