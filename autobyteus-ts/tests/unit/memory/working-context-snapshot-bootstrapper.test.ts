import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const makeMemoryManagerBoundary = (store: unknown = { agentId: 'agent_1' }) => ({
  store,
  replaceWorkingContext: vi.fn(),
  ensureWorkingContextToolProtocolSafeForNextLlm: vi.fn(),
  listRawTraceCorpusOrdered: vi.fn(() => []),
  compactionPolicy: { maxItemChars: 200 },
  workingContextSnapshotStore: null,
});

describe('WorkingContextSnapshotBootstrapper', () => {
  it('runs the schema gate first and installs a valid v4 cache directly', () => {
    const context = new WorkingContext([new Message(MessageRole.SYSTEM, { content: 'System' })]);
    const payload = {
      ...WorkingContextSnapshotSerializer.serialize(context, { agent_id: 'agent_1' }),
      epoch_id: 7,
      last_compaction_ts: 42,
    };
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => payload),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: false })),
    };
    const manager = makeMemoryManagerBoundary();
    const projector = { project: vi.fn() };

    new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      projector as any,
      null as any,
      schemaGate as any,
    ).bootstrap(manager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(schemaGate.ensureCurrentSchema.mock.invocationCallOrder[0]).toBeLessThan(
      snapshotStore.read.mock.invocationCallOrder[0],
    );
    expect(manager.replaceWorkingContext).toHaveBeenCalledWith(expect.any(WorkingContext));
    expect(manager.replaceWorkingContext.mock.calls[0]![0].buildMessages()[0]?.content).toBe('System');
    expect(projector.project).not.toHaveBeenCalled();
  });

  it('uses the shared compacted-memory projector for restore fallback', () => {
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => false),
      read: vi.fn(),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: true })),
    };
    const recovered = [new Message(MessageRole.USER, { content: 'Recovered' })];
    const recoveryProjector = { project: vi.fn(() => recovered) };
    const projected = new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      ...recovered,
    ]);
    const compactedMemoryProjector = { project: vi.fn(() => projected) };
    const manager = makeMemoryManagerBoundary();

    new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      compactedMemoryProjector as any,
      recoveryProjector as any,
      schemaGate as any,
    ).bootstrap(
      manager as any,
      'System',
      new WorkingContextSnapshotBootstrapOptions({ maxEpisodic: 5, maxSemantic: 9, maxItemChars: 123 }),
    );

    expect(snapshotStore.read).not.toHaveBeenCalled();
    expect(recoveryProjector.project).toHaveBeenCalledWith([], 123);
    expect(compactedMemoryProjector.project).toHaveBeenCalledWith({
      systemPrompt: 'System',
      continuationMessages: recovered,
      maxEpisodic: 5,
      maxSemantic: 9,
    });
    expect(manager.replaceWorkingContext).toHaveBeenCalledWith(projected);
  });

  it('repairs a schema-valid cached context with a missing native tool result', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'working-context-bootstrap-tool-repair-'));
    try {
      const agentId = 'agent_cached_tool_repair';
      const store = new FileMemoryStore(tempDir, agentId);
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
      store.add([new RawTraceItem({
        id: 'rt_cached_call',
        ts: 1,
        turnId: 'turn_cached',
        seq: 1,
        traceType: 'tool_call',
        content: '',
        sourceEvent: 'PendingToolInvocationEvent',
        toolName: 'generate_image',
        toolCallId: 'call_cached',
        toolArgs: { prompt: 'page two' },
      })]);
      const cached = new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.ASSISTANT, {
          content: 'Generating page two.',
          tool_payload: new ToolCallPayload([
            { id: 'call_cached', name: 'generate_image', arguments: { prompt: 'page two' } },
          ]),
        }),
        new Message(MessageRole.USER, { content: 'please continue' }),
      ]);
      snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(cached, { agent_id: agentId }));
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });

      new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        manager,
        'System',
        new WorkingContextSnapshotBootstrapOptions(),
      );

      const messages = manager.getWorkingContextMessages();
      expect(messages.map(({ role }) => role)).toEqual([
        MessageRole.SYSTEM,
        MessageRole.ASSISTANT,
        MessageRole.TOOL,
        MessageRole.USER,
      ]);
      expect((messages[2]!.tool_payload as ToolResultPayload).toolCallId).toBe('call_cached');
      expect(manager.listRawTracesOrdered().some((trace) =>
        trace.traceType === 'operation_boundary'
        && trace.sourceEvent === 'WorkingContextSnapshotBootstrapper'
      )).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
