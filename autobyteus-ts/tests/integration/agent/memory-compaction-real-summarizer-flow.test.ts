import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class DeterministicSummarizer extends Summarizer {
  summarize(traces: any[]): CompactionResult {
    const summary = traces.map((trace) => trace.content).filter(Boolean).join(' | ');
    return new CompactionResult(summary || 'summary', [{ fact: 'hello.py created', confidence: 0.8 }]);
  }
}

describe('Memory compaction summarizer flow', () => {
  it('stores episodic and semantic items after compaction', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-real-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_compact_real');
      const policy = new CompactionPolicy({ rawTailTurns: 1, triggerRatio: 0.1 });
      const summarizer = new DeterministicSummarizer();
      const compactor = new Compactor(store, policy, summarizer);
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      const turn1 = memoryManager.startTurn();
      memoryManager.ingestUserMessage(
        new LLMUserMessage({ content: 'We need to write hello.py that prints Hello World.' }),
        turn1,
        'LLMUserMessageReadyEvent'
      );
      const invocation = new ToolInvocation('write_file', { path: 'hello.py' }, 'call_1', turn1);
      memoryManager.ingestToolIntent(invocation, turn1);
      memoryManager.ingestToolResult(new ToolResultEvent('write_file', 'ok', 'call_1', undefined, undefined, turn1), turn1);
      memoryManager.ingestAssistantResponse(
        { content: 'Created hello.py', reasoning: null } as any,
        turn1,
        'LLMCompleteResponseReceivedEvent'
      );

      const turn2 = memoryManager.startTurn();
      memoryManager.ingestUserMessage(
        new LLMUserMessage({ content: 'Also add a short README.' }),
        turn2,
        'LLMUserMessageReadyEvent'
      );
      memoryManager.ingestAssistantResponse(
        { content: 'Added README', reasoning: null } as any,
        turn2,
        'LLMCompleteResponseReceivedEvent'
      );

      const currentTurn = memoryManager.startTurn();
      const currentUser = new LLMUserMessage({ content: 'Please respond with pong.' });
      memoryManager.ingestUserMessage(currentUser, currentTurn, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      memoryManager.requestCompaction();

      const request = await assembler.prepareRequest(currentUser, currentTurn, 'System prompt');
      expect(request.didCompact).toBe(true);

      const episodicItems = store.list(MemoryType.EPISODIC);
      const semanticItems = store.list(MemoryType.SEMANTIC);
      expect(episodicItems.length).toBeGreaterThan(0);
      expect(semanticItems.length).toBeGreaterThan(0);
      expect(episodicItems[0].summary.trim().length).toBeGreaterThan(10);
      expect(semanticItems.some((item) => item.fact)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
