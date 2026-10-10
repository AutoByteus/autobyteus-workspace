import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { parseAnthropicAssistantTurn } from '../../../../src/llm/api/anthropic-native-assistant-turn.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { PROVIDER_NATIVE_ASSISTANT_TURN_KEY } from '../../../../src/llm/provider-native/provider-native-assistant-turn.js';
import { LLMRequestAssembler, type RequestPackage } from '../../../../src/agent/llm-request-assembler.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../../src/memory/store/working-context-snapshot-store.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

// The real native path for one agent: MemoryManager -> LLMRequestAssembler -> AnthropicLLM.
// Only the Anthropic SDK client is substituted, so the captured bodies are the real requests.
const mockCreate = vi.hoisted(() => vi.fn());
vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = { create: mockCreate };
  return { default: Anthropic };
});

const AGENT_ID = 'agent_prefix_flow';
const SYSTEM_PROMPT = 'You are a careful agent.';
const ONE_HOUR = { type: 'ephemeral', ttl: '1h' };
const toolsV1 = [{ name: 'run_bash', description: 'Run a command.', input_schema: { type: 'object', properties: { command: { type: 'string' } } } }];
const toolsV2 = [{ ...toolsV1[0]!, description: 'Run a shell command (media default model changed).' }];

const signedTurn = (id: string, thought: string) => parseAnthropicAssistantTurn({ provider: 'anthropic', blocks: [
  { type: 'thinking', thinking: thought, signature: `sig-${id}` },
  { type: 'tool_use', id, name: 'run_bash', input: { command: 'pwd' } },
] });

type Body = Record<string, any>;
const hasThinking = (body: Body) => body.messages.some((message: any) =>
  Array.isArray(message.content) && message.content.some((block: any) => block.type === 'thinking'));
const nativeTurnBlocks = (messages: ReturnType<MemoryManager['getWorkingContextMessages']>) => messages.flatMap((message) => {
  const native = message.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY];
  return native === undefined ? [] : [parseAnthropicAssistantTurn(native).blocks];
});

class Agent {
  readonly memory: MemoryManager;
  readonly snapshots: WorkingContextSnapshotStore;
  private readonly llm = new AnthropicLLM(
    new LLMModel({ name: 'claude-opus-5-5', value: 'claude-opus-5-5', canonicalName: 'claude-opus-5-5', provider: LLMProvider.ANTHROPIC }),
    new LLMConfig(),
    providerApiKeyResolver('synthetic-anthropic-key'),
  );
  private requestCount = 0;

  constructor(dir: string, restore = false) {
    this.snapshots = new WorkingContextSnapshotStore(dir, AGENT_ID);
    this.memory = new MemoryManager({ store: new FileMemoryStore(dir, AGENT_ID), workingContextSnapshotStore: this.snapshots });
    if (restore) {
      new WorkingContextSnapshotBootstrapper().bootstrap(this.memory, SYSTEM_PROMPT, new WorkingContextSnapshotBootstrapOptions());
    }
  }

  async prepare(turnId: string, input: string | null, tools: typeof toolsV1, isTurnContinuation = input === null): Promise<RequestPackage> {
    return new LLMRequestAssembler(this.memory).prepareRequest(
      input === null ? null : new LLMUserMessage({ content: input }),
      { turnId, requestId: `${turnId}:llm:${++this.requestCount}`, isTurnContinuation, getParentModelIdentifier: () => 'claude-opus-5-5', signal: new AbortController().signal },
      SYSTEM_PROMPT,
      tools,
    );
  }

  /** Assemble and send one conversation request the way LlmPhase does; returns the request body. */
  async request(turnId: string, input: string | null, tools: typeof toolsV1): Promise<Body> {
    const request = await this.prepare(turnId, input, tools);
    await this.llm.sendMessages(request.outboundMessages, { logicalConversationId: AGENT_ID, tools: request.tools }, { promptCacheScope: 'conversation' });
    return structuredClone(mockCreate.mock.calls.at(-1)![0]);
  }

