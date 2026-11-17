import { describe, expect, it } from 'vitest';
import { mobileRunSettingsScope } from '../mobileRunSettingsScope';
import { mobileRunSubjectLine } from '../mobileRunSubjectLine';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

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
