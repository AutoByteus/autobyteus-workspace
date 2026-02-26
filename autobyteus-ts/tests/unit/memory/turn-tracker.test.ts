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
