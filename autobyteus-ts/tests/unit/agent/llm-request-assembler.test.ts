import { describe, it, expect, vi } from 'vitest';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { CompactionSnapshotBuilder } from '../../../src/memory/compaction-snapshot-builder.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';

class FakeRenderer extends BasePromptRenderer {
  async render(messages: Message[]) {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

class FakeMemoryManager {
  workingContextSnapshot = new WorkingContextSnapshot();
  compactionPolicy = new CompactionPolicy();
  compactor: { selectCompactionWindow: () => string[]; compact: (turns: string[]) => void } = {
    selectCompactionWindow: () => [],
    compact: () => {}
  };
  retriever: { retrieve: (maxEpisodic: number, maxSemantic: number) => MemoryBundle } = {
    retrieve: () => new MemoryBundle()
  };
  compactionRequired = false;
  private rawTail: RawTraceItem[];

  constructor(rawTail?: RawTraceItem[]) {
    this.rawTail = rawTail ?? [];
  }

  requestCompaction(): void {
    this.compactionRequired = true;
  }

  clearCompactionRequest(): void {
    this.compactionRequired = false;
  }

  getWorkingContextMessages(): Message[] {
    return this.workingContextSnapshot.buildMessages();
  }

  resetWorkingContextSnapshot(snapshotMessages: Iterable<Message>): void {
    this.workingContextSnapshot.reset(snapshotMessages);
  }

  getRawTail(_tailTurns: number, excludeTurnId?: string | null): RawTraceItem[] {
    if (excludeTurnId) {
      return this.rawTail.filter((item) => item.turnId !== excludeTurnId);
    }
    return [...this.rawTail];
  }
}

describe('LLMRequestAssembler', () => {
  it('prepareRequest appends system + user without compaction', async () => {
    const memoryManager = new FakeMemoryManager();
    const assembler = new LLMRequestAssembler(memoryManager as any, new FakeRenderer());

    const request = await assembler.prepareRequest('hello', null, 'System prompt');

    expect(request.didCompact).toBe(false);
    expect(request.messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    expect(memoryManager.workingContextSnapshot.buildMessages()).toEqual(request.messages);
  });

  it('prepareRequest compacts and resets working context snapshot when requested', async () => {
    const rawTail = [
      new RawTraceItem({
        id: 'rt_1',
        ts: Date.now() / 1000,
        turnId: 'turn_0001',
        seq: 1,
        traceType: 'user',
        content: 'Old',
        sourceEvent: 'LLMUserMessageReadyEvent'
      })
    ];
    const memoryManager = new FakeMemoryManager(rawTail);
    memoryManager.compactionPolicy = new CompactionPolicy({ triggerRatio: 0.1 });
    memoryManager.compactor.selectCompactionWindow = () => ['turn_0001'];
    memoryManager.compactor.compact = vi.fn();
    memoryManager.retriever.retrieve = () =>
      new MemoryBundle({
        episodic: [
          new EpisodicItem({
            id: 'ep_1',
            ts: Date.now() / 1000,
            turnIds: ['turn_0001'],
            summary: 'Did a thing.'
          })
        ],
        semantic: [
          new SemanticItem({
            id: 'sem_1',
            ts: Date.now() / 1000,
            fact: 'Use vitest.'
          })
        ]
      });

    const assembler = new LLMRequestAssembler(
      memoryManager as any,
      new FakeRenderer(),
      new CompactionSnapshotBuilder()
    );

    memoryManager.requestCompaction();

    const request = await assembler.prepareRequest('new input', 'turn_0002', 'System prompt');

    expect(request.didCompact).toBe(true);
    expect(memoryManager.workingContextSnapshot.epochId).toBe(2);
    expect(memoryManager.workingContextSnapshot.lastCompactionTs).not.toBeNull();
    expect(request.messages.map((message) => message.role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.USER,
      MessageRole.USER
    ]);
    expect(request.messages[1].content).toContain('[MEMORY:EPISODIC]');
    expect(request.messages[1].content).toContain('Did a thing.');
  });
});
