import { describe, expect, it, vi } from 'vitest';
import {
  copyMemoryCompactionConfiguration,
  createDisabledMemoryCompactionConfiguration,
  createEnabledMemoryCompactionConfiguration,
  DEFAULT_MEMORY_COMPACTION_CONFIGURATION,
} from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

const makeRunner = () => ({ summarize: vi.fn() });

describe('MemoryCompactionConfiguration', () => {
  it('represents disabled as one complete immutable variant with no policy or summarizer', () => {
    const configuration = createDisabledMemoryCompactionConfiguration();

    expect(configuration).toBe(DEFAULT_MEMORY_COMPACTION_CONFIGURATION);
    expect(configuration).toEqual({ kind: 'disabled' });
    expect(configuration).not.toHaveProperty('policy');
    expect(configuration).not.toHaveProperty('summarizer');
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(copyMemoryCompactionConfiguration(configuration)).toBe(configuration);
  });

  it('constructs enabled only with the current policy and a non-null summarizer', () => {
    const policy = new CompactionPolicy({
      triggerRatio: 0.2,
      maxItemChars: 1234,
      safetyMarginTokens: 77,
    });
    const summarizer = makeRunner();
    const configuration = createEnabledMemoryCompactionConfiguration(policy, summarizer);

    expect(configuration).toEqual({ kind: 'enabled', policy, summarizer });
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(() => createEnabledMemoryCompactionConfiguration(null as any, summarizer))
      .toThrow(/CompactionPolicy/);
    expect(() => createEnabledMemoryCompactionConfiguration(policy, null as any))
      .toThrow(/summarizer/);
  });

  it('copies enabled with fresh mutable policy state and the same summarizer identity', () => {
    const summarizer = makeRunner();
    const original = createEnabledMemoryCompactionConfiguration(
      new CompactionPolicy({
        triggerRatio: 0.2,
        maxItemChars: 1234,
        safetyMarginTokens: 77,
      }),
      summarizer,
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
    expect(copy.summarizer).toBe(summarizer);

    copy.policy.triggerRatio = 0.8;
    expect(original.policy.triggerRatio).toBe(0.2);
  });
});
