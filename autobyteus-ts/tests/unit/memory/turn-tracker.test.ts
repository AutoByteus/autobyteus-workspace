import { describe, it, expect } from 'vitest';
import { TurnTracker } from '../../../src/memory/turn-tracker.js';

describe('TurnTracker', () => {
  it('increments turn ids with zero padding', () => {
    const tracker = new TurnTracker();
    expect(tracker.nextTurnId()).toBe('turn_0001');
    expect(tracker.nextTurnId()).toBe('turn_0002');
  });

  it('respects custom start', () => {
    const tracker = new TurnTracker(10);
    expect(tracker.nextTurnId()).toBe('turn_0010');
  });
});

describe('TurnTracker.continuingAfter (autobyteus-526)', () => {
  it('continues one past the highest stored turn_NNNN; other ids do not count; none stored starts at turn_0001', () => {
    expect(TurnTracker.continuingAfter(['turn_0002', 'turn_0010', 'turn_0003']).nextTurnId()).toBe('turn_0011');
    expect(TurnTracker.continuingAfter(['custom-id', 'turn_12a', 'turn_']).nextTurnId()).toBe('turn_0001');
    expect(TurnTracker.continuingAfter([]).nextTurnId()).toBe('turn_0001');
    expect(TurnTracker.continuingAfter(['turn_9999']).nextTurnId()).toBe('turn_10000');
  });
});
