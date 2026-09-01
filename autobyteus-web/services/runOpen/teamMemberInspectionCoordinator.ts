import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { ensureAuthoritativeTeamMemberProjection } from '~/services/runHydration/teamMemberProjectionHydrationService';

export type TeamMemberInspectionResult =
  | Readonly<{
    disposition: 'committed';
    teamRunId: string;
    agentRunId: string;
    memberAddress: string;
  }>
  | Readonly<{
    disposition: 'rejected';
    code: string;
    message: string;
  }>;

export const inspectMountedTeamMember = async (input: {
  teamRunId: string;
  agentRunId: string;
  commit: (result: Readonly<{
    teamRunId: string;
    agentRunId: string;
    memberAddress: string;
  }>) => void;
}): Promise<TeamMemberInspectionResult> => {
  const teamRunId = input.teamRunId.trim();
  const agentRunId = input.agentRunId.trim();
  try {
    const contexts = useAgentTeamContextsStore();
    const team = contexts.getTeamContextById(teamRunId);
    if (!team || team.view.getRootTeamRunId() !== teamRunId) {
      throw new Error(`Team context '${teamRunId}' is not mounted.`);
    }
    if (!team.view.hasAgentRun(agentRunId)) {
      throw new Error(`AgentRun '${agentRunId}' is not visible in the mounted Team yet.`);
    }
    await ensureAuthoritativeTeamMemberProjection({ team, agentRunId });
    if (contexts.getTeamContextById(teamRunId) !== team) {
      throw new Error(`Team context '${teamRunId}' changed before selection commit.`);
    }
    const memberAddress = team.view.getMemberAddress(agentRunId);
    const focus = team.view.focusAgent(agentRunId);
    if (!memberAddress || focus.disposition === 'rejected'
      || team.view.getFocusedAgentRunId() !== agentRunId) {
      throw new Error(focus.disposition === 'rejected'
        ? focus.message
        : `AgentRun '${agentRunId}' could not be focused.`);
    }
    const committed = Object.freeze({ teamRunId, agentRunId, memberAddress });
    input.commit(committed);
    return Object.freeze({ disposition: 'committed' as const, ...committed });
  } catch (error) {
    return Object.freeze({
      disposition: 'rejected' as const,
      code: 'TEAM_MEMBER_INSPECTION_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
