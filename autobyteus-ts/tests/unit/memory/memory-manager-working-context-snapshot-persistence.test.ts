import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-snapshot-'));

describe('MemoryManager working context snapshot persistence', () => {
  it('persists on resetWorkingContextSnapshot', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_persist');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_persist');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      const snapshot = [new Message(MessageRole.SYSTEM, { content: 'System' })];
      manager.resetWorkingContextSnapshot(snapshot);

      const payload = snapshotStore.read('agent_persist');
      expect(payload).not.toBeNull();
      expect((payload as any).messages[0].role).toBe('system');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists after ingestAssistantResponse', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_persist');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_persist');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      manager.resetWorkingContextSnapshot([new Message(MessageRole.SYSTEM, { content: 'System' })]);

      const turnId = manager.startTurn();
      manager.ingestAssistantResponse({ content: 'Hello', reasoning: null } as any, turnId, 'LLMCompleteResponseReceivedEvent');

      const payload = snapshotStore.read('agent_persist') as any;
      const roles = payload.messages.map((msg: any) => msg.role);
      expect(roles).toEqual(['system', 'assistant']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
