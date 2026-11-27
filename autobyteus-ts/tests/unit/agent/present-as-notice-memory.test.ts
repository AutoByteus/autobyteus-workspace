import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { platformInputPrefaceMetadata } from '../../../src/agent/message/platform-input-preface-metadata.js';
import { presentAsNoticeMetadata, readPresentAsNotice } from '../../../src/agent/message/present-as-notice-metadata.js';
import { buildLLMUserMessage } from '../../../src/agent/message/multimodal-message-builder.js';
import { SenderType } from '../../../src/agent/sender-type.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { MessageRole, type Message } from '../../../src/llm/utils/messages.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }
  protected async *_streamMessagesToLLM(_messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const HANDOVER = '[System: runtime hand-over]\nRead work_journal_000001.md completely.';
const CONTINUE = 'Continue the task where you left off.';
const SENDER = 'system.usage_limit';
const tempDirs: string[] = [];

/** Ingests one input and assembles its request, as the native turn does. */
const ingestAndAssemble = async (message: AgentInputUserMessage) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'present-as-notice-'));
  tempDirs.push(tempDir);
  const memoryManager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_notice') });
  const model = new LLMModel({ name: 'dummy', value: 'dummy', canonicalName: 'dummy', provider: LLMProvider.OPENAI });
  const context = new AgentContext('agent_notice', new AgentConfig('name', 'role', 'desc', new DummyLLM(model, new LLMConfig())),
    new AgentRuntimeState('agent_notice'));
  const turn = new AgentTurn('turn_0001');
  context.state.memoryManager = memoryManager;
  context.state.activeTurn = turn;
  await new MemoryIngestInputProcessor().process(message, context, { agentInputUserMessage: message } as any);
  await new LLMRequestAssembler(memoryManager).prepareRequest(buildLLMUserMessage(message),
    { turnId: turn.turnId, requestId: `${turn.turnId}:llm:1`, inputRawTraceIds: turn.inputRawTraceIds, signal: new AbortController().signal },
    'System prompt', []);
  return {
    traces: memoryManager.listTurnRawTracesOrdered().filter((trace) => trace.turnId === turn.turnId),
    userEntry: memoryManager.getWorkingContextMessages().find((entry) => entry.role === MessageRole.USER)!,
  };
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('an input presented as a notice (autobyteus-646 R-10)', () => {
  it('round-trips the tag and rejects a malformed one', () => {
    expect(readPresentAsNotice(presentAsNoticeMetadata({ senderId: SENDER }))).toEqual({ senderId: SENDER });
    expect(readPresentAsNotice({ present_as_notice: { sender_id: ' ' } })).toBeNull();
    expect(readPresentAsNotice({ present_as_notice: 'x' })).toBeNull();
    expect(readPresentAsNotice({})).toBeNull();
  });

  it('with a preface combined in: two notice traces (the preface, then the input from its sender), no user trace; the model reads both', async () => {
    const message = new AgentInputUserMessage(`${HANDOVER}\n\n${CONTINUE}`, SenderType.SYSTEM, null, {
      message_id: 'continue-1', ...presentAsNoticeMetadata({ senderId: SENDER }),
      ...platformInputPrefaceMetadata({ content: HANDOVER, senderId: 'system.runtime_handover', originalContent: CONTINUE, noticeId: 'handover-1' }),
    });
    const { traces, userEntry } = await ingestAndAssemble(message);
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.senderId, trace.messageId])).toEqual([
      ['system_task_notification', HANDOVER, 'system.runtime_handover', 'handover-1'],
      ['system_task_notification', CONTINUE, SENDER, 'continue-1'],
    ]);
    expect(userEntry.content).toBe(`${HANDOVER}\n\n${CONTINUE}`);
  });

  it('alone: one notice trace from its sender, and the model reads it', async () => {
    const message = new AgentInputUserMessage(CONTINUE, SenderType.SYSTEM, null, { message_id: 'continue-2', ...presentAsNoticeMetadata({ senderId: SENDER }) });
    const { traces, userEntry } = await ingestAndAssemble(message);
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.senderId, trace.messageId])).toEqual([
      ['system_task_notification', CONTINUE, SENDER, 'continue-2'],
    ]);
    expect(userEntry.content).toBe(CONTINUE);
  });
});
