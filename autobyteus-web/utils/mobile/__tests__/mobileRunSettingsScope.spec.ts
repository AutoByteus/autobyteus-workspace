import { describe, expect, it } from 'vitest';
import { mobileRunSettingsScope } from '../mobileRunSettingsScope';
import { mobileRunSubjectLine } from '../mobileRunSubjectLine';

const base = { access: 'live', context: { state: { runId: 'run-a' } }, browse: { kind: 'run', runId: 'run-a' }, workspaceRootPath: null } as const;

describe('mobileRunSettingsScope (autobyteus-458)', () => {
  it('an agent run is its own run; a Team member its scope in its Team run; an Org agent or Org Team member its scope in the Org run', () => {
    expect(mobileRunSettingsScope({ ...base, kind: 'standalone_agent' } as never)).toEqual({ kind: 'agent', runId: 'run-a', address: '/' });
    expect(mobileRunSettingsScope({ ...base, kind: 'standalone_team_member', team: { rootRunId: 'team-1', focusedMemberAddress: '/writer' } } as never))
      .toEqual({ kind: 'team', teamRunId: 'team-1', address: '/writer' });
    for (const kind of ['agent_org_direct_agent', 'agent_org_team_member']) {
      expect(mobileRunSettingsScope({ ...base, kind, root: { orgRunId: 'org-1' }, address: '/research/lead' } as never))
        .toEqual({ kind: 'agent_org', orgRunId: 'org-1', address: '/research/lead' });
    }
  });

  it('serves no delegated copy (task agents and task teams)', () => {
    for (const kind of ['agent_run_task_agent', 'agent_run_task_team_member', 'agent_org_task_agent', 'agent_org_task_team_member']) {
      expect(mobileRunSettingsScope({ ...base, kind } as never)).toBeNull();
    }
  });
});

describe('mobileRunSubjectLine: the run screen\'s and Settings\' status line (one builder)', () => {
  it('names the parent run, or none; "Not reachable" when the node does not answer', () => {
    expect(mobileRunSubjectLine({ status: 'idle', unreachable: false, parentName: 'Marketing Team' }).subtitle).toBe('Idle · in Marketing Team');
    expect(mobileRunSubjectLine({ status: 'offline', unreachable: false, parentName: null }).subtitle).toBe('Stopped');
    expect(mobileRunSubjectLine({ status: 'idle', unreachable: true, parentName: 'Marketing Team' }).subtitle).toBe('Not reachable');
  });
});
