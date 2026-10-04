import { describe, it, expect, vi } from 'vitest';
import { AgentRunService } from '../../../src/agent-execution/services/agent-run-service.js';
import { StandaloneAgentRunLifecycleService } from '../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js';
import { eventually } from '../../unit/agent-execution/recovery-native-fixture.js';
import { createNativeRootFixture, HOST } from './native-compaction-root-fixture.js';

describe('whole-host termination result is later than actual child-root inactivity', () => {
  for (const kind of ['agent', 'agent_team'] as const) {
    it.each(['success', 'child-finish-failure', 'later-host-failure'] as const)(`${kind}: %s`, async mode => {
      const f = await createNativeRootFixture(kind, false);
      try {
        const connection = await f.connect();
        f.request();
        f.compress.mockRejectedValueOnce(new Error('controlled recovery'));
        await f.send(connection.session, 'A');
        await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user');
        if (mode === 'child-finish-failure') {
          vi.spyOn(f.runManager, 'prepareAgentRunTermination').mockImplementation(async run => {
            const prepared = await run.prepareTermination();
            return {
              ...prepared,
              commit: () => {
                const committed = prepared.commit();
                return { ...committed, finish: async () => {
                  await committed.finish(); // real native stop completed, but enclosing cleanup is uncertain
                  return { accepted: false, message: 'controlled child finish uncertainty' };
                } };
              },
            };
          });
        }
        const hostStop = vi.fn(async () => {
          expect(f.native.isRunning).toBe(false);
          expect(f.manager.getActive(HOST)).toBeNull();
          return mode !== 'later-host-failure';
        });
        const history = vi.fn(async () => {});
        const hostRuns = { getActiveRun: () => ({ runtimeKind: 'autobyteus' }), terminateAgentRun: hostStop };
        // The real host termination (the standalone lifecycle) behind the root's host handle.
        const lifecycleService = new StandaloneAgentRunLifecycleService('/unused-test-owned', {
          agentRunManager: hostRuns as never,
          metadataService: {} as never,
          historyCatalogService: { recordRunTerminated: history } as never,
          workspaceManager: {} as never,
          tokenUsageReadiness: {} as never,
          modelSelectionValidator: { validate: vi.fn() } as never,
        });
        f.terminateHost.mockImplementation((id: string) => lifecycleService.terminateHost(id) as never);
        const service = new AgentRunService('/unused-test-owned', {
          agentRunManager: hostRuns as never,
          metadataService: {} as never,
          historyCatalogService: { recordRunTerminated: history } as never,
          provisioningService: {} as never,
          lifecycleService,
          standaloneRuns: f.manager,
          workspaceManager: {} as never,
        });
        if (mode === 'child-finish-failure') {
          await expect(service.terminateAgentRun(HOST)).rejects.toThrow('controlled child finish uncertainty');
          expect(hostStop).not.toHaveBeenCalled();
          expect(history).not.toHaveBeenCalled();
        } else {
          expect((await service.terminateAgentRun(HOST)).success).toBe(mode === 'success');
          expect(hostStop).toHaveBeenCalledOnce();
          expect(history).toHaveBeenCalledTimes(mode === 'success' ? 1 : 0);
        }
        expect(connection.frames.some(frame => frame.type === 'ROOT_LIFECYCLE' && frame.payload.is_active === false)).toBe(true);
        expect(f.native.isRunning).toBe(false);
        expect(f.parent.requests).toHaveLength(3); // held A never reached parent
      } finally { await f.close(); }
    }, 20000);
  }
});
