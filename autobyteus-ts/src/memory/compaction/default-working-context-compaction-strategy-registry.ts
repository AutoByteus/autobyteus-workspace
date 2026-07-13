import { AgentCompactionSummarizer } from './agent-compaction-summarizer.js';
import { Retriever } from '../retrieval/retriever.js';
import { CompactedMemoryContextProjector } from '../projection/compacted-memory-context-projector.js';
import type { CompactionAgentRunner } from './compaction-agent-runner.js';
import { StructuredJsonCompactionStrategy } from './structured-json-compaction-strategy.js';
import { WorkingContextCompactionStrategyRegistry } from './working-context-compaction-strategy-registry.js';

const requireCompactionRunner = (runner: CompactionAgentRunner | null): CompactionAgentRunner => {
  if (!runner) {
    throw new Error([
      'No compactor agent is configured.',
      'Set AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID in Server Settings -> Basics -> Compaction.',
    ].join(' '));
  }
  return runner;
};

export const defaultWorkingContextCompactionStrategyRegistry =
  new WorkingContextCompactionStrategyRegistry();

defaultWorkingContextCompactionStrategyRegistry.register({
  id: 'structured-json',
  name: 'Structured JSON',
  create: (context) => new StructuredJsonCompactionStrategy({
    store: context.memoryStore,
    summarizer: new AgentCompactionSummarizer({
      runner: requireCompactionRunner(context.compactionAgentRunner),
      parentAgentId: context.agentId,
      maxItemChars: context.maxItemChars,
    }),
    inputBudgetTokens: context.inputBudgetTokens,
    compactedMemoryProjector: new CompactedMemoryContextProjector(
      new Retriever(context.memoryStore),
    ),
    diagnostics: context.diagnostics,
  }),
});
