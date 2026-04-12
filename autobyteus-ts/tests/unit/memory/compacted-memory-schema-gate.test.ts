import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { CompactedMemorySchemaGate } from '../../../src/memory/restore/compacted-memory-schema-gate.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { COMPACTED_MEMORY_SCHEMA_VERSION } from '../../../src/memory/store/compacted-memory-manifest.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-schema-gate-'));

describe('CompactedMemorySchemaGate', () => {
  it('clears stale flat semantic memory, writes manifest v2, and invalidates stale snapshots', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_reset');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_reset');
      const semanticPath = path.join(tempDir, 'agents', 'agent_reset', 'semantic.jsonl');
      fs.writeFileSync(
        semanticPath,
        [
          JSON.stringify({ id: 'old_1', ts: 100, fact: 'Critical validation finding: Pinia getter attempts to access undefined products.value causing reference error', tags: ['validation'] }),
          JSON.stringify({ id: 'old_2', ts: 101, fact: 'User prefers concise answers', tags: ['preference'] }),
        ].join('\n') + '\n',
        'utf-8'
      );

      const snapshot = new WorkingContextSnapshot();
      snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'stale' }));
      snapshotStore.write('agent_reset', WorkingContextSnapshotSerializer.serialize(snapshot, {
        schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
        agent_id: 'agent_reset',
      }));

      const gate = new CompactedMemorySchemaGate();
      const result = gate.ensureCurrentSchema(store, snapshotStore, 'agent_reset');

      expect(result.didReset).toBe(true);
      expect(snapshotStore.exists('agent_reset')).toBe(false);
      expect(store.readCompactedMemoryManifest()).toEqual(expect.objectContaining({
        schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      }));
      expect(store.list(MemoryType.SEMANTIC)).toEqual([]);
      expect(store.readSemanticDicts()).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps typed semantic memory and only backfills the manifest when no stale records exist', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_typed');
      store.replaceSemanticItems([
        new SemanticItem({ id: 'sem_1', ts: 100, category: 'durable_fact', fact: 'Keep this', salience: 200 }),
      ]);

      const gate = new CompactedMemorySchemaGate();
      const result = gate.ensureCurrentSchema(store, null, 'agent_typed');

      expect(result.didReset).toBe(false);
      expect(store.readCompactedMemoryManifest()).toEqual(expect.objectContaining({
        schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      }));
      expect((store.list(MemoryType.SEMANTIC) as SemanticItem[])[0]?.fact).toBe('Keep this');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('writes the current manifest and does not reset when semantic store is empty', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_empty');
      const gate = new CompactedMemorySchemaGate();

      const result = gate.ensureCurrentSchema(store, null, 'agent_empty');

      expect(result.didReset).toBe(false);
      expect(store.readCompactedMemoryManifest()).toEqual(expect.objectContaining({
        schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      }));
      expect(store.list(MemoryType.SEMANTIC)).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
