export type MemoryProjectionScope = { kind: 'agent_turn'; id: string };

export const requireAgentTurnScopeId = (
  scope: MemoryProjectionScope | undefined,
  operation: string,
): string => {
  if (!scope || scope.kind !== 'agent_turn' || typeof scope.id !== 'string' || !scope.id.trim()) {
    throw new Error(`${operation} requires an agent_turn scope with a non-empty id.`);
  }
  return scope.id.trim();
};
