import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';
import { OUTPUT_LIMIT_RECOVERY_TRACE_TYPE } from '../../../src/memory/output-limit-recovery-trace.js';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';

const NOTE = 'System note: output token limit hit. Resume directly from where your previous message stopped.';

describe('MemoryManager.appendOutputLimitRecoveryNote (D-06)', () => {
  it('records an output_limit_recovery trace and a USER message linked to it that survives snapshot restore', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'output-limit-note-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_note');
      const snapshotStore = new WorkingContextSnapshotStore(tempDir, 'agent_note');
      const manager = new MemoryManager({ store, workingContextSnapshotStore: snapshotStore });
      const turnId = manager.startTurn();
      manager.appendWorkingContextUserMessage('Write the design spec.', { turnId });
      manager.ingestAssistantResponse(new CompleteResponse({ content: 'Part one' }), turnId, 'LlmPhaseOutputLimited');

      manager.appendOutputLimitRecoveryNote({ turnId, content: NOTE });

      const traces = store.list(MemoryType.RAW_TRACE) as any[];
      const noteTrace = traces.find((trace) => trace.traceType === OUTPUT_LIMIT_RECOVERY_TRACE_TYPE);
      expect(noteTrace).toMatchObject({ turnId, content: NOTE });
      expect(traces.filter((trace) => trace.traceType === 'user')).toHaveLength(0);

      const messages = manager.getWorkingContextMessages();
      const note = messages.at(-1)!;
      expect(note.role).toBe(MessageRole.USER);
      expect(note.content).toBe(NOTE);
      expect(messages.map((message) => message.role)).toEqual([MessageRole.USER, MessageRole.ASSISTANT, MessageRole.USER]);
      const provenance = getWorkingContextMessageProvenance(note);
      expect(provenance?.kind).toBe('composed_user');
      expect(provenance?.kind === 'composed_user' && provenance.constituents[0]).toMatchObject({
        kind: 'current_user', rawTraceIds: [noteTrace.id], turnId,
      });

      const payload = snapshotStore.read('agent_note');
      expect(WorkingContextSnapshotSerializer.validate(payload!)).toBe(true);
      const restored = WorkingContextSnapshotSerializer.deserialize(payload).workingContext.buildMessages();
      expect(restored.at(-1)!.content).toBe(NOTE);
      expect(getWorkingContextMessageProvenance(restored.at(-1)!)).toEqual(provenance);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
