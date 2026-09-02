import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector';
import type { ServerMessage } from '~/services/agentStreaming/protocol';
import type { ToolInvocationLifecycle } from '~/types/segments';
import { AgentRun } from '../../../autobyteus-server-ts/src/agent-execution/domain/agent-run.js';
import { AgentRunConfig } from '../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-context.js';
import { AgentRunEventType, type AgentRunEvent } from '../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js';
import { CodexAgentRunBackend } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.js';
import { CodexAgentRunContext } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.js';
import { CodexThread } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.js';
import { CodexApprovalPolicy } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.js';
import { createCodexThreadStartupGate } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-startup-gate.js';
import { CodexThreadEventName } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.js';
import { RuntimeKind } from '../../../autobyteus-server-ts/src/runtime-management/runtime-kind-enum.js';
import { AgentRunEventMessageMapper } from '../../../autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.js';
import { AgentRunMemoryRecorder } from '../../../autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.js';

const tempDirs = new Set<string>();

const waitFor = async (predicate: () => boolean, timeoutMs = 2_000): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for the native-to-projection event sequence.');
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
};

const buildProjectionContext = (runId: string): AgentContext => new AgentContext({
  agentDefinitionId: 'codex-agent',
  agentDefinitionName: 'Codex Agent',
  llmModelIdentifier: 'gpt-5.6-sol',
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  workspaceId: null,
  workspaceMetadata: null,
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  isLocked: true,
  llmConfig: null,
}, new AgentRunState(runId, {
  id: runId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
}));

const createNativeToProjectionHarness = (memoryDir?: string) => {
  const runId = 'run-codex-turn-lifecycle';
  const runContext = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: 'codex-agent',
      llmModelIdentifier: 'gpt-5.6-sol',
      autoExecuteTools: true,
      workspaceId: '/tmp/codex-turn-lifecycle',
      ...(memoryDir ? { memoryDir } : {}),
      llmConfig: null,
      skillAccessMode: 'NONE' as never,
      memberTeamContext: null,
    }),
    runtimeContext: new CodexAgentRunContext({
      threadId: 'thread-1',
      codexThreadConfig: {
        model: 'gpt-5.6-sol',
        workingDirectory: '/tmp/codex-turn-lifecycle',
        reasoningEffort: 'medium',
        serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.NEVER,
        sandbox: 'workspace-write',
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: [],
      },
    }),
  });
  const client = {
    request: vi.fn(),
    respondSuccess: vi.fn(),
    respondError: vi.fn(),
  };
  const thread = new CodexThread({
    runContext,
    client: client as never,
    startup: createCodexThreadStartupGate(),
  });
  const threadManager = {
    hasThread: vi.fn().mockReturnValue(true),
    terminateThread: vi.fn().mockResolvedValue(undefined),
  };
  const backend = new CodexAgentRunBackend(runContext, thread, threadManager as never);
  const run = new AgentRun({
    context: runContext,
    backend,
    providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
  });
  const projectionContext = buildProjectionContext(runId);
  const mapper = new AgentRunEventMessageMapper();
  const canonicalEvents: AgentRunEvent[] = [];
  const wireMessages: ServerMessage[] = [];
  run.subscribeToEvents((event) => {
    canonicalEvents.push(event);
    const wireMessage = JSON.parse(mapper.map(event).toJson()) as ServerMessage;
    wireMessages.push(wireMessage);
    dispatchAgentStreamMessage(wireMessage, {
      kind: 'standalone',
      context: projectionContext,
      runId,
    });
  });

  return { thread, run, projectionContext, canonicalEvents, wireMessages };
};

