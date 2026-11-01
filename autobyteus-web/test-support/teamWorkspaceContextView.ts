import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamWorkspaceContextView } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import { projectTeamCommunicationMemberIdentity } from '~/utils/teamCommunication/teamCommunicationPerspective'
import { projectParticipantMessageRows } from '~/services/collaborationMessages/participantMessageRows'
import { testTeamMessagesOf } from '~/test-support/currentTeamTestFixtures'
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService'

export const testTeamWorkspaceContextView = (
  team: AgentTeamContext,
  focusedAgentRunId = team.view.getFocusedAgentRunId(),
): TeamWorkspaceContextView => {
  const view = team.view
  const context = view.getAgentContext(focusedAgentRunId)
  if (!context) throw new Error(`Missing test focused AgentRun '${focusedAgentRunId}'.`)
  const memberAddress = view.getMemberAddress(focusedAgentRunId)
  if (!memberAddress) throw new Error(`Missing test focused address '${focusedAgentRunId}'.`)
  const entries = view.listAgentContextEntries()
  return {
    rootKind: 'agent_team',
    rootRunId: view.getRootTeamRunId(),
    teamRunId: view.getRootTeamRunId(),
    teamAddress: parseAgentTeamAddress('/'),
    teamDefinitionName: view.getTeamDefinitionName(),
    coordinatorAddress: parseAgentTeamAddress(view.getExecutionTree().root_team.coordinator_address),
    focusedMemberAddress: memberAddress,
    focusedAgentRunId,
    focusedAgentContext: context,
    isFocusedProjectionAuthoritative: () =>
      isTeamMemberProjectionAuthoritative(team, focusedAgentRunId),
    listMembers: () => entries.map((entry) => ({
      address: entry.memberAddress,
      agentRunId: entry.agentRunId,
      context: entry.agentContext,
      coordinator: entry.memberAddress === view.getExecutionTree().root_team.coordinator_address,
    })),

  }
}

export const testCollaborationMessagesContextView = (
  team: AgentTeamContext,
  focusedAgentRunId = team.view.getFocusedAgentRunId(),
): CollaborationMessagesContextView => {
  const view = team.view
  const focusedMemberAddress = view.getMemberAddress(focusedAgentRunId)
  if (!focusedMemberAddress) throw new Error(`Missing test focused address '${focusedAgentRunId}'.`)
  const entries = view.listAgentContextEntries()
  return {
    rootKind: 'agent_team',
    rootRunId: view.getRootTeamRunId(),
    focusedAgentRunId,
    focusedMemberAddress,
    memberIdentityByAgentRunId: () => Object.fromEntries(entries.map((entry) => [
      entry.agentRunId,
      projectTeamCommunicationMemberIdentity(view, entry.agentRunId),
    ])),
    // The Team tab's rows from the messages the test Team was built with, loaded (the production row builder).
    listMessages: () => projectParticipantMessageRows({
      messages: testTeamMessagesOf(team), focusedAgentRunId,
      identityOf: (agentRunId) => view.getMemberAddress(agentRunId) ? projectTeamCommunicationMemberIdentity(view, agentRunId) : null,
    }),
    messagesStatus: () => ({ state: 'loaded', error: null }),
    loadMessages: () => undefined,
    referenceContentPath: (messageId, referenceId) =>
      `team-runs/${view.getRootTeamRunId()}/team-communication/messages/${messageId}/references/${referenceId}/content`,
  }
}
