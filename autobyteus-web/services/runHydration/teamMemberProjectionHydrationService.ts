import type { WorkspaceSelectionIntent } from '~/stores/agentSelectionStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { fetchExactTeamMemberProjection } from './teamRunContextHydrationService';
import { fetchRunFileChanges } from './runFileChangeHydrationService';
import { memberLoader, type MemberLoadTarget } from './memberLoader';
import { teamAgentSourceOf } from '~/services/collaborators/agentSourceSelectors';

export type TeamMemberProjectionHydrationResult = Readonly<{
  disposition: 'authoritative' | 'hydrated' | 'superseded';
  agentRunId: string;
}>;

/** The member loader's root of one Team run (autobyteus-358: one loader for Team, Org and hub members). */
const loaderRoot = (team: AgentTeamContext): string => `agent_team:${team.view.getRootTeamRunId()}`;

/** The member's load target while its Team context is the mounted one; null once it is not. */
const teamMemberLoadTarget = (team: AgentTeamContext, agentRunId: string): MemberLoadTarget | null => {
  const rootTeamRunId = team.view.getRootTeamRunId();
  if (useAgentTeamContextsStore().getTeamContextById(rootTeamRunId) !== team) return null;
  const agent = team.view.getAgentContext(agentRunId);
  const location = team.view.getAgentExecutionLocation(agentRunId);
  if (!agent || agent.state.runId !== agentRunId || !location || location.agentRunId !== agentRunId) return null;
  const configured = teamAgentSourceOf(team.view.getExecutionTree(), agentRunId);
  if (!configured) throw new Error(`AgentRun '${agentRunId}' has no configured Team placement.`);
  return Object.freeze({
    agent,
    conversationDefaults: {
      agentDefinitionId: configured.agent_definition_id,
      agentName: location.memberAddress.split('/').at(-1) ?? location.memberAddress,
      llmModelIdentifier: configured.launch_configuration.llm_model_identifier,
    },
    fetchProjection: () => fetchExactTeamMemberProjection(rootTeamRunId, agentRunId),
    fetchFileChanges: () => fetchRunFileChanges({
      kind: 'teamMember', teamRunId: rootTeamRunId, memberAddress: location.memberAddress, agentRunId,
    }),
    // Content authority does not supersede currently observed live tool decisions.
    liveToolAuthority: () => team.view.isRootTeamActive() && !team.view.needsStreamRecovery()
      && team.view.listAgentContextEntries().some((entry) => entry.agentRunId === agentRunId && entry.agentContext === agent)
      && useAgentTeamRunStore().isTeamStreamReady(rootTeamRunId),
  });
};

/**
 * Loads one of the Team's own members' stored conversation, activities and files through the member loader, unless
 * loaded. A run the Team delegated is not one of them: it is its own run, read as one (autobyteus-461 rule 2).
 */
export const ensureAuthoritativeTeamMemberProjection = async (input: {
  team: AgentTeamContext;
  agentRunId: string;
  selectionIntent?: WorkspaceSelectionIntent;
}): Promise<TeamMemberProjectionHydrationResult> => {
  const agentRunId = input.agentRunId.trim();
  if (!teamMemberLoadTarget(input.team, agentRunId)) {
    throw new Error(`AgentRun '${agentRunId}' is not a retained member of Team '${input.team.view.getRootTeamRunId()}'.`);
  }
  const outcome = await memberLoader().ensure(loaderRoot(input.team), agentRunId, () => teamMemberLoadTarget(input.team, agentRunId));
  if (input.selectionIntent && !input.selectionIntent.isCurrent()) return Object.freeze({ disposition: 'superseded', agentRunId });
  return Object.freeze({ disposition: outcome === 'already_hydrated' ? 'authoritative' : outcome, agentRunId });
};

export const isTeamMemberProjectionAuthoritative = (team: AgentTeamContext, agentRunId: string): boolean =>
  memberLoader().isHydrated(loaderRoot(team), agentRunId.trim());

/** The member's stored state was staged with the Team context (the focused member at open or recovery). */
export const markTeamMemberProjectionAuthoritative = (team: AgentTeamContext, agentRunId: string): void => {
  memberLoader().markHydrated(loaderRoot(team), agentRunId.trim());
};

/** A live change the stored state may not hold yet: the member loads again when it is next opened. */
export const invalidateTeamMemberProjection = (team: AgentTeamContext, agentRunId: string): void => {
  memberLoader().invalidate(loaderRoot(team), [agentRunId.trim()]);
};

/** The Team context was built or rebuilt (open, recovery, a fresh snapshot): no member is loaded in it. */
export const beginTeamMemberGeneration = (team: AgentTeamContext): void => {
  memberLoader().beginRoot(loaderRoot(team));
};