const readJsonl = async (filePath: string): Promise<Record<string, unknown>[]> =>
  (await fs.readFile(filePath, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe('Codex turn lifecycle native-to-live projection', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('keeps one active response and persists later same-turn work across a retry diagnostic', async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-retry-projection-memory-'));
    tempDirs.add(memoryDir);
    const {
      thread,
      run,
      projectionContext,
      canonicalEvents,
      wireMessages,
    } = createNativeToProjectionHarness(memoryDir);
    const memoryRecorder = new AgentRunMemoryRecorder();
    const detachMemoryRecorder = memoryRecorder.attachToRun(run);

    try {
      thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
        threadId: 'thread-1',
        turn: { id: 'turn-retry' },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_STARTED, {
        turnId: 'turn-retry',
        item: {
          id: 'tool-retry',
          type: 'commandExecution',
          command: 'pwd',
          status: 'inProgress',
        },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
        turnId: 'turn-retry',
        item: {
          id: 'reasoning-before-retry',
          type: 'reasoning',
          summary: [{ text: 'reasoning before retry' }],
        },
      });
      await waitFor(() => wireMessages.some((message) =>
        message.type === 'TOOL_EXECUTION_STARTED' &&
        message.payload.invocation_id === 'tool-retry'
      ));

      thread.handleAppServerNotification(CodexThreadEventName.ERROR, {
        threadId: 'thread-1',
        turnId: 'turn-retry',
        willRetry: true,
        error: {
          code: 'STREAM_DISCONNECTED',
          message: 'Reconnecting... 1/5',
        },
      });
      await waitFor(() => wireMessages.some((message) =>
        message.type === 'ERROR' &&
        message.payload.error_effect === 'diagnostic'
      ));

      const activeMessage = projectionContext.conversation.messages.find(
        (message) => message.type === 'ai',
      );
      const activeTool = activeMessage?.type === 'ai'
        ? activeMessage.segments.find((segment) =>
          'invocationId' in segment && segment.invocationId === 'tool-retry'
        ) as ToolInvocationLifecycle | undefined
        : undefined;
      expect(thread.activeTurnId).toBe('turn-retry');
      expect(run.getStatusSnapshot().status).toBe('running');
      expect(canonicalEvents).toContainEqual(expect.objectContaining({
        eventType: AgentRunEventType.ERROR,
        statusHint: null,
        payload: expect.objectContaining({
          code: 'STREAM_DISCONNECTED',
          error_scope: 'turn',
          error_effect: 'diagnostic',
          turn_id: 'turn-retry',
        }),
      }));
      expect(wireMessages).toContainEqual(expect.objectContaining({
        type: 'ERROR',
        payload: expect.objectContaining({
          code: 'STREAM_DISCONNECTED',
          error_scope: 'turn',
          error_effect: 'diagnostic',
          turn_id: 'turn-retry',
        }),
      }));
      expect(canonicalEvents.some((event) =>
        event.eventType === AgentRunEventType.SEGMENT_END &&
        event.payload.turn_id === 'turn-retry'
      )).toBe(false);
      expect(projectionContext.conversation.messages.filter((message) => message.type === 'ai'))
        .toHaveLength(1);
      expect(activeMessage).toMatchObject({ isComplete: false });
      expect(activeTool).toMatchObject({ status: 'executing', error: null });
      expect(activeMessage?.type === 'ai'
        ? activeMessage.segments.some((segment) =>
          segment.type === 'error' &&
          segment.code === 'STREAM_DISCONNECTED' &&
          segment.message === 'Reconnecting... 1/5'
        )
        : false).toBe(true);

      thread.handleAppServerNotification(CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, {
        turnId: 'turn-retry',
        item: {
          type: 'functionCallOutput',
          call_id: 'tool-retry',
          output: '/tmp/codex-retry\n',
        },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
        turnId: 'turn-retry',
        item: {
          id: 'tool-retry',
          type: 'commandExecution',
          command: 'pwd',
          status: 'completed',
          aggregatedOutput: '/tmp/codex-retry\n',
        },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
        turnId: 'turn-retry',
        item: {
          id: 'reasoning-after-retry',
          type: 'reasoning',
          summary: [{ text: 'reasoning after retry' }],
        },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_STARTED, {
        turnId: 'turn-retry',
        item: { id: 'message-after-retry', type: 'agentMessage' },
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, {
        turnId: 'turn-retry',
        itemId: 'message-after-retry',
        delta: 'final response after retry',
      });
      thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
        turnId: 'turn-retry',
        item: { id: 'message-after-retry', type: 'agentMessage' },
      });
      thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
        threadId: 'thread-1',
        turn: { id: 'turn-retry' },
      });

      await waitFor(() => wireMessages.some((message) =>
        message.type === 'TURN_COMPLETED' && message.payload.turn_id === 'turn-retry'
      ));
      await memoryRecorder.waitForIdle(run.runId);

      const finalMessages = projectionContext.conversation.messages.filter(
        (message) => message.type === 'ai',
      );
      expect(finalMessages).toHaveLength(1);
      expect(finalMessages[0]).toMatchObject({ isComplete: true });
      expect(projectionContext.state.currentStatus).toBe('idle');
      expect(activeTool).toMatchObject({ status: 'success', error: null });
      expect(finalMessages[0]?.type === 'ai'
        ? finalMessages[0].segments.some((segment) =>
          segment.type === 'text' && segment.content === 'final response after retry'
        )
        : false).toBe(true);

      const traces = await readJsonl(path.join(memoryDir, 'raw_traces_active.jsonl'));
      expect(traces).toEqual(expect.arrayContaining([
        expect.objectContaining({
          trace_type: 'reasoning',
          turn_id: 'turn-retry',
          content: expect.stringContaining('reasoning after retry'),
        }),
        expect.objectContaining({
          trace_type: 'tool_call',
          turn_id: 'turn-retry',
          tool_call_id: 'tool-retry',
          tool_name: 'run_bash',
        }),
        expect.objectContaining({
          trace_type: 'tool_result',
          turn_id: 'turn-retry',
          tool_call_id: 'tool-retry',
        }),
        expect.objectContaining({
          trace_type: 'assistant',
          turn_id: 'turn-retry',
          content: 'final response after retry',
        }),
      ]));
    } finally {
      await memoryRecorder.waitForIdle(run.runId);
      detachMemoryRecorder();
    }
  });

  it('keeps one active B response through late terminal and completion facts for A', async () => {
    const {
      thread,
      run,
      projectionContext,
      canonicalEvents,
      wireMessages,
    } = createNativeToProjectionHarness();

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      threadId: 'thread-1',
      turn: { id: 'turn-b' },
    });
    await waitFor(() => canonicalEvents.some((event) =>
      event.eventType === AgentRunEventType.TURN_STARTED &&
      (event.payload.turnId === 'turn-b' || event.payload.turn_id === 'turn-b')
    ));

    thread.handleAppServerNotification(CodexThreadEventName.ITEM_STARTED, {
      turnId: 'turn-b',
      item: { id: 'message-b-1', type: 'agentMessage' },
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, {
      turnId: 'turn-b',
      itemId: 'message-b-1',
      delta: 'before stale A',
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: 'turn-b',
      item: { id: 'message-b-1', type: 'agentMessage' },
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_STARTED, {
      turnId: 'turn-b',
      item: {
        id: 'tool-b',
        type: 'commandExecution',
        command: 'pwd',
        status: 'inProgress',
      },
    });
    await waitFor(() => wireMessages.some((message) =>
      message.type === 'TOOL_EXECUTION_STARTED' &&
      message.payload.invocation_id === 'tool-b'
    ));

    const aiMessageBeforeA = projectionContext.conversation.messages.find(
      (message) => message.type === 'ai',
    );
    const toolBeforeA = aiMessageBeforeA?.type === 'ai'
      ? aiMessageBeforeA.segments.find((segment) =>
        'invocationId' in segment && segment.invocationId === 'tool-b'
      ) as ToolInvocationLifecycle | undefined
      : undefined;
    expect(projectionContext.conversation.messages.filter((message) => message.type === 'ai'))
      .toHaveLength(1);
    expect(aiMessageBeforeA).toMatchObject({ isComplete: false });
    expect(toolBeforeA).toMatchObject({
      invocationId: 'tool-b',
      toolName: 'run_bash',
      status: 'executing',
    });

    const canonicalCountBeforeA = canonicalEvents.length;
    const wireCountBeforeA = wireMessages.length;
    thread.handleAppServerNotification(CodexThreadEventName.ERROR, {
      threadId: 'thread-1',
      turnId: 'turn-a',
      willRetry: false,
      error: { code: 'TURN_FAILED', message: 'late A failure' },
    });
    thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
      threadId: 'thread-1',
      turn: { id: 'turn-a' },
    });

    expect(thread.activeTurnId).toBe('turn-b');
    expect(run.getStatusSnapshot().status).toBe('running');
    expect(canonicalEvents).toHaveLength(canonicalCountBeforeA);
    expect(wireMessages).toHaveLength(wireCountBeforeA);
    expect(canonicalEvents.some((event) =>
      (event.eventType === AgentRunEventType.ERROR ||
        event.eventType === AgentRunEventType.TURN_COMPLETED) &&
      (event.payload.turn_id === 'turn-a' || event.payload.turnId === 'turn-a')
    )).toBe(false);
    expect(projectionContext.conversation.messages.filter((message) => message.type === 'ai'))
      .toHaveLength(1);
    expect(aiMessageBeforeA).toMatchObject({ isComplete: false });
    expect(toolBeforeA).toMatchObject({ status: 'executing', error: null });

    thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: 'turn-b',
      item: {
        id: 'tool-b',
        type: 'commandExecution',
        command: 'pwd',
        status: 'completed',
        aggregatedOutput: '/tmp/codex-stale-boundary\n',
      },
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_STARTED, {
      turnId: 'turn-b',
      item: { id: 'message-b-2', type: 'agentMessage' },
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, {
      turnId: 'turn-b',
      itemId: 'message-b-2',
      delta: 'after stale A',
    });
    thread.handleAppServerNotification(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: 'turn-b',
      item: { id: 'message-b-2', type: 'agentMessage' },
    });
    await waitFor(() => wireMessages.some((message) =>
      message.type === 'SEGMENT_CONTENT' && message.payload.delta === 'after stale A'
    ));

    const aiMessagesBeforeBCompletion = projectionContext.conversation.messages.filter(
      (message) => message.type === 'ai',
    );
    expect(aiMessagesBeforeBCompletion).toHaveLength(1);
    expect(aiMessagesBeforeBCompletion[0]).toMatchObject({ isComplete: false });
    expect(toolBeforeA).toMatchObject({ status: 'success', error: null });
    expect(aiMessagesBeforeBCompletion[0]?.type === 'ai'
      ? aiMessagesBeforeBCompletion[0].segments
        .filter((segment) => segment.type === 'text')
        .map((segment) => segment.content)
      : []).toEqual(['before stale A', 'after stale A']);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
      threadId: 'thread-1',
      turn: { id: 'turn-b' },
    });
    await waitFor(() => wireMessages.some((message) =>
      message.type === 'TURN_COMPLETED' && message.payload.turn_id === 'turn-b'
    ));

    const finalAiMessages = projectionContext.conversation.messages.filter(
      (message) => message.type === 'ai',
    );
    expect(finalAiMessages).toHaveLength(1);
    expect(finalAiMessages[0]).toMatchObject({ isComplete: true });
    expect(projectionContext.state.currentStatus).toBe('idle');
  });
});
