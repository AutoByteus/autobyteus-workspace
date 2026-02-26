import { describe, it, expect } from 'vitest';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionSnapshotBuilder } from '../../../src/memory/compaction-snapshot-builder.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';

describe('CompactionSnapshotBuilder', () => {
  it('formats episodic, semantic, and recent turns', () => {
    const builder = new CompactionSnapshotBuilder();
    const bundle = new MemoryBundle({
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
    const rawTail = [
      new RawTraceItem({
        id: 'rt_1',
        ts: Date.now() / 1000,
        turnId: 'turn_0002',
        seq: 1,
        traceType: 'user',
        content: 'Hello',
        sourceEvent: 'LLMUserMessageReadyEvent'
      }),
      new RawTraceItem({
        id: 'rt_2',
        ts: Date.now() / 1000,
        turnId: 'turn_0002',
        seq: 2,
        traceType: 'tool_call',
        content: '',
        sourceEvent: 'PendingToolInvocationEvent',
        toolName: 'list_directory',
        toolCallId: 'call_1',
        toolArgs: { path: 'src' }
      }),
      new RawTraceItem({
        id: 'rt_3',
        ts: Date.now() / 1000,
        turnId: 'turn_0002',
        seq: 3,
        traceType: 'tool_result',
        content: '',
        sourceEvent: 'ToolResultEvent',
        toolName: 'list_directory',
        toolCallId: 'call_1',
        toolResult: ['a.py', 'b.py']
      })
    ];

    const messages = builder.build('System prompt', bundle, rawTail);

    expect(messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    const summaryText = messages[1].content ?? '';
    expect(summaryText).toContain('[MEMORY:EPISODIC]');
    expect(summaryText).toContain('Did a thing.');
    expect(summaryText).toContain('[MEMORY:SEMANTIC]');
    expect(summaryText).toContain('Use vitest.');
    expect(summaryText).toContain('[RECENT TURNS]');
    expect(summaryText).toContain('list_directory');
    expect(summaryText).toContain('TOOL:');
    expect(summaryText).toContain('->');
  });
});
