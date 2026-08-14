import { describe, it, expect } from 'vitest';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

describe('CompactionPolicy', () => {
  it('should compact at ratio threshold', () => {
    const policy = new CompactionPolicy({ triggerRatio: 0.8 });
    expect(policy.classifyPressure(81, 100)).toBe('proactive');
  });

  it('should compact at budget limit', () => {
    const policy = new CompactionPolicy({ triggerRatio: 0.8 });
    expect(policy.classifyPressure(100, 100)).toBe('hard_input_cap');
  });

  it('does not compact below ratio', () => {
    const policy = new CompactionPolicy({ triggerRatio: 0.8 });
    expect(policy.classifyPressure(50, 100)).toBe('none');
  });
});
