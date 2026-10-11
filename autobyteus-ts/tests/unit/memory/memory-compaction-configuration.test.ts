import { describe, expect, it } from 'vitest';
import {
  copyMemoryCompactionConfiguration,
  createDisabledMemoryCompactionConfiguration,
  createEnabledMemoryCompactionConfiguration,
  DEFAULT_MEMORY_COMPACTION_CONFIGURATION,
} from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

describe('MemoryCompactionConfiguration', () => {
  it('represents disabled as one complete immutable variant with no policy', () => {
    const configuration = createDisabledMemoryCompactionConfiguration();

    expect(configuration).toBe(DEFAULT_MEMORY_COMPACTION_CONFIGURATION);
    expect(configuration).toEqual({ kind: 'disabled' });
    expect(configuration).not.toHaveProperty('policy');
    expect(configuration).not.toHaveProperty('createCompressionStrategy');
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(copyMemoryCompactionConfiguration(configuration)).toBe(configuration);
  });

  it('constructs enabled from the policy only (the summarizer is core-owned, not injected)', () => {
    const policy = new CompactionPolicy({
      triggerRatio: 0.2,
      maxItemChars: 1234,
      safetyMarginTokens: 77,
    });
    const configuration = createEnabledMemoryCompactionConfiguration(policy);

    expect(configuration).toEqual({ kind: 'enabled', policy });
    expect(Object.keys(configuration).sort()).toEqual(['kind', 'policy']);
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(() => createEnabledMemoryCompactionConfiguration(null as any))
      .toThrow(/CompactionPolicy/);
  });

  it('copies enabled with fresh mutable policy state', () => {
    const original = createEnabledMemoryCompactionConfiguration(
      new CompactionPolicy({
        triggerRatio: 0.2,
        maxItemChars: 1234,
        safetyMarginTokens: 77,
      }),
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
    expect(Object.keys(copy).sort()).toEqual(['kind', 'policy']);

    copy.policy.triggerRatio = 0.8;
    expect(original.policy.triggerRatio).toBe(0.2);
  });
});
