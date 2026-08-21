import { describe, expect, it } from 'vitest';
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
import { WorkingContext } from '../../../src/memory/working-context.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { SYNTHETIC_TOOL_RESULT_ERROR } from '../../../src/memory/working-context-tool-protocol-repairer.js';
import {
  buildSingleMessageProvenance,
  setWorkingContextMessageProvenance,
} from '../../../src/memory/working-context-provenance.js';

describe('incomplete native Tool protocol restore boundary (API/E2E)', () => {
  it('repairs an orphaned native call before strict validation and converges raw and snapshot evidence', () => {
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
        setWorkingContextMessageProvenance(
          new Message(MessageRole.SYSTEM, { content: 'System prompt' }),
          buildSingleMessageProvenance([], 'turn_before_shutdown'),
        ),
        setWorkingContextMessageProvenance(
          new Message(MessageRole.ASSISTANT, {
            content: 'I will generate page two.',
            tool_payload: new ToolCallPayload([
              { id: 'call_resume_missing', name: 'generate_image', arguments: { prompt: 'draw page two' } },
            ]),
          }),
          buildSingleMessageProvenance([], 'turn_before_shutdown'),
        ),
        setWorkingContextMessageProvenance(
          new Message(MessageRole.USER, { content: 'earlier failed continue attempt' }),
          {
            kind: 'composed_user',
            constituents: [{
              kind: 'retained_user',
              textRange: { start: 0, end: 'earlier failed continue attempt'.length },
              rawTraceIds: [],
              turnId: 'turn_before_shutdown',
              imageRange: { start: 0, end: 0 },
              audioRange: { start: 0, end: 0 },
              videoRange: { start: 0, end: 0 },
            }],
          },
        ),
      ]);
      const invalidPayload = WorkingContextSnapshotSerializer.serialize(cached, {
        agent_id: agentId,
      });
      expect(WorkingContextSnapshotSerializer.validate(invalidPayload)).toBe(false);
      snapshotStore.write(agentId, invalidPayload);
      const snapshotPath = path.join(tempDir, 'agents', agentId, 'working_context_snapshot.json');
      const memoryManager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        memoryManager,
        'System prompt',
        new WorkingContextSnapshotBootstrapOptions(),
      );

      const repairedMessages = memoryManager.getWorkingContextMessages();
      const repairedResult = repairedMessages[2]?.tool_payload as ToolResultPayload;
      expect(repairedResult).toBeInstanceOf(ToolResultPayload);
      expect(repairedResult.toolCallId).toBe('call_resume_missing');
      expect(repairedResult.toolResult).toBeNull();
      expect(repairedResult.toolError).toBe(
        SYNTHETIC_TOOL_RESULT_ERROR('generate_image', 'call_resume_missing'),
      );
      expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId)!)).toBe(true);

      const repairedRawTraces = store.listTurnRawTracesOrdered();
      const terminalResults = repairedRawTraces.filter((trace) =>
        trace.traceType === 'tool_result' && trace.toolCallId === 'call_resume_missing'
      );
      expect(terminalResults).toHaveLength(1);
      expect(terminalResults[0]).toMatchObject({
        turnId: 'turn_before_shutdown',
        toolName: 'generate_image',
        toolArgs: { prompt: 'draw page two' },
        toolResult: null,
        toolError: SYNTHETIC_TOOL_RESULT_ERROR('generate_image', 'call_resume_missing'),
      });
      expect(fs.existsSync(snapshotPath)).toBe(true);

      // A second restore is a no-op for protocol repair and does not append a duplicate result.
      new WorkingContextSnapshotBootstrapper(snapshotStore).bootstrap(
        memoryManager,
        'System prompt',
        new WorkingContextSnapshotBootstrapOptions(),
      );
      expect(store.listTurnRawTracesOrdered().filter((trace) =>
        trace.traceType === 'tool_result' && trace.toolCallId === 'call_resume_missing'
      )).toHaveLength(1);
      expect(WorkingContextSnapshotSerializer.validate(snapshotStore.read(agentId)!)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
