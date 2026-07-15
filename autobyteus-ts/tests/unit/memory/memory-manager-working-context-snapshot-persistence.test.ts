import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { getMessageProvenance } from '../../../src/memory/message-provenance.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-snapshot-'));

describe('MemoryManager working context snapshot persistence', () => {
  it('persists on replaceWorkingContext', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_persist');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_persist');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      const context = new WorkingContext([new Message(MessageRole.SYSTEM, { content: 'System' })]);
      manager.replaceWorkingContext(context);

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

      manager.replaceWorkingContext(new WorkingContext([new Message(MessageRole.SYSTEM, { content: 'System' })]));

      const turnId = manager.startTurn();
      manager.ingestAssistantResponse({ content: 'Hello', reasoning: null } as any, turnId, 'LLMCompleteResponseReceivedEvent');

      const payload = snapshotStore.read('agent_persist') as any;
      const roles = payload.messages.map((msg: any) => msg.role);
      expect(roles).toEqual(['system', 'assistant']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists enriched assistant/tool provenance through controlled message replacement', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_persist_tool_provenance');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_persist_tool_provenance');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      const turnId = manager.startTurn();

      manager.ingestAssistantToolResponse(
        { content: 'I will search.', reasoning: 'Need current results.' } as any,
        [new ToolInvocation('search', { query: 'current' }, 'call-1', turnId)],
        turnId,
      );

      const persisted = snapshotStore.read('agent_persist_tool_provenance')!;
      const { workingContext } = WorkingContextSnapshotSerializer.deserialize(persisted);
      const messages = workingContext.buildMessages();
      expect(messages).toHaveLength(1);
      expect(getMessageProvenance(messages[0]!)).toMatchObject({
        sourceKind: 'assistant_tool_response',
        turnId,
        toolCallIds: ['call-1'],
      });
      expect(getMessageProvenance(messages[0]!)?.rawTraceIds).toHaveLength(2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
