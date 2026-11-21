import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import WorkspaceDelegatedRunRow from '../WorkspaceDelegatedRunRow.vue';
import WorkspaceStableExecutionRow from '../WorkspaceStableExecutionRow.vue';
import type { RunHistoryDelegatedRunRow, RunHistoryStableExecutionRow } from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { runTreeDisplayRows } from '~/utils/runTree/runTreeDisplayRows';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

/**
 * team-run-follows-definition SR-009/SR-010: a team member removed from its team that is still finishing its turn keeps
 * its run-tree row, tagged "Leaving" (it still opens, to answer its approval); the server's row says so (`leaving`).
 */
const memberDto = (agentRunId: string, leaving?: true): RunTreeRowDto => ({
  key: `team_member:eng:${agentRunId}`, parentKey: 'team:eng', depth: 1, kind: 'team_member', name: agentRunId, address: `/${agentRunId}`,
  openTarget: { runKind: 'agent_team', runId: 'eng', agentRunId }, statusIds: [agentRunId], ...(leaving ? { leaving } : {}),
});

const delegatedRow = (leaving: boolean): RunHistoryDelegatedRunRow => ({
  kind: 'delegated_run', delegatedRunKind: 'task_team_child', rowKey: 'team_member:study:reviewer', teamRunId: 'manager',
  memberAddress: '/reviewer', agentRunId: 'reviewer', teamRunIdForNode: null, memberKind: 'agent', displayName: 'reviewer',
  currentStatus: AgentStatus.Running, delegatedBy: null, depth: 1, hasChildren: false, ...(leaving ? { leaving: true } : {}),
});

const stableRow = (leaving: boolean): RunHistoryStableExecutionRow => ({
  kind: 'stable_member', rowKey: 'agent:writer', teamRunId: 'eng', memberAddress: '/writer', agentRunId: 'writer', teamRunIdForNode: null,
  memberKind: 'agent', displayName: 'writer', depth: 0, hasChildren: false, ...(leaving ? { leaving: true } : {}),
  row: { teamRunId: 'eng', kind: 'agent', memberAddress: '/writer', displayName: 'writer', agentRunId: 'writer', workspaceRootPath: null,
    summary: '', lastActivityAt: '2026-11-21T00:00:00.000Z', currentStatus: AgentStatus.Running, isActive: true, deleteLifecycle: 'READY', children: [] },
});
const avatars = {
  showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', getTeamMemberDisplayName: () => 'writer',
  onTeamMemberAvatarError: () => undefined, getTeamMemberInitials: () => 'W',
} as never;

describe('a leaving member\'s run-tree row', () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it('carries the server row\'s leaving mark into the row model; other rows have none', () => {
    const rows = runTreeDisplayRows({ rows: [
      { key: 'team:eng', parentKey: null, depth: 0, kind: 'team', name: 'eng', address: null, openTarget: null, statusIds: ['eng'] },
      memberDto('lead'), memberDto('writer', true),
    ], rootKey: 'team:eng', topRunId: 'eng', isExpanded: () => true, statusOf: () => null });
    expect(rows.map((display) => [display.row.agentRunId, display.row.leaving ?? false])).toEqual([['lead', false], ['writer', true]]);
  });

  it('a delegated copy\'s member row shows "Leaving" when it leaves, and nothing otherwise', () => {
    const leaving = mount(WorkspaceDelegatedRunRow, { props: { row: delegatedRow(true) } });
    expect(leaving.get('[data-test="workspace-member-leaving"]').text()).toBe('Leaving');
    expect(mount(WorkspaceDelegatedRunRow, { props: { row: delegatedRow(false) } }).find('[data-test="workspace-member-leaving"]').exists()).toBe(false);
  });

  it('the Team\'s own member row shows "Leaving" when it leaves, and nothing otherwise', () => {
    const props = { avatars, age: 'now', isSelected: false, hasChildren: false, expanded: false, continuingAncestorDepths: [], hasFollowingSibling: false };
    const leaving = mount(WorkspaceStableExecutionRow, { props: { ...props, row: stableRow(true) } });
    expect(leaving.get('[data-test="workspace-member-leaving"]').text()).toBe('Leaving');
    expect(mount(WorkspaceStableExecutionRow, { props: { ...props, row: stableRow(false) } }).find('[data-test="workspace-member-leaving"]').exists()).toBe(false);
  });
});
