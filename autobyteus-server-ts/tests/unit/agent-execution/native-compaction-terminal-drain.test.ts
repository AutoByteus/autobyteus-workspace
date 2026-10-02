import { describe, it, expect } from 'vitest';
import { createRecoveryFixture, eventually, summary } from './recovery-native-fixture.js';

describe('actual AgentRun/native shutdown queue ordering', () => {
  it('drains stopped through the real dispatch queue before returning, without late commit or cancelled dispatch', async () => {
    const f = await createRecoveryFixture(); let release!: (value: string) => void;
    const phases: string[] = [];
    const unsubscribe = f.run.subscribeToEvents(event => {
      if (event.eventType === 'COMPACTION_STATUS') phases.push((event.payload as any).phase);
    });
    try {
      f.request(); f.compress.mockRejectedValueOnce(new Error('hold first'));
      await f.submit('cancelled-A'); await eventually(() => f.native.getCompactionRecovery()?.state === 'awaiting_user');
      phases.length = 0;
      f.compress.mockImplementationOnce(() => new Promise(done => { release = done; }));
      await f.submit('queued-B'); await eventually(() => !!release && phases.includes('started'));
      const memory = f.native.context.state.memoryManager!;
      await expect(f.run.terminate()).resolves.toMatchObject({ accepted: true });
      expect(phases).toEqual(['started', 'stopped']);
      expect(f.run.getStatusSnapshot().status).toBe('offline');
      expect(f.run.getInputStateSnapshot().entries).toEqual([]);
      expect(f.parent.requests).toHaveLength(3);
      const afterStop = memory.getWorkingContextMessages();
      release(summary); for (let i=0;i<20;i++) await Promise.resolve();
      expect(memory.getWorkingContextMessages()).toEqual(afterStop);
      expect(phases).toEqual(['started', 'stopped']);
      expect(f.parent.requests).toHaveLength(3);
    } finally { release?.(summary); unsubscribe(); await f.close(); }
  }, 15000);
});
