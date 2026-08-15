import type { CompactionAgentRunner } from './compaction-agent-runner.js';
import { CompactionPolicy } from '../policies/compaction-policy.js';

export type DisabledMemoryCompactionConfiguration = Readonly<{
  kind: 'disabled';
}>;

export type EnabledMemoryCompactionConfiguration = Readonly<{
  kind: 'enabled';
  policy: CompactionPolicy;
  runner: CompactionAgentRunner;
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
  runner: CompactionAgentRunner,
): EnabledMemoryCompactionConfiguration => {
  if (!(policy instanceof CompactionPolicy)) {
    throw new TypeError('Enabled memory compaction requires a CompactionPolicy instance.');
  }
  if (!runner || typeof runner.runCompactionTask !== 'function') {
    throw new TypeError('Enabled memory compaction requires a compaction agent runner.');
  }
  return Object.freeze({ kind: 'enabled', policy, runner });
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
    configuration.runner,
  );
};
