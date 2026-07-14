import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { AgentCompactionSummarizer } from '../../../src/memory/compaction/agent-compaction-summarizer.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../src/memory/compaction/compaction-agent-runner.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { StructuredJsonCompactionStrategy } from '../../../src/memory/compaction/structured-json-compaction-strategy.js';
import type { MessageCompactionPlan, WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';
import { getMessageProvenance } from '../../../src/memory/message-provenance.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import { Retriever } from '../../../src/memory/retrieval/retriever.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const unit = (id: string, message: Message): WorkingContextMessageUnit => ({
  id,
  kind: message.role === MessageRole.SYSTEM ? 'system' : 'message',
  startIndex: 0,
  endIndex: 0,
  messages: [message],
  rawTraceIds: [`rt-${id}`],
});

describe('StructuredJsonCompactionStrategy', () => {
  it('owns planning, durable effects, private 3/20 projection, and returns the projected context', async () => {
    const head = new Message(MessageRole.SYSTEM, { content: 'System' });
    const compacted = new Message(MessageRole.USER, { content: 'Old settled work' });
    const retained = new Message(MessageRole.USER, { content: 'Recent work' });
    const headUnit = unit('head', head);
    const compactedUnit = unit('old', compacted);
    const retainedUnit = unit('recent', retained);
    const plan: MessageCompactionPlan = {
      units: [headUnit, compactedUnit, retainedUnit],
      headMessages: [head],
      compactableUnits: [compactedUnit],
      retainedUnits: [retainedUnit],
      protectedSuffixUnits: [],
      retainedMessages: [retained],
      rawTraceIdsToArchive: ['rt-old'],
      estimatedRetainedTokens: 10,
      estimatedCompactedTokens: 20,
    };
    const planner = { plan: vi.fn(() => plan) };
    const summarizer = {
      summarizeMessageUnits: vi.fn(async () => new CompactionResult('Earlier progress', {
        durableFacts: [{ fact: 'A durable fact' }],
      })),
      getLastCompactionExecutionMetadata: vi.fn(() => ({ taskId: 'task-1' })),
    };
    const store = { add: vi.fn(), pruneRawTracesById: vi.fn() };
    const projected = new WorkingContext([head, new Message(MessageRole.USER, { content: 'projected' }), retained]);
    const projector = { project: vi.fn(() => projected) };
    const diagnostics = { reportPlan: vi.fn(), reportResult: vi.fn() };
    const strategy = new StructuredJsonCompactionStrategy({
      store: store as any,
      summarizer: summarizer as any,
      inputBudgetTokens: 900,
      compactedMemoryProjector: projector as any,
      diagnostics,
      planner: planner as any,
    });

    const result = await strategy.compact(new WorkingContext([head, compacted, retained]));

    expect(planner.plan).toHaveBeenCalledWith(expect.objectContaining({ inputBudgetTokens: 900 }));
    expect(summarizer.summarizeMessageUnits).toHaveBeenCalledWith([compactedUnit]);
    expect(store.add).toHaveBeenCalledTimes(1);
    expect(store.add.mock.calls[0]![0][0]).toBeInstanceOf(EpisodicItem);
    expect(store.add.mock.calls[0]![0][1]).toBeInstanceOf(SemanticItem);
    expect(store.pruneRawTracesById).toHaveBeenCalledWith(['rt-old'], true);
    expect(projector.project).toHaveBeenCalledWith({
      headMessages: [head],
      continuationMessages: [retained],
      maxEpisodic: 3,
      maxSemantic: 20,
    });
    expect(result).toBe(projected);
    expect(diagnostics.reportPlan).toHaveBeenCalledWith(expect.objectContaining({ selectedUnitCount: 1 }));
    expect(diagnostics.reportResult).toHaveBeenCalledWith(expect.objectContaining({
      compactedUnitCount: 1,
      rawTraceCount: 1,
      semanticFactCount: 1,
      compactionMetadata: { taskId: 'task-1' },
    }));
  });

  it('fails before durable writes when no compactable unit exists', async () => {
    const store = { add: vi.fn(), pruneRawTracesById: vi.fn() };
    const planner = { plan: () => ({
      units: [], headMessages: [], compactableUnits: [], retainedUnits: [], protectedSuffixUnits: [],
      retainedMessages: [], rawTraceIdsToArchive: [], estimatedRetainedTokens: 0, estimatedCompactedTokens: 0,
    }) };
    const strategy = new StructuredJsonCompactionStrategy({
      store: store as any,
      summarizer: {} as any,
      inputBudgetTokens: null,
      compactedMemoryProjector: {} as any,
      planner: planner as any,
    });
    await expect(strategy.compact(new WorkingContext())).rejects.toThrow('No eligible settled');
    expect(store.add).not.toHaveBeenCalled();
  });

  it('replaces the synthetic projection across two operations and preserves later continuation', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structured-strategy-sequential-'));
    class SequencedRunner implements CompactionAgentRunner {
      tasks: CompactionAgentTask[] = [];

      async runCompactionTask(task: CompactionAgentTask) {
        this.tasks.push(task);
        const sequence = this.tasks.length;
        return {
          outputText: JSON.stringify({
            episodic_summary: `sequential summary ${sequence}`,
            critical_issues: [],
            unresolved_work: [],
            durable_facts: [{ fact: `sequential fact ${sequence}` }],
            user_preferences: [],
            important_artifacts: [],
          }),
        };
      }
    }

    const now = vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000);
    try {
      const store = new FileMemoryStore(tempDir, 'agent-sequential');
      const runner = new SequencedRunner();
      const createStrategy = () => new StructuredJsonCompactionStrategy({
        store,
        summarizer: new AgentCompactionSummarizer({ runner }),
        inputBudgetTokens: null,
        compactedMemoryProjector: new CompactedMemoryContextProjector(new Retriever(store)),
      });
      const initial = new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        ...Array.from({ length: 8 }, (_, index) => new Message(
          index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
          { content: `initial context ${index + 1}` },
        )),
      ]);

      const first = await createStrategy().compact(initial);
      expect(first.buildMessages().filter(
        (message) => getMessageProvenance(message)?.sourceKind === 'compacted_memory',
      )).toHaveLength(1);

      const withLaterContinuation = first.copy();
      for (let index = 1; index <= 6; index += 1) {
        withLaterContinuation.appendMessage(new Message(
          index % 2 === 0 ? MessageRole.ASSISTANT : MessageRole.USER,
          { content: `later continuation ${index}` },
        ));
      }

      const second = await createStrategy().compact(withLaterContinuation);
      const secondMessages = second.buildMessages();
      const compactedMemoryMessages = secondMessages.filter(
        (message) => getMessageProvenance(message)?.sourceKind === 'compacted_memory',
      );
      expect(runner.tasks).toHaveLength(2);
      expect(compactedMemoryMessages).toHaveLength(1);
      expect(compactedMemoryMessages[0]?.content).toContain('sequential summary 1');
      expect(compactedMemoryMessages[0]?.content).toContain('sequential summary 2');
      expect(secondMessages.map((message) => message.content)).toEqual(expect.arrayContaining([
        'later continuation 3',
        'later continuation 4',
        'later continuation 5',
        'later continuation 6',
      ]));
    } finally {
      now.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
