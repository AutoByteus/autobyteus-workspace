import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class TestSummarizer extends Summarizer {
  async summarize(): Promise<CompactionResult> {
    return new CompactionResult('Summary', {
      durableFacts: [{ fact: 'tool flow preserved' }],
    });
  }
}

describe('Memory compaction tool tail integration', () => {
  it('retains the live tool suffix as canonical messages without raw frontier text', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-tail-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_compact_tool_tail');
      const policy = new CompactionPolicy({ triggerRatio: 0.1 });
      const compactor = new Compactor(store, new TestSummarizer());
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      const oldTurn = memoryManager.startTurn();
      memoryManager.appendWorkingContextUserMessage('old user', { turnId: oldTurn });
      memoryManager.ingestAssistantResponse(new CompleteResponse({ content: 'old assistant' }), oldTurn, 'test');
      const olderTurn = memoryManager.startTurn();
      memoryManager.appendWorkingContextUserMessage('older user', { turnId: olderTurn });
      memoryManager.ingestAssistantResponse(new CompleteResponse({ content: 'older assistant' }), olderTurn, 'test');

      const tailTurn = memoryManager.startTurn();
      memoryManager.appendWorkingContextUserMessage('tail user', { turnId: tailTurn });
      memoryManager.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'I will write a file.' }),
        [new ToolInvocation('write_file', { path: 'x.txt' }, 'call_1', tailTurn)],
        tailTurn,
        'test'
      );
      memoryManager.ingestToolResults([
        new ToolResultEvent('write_file', 'ok', 'call_1', undefined, { path: 'x.txt' }, tailTurn)
      ], tailTurn);
      memoryManager.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'I will write another file.' }),
        [new ToolInvocation('write_file', { path: 'y.txt' }, 'call_2', tailTurn)],
        tailTurn,
        'test'
      );
      memoryManager.ingestToolResults([
        new ToolResultEvent('write_file', 'ok 2', 'call_2', undefined, { path: 'y.txt' }, tailTurn)
      ], tailTurn);

      const assembler = new LLMRequestAssembler(
        memoryManager,
        new OpenAIChatRenderer(),
        new PendingCompactionExecutor(memoryManager)
      );
      memoryManager.requestCompaction(tailTurn);

      const request = await assembler.prepareToolContinuationRequest(tailTurn, 'System prompt');

      expect(request.didCompact).toBe(true);
      const joinedText = request.messages.map((message) => message.content ?? '').join('\n');
      expect(joinedText).not.toContain('[RAW_FRONTIER]');
      expect(joinedText).not.toContain('[BLOCK');
      expect(joinedText).not.toContain('turn_');

      const latestAssistant = request.messages.at(-2);
      const latestToolResult = request.messages.at(-1);
      expect(latestAssistant?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(latestToolResult?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect((latestAssistant?.tool_payload as ToolCallPayload).toolCalls[0].id).toBe('call_2');
      expect((latestToolResult?.tool_payload as ToolResultPayload).toolCallId).toBe('call_2');

      expect(JSON.stringify(request.renderedPayload)).toContain('"tool_calls"');
      expect(JSON.stringify(request.renderedPayload)).toContain('"tool_call_id":"call_2"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
