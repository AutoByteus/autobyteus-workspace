import type { AgentRunContext } from "../../../domain/agent-run-context.js";

/** Durable ACP binding: the agent's session id and the working directory it was opened in. */
export class AcpAgentRunContext {
  constructor(readonly sessionId: string, readonly workingDirectory: string | null = null) {}
}

export type AcpRunContext = AgentRunContext<AcpAgentRunContext>;
