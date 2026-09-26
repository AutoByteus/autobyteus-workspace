import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { WorkingContextFinalizer, createNaturalUserMessageProvenance } from '../../../src/memory/working-context-finalizer.js';
import { resolveCompactionPlanningBudget } from '../../../src/memory/compaction/compaction-planning-budget.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { COMPACTION_SUMMARY_HEADINGS } from '../../../src/memory/compaction/compaction-summary-parser.js';

export const summary = COMPACTION_SUMMARY_HEADINGS.map((h) => `## ${h}\n- Preserve the approved scope; /repo/check.ts is unrun.`).join('\n\n');
export const execution = { modelIdentifier: 'fixture', provider: 'fixture', invocationId: 'one', completionStatus: 'complete' as const, completionReason: 'stop', usage: null };
export const makeHarness = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'direct-compaction-'));
  const store = new FileMemoryStore(dir, 'agent');
  const snapshotStore = new WorkingContextSnapshotStore(dir, 'agent');
  const messages = [new Message(MessageRole.SYSTEM, { content: 'System' })];
  for (let i = 0; i < 12; i++) {
    const id = `raw-${i}`; const turnId = `turn-${i}`; const content = `request-${i}: ` + 'x'.repeat(1500);
    store.add([new RawTraceItem({ id, ts: i+1, turnId, seq: 1, traceType: 'user', content, sourceEvent: 'test' })]);
    messages.push(createNaturalUserMessageProvenance(new Message(MessageRole.USER, { content }), { kind: 'current_user', rawTraceIds: [id], turnId }));
    messages.push(new Message(MessageRole.ASSISTANT, { content: `ack-${i}` }));
  }
  const manager = new MemoryManager({ store, agentId: 'agent', workingContextSnapshotStore: snapshotStore,
    workingContext: new WorkingContextFinalizer().finalize({ messages }) });
  manager.persistWorkingContextSnapshot();
  const request = () => manager.requestCompaction({ requestedTurnId: 'turn-request', requestKind: 'threshold_crossing',
    planningBudget: resolveCompactionPlanningBudget({ inputBudget: 10000, triggerThresholdTokens: 8000 }, 0) });
  const operationId = request();
  const summarize = vi.fn(async () => ({ summary, execution }));
  const emitStatus = vi.fn();
  const executor = new PendingCompactionExecutor(manager, { summarizer: { summarize } as any, reporter: { emitStatus } as any });
  const controller = new AbortController();
  const input = { turnId: 'execute-1', turnOrigin: 'user' as const, parentModelIdentifier: 'parent', signal: controller.signal };
  return { dir, store, snapshotStore, manager, executor, summarize, emitStatus, input, controller, operationId, request,
    dispose: () => fs.rmSync(dir, { recursive: true, force: true }) };
};
