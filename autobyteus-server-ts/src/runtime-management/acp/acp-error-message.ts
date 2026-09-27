import { RequestError } from "@agentclientprotocol/sdk";

/** Error codes the shared ACP layer produces itself; their messages carry no provider output. */
const SAFE_ACP_ERROR_PATTERN = /^(ACP_[A-Z_]+|PLATFORM_AGENT_RUN_BINDING_INVALID):/;

/** Agent-reported JSON-RPC error text: the message plus its string detail, when present. */
export const describeAcpError = (error: unknown): string => {
  if (error instanceof RequestError) {
    const data = error.data as { message?: unknown; details?: unknown } | string | undefined;
    const detail = typeof data === "string" ? data
      : typeof data?.message === "string" ? data.message
        : typeof data?.details === "string" ? data.details : null;
    return detail && !error.message.includes(detail) ? `${error.message}: ${detail}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * User-facing text for a run-activation failure: the agent's own JSON-RPC error (prefixed with
 * the agent label) or a safe ACP-layer error. Any other failure returns null and keeps the
 * caller's generic handling.
 */
export const describeAcpActivationError = (agentLabel: string, error: unknown): string | null => {
  if (error instanceof RequestError) return `${agentLabel}: ${describeAcpError(error)}`;
  if (error instanceof Error && SAFE_ACP_ERROR_PATTERN.test(error.message)) return error.message;
  return null;
};
