import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { WorkingContextFinalizer } from '../../../src/memory/working-context-finalizer.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-snapshot-'));
const finalized = (...messages: Message[]) =>
  new WorkingContextFinalizer().finalize({ messages });

describe('MemoryManager working context snapshot persistence', () => {
  it('persists on replaceWorkingContext', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_persist');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_persist');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      const context = finalized(new Message(MessageRole.SYSTEM, { content: 'System' }));
      manager.replaceWorkingContext(context);

      const payload = snapshotStore.read('agent_persist');
      expect(payload).not.toBeNull();
      expect((payload as any).messages[0].role).toBe('system');
      expect(WorkingContextSnapshotSerializer.validate(payload!)).toBe(true);
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

      manager.replaceWorkingContext(finalized(new Message(MessageRole.SYSTEM, { content: 'System' })));

      const turnId = manager.startTurn();
      manager.ingestAssistantResponse({ content: 'Hello', reasoning: null } as any, turnId, 'LLMCompleteResponseReceivedEvent');

      const payload = snapshotStore.read('agent_persist') as any;
      const roles = payload.messages.map((msg: any) => msg.role);
      expect(roles).toEqual(['system', 'assistant']);
      expect(WorkingContextSnapshotSerializer.validate(payload)).toBe(true);
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
      manager.ingestToolResult(
        new ToolResultEvent(
          'search',
          { matches: ['current'] },
          'call-1',
          undefined,
          { query: 'current' },
          turnId,
        ),
        turnId,
      );

      const persisted = snapshotStore.read('agent_persist_tool_provenance')!;
      const { workingContext } = WorkingContextSnapshotSerializer.deserialize(persisted);
      const messages = workingContext.buildMessages();
      expect(messages).toHaveLength(2);
      expect(getWorkingContextMessageProvenance(messages[0]!)).toMatchObject({
        kind: 'single',
        turnId,
      });
      expect(getWorkingContextMessageProvenance(messages[1]!)).toMatchObject({
        kind: 'single',
        turnId,
      });
      const rawTraceIds = messages.flatMap((message) => {
        const provenance = getWorkingContextMessageProvenance(message);
        return provenance?.kind === 'single' ? provenance.rawTraceIds : [];
      });
      expect(new Set(rawTraceIds).size).toBe(3);
      expect(WorkingContextSnapshotSerializer.validate(persisted)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
