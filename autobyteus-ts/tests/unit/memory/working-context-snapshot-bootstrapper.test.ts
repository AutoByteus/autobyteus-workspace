import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryBundle } from '../../../src/memory/retrieval/memory-bundle.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';

const makeMemoryManager = (store: unknown = {}) => ({
  store,
  resetWorkingContextSnapshot: vi.fn(),
  ensureWorkingContextToolProtocolSafeForNextLlm: vi.fn(),
  retriever: { retrieve: vi.fn(() => new MemoryBundle()) },
  listRawTracesOrdered: vi.fn(() => []),
  compactionPolicy: { maxItemChars: 200 },
});

describe('WorkingContextSnapshotBootstrapper', () => {
  it('runs the schema gate first and uses the cache when no schema reset occurred', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
    const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
      agent_id: 'agent_1',
    });

    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => payload),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: false })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore as any, null, null, schemaGate as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect((schemaGate.ensureCurrentSchema as any).mock.invocationCallOrder[0]).toBeLessThan((snapshotStore.read as any).mock.invocationCallOrder[0]);
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledTimes(1);
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledWith({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
    expect(memoryManager.retriever.retrieve).not.toHaveBeenCalled();
  });

  it('repairs a schema-valid cached snapshot with missing native tool results during bootstrap', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'working-context-bootstrap-tool-repair-'));
    try {
      const agentId = 'agent_cached_tool_repair';
      const store = new FileMemoryStore(tempDir, agentId);
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
      store.add([
        new RawTraceItem({
          id: 'rt_cached_call',
          ts: 1,
          turnId: 'turn_cached',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: 'generate_image',
          toolCallId: 'call_cached',
          toolArgs: { prompt: 'page two' }
        })
      ]);
      const cached = new WorkingContextSnapshot();
      cached.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
      cached.appendMessage(new Message(MessageRole.ASSISTANT, {
        content: 'Generating page two.',
        tool_payload: new ToolCallPayload([
          { id: 'call_cached', name: 'generate_image', arguments: { prompt: 'page two' } }
        ])
      }));
      cached.appendMessage(new Message(MessageRole.USER, { content: 'please continue' }));
      snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(cached, {
        schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
        agent_id: agentId,
      }));

      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        manager,
        'System',
        new WorkingContextSnapshotBootstrapOptions()
      );

      const messages = manager.getWorkingContextMessages();
      expect(messages.map((message) => message.role)).toEqual([
        MessageRole.SYSTEM,
        MessageRole.ASSISTANT,
        MessageRole.TOOL,
        MessageRole.USER,
      ]);
      expect((messages[2].tool_payload as ToolResultPayload).toolCallId).toBe('call_cached');
      expect((messages[2].tool_payload as ToolResultPayload).toolResult).toContain(
        'Tool execution was interrupted by runtime shutdown before a result was recorded.'
      );
      const persisted = snapshotStore.read(agentId);
      expect(JSON.stringify(persisted)).toContain('call_cached');
      expect(manager.listRawTracesOrdered().some((trace) =>
        trace.traceType === 'operation_boundary' &&
        trace.sourceEvent === 'WorkingContextSnapshotBootstrapper' &&
        trace.toolCallId === 'call_cached'
      )).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rebuilds through natural recovery projection when the snapshot schema is stale', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'Old System' }));
    const stalePayload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: 2,
      agent_id: 'agent_1',
    });

    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(() => stalePayload),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: false })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const recoveryProjector = { project: vi.fn(() => [new Message(MessageRole.USER, { content: 'Recovered' })]) };
    const snapshotRebuilder = {
      rebuild: vi.fn(() => [new Message(MessageRole.SYSTEM, { content: 'Rebuilt' })]),
    };
    const bootstrapper = new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      snapshotRebuilder as any,
      recoveryProjector as any,
      schemaGate as any
    );

    bootstrapper.bootstrap(
      memoryManager as any,
      'System',
      new WorkingContextSnapshotBootstrapOptions({ maxItemChars: 123 })
    );

    expect(recoveryProjector.project).toHaveBeenCalledWith([], 123);
    expect(snapshotRebuilder.rebuild).toHaveBeenCalledWith({
      systemPrompt: 'System',
      bundle: expect.any(MemoryBundle),
      retainedMessages: recoveryProjector.project.mock.results[0].value
    });
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith(
      snapshotRebuilder.rebuild.mock.results[0].value
    );
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledWith({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
  });

  it('rebuilds without reading the cache when schema reset invalidated the snapshot', () => {
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => true),
      read: vi.fn(),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: true })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const recoveryProjector = { project: vi.fn(() => []) };
    const snapshotRebuilder = {
      rebuild: vi.fn(() => [new Message(MessageRole.SYSTEM, { content: 'Rebuilt after migration' })]),
    };
    const bootstrapper = new WorkingContextSnapshotBootstrapper(
      snapshotStore as any,
      snapshotRebuilder as any,
      recoveryProjector as any,
      schemaGate as any
    );

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(snapshotStore.read).not.toHaveBeenCalled();
    expect(recoveryProjector.project).toHaveBeenCalledWith([], 200);
    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith(
      snapshotRebuilder.rebuild.mock.results[0].value
    );
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledWith({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
  });

  it('starts clean after schema reset when no canonical rebuild inputs remain', () => {
    const snapshotStore = {
      agentId: 'agent_1',
      exists: vi.fn(() => false),
      read: vi.fn(),
    };
    const schemaGate = {
      supports: vi.fn(() => true),
      ensureCurrentSchema: vi.fn(() => ({ didReset: true })),
    };

    const memoryManager = makeMemoryManager({ agentId: 'agent_1' });
    const bootstrapper = new WorkingContextSnapshotBootstrapper(snapshotStore as any, null, null, schemaGate as any);

    bootstrapper.bootstrap(memoryManager as any, 'System', new WorkingContextSnapshotBootstrapOptions());

    expect(memoryManager.resetWorkingContextSnapshot).toHaveBeenCalledWith([
      expect.objectContaining({ role: MessageRole.SYSTEM, content: 'System' })
    ]);
    expect(memoryManager.retriever.retrieve).toHaveBeenCalledTimes(1);
    expect(memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm).toHaveBeenCalledWith({
      recoverySourceEvent: 'WorkingContextSnapshotBootstrapper',
    });
    expect(snapshotStore.read).not.toHaveBeenCalled();
  });

  it('falls back from a persisted old-schema snapshot to natural recovered messages without raw trace labels', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'working-context-bootstrap-old-schema-'));
    try {
      const agentId = 'agent_old_schema';
      const store = new FileMemoryStore(tempDir, agentId);
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
      const staleSnapshot = new WorkingContextSnapshot([
        new Message(MessageRole.SYSTEM, { content: 'Old system' }),
        new Message(MessageRole.USER, { content: '[RAW_FRONTIER] legacy stale snapshot text' }),
      ]);
      snapshotStore.write(agentId, WorkingContextSnapshotSerializer.serialize(staleSnapshot, {
        schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION - 1,
        agent_id: agentId,
      }));
      store.add([
        new RawTraceItem({
          id: 'rt_old_user',
          ts: 1,
          turnId: 'turn_0005',
          seq: 1,
          traceType: 'user',
          content: 'Please inspect the recovered task.',
          sourceEvent: 'LegacyUserEvent',
        }),
        new RawTraceItem({
          id: 'rt_old_tool_call',
          ts: 2,
          turnId: 'turn_0005',
          seq: 2,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'LegacyToolCallEvent',
          toolName: 'lookup',
          toolCallId: 'call_old_1',
          toolArgs: { query: 'status' },
        }),
        new RawTraceItem({
          id: 'rt_old_tool_result',
          ts: 3,
          turnId: 'turn_0005',
          seq: 3,
          traceType: 'tool_result',
          content: '',
          sourceEvent: 'LegacyToolResultEvent',
          toolName: 'lookup',
          toolCallId: 'call_old_1',
          toolResult: { status: 'done' },
        }),
      ]);

      const memoryManager = new MemoryManager({
        store,
        workingContextSnapshotStore: snapshotStore,
      });
      new WorkingContextSnapshotBootstrapper().bootstrap(
        memoryManager,
        'System prompt',
        new WorkingContextSnapshotBootstrapOptions({ maxItemChars: 200 }),
      );

      const messages = memoryManager.getWorkingContextMessages();
      const joined = messages.map((message) => message.content ?? '').join('\n');
      expect(messages[0]).toEqual(expect.objectContaining({
        role: MessageRole.SYSTEM,
        content: 'System prompt',
      }));
      expect(joined).toContain('Please inspect the recovered task.');
      expect(joined).toContain('I requested tool lookup with arguments');
      expect(joined).toContain('Recovered tool result from lookup');
      expect(joined).not.toContain('[RAW_FRONTIER]');
      expect(joined).not.toContain('[BLOCK');
      expect(joined).not.toContain('turn_0005');
      expect(joined).not.toContain('source_event');
      expect(joined).not.toContain('LegacyToolResultEvent');

      const persisted = snapshotStore.read(agentId);
      expect(persisted?.schema_version).toBe(WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION);
      expect(JSON.stringify(persisted)).not.toContain('[RAW_FRONTIER]');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
