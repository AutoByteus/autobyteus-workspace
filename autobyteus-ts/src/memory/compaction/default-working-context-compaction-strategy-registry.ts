import { AgentCompactionSummarizer } from './agent-compaction-summarizer.js';
import type { CompactionAgentRunner } from './compaction-agent-runner.js';
import { StructuredJsonCompactionStrategy } from './structured-json-compaction-strategy.js';
import { WorkingContextCompactionStrategyRegistry } from './working-context-compaction-strategy-registry.js';

const requireCompactionRunner = (runner: CompactionAgentRunner | null): CompactionAgentRunner => {
  if (!runner) {
    throw new Error('Structured JSON compaction requires a compaction agent runner.');
  }
  return runner;
};

export const defaultWorkingContextCompactionStrategyRegistry =
  new WorkingContextCompactionStrategyRegistry();

defaultWorkingContextCompactionStrategyRegistry.register({
  id: 'structured-json',
  name: 'Structured JSON',
  create: (context) => new StructuredJsonCompactionStrategy({
    summarizer: new AgentCompactionSummarizer({
      runner: requireCompactionRunner(context.compactionAgentRunner),
      parentAgentId: context.agentId,
      maxItemChars: context.maxItemChars,
    }),
    inputBudgetTokens: context.inputBudgetTokens,
    diagnostics: context.diagnostics,
  }),
});
