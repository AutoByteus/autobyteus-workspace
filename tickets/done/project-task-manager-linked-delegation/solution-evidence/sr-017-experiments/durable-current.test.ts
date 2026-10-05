import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { AgentRun } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run.js';
import { AgentRunConfig } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run-context.js';
import { AgentRunEventType } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js';
import type { AgentRunInputLifecycle } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/input/agent-run-input-contract.js';
import { CodexAgentRunContext } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.js';
import { CodexAgentRunBackend } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.js';
import { CodexThreadManager } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.js';
import { CodexClientThreadRouter } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.js';
import { CodexAppServerClient } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.js';
import { CodexAppServerClientManager } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.js';
import type { CodexThreadCleanup } from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.js';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
};
const fixture = fileURLToPath(new URL('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/tests/fixtures/codex-owned-terminal-cli.mjs', import.meta.url));

async function harness() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'codex-input-proof-'));
  let client!: CodexAppServerClient;
  const clients = new CodexAppServerClientManager({ createClient: () => client = new CodexAppServerClient({
    command: process.execPath, args: [fixture], cwd, env: {}, requestTimeoutMs: 2000,
  }) });
  const cleanup = { cleanupPreparedWorkspaceSkills: vi.fn(async () => undefined) };
  const manager = new CodexThreadManager(clients, cleanup as unknown as CodexThreadCleanup, new CodexClientThreadRouter());
  const create = async (runId: string) => {
    const context = new AgentRunContext({ runId,
      config: new AgentRunConfig({ runtimeKind: 'codex_app_server', agentDefinitionId: 'test-reader',
        llmModelIdentifier: '', autoExecuteTools: false, workspaceId: cwd }),
      runtimeContext: new CodexAgentRunContext({ codexThreadConfig: {
        model: null, workingDirectory: cwd, reasoningEffort: null, serviceTier: null,
        approvalPolicy: null, sandbox: null, baseInstructions: null, developerInstructions: null, dynamicTools: [],
      } }),
    });
    const thread = await manager.createThread(context, () => undefined);
    const backend = new CodexAgentRunBackend(context, thread, manager);
    return { context, thread, backend, makeRun: () => new AgentRun({ context, backend,
      providerInputNormalizer: { normalizeForProvider: dispatch => dispatch } }) };
  };
  const owned = await create('test-owned-reader');
  const protectedMember = await create('test-borrowed-member');
  const close = async () => {
    // Test environment teardown only; not Task repair or assertion evidence.
    await client.close();
    await rm(cwd, { recursive: true, force: true });
  };
  return { ...owned, create, protectedMember, client, manager, cleanup, close };
}

