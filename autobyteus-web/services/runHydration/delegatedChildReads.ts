import type { TaskExecutionDto as TeamTaskExecutionDto } from '@autobyteus/team-stream-contracts';
import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject';
import type { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex';
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { fetchRunFileChanges } from './runFileChangeHydrationService';
import { fetchRunProjection } from './runStoredStateLoader';
import type { TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';

/**
 * A delegated child of a run is a run of its own (autobyteus-461, CR-461-010): its agents are read by the child's own
 * identity, never as members of the view that lists them. An agent child is read as its own run; a member of a team
 * child is read as a member of that team run. The view's stream still carries the child's live output and commands.
 */
export type DelegatedChildReadSubject =
  | Extract<AgentRunReadSubject, { kind: 'run' }>
  | Extract<AgentRunReadSubject, { kind: 'teamMember' }>;

/** The child's own read subject for one agent of a Team view's delegated children; null for any other agent. */
export const teamDelegatedChildSubject = (
  tasks: readonly TeamTaskExecutionDto[],
  agentRunId: string,
): DelegatedChildReadSubject | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.agent_run_id === agentRunId) return Object.freeze({ kind: 'run', runId: agentRunId });
      continue;
    }
    const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId);
    if (member) {
      return Object.freeze({ kind: 'teamMember', teamRunId: task.team_run_id, memberAddress: inOwnTeam(member.address, task.address), agentRunId });
    }
    const nested = teamDelegatedChildSubject(task.task_executions, agentRunId);
    if (nested) return nested;
  }
  return null;
};

/** The child's own read subject for one agent an Org view indexes; null for the Org's own agents. */
export const orgDelegatedChildSubject = (index: AgentOrgExecutionViewIndex, agentRunId: string): DelegatedChildReadSubject | null => {
  const agent = index.agents.get(agentRunId);
  if (agent?.kind === 'task') return Object.freeze({ kind: 'run', runId: agentRunId });
  if (agent?.kind !== 'task_team_member') return null;
  const team = index.requireTeam(agent.host.runId);
  return Object.freeze({ kind: 'teamMember', teamRunId: team.teamRunId, memberAddress: inOwnTeam(agent.address, team.address), agentRunId });
};

/** A member address of a child team row (shown under its delegation address) in the team run's own space. */
const inOwnTeam = (memberAddress: string, teamAddress: string): string => {
  const mount = teamAddress.replace(/\/+$/, '');
  return mount && memberAddress.startsWith(`${mount}/`) ? memberAddress.slice(mount.length) : memberAddress;
};

/** A run's own stored projection, in the member projection's shape (keyed by `agentRunId`). */
const runProjectionAsMember = async (runId: string): Promise<TeamMemberRunProjectionPayload> => {
  const { runId: agentRunId, ...rest } = await fetchRunProjection(runId);
  if (agentRunId !== runId) throw new Error(`Run projection '${agentRunId}' does not match '${runId}'.`);
  return { ...rest, agentRunId };
};

/**
 * What the member loader reads for one agent of a delegated child, by the child's own identity. `teamMemberProjection`
 * is the Team member projection read (for a member of a team child, asked of that team run).
 */
export const delegatedChildReads = (
  subject: DelegatedChildReadSubject,
  teamMemberProjection: (teamRunId: string, agentRunId: string) => Promise<TeamMemberRunProjectionPayload>,
): Readonly<{ fetchProjection(): Promise<TeamMemberRunProjectionPayload>; fetchFileChanges(): Promise<RunFileChangeArtifact[]> }> => Object.freeze({
  fetchProjection: () => subject.kind === 'run'
    ? runProjectionAsMember(subject.runId)
    : teamMemberProjection(subject.teamRunId, subject.agentRunId),
  fetchFileChanges: () => fetchRunFileChanges(subject),
});
