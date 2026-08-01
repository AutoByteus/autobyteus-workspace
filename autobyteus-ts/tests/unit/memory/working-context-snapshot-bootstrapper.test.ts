import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { WorkingContextSnapshotBootstrapper } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import {
  createCompactedMemoryUserMessage,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const agentId = 'agent-bootstrap';
const scope: CompactionLineageScope = {
  targetKind: 'agent_run',
  runId: agentId,
  memberId: null,
};

const lineageRecord = (): CompactionLineageRecord => ({
  schemaVersion: 1,
  scope,
  compactionId: 'c1',
  previousCompactionId: null,
  rawTraceArchiveFile: 'raw_traces_000001.jsonl',
  episodeIds: ['e1'],
  semanticIds: [],
  derivedAt: '2026-07-30T00:00:00.000Z',
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    model: 'model-1',
    selectionPolicyVersion: 1,
    promptContractVersion: 1,
  },
});

describe('WorkingContextSnapshotBootstrapper current-only restore', () => {
  let tempDir: string;
  let memoryStore: FileMemoryStore;
  let snapshotStore: WorkingContextSnapshotStore;
  let lineageStore: FileCompactionLineageStore;
  let manager: MemoryManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-bootstrap-v5-'));
    memoryStore = new FileMemoryStore(tempDir, agentId);
    snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
    lineageStore = new FileCompactionLineageStore(memoryStore.agentDir, scope);
    manager = new MemoryManager({
      store: memoryStore,
      snapshotStore,
      workingContextSnapshotStore: snapshotStore,
      lineageStore,
      lineageScope: scope,
      agentId,
    } as any);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('restores a valid v5 snapshot directly and preserves exact current memory shape', () => {
    memoryStore.add([new EpisodicItem({ id: 'e1', ts: 1, summary: 'Current M1' })]);
    lineageStore.appendNext(null, lineageRecord());
    const expected = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'Stored system' }),
        createCompactedMemoryUserMessage('Current M1'),
      ],
    });
    snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(expected, {
      agent_id: agentId,
    }));

    new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'Different current base prompt',
      { maxItemChars: null },
    );

    expect(manager.getWorkingContextMessages().map(({ content }) => content))
      .toEqual(['Stored system', 'Current M1']);
    expect(manager.loadCurrentCompactionOutput()?.lineageHead.compactionId).toBe('c1');
    expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId)!)).toBe(true);
  });

  it('requires a strict v5 snapshot instead of replaying raw history', () => {
    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'Current base system prompt',
      { maxItemChars: null },
    )).toThrow(`Explicit WorkingContext restore requires a strict v5 snapshot for agent '${agentId}'.`);

    expect(manager.getWorkingContextMessages()).toEqual([]);
    expect(snapshotStore.read(agentId)).toBeNull();
  });

  it('rejects historical snapshot schemas without an old-schema reader', () => {
    snapshotStore.write(agentId, {
      schema_version: 4,
      agent_id: agentId,
      messages: [],
    });

    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'System',
      { maxItemChars: null },
    )).toThrow("Unsupported working-context snapshot schema '4'.");
  });

  it('rejects a compacted-memory snapshot when lineage is absent', () => {
    const inconsistent = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        createCompactedMemoryUserMessage('Orphan memory'),
      ],
    });
    snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(inconsistent, {
      agent_id: agentId,
    }));

    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'System',
      { maxItemChars: null },
    )).toThrow('Snapshot compacted memory cannot exist without a lineage head');
  });

  it('rejects a valid strict-v5 payload whose agent identity conflicts with the run', () => {
    const expected = new WorkingContextFinalizer().finalize({
      messages: [new Message(MessageRole.SYSTEM, { content: 'Stored system' })],
    });
    snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(expected, {
      agent_id: 'different-agent',
    }));

    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'System',
      { maxItemChars: null },
    )).toThrow('Working-context v5 snapshot agent identity conflicts with its run.');
    expect(manager.getWorkingContextMessages()).toEqual([]);
  });
});
