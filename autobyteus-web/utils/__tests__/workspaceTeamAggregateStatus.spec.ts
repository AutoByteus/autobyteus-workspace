import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { foldTeamAggregateStatus, resolveTeamStatus } from '../workspaceTeamAggregateStatus';

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

/** delegated-team-aggregate-status REQ-001/003, AC-002/003/004/007: the universal Team status rule. */
describe('resolveTeamStatus', () => {
  it.each([
    [[AgentStatus.Running, AgentStatus.Offline], AgentStatus.Running],
    [[AgentStatus.Initializing], AgentStatus.Running],
    [[AgentStatus.Initializing, AgentStatus.Error, AgentStatus.Idle], AgentStatus.Running],
    [[AgentStatus.Running, AgentStatus.Error], AgentStatus.Running],
    [[AgentStatus.Error, AgentStatus.Idle], AgentStatus.Error],
    [[AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Idle],
    [[AgentStatus.Offline, null, undefined, 'unknown'], AgentStatus.Offline],
    [[], AgentStatus.Offline],
  ] as const)('ranks busy > error > idle > offline: %j -> %s', (statuses, expected) => {
    expect(resolveTeamStatus(statuses, true)).toBe(expected);
  });

  it('is offline when the run is not alive, whatever the agents last reported', () => {
    for (const status of [AgentStatus.Running, AgentStatus.Initializing, AgentStatus.Error, AgentStatus.Idle]) {
      expect(resolveTeamStatus([status], false)).toBe(AgentStatus.Offline);
    }
  });

  it('ranks Team statuses one level up (a group of runs)', () => {
    expect(resolveTeamStatus([AgentStatus.Offline, AgentStatus.Idle, AgentStatus.Running], true)).toBe(AgentStatus.Running);
    expect(resolveTeamStatus([AgentStatus.Offline, AgentStatus.Idle, AgentStatus.Error], true)).toBe(AgentStatus.Error);
    expect(resolveTeamStatus([AgentStatus.Offline, AgentStatus.Offline], true)).toBe(AgentStatus.Offline);
  });
});
