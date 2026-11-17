import { describe, expect, it } from 'vitest';
import { mobileRunSettingsScope } from '../mobileRunSettingsScope';
import { mobileRunSubjectLine } from '../mobileRunSubjectLine';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

const target = (kind: string, browse: object, extra: object = {}) => ({ access: 'live', context: { state: { runId: 'agent-1' } }, workspaceRootPath: null, kind, browse, ...extra }) as never;

describe('mobileRunSettingsScope: the run that holds the opened agent, for every kind (autobyteus-522)', () => {
  it('an agent run, standalone or a task agent of an agent run or an Org, is its own run', () => {
    for (const kind of ['standalone_agent', 'agent_run_task_agent', 'agent_org_task_agent']) {
      expect(mobileRunSettingsScope(target(kind, { kind: 'run', runId: 'agent-1' }))).toEqual({ kind: 'agent', runId: 'agent-1', address: '/' });
    }
  });

  it('a member of a Team run, a standalone Team or a task team (also under an Org), is its address in that Team run', () => {
    for (const kind of ['standalone_team_member', 'agent_run_task_team_member', 'agent_org_task_team_member']) {
      expect(mobileRunSettingsScope(target(kind, { kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/reviewer', agentRunId: 'agent-1' })))
        .toEqual({ kind: 'team', teamRunId: 'team-1', address: '/reviewer' });
    }
  });

  it('an Org\'s own agent or Org Team member is its address in the Org run', () => {
    for (const kind of ['agent_org_direct_agent', 'agent_org_team_member']) {
      expect(mobileRunSettingsScope(target(kind, { kind: 'agentOrgMember', orgRunId: 'org-1', memberAddress: '/research/lead', agentRunId: 'agent-1' },
        { root: { orgRunId: 'org-1' }, address: '/research/lead' }))).toEqual({ kind: 'agent_org', orgRunId: 'org-1', address: '/research/lead' });
    }
  });

  it('a run on another node is remote', () => {
    expect(mobileRunSettingsScope(target('agent_run_task_agent', { kind: 'peerRun', nodeId: 'beta', runId: 'peer-1', agentRunId: 'peer-1' })))
      .toEqual({ kind: 'remote' });
  });

  // BEH-005: a task agent opened in a standalone Team's tree is built as the Team's member target (the host Team's view),
  // but its browse is its own run: Settings change the task agent, never the Team member that delegated it.
  it('a task agent opened under a standalone Team\'s member is its own run, not the member', () => {
    expect(mobileRunSettingsScope(target('standalone_team_member', { kind: 'run', runId: 'helper-1' },
      { team: { rootRunId: 'team-1', focusedMemberAddress: '/lead' } }))).toEqual({ kind: 'agent', runId: 'helper-1', address: '/' });
  });
});

describe('mobileRunSubjectLine: the run screen\'s and Settings\' status line (one builder)', () => {
  const line = (input: { status: string; unreachable: boolean; parentName: string | null; backgroundTasksRunning?: number }) =>
    mobileRunSubjectLine({ backgroundTasksRunning: 0, ...input, t: (key, params) => localizationRuntime.translate(key, params) });
  it('names the parent run, or none; "Not reachable" when the node does not answer', () => {
    expect(line({ status: 'idle', unreachable: false, parentName: 'Marketing Team' }).subtitle).toBe('Idle · in Marketing Team');
    expect(line({ status: 'offline', unreachable: false, parentName: null }).subtitle).toBe('Stopped');
    expect(line({ status: 'idle', unreachable: true, parentName: 'Marketing Team' }).subtitle).toBe('Not reachable');
  });

  it('autobyteus-448 DEC-004: an idle run with background tasks reads them with the active dot; an unreachable run shows its error only', () => {
    expect(line({ status: 'idle', backgroundTasksRunning: 1, unreachable: false, parentName: 'Marketing Team' }))
      .toEqual({ dotClass: 'bg-blue-500', subtitle: 'Background task running · in Marketing Team' });
    expect(line({ status: 'idle', backgroundTasksRunning: 2, unreachable: false, parentName: null }).subtitle).toBe('2 background tasks running');
    expect(line({ status: 'running', backgroundTasksRunning: 2, unreachable: false, parentName: null }).subtitle).toBe('Running');
    expect(line({ status: 'idle', backgroundTasksRunning: 2, unreachable: true, parentName: null })).toEqual({ dotClass: 'bg-red-500', subtitle: 'Not reachable' });
  });
});
