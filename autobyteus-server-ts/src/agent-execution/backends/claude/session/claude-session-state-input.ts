import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type {
  ClaudeSdkClient,
  ClaudeSdkQueryLike,
} from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { AgentToolMcpRunSessionActivator } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { ClaudeProviderSessionLifecycle } from "./claude-provider-session-lifecycle.js";
import type { SystemInstructionCaptureService } from "../../../../agent-memory/services/system-instruction-capture-service.js";

export type ClaudeSessionDependencies = {
  sessionMessageCache: ClaudeSessionMessageCache;
  sdkClient: ClaudeSdkClient;
  activeQueriesByRunId: Map<string, ClaudeSdkQueryLike>;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
  agentToolMcpRunSessions: AgentToolMcpRunSessionActivator;
  systemInstructionCaptureService?: SystemInstructionCaptureService;
  isRunSessionActive: () => boolean;
  terminateRunSession: () => Promise<void>;
};

export type ClaudeSessionStateInput = {
  runContext: ClaudeRunContext;
  providerSessionLifecycle: ClaudeProviderSessionLifecycle;
  dependencies: ClaudeSessionDependencies;
  listeners?: Set<(event: ClaudeSessionEvent) => void>;
  activeAbortController?: AbortController | null;
  activeTurnId?: string | null;
};
