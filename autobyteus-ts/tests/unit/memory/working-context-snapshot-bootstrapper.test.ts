import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { WorkingContextSnapshotBootstrapper } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import {
  createCompactedMemoryUserMessage,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';
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

  it('recovers only the trusted active interruption fence with provenance after reset', () => {
    memoryStore.add([
      new RawTraceItem({
        id: 'trusted-boundary',
        ts: 1,
        turnId: 'turn-interrupted',
        seq: 1,
        traceType: 'operation_boundary',
        content: 'Cancellation fence: do not resume the interrupted action.',
        sourceEvent: 'AgentTurnInterruptedEvent',
      }),
      new RawTraceItem({
        id: 'wrong-source',
        ts: 2,
        turnId: 'turn-interrupted',
        seq: 2,
        traceType: 'operation_boundary',
        content: 'UNTRUSTED_BOUNDARY',
        sourceEvent: 'OtherEvent',
      }),
      new RawTraceItem({
        id: 'blank-trusted',
        ts: 3,
        turnId: 'turn-interrupted',
        seq: 3,
        traceType: 'operation_boundary',
        content: '   ',
        sourceEvent: 'AgentTurnInterruptedEvent',
      }),
      new RawTraceItem({
        id: 'follow-up-active-history',
        ts: 4,
        turnId: 'turn-follow-up',
        seq: 1,
        traceType: 'user',
        content: 'Natural active continuation.',
        sourceEvent: 'UserMessageReceivedEvent',
      }),
    ]);

    new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'Current base system prompt',
      { maxItemChars: null },
    );

    const messages = manager.getWorkingContextMessages();
    expect(messages.map(({ role }) => role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.SYSTEM,
      MessageRole.USER,
    ]);
    expect(messages.map(({ content }) => content)).toEqual([
      'Current base system prompt',
      'Cancellation fence: do not resume the interrupted action.',
      'Natural active continuation.',
    ]);
    expect(JSON.stringify(messages)).not.toContain('UNTRUSTED_BOUNDARY');
    expect(getWorkingContextMessageProvenance(messages[1]!)).toEqual({
      kind: 'single',
      rawTraceIds: ['trusted-boundary'],
      turnId: 'turn-interrupted',
    });
    expect(manager.loadCurrentCompactionOutput()).toBeNull();
    expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId)!)).toBe(true);
  });

  it('fails closed when a lineage head exists without its required v5 snapshot', () => {
    memoryStore.add([new EpisodicItem({ id: 'e1', ts: 1, summary: 'Current M1' })]);
    lineageStore.appendNext(null, lineageRecord());

    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'System',
      { maxItemChars: null },
    )).toThrow("Current lineage head 'c1' requires a v5 message snapshot");
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
});
