import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { WorkingContextSnapshotBootstrapper } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import {
  createCompactedMemoryUserMessage,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const agentId = 'agent-bootstrap';
describe('WorkingContextSnapshotBootstrapper current-only restore', () => {
  let tempDir: string;
  let memoryStore: FileMemoryStore;
  let snapshotStore: WorkingContextSnapshotStore;
  let manager: MemoryManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-bootstrap-v5-'));
    memoryStore = new FileMemoryStore(tempDir, agentId);
    snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
    manager = new MemoryManager({
      store: memoryStore,
      snapshotStore,
      workingContextSnapshotStore: snapshotStore,
      agentId,
    } as any);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('restores a valid v5 snapshot directly and preserves exact current memory shape', () => {
    memoryStore.add([new EpisodicItem({ id: 'e1', ts: 1, summary: 'Current M1' })]);
    const expected = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'Stored system' }),
        createCompactedMemoryUserMessage('Current M1'),
      ],
    });
    snapshotStore.write(agentId, { schema_version: 5, ...WorkingContextSnapshotSerializer.serialize(expected, {
      agent_id: agentId,
    }) });

    new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'Different current base prompt',
      { maxItemChars: null },
    );

    expect(manager.getWorkingContextMessages().map(({ content }) => content))
      .toEqual(['Stored system', 'Current M1']);
    expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId)!)).toBe(true);
  });

  it('requires a current snapshot instead of replaying raw history', () => {
    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'Current base system prompt',
      { maxItemChars: null },
    )).toThrow(`Explicit WorkingContext restore requires a current snapshot for agent '${agentId}'.`);

    expect(manager.getWorkingContextMessages()).toEqual([]);
    expect(snapshotStore.read(agentId)).toBeNull();
  });

  it('rejects missing current facts without an old-schema reader', () => {
    snapshotStore.write(agentId, {
      schema_version: 4,
      agent_id: agentId,
      messages: [{ role: 'user', content: 'legacy without provenance' }],
    });

    expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
      manager,
      'System',
      { maxItemChars: null },
    )).toThrow('Working-context snapshot failed safe envelope validation.');
  });

  it('restores a compacted-memory snapshot without category or lineage files', () => {
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
    )).not.toThrow();
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
    )).toThrow('Working-context snapshot agent identity conflicts with its run.');
    expect(manager.getWorkingContextMessages()).toEqual([]);
  });
  it.each([{ results: 0 }, { results: 1 }, { results: 2 }, { results: 2, rawAhead: true }])(
    'independently repairs an actual writer cut: %j', ({ results, rawAhead = false }) => {
      const summary = 'Preserve confirmed work 🧠 and pending approval.';
      manager.replaceWorkingContext(new WorkingContextFinalizer().finalize({ messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }), createCompactedMemoryUserMessage(summary),
      ] }));
      const turn = manager.startTurn();
      const native = { provider: 'openai_responses' as const, functionCallItem: { opaque: { retained: true } } };
      manager.ingestToolIntents(['a', 'b'].map((id) => new ToolInvocation('inspect', { id }, id, turn, native)), turn);
      for (let i = 0; i < results; i++) manager.ingestToolResults([
        new ToolResultEvent('inspect', { committed: i }, ['a', 'b'][i]!, undefined, {}, turn),
      ], turn, { appendToWorkingContext: !rawAhead });
      const cut = snapshotStore.read(agentId)!;
      expect(Object.keys(cut)).toEqual(['agent_id', 'messages']);
      expect(WorkingContextSnapshotSerializer.validateEnvelope(cut)).toBe(true);
      expect(WorkingContextSnapshotSerializer.validate(cut)).toBe(results === 2 && !rawAhead);
      const reopened = new MemoryManager({ store: new FileMemoryStore(tempDir, agentId), workingContextSnapshotStore: snapshotStore, agentId });
      const repair = vi.spyOn(reopened, 'ensureWorkingContextToolProtocolSafeForNextLlm');
      const fullValidation = vi.spyOn(WorkingContextSnapshotSerializer, 'validate');
      const save = vi.spyOn(reopened, 'persistWorkingContextSnapshot');
      try {
        new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(reopened, 'ignored', { maxItemChars: null });
        expect(repair).toHaveBeenCalledWith({ recoverySourceEvent: 'WorkingContextSnapshotBootstrapper', rawTraceScope: 'active' });
        expect(fullValidation).toHaveReturnedWith(true);
        expect(repair.mock.invocationCallOrder[0]).toBeLessThan(fullValidation.mock.invocationCallOrder[0]!);
        expect(fullValidation.mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder.at(-1)!);
        const messages = reopened.getWorkingContextMessages();
        expect(messages.find((m) => m.role === MessageRole.USER)?.content).toBe(summary);
        const calls = messages.find((m) => m.tool_payload instanceof ToolCallPayload)?.tool_payload as ToolCallPayload;
        expect(calls.toolCalls.map((c) => c.nativeToolCallContext)).toEqual([native, native]);
        const restored = messages.filter((m) => m.role === MessageRole.TOOL).map((m) => m.tool_payload as ToolResultPayload);
        expect(restored).toHaveLength(2);
        restored.forEach((result, i) => {
          if (i < results) { expect(result.toolResult).toEqual({ committed: i }); expect(result.toolError).toBeNull(); }
          else expect(result.toolError).toContain('interrupted');
        });
        expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId))).toBe(true);
      } finally { vi.restoreAllMocks(); }
    },
  );

});
