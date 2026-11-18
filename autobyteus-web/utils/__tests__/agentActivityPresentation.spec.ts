/**
 * autobyteus-448 DEC-004 (REQ-006, AC-005): the one mapping from an agent's status and running background task count to
 * its text, dot and icon. A turn wins; an idle agent with background tasks shows them with the active, non-pulsing dot;
 * offline and error show as today.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { agentActivityLabel, agentActivityPresentation } from '~/utils/agentActivityPresentation';
import { agentStatusDotClass, agentTransientStatusDotClass } from '~/utils/workspaceStatusDotPresentation';
import { teamActivityOf } from '~/utils/workspaceTeamAggregateStatus';

const t = (key: string, params?: Readonly<Record<string, string | number>>) => localizationRuntime.translate(key, params);
const label = (status: AgentStatus, backgroundTasksRunning: number) => {
  const presentation = agentActivityPresentation({ status, backgroundTasksRunning });
  return t(presentation.labelKey, presentation.labelParams);
};

afterEach(async () => { await localizationRuntime.setPreference('en'); });

describe('agentActivityPresentation (DEC-004)', () => {
  it('an idle agent with background tasks running shows them, with the active blue dot (not pulsing) and the arrow-path icon', () => {
    expect(agentActivityPresentation({ status: AgentStatus.Idle, backgroundTasksRunning: 1 })).toMatchObject({
      kind: 'background', labelKey: 'workspace.agentActivity.backgroundOne', dotClass: 'bg-blue-500', transientDotClass: 'text-blue-700',
      iconName: 'heroicons:arrow-path',
    });
    expect(agentActivityPresentation({ status: AgentStatus.Idle, backgroundTasksRunning: 3 })).toMatchObject({
      kind: 'background', labelKey: 'workspace.agentActivity.backgroundOther', labelParams: { count: 3 } });
    expect(label(AgentStatus.Idle, 1)).toBe('Background task running');
    expect(label(AgentStatus.Idle, 3)).toBe('3 background tasks running');
  });

  it('a turn wins (a run in a turn shows "Running"); offline, error and starting show as today whatever the count', () => {
    expect(agentActivityPresentation({ status: AgentStatus.Running, backgroundTasksRunning: 2 })).toMatchObject({ kind: 'running', dotClass: 'bg-blue-500 animate-pulse' });
    expect(agentActivityPresentation({ status: AgentStatus.Initializing, backgroundTasksRunning: 2 }).kind).toBe('initializing');
    expect(agentActivityPresentation({ status: AgentStatus.Error, backgroundTasksRunning: 2 }).kind).toBe('error');
    expect(agentActivityPresentation({ status: AgentStatus.Offline, backgroundTasksRunning: 2 }).kind).toBe('offline');
    expect(agentActivityPresentation({ status: AgentStatus.Idle, backgroundTasksRunning: 0 })).toMatchObject({ kind: 'idle', dotClass: 'bg-green-500' });
    expect(agentActivityPresentation({ status: AgentStatus.Idle })).toMatchObject({ kind: 'idle' });
    for (const bad of [-1, 1.5, Number.NaN]) expect(agentActivityPresentation({ status: AgentStatus.Idle, backgroundTasksRunning: bad }).kind).toBe('idle');
    expect(agentActivityPresentation({ status: 'unexpected', backgroundTasksRunning: 1 }).kind).toBe('offline');
    expect(label(AgentStatus.Running, 2)).toBe('Running');
  });

  it('the dots delegate to it; a surface keeps its own words except for the background text', () => {
    expect(agentStatusDotClass(AgentStatus.Idle, 1)).toBe('bg-blue-500');
    expect(agentStatusDotClass(AgentStatus.Idle)).toBe('bg-green-500');
    expect(agentTransientStatusDotClass(AgentStatus.Idle, 2)).toBe('text-blue-700');
    expect(agentActivityLabel({ status: AgentStatus.Idle, backgroundTasksRunning: 2 }, t, () => 'idle')).toBe('2 background tasks running');
    expect(agentActivityLabel({ status: AgentStatus.Idle, backgroundTasksRunning: 0 }, t, () => 'idle')).toBe('idle');
  });

  it('is localized in zh-CN', async () => {
    await localizationRuntime.setPreference('zh-CN');
    expect(label(AgentStatus.Idle, 1)).toBe('后台任务运行中');
    expect(label(AgentStatus.Idle, 4)).toBe('4 个后台任务运行中');
  });
});

describe('teamActivityOf (a Team row: busy > background > error > idle > offline)', () => {
  it('a Team that is not busy shows its agents\' background tasks, even with an error; busy and offline show as today', () => {
    expect(teamActivityOf(AgentStatus.Idle, 1)).toEqual({ status: AgentStatus.Idle, backgroundTasksRunning: 1 });
    expect(agentActivityPresentation(teamActivityOf(AgentStatus.Error, 2)).kind).toBe('background');
    expect(agentActivityPresentation(teamActivityOf(AgentStatus.Running, 2)).kind).toBe('running');
    expect(agentActivityPresentation(teamActivityOf(AgentStatus.Offline, 2)).kind).toBe('offline');
    expect(agentActivityPresentation(teamActivityOf(AgentStatus.Error, 0)).kind).toBe('error');
    expect(agentActivityPresentation(teamActivityOf(AgentStatus.Idle, 0)).kind).toBe('idle');
  });
});
