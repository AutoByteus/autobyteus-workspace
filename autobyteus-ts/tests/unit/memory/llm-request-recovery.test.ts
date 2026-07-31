import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

describe('LLM request recovery boundary', () => {
  it('restores the pre-request working context and compaction state while preserving recovery traces', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-request-recovery-'));
    tempDirs.push(tempDir);
    const manager = new MemoryManager({
      store: new FileMemoryStore(tempDir, 'agent-recovery'),
      workingContext: new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.USER, { content: 'Earlier user turn' }),
      ]),
    });
    manager.appendRawTrace({
      turnId: 'turn-before',
      traceType: 'user',
      content: 'Earlier user turn',
      sourceEvent: 'test',
    });

    const snapshot = manager.captureLlmRequestRecoverySnapshot({
      turnId: 'turn-failed',
      requestId: 'turn-failed:llm:1',
      sourceEvent: 'test.capture',
    });
    manager.appendWorkingContextUserMessage(new Message(MessageRole.USER, {
      content: 'Failed image-bearing continuation',
      image_urls: ['data:image/png;base64,'],
    }), { turnId: 'turn-failed' });
    manager.requestCompaction('turn-failed');

    manager.restoreLlmRequestRecoverySnapshot(snapshot, {
      sourceEvent: 'test.restore',
      reason: 'synthetic provider failure',
    });

    expect(manager.getWorkingContextMessages().map((message) => message.content)).toEqual([
      'System prompt',
      'Earlier user turn',
    ]);
    expect(manager.getPendingCompactionRequest()).toBeNull();
    expect(manager.compactionRequired).toBe(false);
    expect(manager.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      'user',
      'llm_request_recovery',
    ]);
    expect(manager.listRawTracesOrdered().at(-1)?.content).toContain('synthetic provider failure');
  });
});
