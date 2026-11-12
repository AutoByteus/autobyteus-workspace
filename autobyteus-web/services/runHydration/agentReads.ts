import type { TaskExecutionDto as TeamTaskExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';
import { GetAgentOrgMemberRunProjection, GetTeamMemberRunProjection } from '~/graphql/queries/runHistoryQueries';
import type { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import type { TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject';
import { getApolloClient } from '~/utils/apolloClient';
import { fetchRunFileChanges } from './runFileChangeHydrationService';
import { fetchRunProjection } from './runStoredStateLoader';
import type { ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages';

/**
 * Which subject reads one agent of a Team or Org view, and that subject's reads (autobyteus-461 CR-461-010, CR-461-015).
 * A run the view's run delegated to is a run of its own: it is read by its own identity (an agent child as its own run,
 * a member of a team child as a member of that team run), never as a member of the view. Every read of an agent in
 * these views asks its view kind's owner for the subject (`teamAgentReadSubject`, `orgAgentReadSubject`) and reads it
 * through `readsOf`: its stored state at selection and at open, and its trace pages, files and file content.
 */
export type AgentViewReadSubject = Exclude<AgentRunReadSubject, { kind: 'standaloneMember' }>;

/** One agent's stored state, whichever subject it is read through. */
export type AgentStoredProjection = TeamMemberRunProjectionPayload;

/** A delegated child's own subject among a Team view's children; null for any other agent. */
const teamChildSubject = (tasks: readonly TeamTaskExecutionDto[], agentRunId: string): AgentViewReadSubject | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.agent_run_id === agentRunId) return Object.freeze({ kind: 'run', runId: agentRunId });
      continue;
    }
    // A child team's members come in the team run's own space (its own file's addresses).
    const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId);
    if (member) return Object.freeze({ kind: 'teamMember', teamRunId: task.team_run_id, memberAddress: member.address, agentRunId });
    const nested = teamChildSubject(task.task_executions, agentRunId);
    if (nested) return nested;
  }
  return null;
};

/** The subject that reads one agent of a Team view: a delegated child's own, else this team run's member. */
export const teamAgentReadSubject = (
  team: Readonly<{ teamRunId: string; tree: TeamRunExecutionTreeDto; memberAddress: string }>,
  agentRunId: string,
): AgentViewReadSubject => teamChildSubject(team.tree.root_team.task_executions, agentRunId)
  ?? Object.freeze({ kind: 'teamMember', teamRunId: team.teamRunId, memberAddress: team.memberAddress, agentRunId });

/** The subject that reads one agent of an Org view: a delegated child's own, else this Org run's agent. */
export const orgAgentReadSubject = (orgRunId: string, index: AgentOrgExecutionViewIndex, agentRunId: string): AgentViewReadSubject => {
  const agent = index.agents.get(agentRunId);
  if (agent?.kind === 'task') return Object.freeze({ kind: 'run', runId: agentRunId });
  // A child team's member address is in the team run's own space, as the server sends it.
  if (agent?.kind === 'task_team_member') return Object.freeze({ kind: 'teamMember', teamRunId: agent.host.runId, memberAddress: agent.address, agentRunId });
  const address = agent?.address ?? index.remoteAgents.get(agentRunId)?.address;
  if (address === undefined) throw new Error(`AgentRun '${agentRunId}' is not an agent of AgentOrg run '${orgRunId}'.`);
  return Object.freeze({ kind: 'agentOrgMember', orgRunId, memberAddress: address, agentRunId });
};

const graphqlErrors = (errors: readonly { message: string }[] | undefined): string | null =>
  errors?.length ? errors.map((error) => error.message).join(', ') : null;

/** A team run member's stored state (`getTeamMemberRunProjection`), exactly that member's. */
export const fetchExactTeamMemberProjection = async (teamRunId: string, agentRunId: string): Promise<TeamMemberRunProjectionPayload> => {
  const response = await getApolloClient().query<{ getTeamMemberRunProjection: TeamMemberRunProjectionPayload | null }>({
    query: GetTeamMemberRunProjection,
    variables: { teamRunId, agentRunId },
    fetchPolicy: 'network-only',
  });
  const errors = graphqlErrors(response.errors);
  if (errors) throw new Error(errors);
  const projection = response.data?.getTeamMemberRunProjection;
  if (!projection) throw new Error(`Team member projection payload missing for '${agentRunId}'.`);
  if (projection.agentRunId !== agentRunId) {
    throw new Error(`Team member projection '${projection.agentRunId}' does not match '${agentRunId}'.`);
  }
  return projection;
};

/** An Org agent's stored state (`getAgentOrgMemberRunProjection`), exactly that agent's at that address. */
const fetchExactOrgMemberProjection = async (orgRunId: string, memberAddress: string, agentRunId: string): Promise<AgentStoredProjection> => {
  type OrgMemberProjection = AgentStoredProjection & Readonly<{ memberAddress: string }>;
  const response = await getApolloClient().query<{ getAgentOrgMemberRunProjection: OrgMemberProjection | null }>({
    query: GetAgentOrgMemberRunProjection,
    variables: { orgRunId, memberAddress, agentRunId },
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  });
  const errors = graphqlErrors(response.errors);
  if (errors) throw new Error(errors);
  const projection = response.data?.getAgentOrgMemberRunProjection ?? null;
  if (projection && (projection.agentRunId !== agentRunId || projection.memberAddress !== memberAddress)) {
    throw new Error(`Projection identity mismatch for '${agentRunId}'.`);
  }
  if (!projection) throw new Error(`Projection unavailable for '${agentRunId}'.`);
  const { memberAddress: _address, ...state } = projection;
  return state;
};

/** A run's own stored state, keyed like a member's (`agentRunId`). */
const fetchRunProjectionAsAgent = async (runId: string): Promise<AgentStoredProjection> => {
  const { runId: agentRunId, ...state } = await fetchRunProjection(runId);
  if (agentRunId !== runId) throw new Error(`Run projection '${agentRunId}' does not match '${runId}'.`);
  return { ...state, agentRunId };
};

/** The reads of one subject: its stored state and its files. */
export const readsOf = (subject: AgentViewReadSubject): Readonly<{
  fetchProjection(): Promise<AgentStoredProjection>;
  fetchFileChanges(): Promise<RunFileChangeArtifact[]>;
}> => Object.freeze({
  fetchProjection: () => subject.kind === 'run'
    ? fetchRunProjectionAsAgent(subject.runId)
    : subject.kind === 'teamMember'
      ? fetchExactTeamMemberProjection(subject.teamRunId, subject.agentRunId)
      : fetchExactOrgMemberProjection(subject.orgRunId, subject.memberAddress, subject.agentRunId),
  fetchFileChanges: () => fetchRunFileChanges(subject),
});

/**
 * The participant-messages key of the subject that reads an agent: the log of the run it is read through, by its own
 * identity (a delegated child's own run, or the view's root for its own agents; CR-461-020).
 */
export const participantMessagesKeyOf = (subject: AgentViewReadSubject): ParticipantMessagesKey => subject.kind === 'run'
  ? Object.freeze({ rootKind: 'agent', rootRunId: subject.runId, agentRunId: subject.runId })
  : subject.kind === 'teamMember'
    ? Object.freeze({ rootKind: 'agent_team', rootRunId: subject.teamRunId, agentRunId: subject.agentRunId })
    : Object.freeze({ rootKind: 'agent_org', rootRunId: subject.orgRunId, agentRunId: subject.agentRunId });
