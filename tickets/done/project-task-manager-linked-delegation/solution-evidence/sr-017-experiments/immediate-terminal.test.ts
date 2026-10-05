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
const fixture = fileURLToPath(new URL('/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-evidence/sr-017-experiments/immediate-terminal-cli.mjs', import.meta.url));

async function harness() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'sd017-causal-proof-'));
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
  const owned = await create('sd017-owned-reader');
  const protectedMember = await create('sd017-protected-member');
  const close = async () => {
    // Test environment teardown only; not Task repair or assertion evidence.
    await client.close();
    await rm(cwd, { recursive: true, force: true });
  };
  return { ...owned, create, protectedMember, client, manager, cleanup, close };
}


import { appendFileSync } from 'node:fs';
const variant = process.env.SD_VARIANT ?? 'tbc';
const hasThread = variant.includes('t');
const hasBackend = variant.includes('b');
const hasConverter = variant.includes('c');
const evidenceFile = new URL(`./${variant || 'incoming'}-receipts.jsonl`, import.meta.url);
const record = (test: string, boundary: string, value: unknown) => {
 const receipt = {at:new Date().toISOString(), variant, test, boundary, value};
 appendFileSync(evidenceFile, JSON.stringify(receipt)+'\n');
 console.log('SD017', JSON.stringify(receipt));
};
const terminalFacts = (facts: AgentRunInputLifecycle[]) => facts.filter(f=>['completed','interrupted','failed'].includes(f.kind));
const observedRelease = (run: AgentRun) => {
 const state: {receipt:any} = {receipt:null};
 const promise = run.forceReleaseRuntime().then(r=>{state.receipt=r;return r;},error=>{
  state.receipt={error:error.message};return state.receipt;
 });
 return {state,promise};
};
function observe(h: Awaited<ReturnType<typeof harness>>) {
 const wire:any[]=[]; const backend:any[]=[];
 h.client.onNotification(m=>wire.push(m));
 const terminate=h.backend.terminate.bind(h.backend);
 vi.spyOn(h.backend,'terminate').mockImplementation(async()=>{const r=await terminate();backend.push(r);return r;});
 return {wire,backend};
}
const snapshot = (h:any,run:AgentRun,trace:any,release:any,facts:any[])=>({
 runId:run.runId,generation:run.runInstanceId,threadId:h.thread.threadId,
 activeTurn:h.thread.activeTurnId,lastTerminal:h.thread.lastTerminalTurnId,status:h.thread.currentStatus,
 threadRetained:h.manager.getThread(run.runId)===h.thread,
 protectedRetained:h.manager.getThread(h.protectedMember.thread.runId)===h.protectedMember.thread,
 release:release.state.receipt,backendReturns:trace.backend,input:run.getInputStateSnapshot(),facts,
 wire:trace.wire, pendingSourceWork:h.backend.sourceEventWork?.size ?? 'owner not present'
});


describe('SD017 immediate native terminal scheduling contrast',()=>{
 it.each([1,2,3,4,5])('observes automatic terminal iteration %s with no deliberate wait',async iteration=>{
  const h=await harness();
  try{
   const trace=observe(h);const run=h.makeRun();const facts:AgentRunInputLifecycle[]=[];
   await run.postUserMessage(new AgentInputUserMessage('sd017 automatic terminal'),{lifecycleObserver:f=>facts.push(f)});
   await vi.waitFor(()=>expect(run.getInputStateSnapshot().entries[0]?.state).toBe('forwarded'));
   const release=observedRelease(run);await release.promise;
   record('immediate',String(iteration),snapshot(h,run,trace,release,facts));
   if(hasThread){expect(release.state.receipt).toEqual({accepted:true});expect(run.getInputStateSnapshot().entries).toEqual([]);}
   else expect(release.state.receipt.accepted===true || release.state.receipt.error==='AgentRun termination cannot settle while submitted input remains unresolved.').toBe(true);
   const calls=await h.client.request<any[]>('test/requests',{});
   expect(calls.filter(c=>c.method==='turn/start')).toHaveLength(1);
   expect(h.manager.getThread(h.protectedMember.thread.runId)).toBe(h.protectedMember.thread);
  }finally{await h.close();}
 });
});
