import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AnthropicAssistantTurnAssembler } from '../../../../src/llm/api/anthropic-assistant-turn-assembler.js';
import { AnthropicPromptRenderer } from '../../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import { LLMRequestAssembler } from '../../../../src/agent/llm-request-assembler.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { parseAnthropicAssistantTurn } from '../../../../src/llm/api/anthropic-native-assistant-turn.js';
import { PROVIDER_NATIVE_ASSISTANT_TURN_KEY } from '../../../../src/llm/provider-native/provider-native-assistant-turn.js';
import type { RequestPackage } from '../../../../src/agent/llm-request-assembler.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';

const signedTurn = parseAnthropicAssistantTurn({ provider: 'anthropic', blocks: [
  { type: 'thinking', thinking: 'private synthetic reasoning', signature: 'synthetic-signature' },
  { type: 'text', text: 'Checking.' },
  { type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: { command: 'pwd' } },
] });

describe('Anthropic signed tool continuation', () => {
  it('rejects a mismatched native turn before writing tool traces or working context', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anthropic-mismatched-turn-'));
    try {
      const memory = new MemoryManager({ store: new FileMemoryStore(dir, 'agent_mismatch') });
      const turnId = memory.startTurn();
      expect(() => memory.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'Checking.', providerNativeAssistantTurn: signedTurn }),
        [new ToolInvocation('run_bash', { command: 'wrong' }, 'toolu_1', turnId)], turnId,
      )).toThrow('does not match executable tool calls');
      expect(memory.getWorkingContextMessages()).toEqual([]);
      expect(memory.listTurnRawTracesOrdered().some((trace) => trace.traceType === 'tool_call')).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it('assembles fragmented signed blocks and rejects an incomplete signature', () => {
    const assembler = new AnthropicAssistantTurnAssembler();
    const accept = (event: unknown) => assembler.accept(event as Parameters<typeof assembler.accept>[0]);
    accept({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } });
    accept({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'private ' } });
    accept({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'thought' } });
    accept({ type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'signed' } });
    accept({ type: 'content_block_stop', index: 0 });
    accept({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: {} } });
    accept({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"command":' } });
    accept({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"pwd"}' } });
    accept({ type: 'content_block_stop', index: 1 });
    expect(assembler.complete()?.blocks).toEqual([
      { type: 'thinking', thinking: 'private thought', signature: 'signed' },
      { type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: { command: 'pwd' } },
    ]);
    const incomplete = new AnthropicAssistantTurnAssembler();
    incomplete.accept({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } } as any);
    incomplete.accept({ type: 'content_block_stop', index: 0 } as any);
    expect(() => incomplete.complete()).toThrow('incomplete');
  });

  it('replays exactly within a tool cycle and keeps signed blocks across an independent turn (append-only)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anthropic-signed-turn-'));
    const identity = (turnId: string, requestId: string, isTurnContinuation: boolean) => ({
      turnId, requestId, isTurnContinuation, getParentModelIdentifier: () => 'claude-opus-5-5', signal: new AbortController().signal,
    });
    const render = async (request: RequestPackage) => await new AnthropicPromptRenderer().render(request.outboundMessages) as any[];
    const nativeTurns = (request: RequestPackage) => request.canonicalMessages.flatMap((message) => {
      const native = message.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY];
      return native === undefined ? [] : [parseAnthropicAssistantTurn(native)];
    });
    try {
      const memory = new MemoryManager({ store: new FileMemoryStore(dir, 'agent_signed') });
      const assembler = new LLMRequestAssembler(memory);
      const turnId = memory.startTurn();
      // A real run: thinking only exists after a first request has bound the request prefix.
      await assembler.prepareRequest(new LLMUserMessage({ content: 'Start' }), identity(turnId, 'first-request', false), undefined, []);
      memory.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'Checking.', reasoning: 'private synthetic reasoning', providerNativeAssistantTurn: signedTurn }),
        [new ToolInvocation('run_bash', { command: 'pwd' }, 'toolu_1', turnId)], turnId,
      );
      memory.ingestToolResult(new ToolResultEvent('run_bash', { stdout: '/tmp' }, 'toolu_1', undefined, { command: 'pwd' }, turnId), turnId);

      const continuation = await assembler.prepareRequest(null, identity(turnId, 'tool-continuation', true), undefined, []);
      const continuationRendered = await render(continuation);
      expect(continuationRendered[1].content).toEqual(signedTurn.blocks);
      expect(continuationRendered[2].content[0].tool_use_id).toBe('toolu_1');

      memory.ingestAssistantResponse(new CompleteResponse({ content: 'Done.' }), turnId, 'test');
      const later = await assembler.prepareRequest(new LLMUserMessage({ content: 'Next task' }), identity('later-turn', 'later-request', false), undefined, []);
      const laterRendered = await render(later);
      expect(laterRendered.slice(0, continuationRendered.length)).toEqual(continuationRendered);
      expect(nativeTurns(later)[0]!.blocks).toEqual(signedTurn.blocks);
      expect(later.canonicalMessages[1]!.reasoning_content).toBe('private synthetic reasoning');
      memory.restoreLlmRequestRecoverySnapshot(later.recoverySnapshot, { reason: 'retry' } as any);
      expect(parseAnthropicAssistantTurn(memory.getWorkingContextMessages()[1]!.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY]).blocks)
        .toEqual(signedTurn.blocks);

      memory.ingestAssistantResponse(new CompleteResponse({ content: 'Plain later answer.' }), 'later-turn', 'test');
      await assembler.prepareRequest(new LLMUserMessage({ content: 'Third task' }), identity('third-turn', 'third-request', false), undefined, []);
      const freshTurn = parseAnthropicAssistantTurn({ provider: 'anthropic', blocks: [
        { type: 'thinking', thinking: 'new synthetic thought', signature: 'new-signature' },
        { type: 'tool_use', id: 'toolu_3', name: 'run_bash', input: { command: 'ls' } },
      ] });
      memory.ingestAssistantToolResponse(new CompleteResponse({
        content: '', reasoning: 'new synthetic thought', providerNativeAssistantTurn: freshTurn,
      }), [new ToolInvocation('run_bash', { command: 'ls' }, 'toolu_3', 'third-turn')], 'third-turn');
      memory.ingestToolResult(new ToolResultEvent('run_bash', { stdout: 'file' }, 'toolu_3', undefined, { command: 'ls' }, 'third-turn'), 'third-turn');
      const third = await assembler.prepareRequest(null, identity('third-turn', 'third-continuation', true), undefined, []);
      expect(nativeTurns(third)).toHaveLength(2);
      expect(nativeTurns(third)[0]!.blocks).toEqual(signedTurn.blocks);
      expect(nativeTurns(third)[1]!.blocks[0]).toEqual({ type: 'thinking', thinking: 'new synthetic thought', signature: 'new-signature' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
