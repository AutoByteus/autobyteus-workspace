import { describe, it, expect } from 'vitest';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { WorkingContextSnapshotBootstrapper, WorkingContextSnapshotBootstrapOptions } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-restore-'));

describe('WorkingContextSnapshot restore integration', () => {
  it('uses cache when valid', () => {
    const tempDir = makeTempDir();
    try {
      const snapshot = new WorkingContextSnapshot();
      snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
      snapshot.appendMessage(new Message(MessageRole.USER, { content: 'Hello' }));

      const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
        schema_version: 1,
        agent_id: 'agent_cache'
      });

      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_cache');
      snapshotStore.write('agent_cache', payload);

      const store = new FileMemoryStore(tempDir, 'agent_cache');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore);
      bootstrapper.bootstrap(manager, 'System', new WorkingContextSnapshotBootstrapOptions());

      const messages = manager.getWorkingContextMessages();
      expect(messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
      expect(messages[1].content).toBe('Hello');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to rebuild when cache missing', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_fallback');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_fallback');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      const episodic = new EpisodicItem({
        id: 'ep_1',
        ts: Date.now() / 1000,
        turnIds: ['turn_0001'],
        summary: 'User asked about memory.'
      });
      const semantic = new SemanticItem({
        id: 'sem_1',
        ts: Date.now() / 1000,
        fact: 'User prefers concise answers.'
      });
      const rawTail = new RawTraceItem({
        id: 'rt_1',
        ts: Date.now() / 1000,
        turnId: 'turn_0002',
        seq: 1,
        traceType: 'user',
        content: 'Current question',
        sourceEvent: 'LLMUserMessageReadyEvent'
      });
      store.add([episodic, semantic, rawTail]);

      const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore);
      const options = new WorkingContextSnapshotBootstrapOptions({ maxEpisodic: 3, maxSemantic: 20, rawTailTurns: 1 });
      bootstrapper.bootstrap(manager, 'System', options);

      const messages = manager.getWorkingContextMessages();
      expect(messages[0].role).toBe(MessageRole.SYSTEM);
      expect(messages[1].role).toBe(MessageRole.USER);
      expect(messages[1].content).toContain('[MEMORY:EPISODIC]');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
