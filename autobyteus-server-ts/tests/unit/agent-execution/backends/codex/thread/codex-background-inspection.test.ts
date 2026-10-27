import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodexThread } from '../../../../../../src/agent-execution/backends/codex/thread/codex-thread.js';
import { createCodexThreadStartupGate } from '../../../../../../src/agent-execution/backends/codex/thread/codex-thread-startup-gate.js';
import { AgentRunConfig } from '../../../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../../../../src/agent-execution/domain/agent-run-context.js';
import { CodexAgentRunContext } from '../../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js';
import { CodexApprovalPolicy } from '../../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js';
import { RuntimeKind } from '../../../../../../src/runtime-management/runtime-kind-enum.js';

const fixture = () => {
  const request = vi.fn<(...args: any[]) => Promise<unknown>>().mockResolvedValue({ data: [], nextCursor: null });
  const thread = new CodexThread({
    runContext: new AgentRunContext({
      runId: 'run-1',
      config: new AgentRunConfig({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: 'def-1', llmModelIdentifier: 'fixture', autoExecuteTools: true, workspaceId: '/tmp', llmConfig: null }),
      runtimeContext: new CodexAgentRunContext({ codexThreadConfig: {
        model: 'fixture', workingDirectory: '/tmp', reasoningEffort: null, approvalPolicy: CodexApprovalPolicy.NEVER,
        sandbox: 'workspace-write', baseInstructions: null, developerInstructions: null, dynamicTools: [],
      } }),
    }),
    client: { request } as never, startup: createCodexThreadStartupGate(),
  });
  thread.setThreadId('thread-1'); thread.markStartupReady();
  return { thread, request };
};
const entry = { itemId: 'command-1', processId: 'provider-handle', command: '/bin/bash -c SECRET' };
const command = (status = 'inProgress', exitCode: number | null = null) => ({
  threadId: 'thread-1', turnId: 'turn-1', item: { id: entry.itemId, processId: entry.processId, type: 'commandExecution', command: entry.command, status, exitCode },
});
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
afterEach(() => vi.useRealTimers());

describe('CodexThread read-only inspection boundary', () => {
  it('observes matched completion after the strict transcript gate closes without publishing it', async () => {
    const { thread, request } = fixture(); const observed: any[] = [];
    thread.subscribeAppServerMessages(message => observed.push(message));
    thread.markTurnStarted('turn-1'); thread.handleAppServerNotification('item/started', command());
    request.mockResolvedValue({ data: [entry], nextCursor: null });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'snapshot', tasks: [] });
    thread.handleAppServerNotification('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1' } });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ tasks: [{ status: 'running' }] });
    const count = observed.length;
    thread.handleAppServerNotification('item/completed', command('completed', 0));
    expect(observed).toHaveLength(count);
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ tasks: [{ status: 'completed' }] });
    expect(request.mock.calls.every(([method]) => method === 'thread/backgroundTerminals/list')).toBe(true);
  });
  it('shares one page walk and reconciles a newly observed completion during its pending response', async () => {
    const { thread, request } = fixture(); const read = deferred<unknown>(); request.mockReturnValue(read.promise);
    const first = thread.inspectBackgroundTasks(), second = thread.inspectBackgroundTasks();
    expect(first).toBe(second); expect(request).toHaveBeenCalledTimes(1);
    thread.handleAppServerNotification('item/completed', command('completed', 0));
    read.resolve({ data: [entry], nextCursor: null });
    expect(await first).toMatchObject({ kind: 'snapshot', tasks: [{ status: 'completed' }] });
  });
  it('passes a decreasing total deadline across pages, never parallel reads', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const { thread, request } = fixture();
    request.mockImplementationOnce(async () => { vi.setSystemTime(11_000); return { data: [entry], nextCursor: 'page2' }; });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'snapshot', tasks: [{ status: 'running' }] });
    expect(request.mock.calls).toEqual([
      ['thread/backgroundTerminals/list', { threadId: 'thread-1', cursor: null }, 5_000],
      ['thread/backgroundTerminals/list', { threadId: 'thread-1', cursor: 'page2' }, 4_000],
    ]);
  });
  it.each([{ data: [] }, { data: [{ itemId: 'x' }], nextCursor: null }, { data: [], nextCursor: 1 }])('malformed response is unavailable, not empty: %j', async response => {
    const { thread, request } = fixture(); request.mockResolvedValue(response);
    expect(await thread.inspectBackgroundTasks()).toEqual({ kind: 'unavailable', reason: 'incomplete' });
  });
  it('bounds repeated cursors, page count and deadline without silently truncating', async () => {
    const { thread, request } = fixture(); request.mockResolvedValue({ data: [], nextCursor: 'same' });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'unavailable', reason: 'incomplete' });
    expect(request).toHaveBeenCalledTimes(2); request.mockClear();
    let pages = 0; request.mockImplementation(async () => ({ data: [], nextCursor: String(++pages) }));
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'unavailable', reason: 'incomplete' });
    expect(pages).toBe(100);
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    request.mockImplementation(async () => { vi.setSystemTime(15_001); return { data: [], nextCursor: null }; });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'unavailable', reason: 'incomplete' });
  });
  it('maps provider errors safely and can recover on a later inspection', async () => {
    const { thread, request } = fixture(); request.mockRejectedValueOnce(new Error('SECRET provider error'));
    expect(await thread.inspectBackgroundTasks()).toEqual({ kind: 'unavailable', reason: 'inspection_failed' });
    expect(await thread.inspectBackgroundTasks()).toMatchObject({ kind: 'snapshot', tasks: [] });
  });
  it('fences release immediately and discards pending results without waiting for inspection to release input', async () => {
    const { thread, request } = fixture(); const read = deferred<unknown>(); request.mockReturnValue(read.promise);
    const pending = thread.inspectBackgroundTasks(); thread.cancelRuntimeInput();
    expect(await thread.inspectBackgroundTasks()).toEqual({ kind: 'unavailable', reason: 'inactive' });
    read.resolve({ data: [entry], nextCursor: null });
    expect(await pending).toEqual({ kind: 'unavailable', reason: 'inactive' });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects an old thread identity response', async () => {
    const { thread, request } = fixture(); const read = deferred<unknown>(); request.mockReturnValue(read.promise);
    const pending = thread.inspectBackgroundTasks(); thread.setThreadId('replacement');
    read.resolve({ data: [entry], nextCursor: null });
    expect(await pending).toEqual({ kind: 'unavailable', reason: 'inactive' });
  });
});
