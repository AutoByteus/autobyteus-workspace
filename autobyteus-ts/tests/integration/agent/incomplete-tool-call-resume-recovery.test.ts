import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Message, MessageRole, ToolCallPayload } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

describe('incomplete native Tool protocol strict restore boundary (API/E2E)', () => {
  it('rejects an invalid v5 snapshot without synthesizing a Tool result or mutating raw evidence', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incomplete-tool-call-resume-'));
    try {
      const agentId = 'agent_incomplete_tool_resume';
      const store = new FileMemoryStore(tempDir, agentId);
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
      store.add([
        new RawTraceItem({
          id: 'rt_resume_missing_tool_call',
          ts: 1,
          turnId: 'turn_before_shutdown',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: 'generate_image',
          toolCallId: 'call_resume_missing',
          toolArgs: { prompt: 'draw page two' },
        }),
      ]);

      const cached = new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
        new Message(MessageRole.ASSISTANT, {
          content: 'I will generate page two.',
          tool_payload: new ToolCallPayload([
            { id: 'call_resume_missing', name: 'generate_image', arguments: { prompt: 'draw page two' } },
          ]),
        }),
        new Message(MessageRole.USER, { content: 'earlier failed continue attempt' }),
      ]);
      const invalidPayload = WorkingContextSnapshotSerializer.serialize(cached, {
        agent_id: agentId,
      });
      expect(WorkingContextSnapshotSerializer.validate(invalidPayload)).toBe(false);
      snapshotStore.write(agentId, invalidPayload);
      const snapshotPath = path.join(tempDir, 'agents', agentId, 'working_context_snapshot.json');
      const beforeSnapshotBytes = fs.readFileSync(snapshotPath, 'utf8');
      const beforeRawTraces = store.listRawTracesOrdered();

      const memoryManager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      expect(() => new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        memoryManager,
        'System prompt',
        new WorkingContextSnapshotBootstrapOptions(),
      )).toThrow('Working-context v5 snapshot failed strict integrity validation.');

      expect(memoryManager.getWorkingContextMessages()).toEqual([]);
      expect(fs.readFileSync(snapshotPath, 'utf8')).toBe(beforeSnapshotBytes);
      expect(store.listRawTracesOrdered()).toEqual(beforeRawTraces);
      expect(store.listRawTracesOrdered().some((trace) =>
        trace.traceType === 'operation_boundary' || trace.traceType === 'tool_result'
      )).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
