import type { TaskExecutionDto, TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildTestTeamContext, testAgentNode, testSubTeamNode, testTaskRecord } from './currentTeamTestFixtures';
import { collectLiveAgentExecutionLocations } from '~/services/teamExecution/teamExecutionTreeSelectors';

const time = '2026-09-12T09:00:00.000Z';
const settled = '2026-09-12T09:01:00.000Z';
export const HISTORY_TEAM_ROOT = 'history-team';
const placement = (id: string, address = '/verifier', retired = true): TaskExecutionDto => ({
  kind: 'task_agent', address, agent_run_id: id, platform_agent_run_id: null,
  started_at: time, settled_at: retired ? settled : null,
});
const task = (id: string, address = '/verifier', team = false) => testTaskRecord({
  taskId: `task-${id}`, delegatorAgentRunId: 'lead', recipientAddress: address,
  target: team ? { teamRunId: id } : { agentRunId: id }, status: 'accepted',
  description: `Inspect ${id}`, createdAt: time,
  updates: [
    { kind: 'submission', submission_id: `submission-${id}`, message: `Result ${id}`, reference_files: [], created_at: time },
    { kind: 'review', review_id: `review-${id}`, reviewed_submission_id: `submission-${id}`, decision: 'accept', comment: 'Accepted', reference_files: [], created_at: settled },
  ],
});

// Synthetic current contract fixture: same-address first/repeat settled work and
// accepted-but-not-yet-settled live work. Formal acceptance is not liveness.
export const buildRetainedTeamHistoryFixture = (recursive = false) => {
  const executions: TaskExecutionDto[] = [placement('first'), placement('repeat'), placement('live-task', '/verifier', false)];
  const tasks = [task('first'), task('repeat'), task('live-task')];
  const children = [testAgentNode('/lead', { agentRunId: 'lead', currentStatus: AgentStatus.Offline }),
    testAgentNode('/verifier', { agentRunId: 'configured-verifier', currentStatus: AgentStatus.Offline })];
  const retiredIds = ['first', 'repeat'];
  const rootChildren = recursive ? [...children, testSubTeamNode('/group', [
    testAgentNode('/group/worker', { agentRunId: 'group-worker' }),
    testSubTeamNode('/group/nested', [testAgentNode('/group/nested/worker', { agentRunId: 'nested-worker' })]),
  ], { teamRunId: 'configured-group', taskExecutions: [placement('group-retired', '/group/worker')] })] : children;
  if (recursive) {
    executions.push({ kind: 'task_team', address: '/group', team_run_id: 'retired-group', started_at: time, settled_at: settled,
      members: [{ kind: 'task_team_agent', address: '/group/worker', agent_run_id: 'retired-worker', platform_agent_run_id: null },
        { kind: 'task_team_member', address: '/group/nested', team_run_id: 'retired-nested',
          members: [{ kind: 'task_team_agent', address: '/group/nested/worker', agent_run_id: 'retired-nested-worker', platform_agent_run_id: null }], task_executions: [] }],
      task_executions: [placement('retired-descendant', '/group/worker', false)] });
    executions.push({ kind: 'task_team', address: '/group', team_run_id: 'live-group', started_at: time, settled_at: null,
      members: [{ kind: 'task_team_agent', address: '/group/worker', agent_run_id: 'live-worker', platform_agent_run_id: null }],
      task_executions: [placement('live-group-retired', '/group/worker')] });
    retiredIds.push('group-retired', 'retired-worker', 'retired-nested-worker', 'retired-descendant', 'live-group-retired');
    tasks.push(task('retired-group', '/group', true), task('live-group', '/group', true),
      task('group-retired', '/group/worker'), task('retired-descendant', '/group/worker'), task('live-group-retired', '/group/worker'));
  }
  const team = buildTestTeamContext({ teamRunId: HISTORY_TEAM_ROOT, teamDefinitionName: 'History Team',
    rootChildren, coordinatorAddress: '/lead', focusedAgentRunId: 'lead', isActive: true, tasks, taskExecutions: executions });
  const snapshot: Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }> = {
    type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_team_run_id: HISTORY_TEAM_ROOT, base_change_sequence: 648, execution_tree: team.view.getExecutionTree(),
      tasks, messages: [], agent_statuses: collectLiveAgentExecutionLocations(team.view.getExecutionTree()).map(location => ({
        agent_run_id: location.agentRunId, member_address: location.memberAddress,
        status: location.agentRunId === 'live-task' ? 'running' : 'idle', trigger: null, tool_name: null, error_message: null, error_details: null,
      })),
    },
  };
  return { team, snapshot, retiredIds };
};
