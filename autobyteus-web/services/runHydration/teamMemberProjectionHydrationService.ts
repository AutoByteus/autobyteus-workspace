import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { buildConversationFromProjection } from './runProjectionConversation';
import { buildActivitiesFromProjection } from './runProjectionActivityHydration';
import { fetchExactTeamMemberProjection } from './teamRunContextHydrationService';
import { findConfiguredAgentByAddress } from '~/services/teamExecution/teamExecutionTreeSelectors';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export type TeamMemberProjectionHydrationResult = Readonly<{
  disposition: 'authoritative' | 'hydrated';
  agentRunId: string;
}>;

const authoritativeContexts = new WeakSet<AgentContext>();
const hydrationByContext = new WeakMap<AgentContext, Promise<TeamMemberProjectionHydrationResult>>();
const MAX_CONFLICT_ATTEMPTS = 3;

const exactMountedContext = (
  team: AgentTeamContext,
  agentRunId: string,
): AgentContext => {
  const rootTeamRunId = team.view.getRootTeamRunId();
  if (useAgentTeamContextsStore().getTeamContextById(rootTeamRunId) !== team) {
    throw new Error(`Team context '${rootTeamRunId}' changed before task activity could be loaded.`);
  }
  const agent = team.view.getAgentContext(agentRunId);
  const location = team.view.getAgentExecutionLocation(agentRunId);
  const visible = team.view.listNavigationRows().some((row) => row.agentRunId === agentRunId);
  if (!agent || agent.state.runId !== agentRunId || !location || !visible) {
    throw new Error(`AgentRun '${agentRunId}' is not a visible member of Team '${rootTeamRunId}'.`);
  }
  return agent;
};

const attemptHydration = async (
  team: AgentTeamContext,
  agentRunId: string,
): Promise<TeamMemberProjectionHydrationResult | null> => {
  const agent = exactMountedContext(team, agentRunId);
  if (authoritativeContexts.has(agent)) {
    return Object.freeze({ disposition: 'authoritative', agentRunId });
  }
  const rootTeamRunId = team.view.getRootTeamRunId();
  const location = team.view.getAgentExecutionLocation(agentRunId)!;
  const configured = findConfiguredAgentByAddress(team.view.getExecutionTree(), location.memberAddress);
  if (!configured) {
    throw new Error(`AgentRun '${agentRunId}' has no configured Team placement.`);
  }
  const expectedPresentationRevision = agent.state.eventMonitorPresentationRevision;
  const activityStore = useAgentActivityStore();
  const expectedActivityRevision = activityStore.getActivityContentRevision(agentRunId);
  const projection = await fetchExactTeamMemberProjection(rootTeamRunId, agentRunId);
  const conversation = buildConversationFromProjection(
    agentRunId,
    projection.conversation ?? [],
    {
      agentDefinitionId: configured.agent_definition_id,
      agentName: location.memberAddress.split('/').at(-1) ?? location.memberAddress,
      llmModelIdentifier: configured.launch_configuration.llm_model_identifier,
    },
  );
  if (projection.lastActivityAt) conversation.updatedAt = projection.lastActivityAt;
  const activities = buildActivitiesFromProjection(projection.activities ?? []);

  const currentAgent = exactMountedContext(team, agentRunId);
  const currentLocation = team.view.getAgentExecutionLocation(agentRunId)!;
  if (currentAgent !== agent
    || currentLocation.memberAddress !== location.memberAddress
    || currentLocation.containingTeamRunId !== location.containingTeamRunId
    || agent.state.eventMonitorPresentationRevision !== expectedPresentationRevision
    || activityStore.getActivityContentRevision(agentRunId) !== expectedActivityRevision) {
    return null;
  }
  const replacement = activityStore.replaceProjectionActivitiesIfRevisions([{
    runId: agentRunId,
    expectedRevision: expectedActivityRevision,
    activities,
  }]);
  if (replacement === 'conflict') return null;

  resetRecentEventMonitorBaseline(agent);
  agent.state.conversation = conversation;
  agent.state.hasEarlierActiveTraceEvents = projection.hasEarlierActiveTraceEvents === true;
  agent.state.markEventMonitorPresentationChanged();
  primeRecentEventMonitorBaseline(agent);
  authoritativeContexts.add(agent);
  return Object.freeze({ disposition: 'hydrated', agentRunId });
};

export const ensureAuthoritativeTeamMemberProjection = async (input: {
  team: AgentTeamContext;
  agentRunId: string;
}): Promise<TeamMemberProjectionHydrationResult> => {
  const agentRunId = input.agentRunId.trim();
  const initialAgent = exactMountedContext(input.team, agentRunId);
  if (authoritativeContexts.has(initialAgent)) {
    return Object.freeze({ disposition: 'authoritative', agentRunId });
  }
  const existing = hydrationByContext.get(initialAgent);
  if (existing) return existing;

  const operation = (async () => {
    for (let attempt = 0; attempt < MAX_CONFLICT_ATTEMPTS; attempt += 1) {
      const result = await attemptHydration(input.team, agentRunId);
      if (result) return result;
    }
    throw new Error(`Task activity for '${agentRunId}' changed while it was loading.`);
  })();
  hydrationByContext.set(initialAgent, operation);
  try {
    return await operation;
  } finally {
    if (hydrationByContext.get(initialAgent) === operation) hydrationByContext.delete(initialAgent);
  }
};

export const isTeamMemberProjectionAuthoritative = (
  team: AgentTeamContext,
  agentRunId: string,
): boolean => {
  const agent = team.view.getAgentContext(agentRunId.trim());
  return Boolean(agent && authoritativeContexts.has(agent));
};

export const markTeamMemberProjectionAuthoritative = (
  team: AgentTeamContext,
  agentRunId: string,
): void => {
  const agent = team.view.getAgentContext(agentRunId.trim());
  if (agent) authoritativeContexts.add(agent);
};

export const invalidateTeamMemberProjection = (
  team: AgentTeamContext,
  agentRunId: string,
): void => {
  const agent = team.view.getAgentContext(agentRunId.trim());
  if (agent) authoritativeContexts.delete(agent);
};

export const invalidateTeamMemberProjections = (team: AgentTeamContext): void => {
  team.view.listAgentContextEntries().forEach(({ agentContext }) => {
    authoritativeContexts.delete(agentContext);
  });
};