describe('REQ-007/009/013 exact Codex input outcome before Task-owned release', () => {
  it('retains the exact reader/router/lease through idle and awaits the genuine native terminal', async () => {
    const h = await harness();
    try {
      const backendReceipts: unknown[] = [];
      const terminate = h.backend.terminate.bind(h.backend);
      vi.spyOn(h.backend, 'terminate').mockImplementation(async () => {
        const result = await terminate(); backendReceipts.push(result); return result;
      });
      const run = h.makeRun();
      const facts: AgentRunInputLifecycle[] = [];
      const events: string[] = [];
      run.subscribeToEvents(e => events.push(e.eventType));
      await run.postUserMessage(new AgentInputUserMessage('test-owned saved Task packet'), { lifecycleObserver: fact => facts.push(fact) });
      await vi.waitFor(() => expect(facts.some(f => f.kind === 'forwarded')).toBe(true));
      const turnId = h.thread.activeTurnId!;
      let receipt: unknown = null;
      const release = run.forceReleaseRuntime().then(r => { receipt = r; return r; }, e => { receipt = { error: e.message }; throw e; });
      void release.catch(() => undefined);
      await vi.waitFor(() => expect(h.thread.currentStatus).toBe('IDLE'));
      await h.client.request('test/barrier', {});
      console.log('test-owned idle boundary receipt', JSON.stringify({ receipt, backendReceipts, threadRetained: h.manager.getThread(run.runId) === h.thread,
        activeTurn: h.thread.activeTurnId, lastTerminal: h.thread.lastTerminalTurnId, input: run.getInputStateSnapshot().entries.map(e => ({ state: e.state, turn: e.turn_id })) }));
      expect(receipt).toBeNull();
      expect(h.manager.getThread(run.runId)).toBe(h.thread);
      expect(h.thread.activeTurnId).toBe(turnId);
      expect(h.thread.lastTerminalTurnId).toBeNull();
      expect(run.getInputStateSnapshot().entries).toHaveLength(1);
      expect(events).not.toContain(AgentRunEventType.TURN_COMPLETED);
      expect(events).not.toContain(AgentRunEventType.TURN_INTERRUPTED);
      await expect(run.postUserMessage(new AgentInputUserMessage('late closed ingress'))).rejects.toThrow();
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId });
      expect(await release).toEqual({ accepted: true });
      expect(backendReceipts).toEqual([{ accepted: true }]);
      expect(run.getInputStateSnapshot().entries).toEqual([]);
      expect(facts.filter(f => ['completed', 'interrupted', 'failed'].includes(f.kind))).toEqual([{ kind: 'interrupted', turnId }]);
      expect(events).toContain(AgentRunEventType.TURN_INTERRUPTED);
      expect(h.manager.getThread(run.runId)).toBeNull();
      const calls = await h.client.request<Array<{ method: string; params: Record<string, unknown> }>>('test/requests', {});
      expect(calls.filter(c => c.method === 'turn/start')).toHaveLength(1);
      expect(calls.filter(c => c.method === 'turn/interrupt').map(c => c.params)).toEqual([{ threadId: h.thread.threadId, turnId }]);
      await run.forceReleaseRuntime();
      expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
      expect(h.protectedMember.thread.activeTurnId).toBeNull();
    } finally { await h.close(); }
  });

  it('retains timed-out async delivery proof and retries the same backend after provider release', async () => {
    const h = await harness();
    const held = deferred();
    try {
      const entered = deferred();
      h.backend.subscribeToSourceEventBatches(async events => {
        if (events.some(e => e.eventType === AgentRunEventType.TURN_COMPLETED || e.eventType === AgentRunEventType.TURN_INTERRUPTED)) {
          entered.resolve(); await held.promise;
        }
      });
      const run = h.makeRun();
      await run.postUserMessage(new AgentInputUserMessage('test-owned finite submitted input'));
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries[0]?.state).toBe('forwarded'));
      const turnId = h.thread.activeTurnId!;
      let receipt: unknown = null;
      const release = run.forceReleaseRuntime().then(r => { receipt = r; return r; }, e => { receipt = { error: e.message }; throw e; });
      void release.catch(() => undefined);
      await vi.waitFor(() => expect(h.thread.currentStatus).toBe('IDLE'));
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId });
      await entered.promise;
      await vi.waitFor(() => expect(h.cleanup.cleanupPreparedWorkspaceSkills).toHaveBeenCalled());
      await h.client.request('test/barrier', {});
      expect(receipt).toBeNull();
      expect(run.getInputStateSnapshot().entries).toHaveLength(1);
      const first = await release;
      expect(first).toMatchObject({ accepted: false, code: 'RUNTIME_COMMAND_FAILED' });
      expect(first.message).toContain('Codex canonical event delivery proof pending.');
      expect(h.manager.getThread(run.runId)).toBeNull(); // native proof does not certify delivery
      expect(run.getInputStateSnapshot().entries).toHaveLength(1);
      const retry = run.forceReleaseRuntime();
      held.resolve();
      expect(await retry).toEqual({ accepted: true });
      expect(run.getInputStateSnapshot().entries).toEqual([]);
      const calls = await h.client.request<Array<{ method: string }>>('test/requests', {});
      expect(calls.filter(c => c.method === 'turn/start')).toHaveLength(1);
      expect(calls.filter(c => c.method === 'turn/interrupt')).toHaveLength(1);
      expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
    } finally { held.resolve(); await h.close(); }
  }, 20_000);

  it('retains missing-terminal proof, then retries only the same fenced exact generation', async () => {
    const h = await harness();
    try {
      const rejected: unknown[] = [];
      const terminateThread = h.manager.terminateThread.bind(h.manager);
      vi.spyOn(h.manager, 'terminateThread').mockImplementation(async (...args) => {
        try { await terminateThread(...args); }
        catch (error) { rejected.push(error); throw error; }
      });
      const run = h.makeRun();
      const facts: AgentRunInputLifecycle[] = [];
      await run.postUserMessage(new AgentInputUserMessage('test-owned saved Task'), { lifecycleObserver: f => facts.push(f) });
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries[0]?.state).toBe('forwarded'));
      const turnId = h.thread.activeTurnId!;
      const first = await run.forceReleaseRuntime();
      expect(first).toMatchObject({ accepted: false, code: 'RUNTIME_COMMAND_FAILED' });
      expect(first.message).toContain('AggregateError: Codex exact thread cleanup failed.');
      expect(rejected[0]).toBeInstanceOf(AggregateError);
      expect((rejected[0] as AggregateError).errors[0].message).toBe('Codex exact input/turn close proof pending.');
      expect(h.manager.getThread(run.runId)).toBe(h.thread);
      expect(h.thread.activeTurnId).toBe(turnId);
      expect(run.getInputStateSnapshot().entries).toHaveLength(1);
      // Existing independent skill cleanup can run even when turn proof fails;
      // only exact thread/lease disposal is gated on the complete receipt.
      expect(h.cleanup.cleanupPreparedWorkspaceSkills).toHaveBeenCalledTimes(1);
      expect(facts.some(f => ['completed', 'interrupted', 'failed'].includes(f.kind))).toBe(false);
      const retry = run.forceReleaseRuntime();
      await vi.waitFor(async () => {
        const calls = await h.client.request<Array<{ method: string }>>('test/requests', {});
        expect(calls.filter(c => c.method === 'turn/interrupt')).toHaveLength(2);
      });
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId });
      expect(await retry).toEqual({ accepted: true });
      expect(run.getInputStateSnapshot().entries).toEqual([]);
      expect(h.cleanup.cleanupPreparedWorkspaceSkills).toHaveBeenCalledTimes(2);
      const calls = await h.client.request<Array<{ method: string; params: Record<string, unknown> }>>('test/requests', {});
      expect(calls.filter(c => c.method === 'turn/start')).toHaveLength(1);
      expect(calls.filter(c => c.method === 'turn/interrupt').every(c => c.params.turnId === turnId && c.params.threadId === h.thread.threadId)).toBe(true);
      expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
      console.log('test-owned exact retry receipt', JSON.stringify({ first, retry: { accepted: true }, sameThread: h.thread.threadId, sameTurn: turnId, facts }));
    } finally { await h.close(); }
  }, 20_000);

  it.each(['completed', 'failed'] as const)('settles the actual native %s outcome, not idle or teardown', async status => {
    const h = await harness();
    try {
      const run = h.makeRun();
      const facts: AgentRunInputLifecycle[] = [];
      await run.postUserMessage(new AgentInputUserMessage('test-owned input'), { lifecycleObserver: f => facts.push(f) });
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries[0]?.state).toBe('forwarded'));
      const turnId = h.thread.activeTurnId!;
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId, status, error: { message: 'test-owned native failure' } });
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries).toEqual([]));
      expect(facts.filter(f => ['completed', 'interrupted', 'failed'].includes(f.kind))).toEqual([status === 'completed'
        ? { kind: 'completed', turnId }
        : { kind: 'failed', turnId, code: 'RUNTIME_TURN_FAILED', message: 'test-owned native failure' }]);
      expect(await run.forceReleaseRuntime()).toEqual({ accepted: true });
      const calls = await h.client.request<Array<{ method: string }>>('test/requests', {});
      expect(calls.filter(c => c.method === 'turn/interrupt')).toEqual([]);
      expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
    } finally { await h.close(); }
  });

  it('drains a real late start RPC and its terminal while forced release fences subsequent ingress', async () => {
    const h = await harness();
    try {
      await h.client.request('test/holdStart', {});
      const run = h.makeRun();
      const facts: AgentRunInputLifecycle[] = [];
      await run.postUserMessage(new AgentInputUserMessage('test-owned late start'), { lifecycleObserver: f => facts.push(f) });
      await vi.waitFor(() => expect(h.thread.activeTurnId).not.toBeNull());
      const turnId = h.thread.activeTurnId!;
      const release = run.forceReleaseRuntime();
      await h.client.request('test/releaseStart', {});
      await vi.waitFor(() => expect(h.thread.currentStatus).toBe('IDLE'));
      expect(run.getInputStateSnapshot().entries).toHaveLength(1);
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId });
      expect(await release).toEqual({ accepted: true });
      expect(facts.filter(f => f.kind === 'forwarded')).toHaveLength(1);
      expect(facts.filter(f => f.kind === 'interrupted')).toEqual([{ kind: 'interrupted', turnId }]);
      expect(run.getInputStateSnapshot().entries).toEqual([]);
    } finally { await h.close(); }
  });

  it('retains a rejected canonical delivery instead of converting provider absence into successful release', async () => {
    const h = await harness();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      h.backend.subscribeToSourceEventBatches(async events => {
        if (events.some(e => e.eventType === AgentRunEventType.TURN_COMPLETED)) throw new Error('test-owned canonical delivery failure');
      });
      const run = h.makeRun();
      await run.postUserMessage(new AgentInputUserMessage('test-owned unresolved delivery'));
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries[0]?.state).toBe('forwarded'));
      await h.client.request('test/terminal', { threadId: h.thread.threadId, turnId: h.thread.activeTurnId, status: 'completed' });
      await vi.waitFor(() => expect(log).toHaveBeenCalledWith(expect.stringContaining('test-owned canonical delivery failure')));
      const result = await run.forceReleaseRuntime();
      expect(result).toMatchObject({ accepted: false, code: 'RUNTIME_COMMAND_FAILED' });
      expect(result.message).toContain('test-owned canonical delivery failure');
      expect(h.manager.getThread(run.runId)).toBeNull(); // native resource proof is separate
      expect(run.getInputStateSnapshot().entries).toHaveLength(1); // no invented outcome
      expect(await run.forceReleaseRuntime()).toEqual(result); // exact failure remains pinned
      expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
    } finally { log.mockRestore(); await h.close(); }
  });
});
