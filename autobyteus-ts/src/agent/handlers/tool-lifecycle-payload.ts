import type { ToolInvocation } from '../tool-invocation.js';
import type { ToolResultEvent } from '../events/agent-events.js';

export const buildToolLifecycleBasePayload = (
  agentId: string,
  toolName: string,
  invocationId: string,
  turnId?: string | null
): Record<string, unknown> => ({
  agent_id: agentId,
  tool_name: toolName,
  invocation_id: invocationId,
  turn_id: turnId ?? null
});

export const buildToolLifecyclePayloadFromInvocation = (
  agentId: string,
  invocation: ToolInvocation
): Record<string, unknown> =>
  buildToolLifecycleBasePayload(agentId, invocation.name, invocation.id, invocation.turnId ?? null);

export const buildToolLifecyclePayloadFromResult = (
  agentId: string,
  result: ToolResultEvent
): Record<string, unknown> =>
  buildToolLifecycleBasePayload(
    agentId,
    result.toolName,
    result.toolInvocationId ?? 'unknown_invocation',
    result.turnId ?? null
  );
