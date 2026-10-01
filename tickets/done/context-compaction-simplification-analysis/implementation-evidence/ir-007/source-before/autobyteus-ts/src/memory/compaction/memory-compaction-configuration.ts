import type { CompressionStrategy } from './compression-strategy.js';
import type { CompactionCompressionExecution } from './compaction-execution.js';

export type CompressionStrategyFactory = (execution: CompactionCompressionExecution) => CompressionStrategy;
import { CompactionPolicy } from '../policies/compaction-policy.js';

export type DisabledMemoryCompactionConfiguration = Readonly<{
  kind: 'disabled';
}>;

export type EnabledMemoryCompactionConfiguration = Readonly<{
  kind: 'enabled';
  policy: CompactionPolicy;
  createCompressionStrategy: CompressionStrategyFactory;
}>;

export type MemoryCompactionConfiguration =
  | DisabledMemoryCompactionConfiguration
  | EnabledMemoryCompactionConfiguration;

export const DEFAULT_MEMORY_COMPACTION_CONFIGURATION: DisabledMemoryCompactionConfiguration =
  Object.freeze({ kind: 'disabled' });

export const createDisabledMemoryCompactionConfiguration = (
): DisabledMemoryCompactionConfiguration => DEFAULT_MEMORY_COMPACTION_CONFIGURATION;

export const createEnabledMemoryCompactionConfiguration = (
  policy: CompactionPolicy,
  createCompressionStrategy: CompressionStrategyFactory,
): EnabledMemoryCompactionConfiguration => {
  if (!(policy instanceof CompactionPolicy)) {
    throw new TypeError('Enabled memory compaction requires a CompactionPolicy instance.');
  }
  if (typeof createCompressionStrategy !== 'function') {
    throw new TypeError('Enabled memory compaction requires a compression strategy factory.');
  }
  return Object.freeze({ kind: 'enabled', policy, createCompressionStrategy });
};

export const copyMemoryCompactionConfiguration = (
  configuration: MemoryCompactionConfiguration,
): MemoryCompactionConfiguration => {
  if (configuration.kind === 'disabled') {
    return DEFAULT_MEMORY_COMPACTION_CONFIGURATION;
  }
  return createEnabledMemoryCompactionConfiguration(
    new CompactionPolicy({
      triggerRatio: configuration.policy.triggerRatio,
      maxItemChars: configuration.policy.maxItemChars,
      safetyMarginTokens: configuration.policy.safetyMarginTokens,
    }),
    configuration.createCompressionStrategy,
  );
};
