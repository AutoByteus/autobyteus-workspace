import type { AgentRunContext } from "../../../domain/agent-run-context.js";

export class AgyAgentRunContext {
  constructor(readonly conversationId: string) {}
}

export type AgyRunContext = AgentRunContext<AgyAgentRunContext>;
