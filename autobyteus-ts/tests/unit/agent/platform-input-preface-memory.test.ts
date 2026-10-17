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
import {
  platformInputPrefaceMetadata,
  readPlatformInputPreface,
  stripPlatformInputPreface,
} from '../../../src/agent/message/platform-input-preface-metadata.js';
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
import { MEMORY_MESSAGE_PROVENANCE_METADATA_KEY } from '../../../src/memory/working-context-provenance.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }
  protected async *_streamMessagesToLLM(_messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const NOTICE = '[Platform notice — skill updated]\nRe-read /skills/code-review/SKILL.md.';
const SENDER = 'system.skill_update_notifier';
const tempDirs: string[] = [];

const setup = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preface-memory-'));
  tempDirs.push(tempDir);
  const memoryManager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_preface') });
  const model = new LLMModel({ name: 'dummy', value: 'dummy', canonicalName: 'dummy', provider: LLMProvider.OPENAI });
  const context = new AgentContext('agent_preface', new AgentConfig('name', 'role', 'desc', new DummyLLM(model, new LLMConfig())),
    new AgentRuntimeState('agent_preface'));
  const turn = new AgentTurn('turn_0001');
  context.state.memoryManager = memoryManager;
  context.state.activeTurn = turn;
  return { memoryManager, context, turn };
};

/** Runs the ingest step and then the request assembly for one input, as the native turn does. */
const ingestAndAssemble = async (message: AgentInputUserMessage) => {
  const { memoryManager, context, turn } = setup();
  await new MemoryIngestInputProcessor().process(message, context, { agentInputUserMessage: message } as any);
  await new LLMRequestAssembler(memoryManager).prepareRequest(
    buildLLMUserMessage(message),
    { turnId: turn.turnId, requestId: `${turn.turnId}:llm:1`, inputRawTraceIds: turn.inputRawTraceIds,
      signal: new AbortController().signal },
    'System prompt',
    [],
  );
  const traces = memoryManager.listTurnRawTracesOrdered().filter((trace) => trace.turnId === turn.turnId);
  const userEntry = memoryManager.getWorkingContextMessages().find((entry) => entry.role === MessageRole.USER)!;
  return { traces, userEntry };
};

const linkedTraceIds = (entry: Message): string[] => {
  const ids: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'rawTraceIds' && Array.isArray(item)) ids.push(...item.map(String));
        else visit(item);
      }
    }
  };
  visit(entry.metadata?.[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]);
  return ids;
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('platform input preface metadata', () => {
  it('round-trips the tag and rejects a malformed one', () => {
    const metadata = platformInputPrefaceMetadata({ content: NOTICE, senderId: SENDER, originalContent: 'Do the task.' });
    expect(readPlatformInputPreface(metadata)).toEqual({ content: NOTICE, senderId: SENDER, originalContent: 'Do the task.' });
    expect(readPlatformInputPreface({ platform_input_preface: { content: '', sender_id: SENDER, original_content: null } })).toBeNull();
    expect(readPlatformInputPreface({ platform_input_preface: { content: NOTICE, sender_id: SENDER, original_content: 3 } })).toBeNull();
    expect(readPlatformInputPreface({})).toBeNull();
  });

  it('takes the input part after the notice, keeping processor changes, and falls back to the original', () => {
    const preface = { content: NOTICE, senderId: SENDER, originalContent: 'Do the task.' };
    expect(stripPlatformInputPreface(`${NOTICE}\n\nDo the task, processed.`, preface)).toBe('Do the task, processed.');
    expect(stripPlatformInputPreface('Rewritten entirely.', preface)).toBe('Do the task.');
    expect(stripPlatformInputPreface(NOTICE, { ...preface, originalContent: null })).toBeNull();
  });
});

describe('native memory for an input carrying a platform notice (SR-004, N-1)', () => {
  it('records one system notice and the input unchanged, and links the combined working-context entry to both traces', async () => {
    const combined = new AgentInputUserMessage(`${NOTICE}\n\nPlease review PR 12.`, SenderType.USER, null, {
      message_id: 'msg-1',
      ...platformInputPrefaceMetadata({ content: NOTICE, senderId: SENDER, originalContent: 'Please review PR 12.' }),
    });
    const { traces, userEntry } = await ingestAndAssemble(combined);

    expect(traces.map((trace) => [trace.traceType, trace.content, trace.senderId])).toEqual([
      ['system_task_notification', NOTICE, SENDER],
      ['user', 'Please review PR 12.', null],
    ]);
    expect(traces[1]!.messageId).toBe('msg-1');
    // The model saw both together.
    expect(userEntry.content).toBe(`${NOTICE}\n\nPlease review PR 12.`);
    // N-1: linked explicitly to exactly the notice trace and the user trace (content lookup cannot match).
    expect(linkedTraceIds(userEntry).sort()).toEqual([traces[0]!.id, traces[1]!.id].sort());
  });

  it('records a notice-only message as one system notice and no user message', async () => {
    const notice = new AgentInputUserMessage(NOTICE, SenderType.SYSTEM, null,
      platformInputPrefaceMetadata({ content: NOTICE, senderId: SENDER, originalContent: null }));
    const { traces, userEntry } = await ingestAndAssemble(notice);

    expect(traces.map((trace) => trace.traceType)).toEqual(['system_task_notification']);
    expect(userEntry.content).toBe(NOTICE);
    expect(linkedTraceIds(userEntry)).toEqual([traces[0]!.id]);
  });

  it('handles an untagged message exactly as before (one user trace, linked by content)', async () => {
    const { traces, userEntry } = await ingestAndAssemble(new AgentInputUserMessage('Plain input.'));

    expect(traces.map((trace) => [trace.traceType, trace.content])).toEqual([['user', 'Plain input.']]);
    expect(linkedTraceIds(userEntry)).toEqual([traces[0]!.id]);
  });
});
