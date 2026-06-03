import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';
import {
  ensureTaskAgentContext,
  extractTaskAgentIdentity,
  getTaskAgentContextByRunId,
} from './teamTaskAgentContextProjection';

export interface TeamStreamMemberContextResolution {
  context: AgentContext;
}

type TeamScopedPayload = {
  agent_id?: unknown;
  agentId?: unknown;
  member_route_key?: unknown;
  memberRouteKey?: unknown;
  source_route_key?: unknown;
  sourceRouteKey?: unknown;
  source_path?: unknown;
  sourcePath?: unknown;
  member_path?: unknown;
  memberPath?: unknown;
};

const normalizeString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const normalizePath = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((part) => String(part).trim()).filter(Boolean)
    : []
);

const payloadFor = (message: ServerMessage): TeamScopedPayload | null => (
  'payload' in message && message.payload && typeof message.payload === 'object'
    ? message.payload as TeamScopedPayload
    : null
);

const routeKeyFromPath = (value: unknown): string | null => {
  const path = normalizePath(value);
  return path.length > 0 ? path.join('/') : null;
};

const resolvePayloadRouteKey = (payload: TeamScopedPayload): string | null => (
  normalizeString(payload.source_route_key) ??
  normalizeString(payload.sourceRouteKey) ??
  normalizeString(payload.member_route_key) ??
  normalizeString(payload.memberRouteKey) ??
  routeKeyFromPath(payload.source_path) ??
  routeKeyFromPath(payload.sourcePath) ??
  routeKeyFromPath(payload.member_path) ??
  routeKeyFromPath(payload.memberPath)
);

const resolvePayloadAgentId = (payload: TeamScopedPayload): string | null => (
  normalizeString(payload.agent_id) ?? normalizeString(payload.agentId)
);

const resolveLogicalContextByRunId = (
  teamContext: AgentTeamContext,
  agentId: string,
): AgentContext | null => {
  for (const memberContext of teamContext.leafAgentContextsByRouteKey.values()) {
    if (memberContext.state.runId === agentId) {
      return memberContext;
    }
  }
  return null;
};

export const resolveTeamStreamMemberContext = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TeamStreamMemberContextResolution | null => {
  const taskAgentIdentity = extractTaskAgentIdentity(message);
  if (taskAgentIdentity) {
    return {
      context: ensureTaskAgentContext(teamContext, taskAgentIdentity),
    };
  }

  const payload = payloadFor(message);
  if (!payload) {
    return null;
  }

  const agentId = resolvePayloadAgentId(payload);
  if (agentId) {
    const taskAgentContext = getTaskAgentContextByRunId(teamContext, agentId);
    if (taskAgentContext) {
      return {
        context: taskAgentContext,
      };
    }
  }

  const routeKey = resolvePayloadRouteKey(payload);
  const routedContext = routeKey
    ? teamContext.leafAgentContextsByRouteKey.get(routeKey) || null
    : null;
  if (routedContext) {
    const existingRunId = routedContext.state.runId?.trim() || '';
    if (agentId && existingRunId && existingRunId !== agentId) {
      return null;
    }
    return {
      context: routedContext,
    };
  }

  const runMatchedContext = agentId
    ? resolveLogicalContextByRunId(teamContext, agentId)
    : null;
  return runMatchedContext ? { context: runMatchedContext } : null;
};
