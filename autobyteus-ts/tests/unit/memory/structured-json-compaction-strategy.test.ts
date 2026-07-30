import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { StructuredJsonCompactionStrategy } from '../../../src/memory/compaction/structured-json-compaction-strategy.js';
import type {
  MessageCompactionPlan,
  WorkingContextMessageUnit,
} from '../../../src/memory/compaction/working-context-message-unit.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const unit = (
  id: string,
  kind: 'system' | 'message' | 'compacted_memory',
  content: string,
  rawTraceIds: string[],
): WorkingContextMessageUnit => ({
  id,
  kind,
  startIndex: 0,
  endIndex: 0,
  messages: [new Message(
    kind === 'system' ? MessageRole.SYSTEM : MessageRole.USER,
    { content },
  )],
  rawTraceIds,
});

const plan = (
  compactableUnits: WorkingContextMessageUnit[],
  retainedMessages: Message[] = [],
): MessageCompactionPlan => ({
  units: compactableUnits,
  compactableUnits,
  retainedUnits: [],
  protectedSuffixUnits: [],
  retainedMessages,
  rawTraceIdsToArchive: [...new Set(compactableUnits.flatMap(({ rawTraceIds }) => rawTraceIds))],
  estimatedRetainedTokens: 0,
  estimatedCompactedTokens: 20,
});

describe('StructuredJsonCompactionStrategy', () => {
  it('returns an IDless proposal and performs no persistence or identity assignment', async () => {
    const compacted = unit('old', 'message', 'Old settled work', ['rt-old']);
    const retained = new Message(MessageRole.USER, { content: 'Recent work' });
    const planner = { plan: vi.fn(() => plan([compacted], [retained])) };
    const summarizer = {
      summarizeMessageUnits: vi.fn(async () => new CompactionResult({
        episodes: [{ summary: 'Earlier progress' }],
        durableFacts: [{ fact: 'A durable fact' }],
      })),
      getLastCompactionExecutionMetadata: vi.fn(() => ({
        runtimeKind: 'autobyteus',
        provider: 'openai',
        modelIdentifier: 'model-1',
        taskId: 'task-1',
      })),
    };
    const diagnostics = { reportPlan: vi.fn(), reportResult: vi.fn() };
    const strategy = new StructuredJsonCompactionStrategy({
      summarizer: summarizer as any,
      inputBudgetTokens: 900,
      diagnostics,
      planner: planner as any,
    });

    const proposal = await strategy.propose(new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      ...compacted.messages,
      retained,
    ]));

    expect(planner.plan).toHaveBeenCalledWith(expect.objectContaining({
      inputBudgetTokens: 900,
    }));
    expect(summarizer.summarizeMessageUnits).toHaveBeenCalledWith([compacted]);
    expect(proposal).toEqual({
      selectedNewRawTraceIds: ['rt-old'],
      retainedMessages: [retained],
      output: {
        episodes: [{ summary: 'Earlier progress' }],
        semanticEntries: [{
          category: 'durable_fact',
          fact: 'A durable fact',
          salience: 200,
        }],
      },
      execution: {
        runtimeKind: 'autobyteus',
        provider: 'openai',
        modelIdentifier: 'model-1',
        taskId: 'task-1',
      },
    });
    expect(proposal).not.toHaveProperty('compactionId');
    expect(proposal).not.toHaveProperty('episodeIds');
    expect(proposal).not.toHaveProperty('lineage');
    expect(diagnostics.reportPlan).toHaveBeenCalledWith(expect.objectContaining({
      selectedUnitCount: 1,
      rawTraceCount: 1,
    }));
    expect(diagnostics.reportResult).toHaveBeenCalledWith(expect.objectContaining({
      compactedUnitCount: 1,
      rawTraceCount: 1,
      semanticFactCount: 1,
    }));
  });

  it('passes M1 plus R2 to the summarizer but archives only R2', async () => {
    const m1 = unit('m1', 'compacted_memory', 'M1 current memory', []);
    const r2 = unit('r2', 'message', 'R2 new work', ['raw-r2']);
    const summarizer = {
      summarizeMessageUnits: vi.fn(async () => new CompactionResult({
        episodes: [{ summary: 'M2 replacement' }],
      })),
      getLastCompactionExecutionMetadata: () => ({
        runtimeKind: 'autobyteus',
        provider: 'openai',
        modelIdentifier: 'model-2',
      }),
    };
    const strategy = new StructuredJsonCompactionStrategy({
      summarizer: summarizer as any,
      inputBudgetTokens: null,
      planner: { plan: () => plan([m1, r2]) } as any,
    });

    const proposal = await strategy.propose(new WorkingContext());

    expect(summarizer.summarizeMessageUnits).toHaveBeenCalledWith([m1, r2]);
    expect(proposal.selectedNewRawTraceIds).toEqual(['raw-r2']);
    expect(proposal.output.episodes).toEqual([{ summary: 'M2 replacement' }]);
  });

  it('fails before the runner when no raw-backed natural input is eligible', async () => {
    const summarizeMessageUnits = vi.fn();
    const strategy = new StructuredJsonCompactionStrategy({
      summarizer: {
        summarizeMessageUnits,
        getLastCompactionExecutionMetadata: () => null,
      } as any,
      inputBudgetTokens: null,
      planner: { plan: () => plan([]) } as any,
    });

    await expect(strategy.propose(new WorkingContext())).rejects.toThrow(
      'No eligible settled natural working-context message',
    );
    expect(summarizeMessageUnits).not.toHaveBeenCalled();
  });
});
