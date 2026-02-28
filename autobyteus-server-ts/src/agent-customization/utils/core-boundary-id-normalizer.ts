type AgentRuntimeContextBoundary = {
  // Core boundary from autobyteus-ts runtime.
  agentId: string;
};

export function resolveAgentRunIdFromRuntimeContext(
  context: AgentRuntimeContextBoundary,
): string {
  // `context.agentId` in autobyteus-ts is the runtime execution ID (run ID), not a definition ID.
  return context.agentId;
}
