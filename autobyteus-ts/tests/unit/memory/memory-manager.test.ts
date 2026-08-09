import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolInteractionStatus } from '../../../src/memory/models/tool-interaction.js';
import { SYNTHETIC_TOOL_RESULT_ERROR } from '../../../src/memory/working-context-tool-protocol-repairer.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-'));
const makeTrace = (
  turnId: string,
  seq: number,
  traceType = 'user',
  content = ''
) =>
  new RawTraceItem({
    id: `rt_${turnId}_${seq}`,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType,
    content,
    sourceEvent: 'TestEvent'
  });
const appendOperationBoundaryNote = (manager: MemoryManager, turnId: string, reason: string) => {
  manager.appendRawTrace({
    turnId,
    traceType: 'operation_boundary',
    content: manager.buildOperationBoundaryNote({
      scope: { kind: 'agent_turn', id: turnId },
      reason
    }),
    sourceEvent: 'AgentTurnInterruptedEvent'
  });
};

describe('MemoryManager', () => {
  it('ingests user message and assistant response with sequencing', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      manager.ingestUserMessage(new LLMUserMessage({ content: 'hello' }), turnId, 'LLMUserMessageReadyEvent');
      manager.ingestAssistantResponse({ content: 'hi', reasoning: null } as any, turnId, 'LLMCompleteResponseReceivedEvent');

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems).toHaveLength(2);
      expect(rawItems[0].seq).toBe(1);
      expect(rawItems[1].seq).toBe(2);
      expect(rawItems[0].traceType).toBe('user');
      expect(rawItems[1].traceType).toBe('assistant');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ingests tool intent and result into working context snapshot', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tools');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('write_file', { path: 'x.txt' }, 'call_1', turnId);
      manager.ingestToolIntent(invocation, turnId);
      expect(manager.listRawTracesOrdered()).toHaveLength(1);

      const toolResult = new ToolResultEvent('write_file', 'ok', 'call_1', undefined, { path: 'x.txt' }, turnId);
      manager.ingestToolResult(toolResult, turnId);

      const snapshot = manager.getWorkingContextMessages();
      expect(snapshot).toHaveLength(2);
      expect(snapshot[0].role).toBe(MessageRole.ASSISTANT);
      expect(snapshot[1].role).toBe(MessageRole.TOOL);
      const raw = manager.listRawTracesOrdered();
      expect(raw).toHaveLength(2);
      expect(raw[0]).toMatchObject({
        traceType: 'tool_call', toolCallId: 'call_1', toolName: 'write_file',
        toolArgs: { path: 'x.txt' },
      });
      expect(raw[0].toDict()).not.toHaveProperty('tool_result');
      expect(raw[0].toDict()).not.toHaveProperty('tool_error');
      expect(raw[1].toDict()).toMatchObject({
        trace_type: 'tool_result', tool_call_id: 'call_1', tool_name: 'write_file',
        tool_args: { path: 'x.txt' }, tool_result: 'ok', tool_error: null,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('builds tool interactions from stored traces', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interactions');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('read_file', { path: 'a.txt' }, 'call_1', turnId);
      manager.ingestToolIntent(invocation, turnId);

      const toolResult = new ToolResultEvent('read_file', 'ok', 'call_1', undefined, { path: 'a.txt' }, turnId);
      manager.ingestToolResult(toolResult, turnId);

      const interactions = manager.getToolInteractions(turnId);
      expect(interactions).toHaveLength(1);
      expect(interactions[0].toolName).toBe('read_file');
      expect(interactions[0].status).toBe(ToolInteractionStatus.SUCCESS);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists denied native results with the canonical name and invocation arguments', () => {
    const tempDir = makeTempDir();
    try {
      const manager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_mem_denied_tool') });
      const turnId = manager.startTurn();
      manager.ingestToolIntent(new ToolInvocation('run_bash', { command: 'rm -rf /' }, 'call_denied', turnId), turnId);

      manager.ingestToolResult(new ToolResultEvent(
        'run_bash',
        undefined,
        'call_denied',
        undefined,
        { command: 'rm -rf /' },
        turnId,
        true,
      ), turnId);

      const result = manager.listRawTracesOrdered()[1]!.toDict();
      expect(result).toMatchObject({
        trace_type: 'tool_result',
        tool_call_id: 'call_denied',
        tool_name: 'run_bash',
        tool_args: { command: 'rm -rf /' },
        tool_result: null,
        tool_error: 'Tool execution denied.',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('groups multiple tool intents into one assistant tool-call message', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_grouped_tool_calls');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      const first = new ToolInvocation('write_file', { path: 'a.txt' }, 'call_1', turnId);
      const second = new ToolInvocation('read_file', { path: 'b.txt' }, 'call_2', turnId);
      manager.ingestToolIntents([first, second], turnId);

      const snapshot = manager.getWorkingContextMessages();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].role).toBe(MessageRole.ASSISTANT);
      expect(snapshot[0].tool_payload).toBeInstanceOf(ToolCallPayload);
      const payload = snapshot[0].tool_payload as ToolCallPayload;
      expect(payload.toolCalls.map((call) => call.id)).toEqual(['call_1', 'call_2']);

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems).toHaveLength(2);
      expect(rawItems.map((item) => item.traceType)).toEqual(['tool_call', 'tool_call']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a mixed invalid assistant tool batch before any raw or Working Context mutation', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_atomic_assistant_tools');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();
      manager.ingestUserMessage(new LLMUserMessage({ content: 'existing input' }), turnId, 'TestEvent');
      manager.appendWorkingContextUserMessage('existing input', { turnId });
      const rawPath = path.join(store.agentDir, 'raw_traces_active.jsonl');
      const rawBefore = fs.readFileSync(rawPath, 'utf-8');
      const workingContextBefore = JSON.stringify(manager.getWorkingContextMessages());

      expect(() => manager.ingestAssistantToolResponse(
        { content: 'assistant tool plan', reasoning: 'reasoning' } as any,
        [
          new ToolInvocation('valid_tool', { value: 1 }, 'valid-call', turnId),
          new ToolInvocation('invalid_tool', { value: 2 }, '   ', turnId),
        ],
        turnId,
      )).toThrow(/batch was rejected/);

      expect(fs.readFileSync(rawPath, 'utf-8')).toBe(rawBefore);
      expect(JSON.stringify(manager.getWorkingContextMessages())).toBe(workingContextBefore);
      expect(manager.listRawTracesOrdered()).toHaveLength(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('preserves provider-native tool-call context in grouped tool intents', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_native_tool_context');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();
      const invocation = new ToolInvocation(
        'search',
        { q: 'abc' },
        'call_1',
        turnId,
        { provider: 'gemini', functionCallPart: { functionCall: { id: 'call_1', name: 'search' } } }
      );

      manager.ingestToolIntents([invocation], turnId);

      const payload = manager.getWorkingContextMessages()[0].tool_payload as ToolCallPayload;
      expect(payload.toolCalls[0].nativeToolCallContext).toEqual(invocation.nativeToolCallContext);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ingests ordered tool result batches in received order', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_ordered_tool_results');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestToolIntents([
        new ToolInvocation('tool_A', {}, 'call_A', turnId),
        new ToolInvocation('tool_B', {}, 'call_B', turnId),
      ], turnId);

      manager.ingestToolResults([
        new ToolResultEvent('tool_A', 'result A', 'call_A', undefined, undefined, turnId),
        new ToolResultEvent('tool_B', 'result B', 'call_B', undefined, undefined, turnId)
      ], turnId, { source: 'native_api_ordered_batch' });

      const messages = manager.getWorkingContextMessages();
      expect(messages.map((message) => message.role)).toEqual([
        MessageRole.ASSISTANT, MessageRole.TOOL, MessageRole.TOOL,
      ]);
      expect(messages.slice(1).map((message) => (message.tool_payload as any).toolCallId)).toEqual(['call_A', 'call_B']);
      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems.filter((item) => item.traceType === 'tool_result').map((item) => item.sourceEvent)).toEqual([
        'native_api_ordered_batch',
        'native_api_ordered_batch'
      ]);
      expect(rawItems.map((item) => item.traceType)).toEqual([
        'tool_call', 'tool_call', 'tool_result', 'tool_result',
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('can skip appending assistant response to working context snapshot', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_skip_assistant_append');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestAssistantResponse(
        { content: 'tool planning text', reasoning: null } as any,
        turnId,
        'LLMCompleteResponseReceivedEvent',
        { appendToWorkingContext: false }
      );

      expect(manager.getWorkingContextMessages()).toHaveLength(0);

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems).toHaveLength(1);
      expect(rawItems[0].traceType).toBe('assistant');
      expect(rawItems[0].content).toBe('tool planning text');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('filters tool interactions by turn id', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_filter');
      const manager = new MemoryManager({ store });

      store.add([
        new RawTraceItem({
          id: 'rt_1',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'search',
          toolCallId: 'call_1',
          toolArgs: { q: 'a' }
        }),
        new RawTraceItem({
          id: 'rt_2',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 2,
          traceType: 'tool_result',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'search',
          toolCallId: 'call_1',
          toolResult: { ok: true }
        }),
        new RawTraceItem({
          id: 'rt_3',
          ts: Date.now() / 1000,
          turnId: 'turn_0002',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'write_file',
          toolCallId: 'call_2',
          toolArgs: { path: 'a.txt' }
        })
      ]);

      const allInteractions = manager.getToolInteractions();
      expect(new Set(allInteractions.map((interaction) => interaction.toolCallId))).toEqual(
        new Set(['call_1', 'call_2'])
      );

      const turn1Interactions = manager.getToolInteractions('turn_0001');
      expect(turn1Interactions).toHaveLength(1);
      expect(turn1Interactions[0].toolCallId).toBe('call_1');
      expect(turn1Interactions[0].status).toBe(ToolInteractionStatus.SUCCESS);

      const turn2Interactions = manager.getToolInteractions('turn_0002');
      expect(turn2Interactions).toHaveLength(1);
      expect(turn2Interactions[0].status).toBe(ToolInteractionStatus.PENDING);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lists ordered raw traces from the store append order', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tail');
      const manager = new MemoryManager({ store });

      store.add([
        makeTrace('turn_0001', 1, 'user', 't1 user'),
        makeTrace('turn_0001', 2, 'assistant', 't1 assistant'),
        makeTrace('turn_0002', 1, 'user', 't2 user'),
      ]);

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.map((item) => [item.turnId, item.seq])).toEqual([
        ['turn_0001', 1],
        ['turn_0001', 2],
        ['turn_0002', 1]
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists a tool continuation boundary without duplicating tool results', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_boundary');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestToolIntent(new ToolInvocation('search', {}, 'call_1', turnId), turnId);
      manager.ingestToolResult(new ToolResultEvent('search', { ok: true }, 'call_1', undefined, undefined, turnId), turnId);
      manager.ingestToolContinuationBoundary(turnId, 'ToolContinuationInput');

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.map((item) => item.traceType)).toEqual(['tool_call', 'tool_result', 'tool_continuation']);
      expect(rawItems[2]?.content).toBe('Tool continuation');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ensures crash-recovered incomplete tool calls get one idempotent synthetic terminal result', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_crash_recovery_marker');
      const manager = new MemoryManager({ store });
      store.add([
        new RawTraceItem({
          id: 'rt_missing_tool_call',
          ts: 1,
          turnId: 'turn_crash',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: 'generate_image',
          toolCallId: 'call_crash',
          toolArgs: { prompt: 'page two' }
        })
      ]);
      manager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.ASSISTANT, {
          content: 'Generating page two.',
          tool_payload: new ToolCallPayload([
            { id: 'call_crash', name: 'generate_image', arguments: { prompt: 'page two' } },
          ]),
        }),
        new Message(MessageRole.USER, { content: 'please continue there was a shutdown' }),
      ]));

      const firstRepair = manager.ensureWorkingContextToolProtocolSafeForNextLlm();
      const secondRepair = manager.ensureWorkingContextToolProtocolSafeForNextLlm();

      expect(firstRepair.didRepair).toBe(true);
      expect(secondRepair.didRepair).toBe(false);
      const messages = manager.getWorkingContextMessages();
      expect(messages.map((message) => message.role)).toEqual([
        MessageRole.ASSISTANT,
        MessageRole.TOOL,
        MessageRole.USER,
      ]);
      const syntheticResult = messages[1].tool_payload as ToolResultPayload;
      expect(syntheticResult.toolCallId).toBe('call_crash');
      expect(syntheticResult.toolResult).toBeNull();
      expect(syntheticResult.toolError).toBe(
        SYNTHETIC_TOOL_RESULT_ERROR('generate_image', 'call_crash')
      );
      const terminalResults = manager.listRawTracesOrdered().filter((item) =>
        item.traceType === 'tool_result' && item.toolCallId === 'call_crash'
      );
      expect(terminalResults).toHaveLength(1);
      expect(terminalResults[0]).toMatchObject({
        toolName: 'generate_image',
        toolArgs: { prompt: 'page two' },
        toolResult: null,
        toolError: SYNTHETIC_TOOL_RESULT_ERROR('generate_image', 'call_crash'),
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('appends operation-boundary notes and closes interrupted tool calls with source-accurate synthetic results', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interrupted_projection');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.replaceWorkingContext(new WorkingContext([
        new Message(MessageRole.SYSTEM, { content: 'stable system prompt' }),
        new Message(MessageRole.USER, { content: 'interrupted user input' }),
      ]));
      manager.ingestUserMessage(new LLMUserMessage({ content: 'interrupted user input' }), turnId, 'LLMUserMessageReadyEvent');
      manager.ingestToolIntent(new ToolInvocation('read_file', { path: '/tmp/incomplete.txt' }, 'inv-interrupt', turnId), turnId);

      manager.finalizePendingToolCallsForTurn(turnId, 'user_interrupt', { appendToWorkingContext: false });
      appendOperationBoundaryNote(manager, turnId, 'user_interrupt');
      await manager.projectWorkingContextForNextLlm({
        mode: 'llm_safe',
        fenceIncompleteToolProtocolScope: { kind: 'agent_turn', id: turnId }
      });

      const messages = manager.getWorkingContextMessages();
      expect(messages.some((message) => message.content === 'stable system prompt')).toBe(true);
      expect(messages.some((message) => message.content === 'interrupted user input')).toBe(true);
      expect(messages.find((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${turnId}' was interrupted`)
      )?.role).toBe(MessageRole.SYSTEM);
      expect(messages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${turnId}' was interrupted`) &&
        message.content.includes('user_interrupt') &&
        message.content.includes('interrupted request as cancelled') &&
        message.content.includes('Treat the next user message as the active instruction')
      )).toBe(true);
      expect(messages.some((message) => message.tool_payload instanceof ToolCallPayload)).toBe(true);
      const syntheticResult = messages.find(
        (message) => message.tool_payload instanceof ToolResultPayload
      )?.tool_payload as ToolResultPayload | undefined;
      expect(syntheticResult?.toolCallId).toBe('inv-interrupt');
      expect(syntheticResult?.toolResult).toBeNull();
      expect(syntheticResult?.toolError).toBe('user_interrupt');

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.some((item) => item.traceType === 'user' && item.content === 'interrupted user input')).toBe(true);
      expect(rawItems.some((item) =>
        item.traceType === 'operation_boundary' &&
        item.sourceEvent === 'AgentTurnInterruptedEvent' &&
        item.content.includes('user_interrupt')
      )).toBe(true);
      expect(rawItems.some((item) => item.traceType === 'tool_result' &&
        item.sourceEvent === 'AgentTurnInterruptedEvent' && item.toolCallId === 'inv-interrupt' &&
        item.toolName === 'read_file' && item.toolResult === null && item.toolError === 'user_interrupt')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps complete native tool-call history while adding an operation-boundary note', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interrupted_complete_tools');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      const invocation = new ToolInvocation('search', { q: 'abc' }, 'call_complete', turnId);
      manager.ingestToolIntent(invocation, turnId);
      manager.ingestToolResult(
        new ToolResultEvent('search', { ok: true }, 'call_complete', undefined, { q: 'abc' }, turnId),
        turnId
      );

      appendOperationBoundaryNote(manager, turnId, 'post_tool_interrupt');
      await manager.projectWorkingContextForNextLlm({
        mode: 'llm_safe',
        fenceIncompleteToolProtocolScope: { kind: 'agent_turn', id: turnId }
      });

      const messages = manager.getWorkingContextMessages();
      expect(messages.some((message) => message.tool_payload instanceof ToolCallPayload)).toBe(true);
      expect(messages.some((message) => message.tool_payload instanceof ToolResultPayload)).toBe(true);
      expect(messages.at(-1)?.content).toContain(`turn '${turnId}' was interrupted`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('repairs partial native tool batches as native results while retaining completed facts', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interrupted_partial_tools');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestToolIntents([
        new ToolInvocation('safe_tool', {}, 'call_A', turnId),
        new ToolInvocation('slow_tool', {}, 'call_B', turnId),
      ], turnId);
      manager.ingestToolResults([
        new ToolResultEvent('safe_tool', 'SAFE_FACT', 'call_A', undefined, {}, turnId)
      ], turnId, {
        source: 'ToolResultEvent',
        appendToWorkingContext: false
      });
      manager.finalizePendingToolCallsForTurn(turnId, 'user_interrupt', {
        source: 'AgentTurnInterruptedEvent',
        appendToWorkingContext: false,
      });

      appendOperationBoundaryNote(manager, turnId, 'user_interrupt');
      await manager.projectWorkingContextForNextLlm({
        mode: 'llm_safe',
        fenceIncompleteToolProtocolScope: { kind: 'agent_turn', id: turnId }
      });

      const messages = manager.getWorkingContextMessages();
      expect(messages[0]?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(messages[1]?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect(messages[2]?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect((messages[1].tool_payload as ToolResultPayload).toolCallId).toBe('call_A');
      expect((messages[1].tool_payload as ToolResultPayload).toolResult).toBe('SAFE_FACT');
      expect((messages[2].tool_payload as ToolResultPayload).toolCallId).toBe('call_B');
      expect((messages[2].tool_payload as ToolResultPayload).toolResult).toBeNull();
      expect((messages[2].tool_payload as ToolResultPayload).toolError).toBe('user_interrupt');
      expect(messages.at(-1)?.content).toContain(`turn '${turnId}' was interrupted`);
      expect(messages.at(-1)?.role).toBe(MessageRole.SYSTEM);
      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.some((item) =>
        item.traceType === 'tool_result' &&
        item.toolCallId === 'call_A' &&
        item.toolResult === 'SAFE_FACT'
      )).toBe(true);
      expect(rawItems.some((item) =>
        item.traceType === 'tool_result' && item.sourceEvent === 'AgentTurnInterruptedEvent' &&
        item.toolCallId === 'call_B' && item.toolName === 'slow_tool' && item.toolError === 'user_interrupt'
      )).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps model-issued arguments on the early call and records prepared arguments on failure results', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_prepared_failure');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('edit_image', { input: 'relative.png' }, 'call_edit', turnId);
      manager.ingestToolIntent(invocation, turnId);
      invocation.arguments.input = 'mutated-after-persistence.png';
      invocation.arguments.input_images = ['/absolute/relative.png'];

      manager.ingestToolResult(new ToolResultEvent(
        'edit_image', null, 'call_edit', 'execution failed',
        { input_images: ['/absolute/relative.png'] }, turnId,
      ), turnId);

      expect(manager.listRawTracesOrdered()).toHaveLength(2);
      expect(manager.listRawTracesOrdered()[0]).toMatchObject({
        traceType: 'tool_call',
        toolArgs: { input: 'relative.png' },
      });
      expect(manager.listRawTracesOrdered()[1]).toMatchObject({
        traceType: 'tool_result',
        toolName: 'edit_image',
        toolArgs: { input_images: ['/absolute/relative.png'] },
        toolResult: null,
        toolError: 'execution failed',
      });
      expect((manager.getWorkingContextMessages()[0].tool_payload as ToolCallPayload).toolCalls[0].arguments).toEqual({
        input: 'relative.png',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a missing-id terminal batch before raw or Working Context mutation', () => {
    const tempDir = makeTempDir();
    try {
      const manager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_mem_invalid_batch') });
      const turnId = manager.startTurn();
      manager.ingestToolIntents([
        new ToolInvocation('tool_A', {}, 'call_A', turnId),
        new ToolInvocation('tool_B', {}, 'call_B', turnId),
      ], turnId);
      const messageCount = manager.getWorkingContextMessages().length;

      expect(() => manager.ingestToolResults([
        new ToolResultEvent('tool_A', 'ok', 'call_A', undefined, {}, turnId),
        new ToolResultEvent('tool_B', 'bad', '   ', undefined, {}, turnId),
      ], turnId)).toThrow(/batch was rejected/);

      expect(manager.listRawTracesOrdered()).toHaveLength(2);
      expect(manager.listRawTracesOrdered().every((trace) => trace.traceType === 'tool_call')).toBe(true);
      expect(manager.getWorkingContextMessages()).toHaveLength(messageCount);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects a conflicting terminal name before batch mutation and accepts a later name-less terminal', () => {
    const tempDir = makeTempDir();
    try {
      const manager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_mem_conflicting_names') });
      const turnId = manager.startTurn();
      manager.ingestToolIntents([
        new ToolInvocation('tool_A', {}, 'call_A', turnId),
        new ToolInvocation('tool_B', {}, 'call_B', turnId),
      ], turnId);
      const messageCount = manager.getWorkingContextMessages().length;

      expect(() => manager.ingestToolResults([
        new ToolResultEvent('tool_A', 'ok', 'call_A', undefined, undefined, turnId),
        new ToolResultEvent('wrong_tool', 'bad', 'call_B', undefined, undefined, turnId),
      ], turnId)).toThrow(
        `Native tool result 'call_B' in turn '${turnId}' names 'wrong_tool' but the persisted tool call names 'tool_B'`,
      );

      expect(manager.listRawTracesOrdered().map((trace) => trace.traceType)).toEqual([
        'tool_call', 'tool_call',
      ]);
      expect(manager.getWorkingContextMessages()).toHaveLength(messageCount);

      manager.ingestToolResults([
        new ToolResultEvent('tool_A', 'ok', 'call_A', undefined, undefined, turnId),
        new ToolResultEvent('   ', 'ok', 'call_B', undefined, undefined, turnId),
      ], turnId);
      expect(manager.listRawTracesOrdered().slice(2).map((trace) => trace.toDict())).toEqual([
        expect.objectContaining({ tool_call_id: 'call_A', tool_name: 'tool_A', tool_result: 'ok' }),
        expect.objectContaining({ tool_call_id: 'call_B', tool_name: 'tool_B', tool_result: 'ok' }),
      ]);
      expect(manager.listRawTracesOrdered().slice(2).every((trace) => !('tool_args' in trace.toDict()))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects result-before-call and suppresses reconstructed duplicate results', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_split_result');
      const turnId = 'turn_terminal';
      const manager = new MemoryManager({ store });
      const terminal = new ToolResultEvent('search_web', 'done', 'call_web', undefined, { query: 'cats' }, turnId);
      expect(() => manager.ingestToolResult(terminal, turnId)).toThrow(/no persisted tool call/);
      expect(manager.listRawTracesOrdered()).toHaveLength(0);

      manager.ingestToolIntent(new ToolInvocation('search_web', { query: 'cats' }, 'call_web', turnId), turnId);
      manager.ingestToolResult(terminal, turnId);

      expect(manager.getWorkingContextMessages().map((message) => message.role)).toEqual([
        MessageRole.ASSISTANT, MessageRole.TOOL,
      ]);
      expect(manager.listRawTracesOrdered()).toHaveLength(2);

      const reconstructed = new MemoryManager({ store });
      reconstructed.ingestToolResult(terminal, turnId);
      expect(reconstructed.listRawTracesOrdered()).toHaveLength(2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('hydrates an archived native call before appending one active name-bearing result', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_archived_call');
      const turnId = 'turn_archive';
      const first = new MemoryManager({ store });
      first.ingestToolIntent(new ToolInvocation('read_file', { path: 'archived.txt' }, 'call_archive', turnId), turnId);
      const call = first.listRawTracesOrdered()[0]!;
      first.pruneRawTracesById([call.id]);

      const reconstructed = new MemoryManager({ store });
      reconstructed.ingestToolResult(
        new ToolResultEvent('read_file', 'contents', 'call_archive', undefined, undefined, turnId),
        turnId,
      );

      expect(reconstructed.listRawTracesOrdered()).toHaveLength(1);
      expect(reconstructed.listRawTracesOrdered()[0]).toMatchObject({
        traceType: 'tool_result', toolCallId: 'call_archive', toolName: 'read_file',
        toolResult: 'contents', toolError: null,
      });
      expect(reconstructed.listRawTraceCorpusOrdered().map((trace) => trace.traceType)).toEqual([
        'tool_call', 'tool_result',
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
