import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';

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
    });
    manager.appendWorkingContextUserMessage(new Message(MessageRole.USER, {
      content: 'Failed image-bearing continuation',
      image_urls: ['data:image/png;base64,'],
    }), { turnId: 'turn-failed' });
    manager.requestCompaction({
      requestedTurnId: 'turn-failed',
      requestKind: 'threshold_crossing',
      planningBudget: resolveCompactionPlanningBudget(
        { inputBudget: 10_000, triggerThresholdTokens: 8_000 },
        9_000,
      ),
    });

    manager.restoreLlmRequestRecoverySnapshot(snapshot, {
      sourceEvent: 'test.restore',
      reason: 'synthetic provider failure',
    });

    expect(manager.getWorkingContextMessages().map((message) => message.content)).toEqual([
      'System prompt',
      'Earlier user turn',
    ]);
    expect(manager.getPendingCompactionRequest()).toBeNull();
    expect(manager.hasPendingCompaction()).toBe(false);
    expect(manager.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
      'user',
      'llm_request_recovery',
    ]);
    expect(manager.listRawTracesOrdered().at(-1)?.content).toContain('synthetic provider failure');
  });

  it('settles each captured request exactly once for either restore or commit', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-request-settlement-'));
    tempDirs.push(tempDir);
    const manager = new MemoryManager({
      store: new FileMemoryStore(tempDir, 'agent-settlement'),
      workingContext: new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'Stable base' }),
      ]),
    });
    const restored = manager.captureLlmRequestRecoverySnapshot({
      turnId: 'turn-restore',
      requestId: 'turn-restore:llm:1',
    });

    manager.restoreLlmRequestRecoverySnapshot(restored, {
      sourceEvent: 'test.restore',
      reason: 'provider rejected request',
    });
    expect(() => manager.commitLlmRequestRecoverySnapshot(restored)).toThrow(
      `Unknown or already-settled LLM request recovery snapshot '${restored.snapshotId}'.`,
    );

    const committed = manager.captureLlmRequestRecoverySnapshot({
      turnId: 'turn-commit',
      requestId: 'turn-commit:llm:1',
    });
    manager.commitLlmRequestRecoverySnapshot(committed);
    expect(() => manager.restoreLlmRequestRecoverySnapshot(committed, {
      sourceEvent: 'test.restore-after-commit',
      reason: 'must not restore',
    })).toThrow(`Unknown or already-settled LLM request recovery snapshot '${committed.snapshotId}'.`);
    expect(manager.listRawTracesOrdered().filter(({ traceType }) =>
      traceType === 'llm_request_recovery'
    )).toHaveLength(1);
  });
});
