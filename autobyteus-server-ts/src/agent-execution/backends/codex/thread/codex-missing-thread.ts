import { CodexAppServerRpcError } from "../../../../runtime-management/codex/client/codex-app-server-client.js";

/**
 * Codex's own answer when a `thread/resume` names a thread it has no rollout for (autobyteus-599, PRB-003, Codex app-server
 * 0.171.0): the JSON-RPC error message `no rollout found for thread id <id>`, for exactly the requested thread. Anything else,
 * an auth or network failure included, is not a lost session.
 */
export const isMissingCodexThread = (error: unknown, threadId: string): boolean =>
  error instanceof CodexAppServerRpcError && error.rpcMessage === `no rollout found for thread id ${threadId}`;
