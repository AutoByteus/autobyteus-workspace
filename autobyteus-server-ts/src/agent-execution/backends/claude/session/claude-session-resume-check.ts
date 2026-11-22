import { SavedRuntimeSessionMissingError } from "../../../errors.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import type { ClaudeSessionProcess } from "./claude-session-process.js";

/**
 * The SDK's own reason when the CLI has no conversation to resume (autobyteus-599, PRB-002, PRB-007; Claude Agent SDK 0.3.280,
 * Claude Code 2.1.330): `initializationResult()` rejects with exactly this text for the requested session. Anything else, an
 * auth or network failure included, is not a lost session.
 */
export const isMissingClaudeSession = (error: unknown, sessionId: string): boolean =>
  error instanceof Error && error.message === `Claude Code returned an error result: No conversation found with session ID: ${sessionId}`;

/**
 * A restored Claude session's check (DS-003): the process opens now and the SDK's initialization is awaited, so a lost session
 * is found at activation, not inside the first turn. The CLI's error result and exit come before any turn exists, so they fail
 * none (the turn tracker drops a result without a turn). Any other failure is thrown as it is.
 */
export const verifyClaudeSessionResumable = async (process: ClaudeSessionProcess, sessionId: string): Promise<void> => {
  try {
    await process.ensureInitialized();
  } catch (error) {
    if (isMissingClaudeSession(error, sessionId)) throw new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, sessionId, { cause: error });
    throw error;
  }
};
