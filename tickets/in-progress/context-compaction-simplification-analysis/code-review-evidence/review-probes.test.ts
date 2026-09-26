import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { LiveE2eScenarioExecution } from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { CompactionStatusData } from '../../../../autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.js';

describe('CRR-001 bounded review probes (no provider calls)', () => {
  it('established live-compaction entry fails on the deleted builtin template before generation', async () => {
    const created: string[] = [];
    const originalMkdtemp = fs.mkdtemp.bind(fs);
    const spy = vi.spyOn(fs, 'mkdtemp').mockImplementation(async (prefix: any, options?: any) => {
      const result = await originalMkdtemp(prefix, options);
      created.push(String(result));
      return result as any;
    });
    // Bypass only provider model discovery. The real shared compaction harness then runs unchanged.
    const scenario = new LiveE2eScenarioExecution('deepseek.compaction-agent-flow', {
      operation: 'compaction-agent-flow', providerId: 'DEEPSEEK',
      requiredSecretId: 'provider.deepseek.api-key', model: 'deepseek-v4-flash',
    } as any, {} as any, 'http://127.0.0.1:1');
    vi.spyOn(scenario as any, 'resolveScenarioModelIdentifier').mockResolvedValue('fixture-never-dispatched');
    try {
      await expect(scenario.executeCompactionAgentFlow()).rejects.toMatchObject({
        code: 'ENOENT', path: expect.stringContaining('built-in-agents/templates/memory-compactor/agent.md'),
      });
    } finally {
      spy.mockRestore();
      for (const dir of created) {
        if (!dir.startsWith(path.join(os.tmpdir(), 'live-e2e-compaction-agent-flow-'))) throw new Error('Unexpected temporary path');
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  });
  it('rejects the provisional claim that core stream wrapping drops new direct-summary metadata', () => {
    const payload = new CompactionStatusData({ phase: 'completed', summarizer_provider: 'openai',
      completion_status: 'unknown', summary_char_count: 10, compaction_invocation_id: 'attempt-1' });
    expect(payload).toMatchObject({ summarizer_provider: 'openai', completion_status: 'unknown',
      summary_char_count: 10, compaction_invocation_id: 'attempt-1' });
    // Stale live field declarations remain; this is cleanup/type drift, not metadata loss.
    expect(Object.hasOwn(payload, 'compaction_run_id')).toBe(true);
  });
});
