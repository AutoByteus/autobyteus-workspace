import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { foldTeamAggregateStatus } from '../workspaceTeamAggregateStatus';

describe('foldTeamAggregateStatus', () => {
  it.each([
    [[AgentStatus.Running, AgentStatus.Initializing, AgentStatus.Error], AgentStatus.Running],
    [[AgentStatus.Initializing, AgentStatus.Error, AgentStatus.Idle], AgentStatus.Initializing],
    [[AgentStatus.Error, AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Error],
    [[AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Idle],
    [[AgentStatus.Offline, null, undefined, 'unknown'], AgentStatus.Offline],
    [[], AgentStatus.Offline],
  ] as const)('folds live values %j to %s', (statuses, expected) => {
    expect(foldTeamAggregateStatus(statuses, 'live')).toBe(expected);
  });

  it('demotes live-only historical values while retaining terminal truth', () => {
    expect(foldTeamAggregateStatus([
      AgentStatus.Running,
      AgentStatus.Initializing,
      AgentStatus.Error,
    ], 'historical')).toBe(AgentStatus.Error);
    expect(foldTeamAggregateStatus([
      AgentStatus.Running,
      AgentStatus.Initializing,
    ], 'historical')).toBe(AgentStatus.Offline);
    expect(foldTeamAggregateStatus([
      AgentStatus.Running,
      AgentStatus.Idle,
    ], 'historical')).toBe(AgentStatus.Idle);
  });

  it('normalizes casing and whitespace without admitting unknown states', () => {
    expect(foldTeamAggregateStatus([' RUNNING ', 'unexpected'], 'live'))
      .toBe(AgentStatus.Running);
    expect(foldTeamAggregateStatus([' INITIALIZING '], 'historical'))
      .toBe(AgentStatus.Offline);
  });
});