  toolCycle(turnId: string, id: string, thought: string): void {
    this.memory.ingestAssistantToolResponse(
      new CompleteResponse({ content: '', reasoning: thought, providerNativeAssistantTurn: signedTurn(id, thought) }),
      [new ToolInvocation('run_bash', { command: 'pwd' }, id, turnId)], turnId,
    );
    this.memory.ingestToolResult(new ToolResultEvent('run_bash', { stdout: '/tmp' }, id, undefined, { command: 'pwd' }, turnId), turnId);
  }

  finalAnswer(turnId: string, text: string): void {
    this.memory.ingestAssistantResponse(new CompleteResponse({ content: text }), turnId, 'test');
  }

  persistedSnapshotHasThinking(): boolean {
    return JSON.stringify(this.snapshots.read(AGENT_ID)).includes('"type":"thinking"');
  }
}

describe('Anthropic conversation requests through the native agent path', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anthropic-prefix-flow-'));
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } });
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('sends an append-only, byte-identical prefix across a tool continuation and an independent turn, keeping thinking (AC-002, AC-004)', async () => {
    const agent = new Agent(dir);
    const first = await agent.request('turn_1', 'Inspect the workspace.', toolsV1);
    agent.toolCycle('turn_1', 'toolu_1', 'Need the working directory.');
    const continuation = await agent.request('turn_1', null, toolsV1);
    agent.finalAnswer('turn_1', 'The workspace is /tmp.');
    const nextTurn = await agent.request('turn_2', 'Now list the files.', toolsV1);

    for (const body of [first, continuation, nextTurn]) {
      expect(body.system).toEqual([{ type: 'text', text: SYSTEM_PROMPT, cache_control: ONE_HOUR }]);
      expect(body.tools).toEqual(toolsV1);
      expect(body.cache_control).toEqual(ONE_HOUR);
    }
    expect(continuation.messages.slice(0, first.messages.length)).toEqual(first.messages);
    expect(nextTurn.messages.slice(0, continuation.messages.length)).toEqual(continuation.messages);
    expect(nextTurn.messages.slice(continuation.messages.length)).toEqual([
      { role: 'assistant', content: 'The workspace is /tmp.' },
      { role: 'user', content: 'Now list the files.' },
    ]);
    expect(nextTurn.messages[1].content).toEqual(signedTurn('toolu_1', 'Need the working directory.').blocks);
  });

  it('keeps the top-level system byte-identical after an interruption and sends the boundary note after the history (AC-011)', async () => {
    const agent = new Agent(dir);
    const first = await agent.request('turn_1', 'Start a long task.', toolsV1);
    agent.toolCycle('turn_1', 'toolu_1', 'Checking first.');
    await agent.request('turn_1', null, toolsV1);
    agent.memory.ingestToolIntent(new ToolInvocation('run_bash', { command: 'sleep 100' }, 'toolu_2', 'turn_1'), 'turn_1');
    agent.memory.finalizePendingToolCallsForTurn('turn_1', 'user_interrupt', { appendToWorkingContext: false });
    agent.memory.appendRawTrace({
      turnId: 'turn_1', traceType: 'operation_boundary', sourceEvent: 'AgentTurnInterruptedEvent',
      content: agent.memory.buildOperationBoundaryNote({ scope: { kind: 'agent_turn', id: 'turn_1' }, reason: 'user_interrupt' }),
    });
    const beforeNote = agent.memory.getWorkingContextMessages().length;
    await agent.memory.projectWorkingContextForNextLlm({ mode: 'llm_safe', fenceIncompleteToolProtocolScope: { kind: 'agent_turn', id: 'turn_1' } });
    expect(agent.memory.getWorkingContextMessages().length).toBeGreaterThan(beforeNote);

    const afterInterrupt = await agent.request('turn_2', 'Do something else.', toolsV1);

    expect(afterInterrupt.system).toEqual(first.system);
    expect(afterInterrupt.messages.slice(0, first.messages.length)).toEqual(first.messages);
    const [note, next] = afterInterrupt.messages.slice(-2);
    expect(note.role).toBe('user');
    expect(note.content).toContain("System note: turn 'turn_1' was interrupted before normal completion.");
    expect(next).toEqual({ role: 'user', content: 'Do something else.' });
    expect(hasThinking(afterInterrupt)).toBe(true);
  });

  it('removes thinking once when the tool definitions change mid tool round, persisted before the checkpoint (AC-013a)', async () => {
    const agent = new Agent(dir);
    await agent.request('turn_1', 'Inspect the workspace.', toolsV1);
    agent.toolCycle('turn_1', 'toolu_1', 'Need the working directory.');
    expect(agent.persistedSnapshotHasThinking()).toBe(true);

    // Settings change the tool schema while the agent waits between tool_use and its continuation.
    const changed = await agent.prepare('turn_1', null, toolsV2);
    expect(nativeTurnBlocks(changed.canonicalMessages)).toEqual([[{ type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: { command: 'pwd' } }]]);
    expect(changed.tools).toBe(toolsV2);
    expect(agent.persistedSnapshotHasThinking()).toBe(false);
    expect(nativeTurnBlocks(changed.recoverySnapshot.workingContext.buildMessages())[0]).toHaveLength(1);
    // A failed request restores the checkpoint, which cannot bring the removed thinking back.
    agent.memory.restoreLlmRequestRecoverySnapshot(changed.recoverySnapshot, { reason: 'provider failure', sourceEvent: 'test' });
    expect(nativeTurnBlocks(agent.memory.getWorkingContextMessages())[0]).toHaveLength(1);

    const retried = await agent.request('turn_1', null, toolsV2);
    expect(retried.tools).toEqual(toolsV2);
    expect(hasThinking(retried)).toBe(false);

    agent.toolCycle('turn_1', 'toolu_2', 'Fresh reasoning under the new tools.');
    const sameTools = await agent.request('turn_1', null, toolsV2);
    expect(sameTools.messages.slice(0, retried.messages.length)).toEqual(retried.messages);
    expect(nativeTurnBlocks(agent.memory.getWorkingContextMessages())[1]![0]).toEqual(
      { type: 'thinking', thinking: 'Fresh reasoning under the new tools.', signature: 'sig-toolu_2' },
    );
  });

  it('removes thinking once on the first request after a restore, then stays append-only (AC-013b)', async () => {
    const original = new Agent(dir);
    await original.request('turn_1', 'Inspect the workspace.', toolsV1);
    original.toolCycle('turn_1', 'toolu_1', 'Need the working directory.');
    expect(original.persistedSnapshotHasThinking()).toBe(true);

    const restored = new Agent(dir, true);
    expect(nativeTurnBlocks(restored.memory.getWorkingContextMessages())[0]).toHaveLength(2);
    const firstAfterRestore = await restored.request('turn_1', null, toolsV1);
    expect(hasThinking(firstAfterRestore)).toBe(false);
    expect(restored.persistedSnapshotHasThinking()).toBe(false);

    restored.toolCycle('turn_1', 'toolu_2', 'Reasoning after restore.');
    const next = await restored.request('turn_1', null, toolsV1);
    expect(next.messages.slice(0, firstAfterRestore.messages.length)).toEqual(firstAfterRestore.messages);
    expect(hasThinking(next)).toBe(true);
  });

  it('binds a fresh run and an unchanged prefix without rewriting history', async () => {
    const agent = new Agent(dir);
    const replace = vi.spyOn(agent.memory, 'replaceWorkingContext');
    await agent.request('turn_1', 'Hello.', toolsV1);
    agent.toolCycle('turn_1', 'toolu_1', 'Thinking.');
    await agent.request('turn_1', null, toolsV1);
    agent.finalAnswer('turn_1', 'Done.');
    await agent.request('turn_2', 'Again.', toolsV1);
    expect(replace).not.toHaveBeenCalled();
    expect(agent.memory.bindRetainedReasoningToRequestPrefix('unchanged-digest-is-new-here')).toBe(true);
    expect(agent.memory.bindRetainedReasoningToRequestPrefix('unchanged-digest-is-new-here')).toBe(false);
  });
});
