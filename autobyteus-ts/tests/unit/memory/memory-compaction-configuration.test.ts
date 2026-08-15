import { describe, expect, it, vi } from 'vitest';
import {
  copyMemoryCompactionConfiguration,
  createDisabledMemoryCompactionConfiguration,
  createEnabledMemoryCompactionConfiguration,
  DEFAULT_MEMORY_COMPACTION_CONFIGURATION,
} from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

const makeRunner = () => ({ runCompactionTask: vi.fn() });

describe('MemoryCompactionConfiguration', () => {
  it('represents disabled as one complete immutable variant with no policy or runner', () => {
    const configuration = createDisabledMemoryCompactionConfiguration();

    expect(configuration).toBe(DEFAULT_MEMORY_COMPACTION_CONFIGURATION);
    expect(configuration).toEqual({ kind: 'disabled' });
    expect(configuration).not.toHaveProperty('policy');
    expect(configuration).not.toHaveProperty('runner');
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(copyMemoryCompactionConfiguration(configuration)).toBe(configuration);
  });

  it('constructs enabled only with the current policy and a non-null runner', () => {
    const policy = new CompactionPolicy({
      triggerRatio: 0.2,
      maxItemChars: 1234,
      safetyMarginTokens: 77,
    });
    const runner = makeRunner();
    const configuration = createEnabledMemoryCompactionConfiguration(policy, runner);

    expect(configuration).toEqual({ kind: 'enabled', policy, runner });
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(() => createEnabledMemoryCompactionConfiguration(null as any, runner))
      .toThrow(/CompactionPolicy/);
    expect(() => createEnabledMemoryCompactionConfiguration(policy, null as any))
      .toThrow(/runner/);
  });

  it('copies enabled with fresh mutable policy state and the same runner identity', () => {
    const runner = makeRunner();
    const original = createEnabledMemoryCompactionConfiguration(
      new CompactionPolicy({
        triggerRatio: 0.2,
        maxItemChars: 1234,
        safetyMarginTokens: 77,
      }),
      runner,
    );
    const copy = copyMemoryCompactionConfiguration(original);

    expect(copy.kind).toBe('enabled');
    if (copy.kind !== 'enabled') throw new Error('Expected enabled copy.');
    expect(copy).not.toBe(original);
    expect(copy.policy).not.toBe(original.policy);
    expect(copy.policy).toMatchObject({
      triggerRatio: 0.2,
      maxItemChars: 1234,
      safetyMarginTokens: 77,
    });
    expect(copy.runner).toBe(runner);

    copy.policy.triggerRatio = 0.8;
    expect(original.policy.triggerRatio).toBe(0.2);
  });
});
