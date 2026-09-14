// Test-only read-only telemetry. No runtime/provider responses are replaced.
import fs from 'node:fs';
import { AgentRunManager } from '../../../../../autobyteus-server-ts/dist/agent-execution/services/agent-run-manager.js';
const events = [];
for (const name of ['prepareNewAgentRun', 'prepareRestoreAgentRun', 'prepareRestoreAgentRunFromPlatformState']) {
  const original = AgentRunManager.prototype[name];
  AgentRunManager.prototype[name] = async function (...args) {
    const input = args[0];
    const event = { method: name, runId: input?.runId, startedAt: new Date().toISOString(), outcome: 'pending' };
    events.push(event);
    try {
      const candidate = await original.apply(this, args);
      event.outcome = 'prepared'; event.platformAgentRunId = candidate.platformAgentRunId;
      return candidate;
    } catch (error) { event.outcome = 'rejected'; event.code = error?.code ?? error?.name; throw error; }
  };
}
const timer = setInterval(() => {
  try {
    const manager = AgentRunManager.getInstance();
    const registry = manager.activationRegistry; // test telemetry only: compiled TS-private maps, no mutation
    const active = [...registry.activeRuns.values()].map(run => ({ runId: run.runId, active: run.isActive(), status: run.getStatusSnapshot() }));
    const pending = [...registry.pending.values()].map(item => ({ runId: item.claim.runId, state: item.state }));
    const target = process.env.AORG_TELEMETRY_PATH;
    fs.writeFileSync(target + '.tmp', JSON.stringify({ pid: process.pid, at: new Date().toISOString(), active, pending, events }, null, 2));
    fs.renameSync(target + '.tmp', target);
  } catch { /* composition not initialized yet */ }
}, 200);
timer.unref();

