import { createHash } from "node:crypto";
import { normalizeStoredAgentRunId } from "../../agent-execution/identity/agent-run-id.js";

const AGENT_TOOL_MCP_RUN_SESSION_ID_PREFIX = "agtrun_";
const SHA256_BASE64URL_LENGTH = 43;
const RUN_SESSION_ID_PATTERN = new RegExp(
  `^${AGENT_TOOL_MCP_RUN_SESSION_ID_PREFIX}[A-Za-z0-9_-]{${SHA256_BASE64URL_LENGTH}}$`,
);

declare const agentToolMcpRunSessionIdBrand: unique symbol;

export type AgentToolMcpRunSessionId = string & {
  readonly [agentToolMcpRunSessionIdBrand]: true;
};

export const deriveAgentToolMcpRunSessionId = (
  runId: string,
): AgentToolMcpRunSessionId => {
  const normalizedRunId = normalizeStoredAgentRunId(runId);
  const digest = createHash("sha256")
    .update(normalizedRunId, "utf8")
    .digest("base64url");
  return `${AGENT_TOOL_MCP_RUN_SESSION_ID_PREFIX}${digest}` as AgentToolMcpRunSessionId;
};

export const isAgentToolMcpRunSessionId = (
  value: string,
): value is AgentToolMcpRunSessionId => RUN_SESSION_ID_PATTERN.test(value);
