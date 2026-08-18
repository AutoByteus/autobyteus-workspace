import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type {
  ClaudeSdkClient,
  ClaudeSdkQueryLike,
} from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { ContextFileLocalPathResolver } from "../../../../context-files/services/context-file-local-path-resolver.js";
import type { ClaudeAgentToolsMcpSessionServiceLike } from "../agent-tools-mcp/claude-agent-tools-mcp-session-state.js";
import type { ClaudeProviderSessionLifecycle } from "./claude-provider-session-lifecycle.js";

type ContextFilePathResolverLike = Pick<ContextFileLocalPathResolver, "resolve">;

export type ClaudeSessionDependencies = {
  sessionMessageCache: ClaudeSessionMessageCache;
  sdkClient: ClaudeSdkClient;
  activeQueriesByRunId: Map<string, ClaudeSdkQueryLike>;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
  contextFileLocalPathResolver?: ContextFilePathResolverLike;
  agentToolMcpSessionService?: ClaudeAgentToolsMcpSessionServiceLike;
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
