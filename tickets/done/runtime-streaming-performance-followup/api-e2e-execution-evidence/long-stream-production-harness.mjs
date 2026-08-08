#!/usr/bin/env node
import crypto from 'node:crypto';
import process from 'node:process';
import { createRequire } from 'node:module';

const serverRequire = createRequire(new URL('../../../../autobyteus-server-ts/package.json', import.meta.url));
const fastify = serverRequire('fastify');
const websocket = serverRequire('@fastify/websocket');

import { AgentRunConfig } from '../../../../autobyteus-server-ts/dist/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../../autobyteus-server-ts/dist/agent-execution/domain/agent-run-context.js';
import { AgentRun } from '../../../../autobyteus-server-ts/dist/agent-execution/domain/agent-run.js';
import { AgentRunEventType } from '../../../../autobyteus-server-ts/dist/agent-execution/domain/agent-run-event.js';
import { AgentRunCommandRegistry } from '../../../../autobyteus-server-ts/dist/agent-execution/services/agent-run-command-registry.js';
import { AgentRunCommandStatusOverlayStore } from '../../../../autobyteus-server-ts/dist/agent-execution/services/agent-run-command-status-overlay-store.js';
import { AgentRunStatusProjectionService } from '../../../../autobyteus-server-ts/dist/agent-execution/services/agent-run-status-projection-service.js';
import { registerAgentWebsocket } from '../../../../autobyteus-server-ts/dist/api/websocket/agent.js';
import { RuntimeKind } from '../../../../autobyteus-server-ts/dist/runtime-management/runtime-kind-enum.js';
import { AgentStreamHandler } from '../../../../autobyteus-server-ts/dist/services/agent-streaming/agent-stream-handler.js';
import { AgentSessionManager } from '../../../../autobyteus-server-ts/dist/services/agent-streaming/agent-session-manager.js';

const getArg = (name, fallback) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const port = Number(getArg('port', '0'));
const runId = getArg('run-id', 'api-e2e-long-stream');
const intervalMs = Number(getArg('interval-ms', '100'));
const durationMs = Number(getArg('duration-ms', '600000'));
const eventsPerTick = Number(getArg('events-per-tick', '4'));
const charsPerEvent = Number(getArg('chars-per-event', '5'));
const totalTicks = Math.floor(durationMs / intervalMs) + 1;
const totalContentEvents = totalTicks * eventsPerTick;
const targetLength = totalContentEvents * charsPerEvent;

if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`Invalid port: ${port}`);
if (!Number.isInteger(intervalMs) || intervalMs < 1) throw new Error(`Invalid interval: ${intervalMs}`);
if (!Number.isInteger(durationMs) || durationMs < intervalMs) throw new Error(`Invalid duration: ${durationMs}`);
if (!Number.isInteger(eventsPerTick) || eventsPerTick < 1) throw new Error('events-per-tick must be positive');
if (!Number.isInteger(charsPerEvent) || charsPerEvent < 1) throw new Error('chars-per-event must be positive');

process.env.AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS = '500';

const prefix = [
  '# Runtime Streaming Validation',
  '',
  'Literal unsafe markup follows: <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.__apiE2eXss = true">',
  '',
  '## Highlighted code',
  '',
  '```ts',
  'const answer: number = 42;',
  '```',
  '',
  'Inline math: $E = mc^2$.',
  '',
  '```mermaid',
  'graph TD',
  '  A[Start] --> B[Complete]',
  '```',
  '',
  '[Reference](https://example.com/reference)',
  '',
].join('\n');
const fillerLine = 'stream payload exact line 0123456789 abcdefghijklmnopqrstuvwxyz\n';
let expectedContent = prefix;
while (expectedContent.length < targetLength) expectedContent += fillerLine;
expectedContent = expectedContent.slice(0, targetLength);
const expectedSha256 = crypto.createHash('sha256').update(expectedContent).digest('hex');
const chunks = Array.from(
  { length: totalContentEvents },
  (_, index) => expectedContent.slice(index * charsPerEvent, (index + 1) * charsPerEvent),
);

const idleSnapshot = () => ({
  availability: 'active',
  phase: 'idle',
  currentTurn: { kind: 'NONE' },
});
const runningSnapshot = (turnId) => ({
  availability: 'active',
  phase: 'running',
  currentTurn: { kind: 'IDENTIFIED', turnId },
});
const event = (eventType, payload) => ({ runId, eventType, payload, statusHint: null });

class ScriptedAgentRunBackend {
  active = true;
  sourceListeners = new Set();
  snapshot = runningSnapshot('turn-long');

  constructor() {
    this.context = new AgentRunContext({
      runId,
      config: new AgentRunConfig({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        agentDefinitionId: 'api-e2e-long-stream-agent',
        llmModelIdentifier: 'deterministic-production-path',
        autoExecuteTools: true,
        workspaceId: null,
        memoryDir: null,
        llmConfig: null,
        skillAccessMode: 'NONE',
      }),
      runtimeContext: null,
    });
  }

  getContext() { return this.context; }
  isActive() { return this.active; }
  getPlatformAgentRunId() { return `platform-${runId}`; }
  getLifecycleSnapshot() { return this.snapshot; }
  subscribeToSourceEventBatches(listener) {
    this.sourceListeners.add(listener);
    return () => this.sourceListeners.delete(listener);
  }
  async postUserMessage() { return { accepted: true }; }
  async approveToolInvocation() { return { accepted: true }; }
  async interrupt() { return { accepted: true }; }
  async terminate() {
    this.active = false;
    this.snapshot = { availability: 'offline', phase: 'idle', currentTurn: { kind: 'NONE' } };
    return { accepted: true };
  }
  setSnapshot(snapshot) { this.snapshot = snapshot; }
  async emitSource(events) {
    for (const listener of this.sourceListeners) await listener(events);
  }
}

const metrics = {
  configuration: {
    intervalMs,
    durationMs,
    eventsPerTick,
    charsPerEvent,
    totalTicks,
    expectedContentEvents: totalContentEvents,
    expectedCharacters: targetLength,
    expectedSha256,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    topology: 'ScriptedAgentRunBackend -> AgentRun default pipeline -> LifecycleStatusEventTransformer -> mapper -> AgentStreamHandler -> AgentStreamWebSocketEgress -> Fastify WebSocket',
  },
  started: false,
  finished: false,
  startRequestedAt: null,
  firstContentSourceAt: null,
  lastContentSourceAt: null,
  finishedAt: null,
  sourceContentEvents: 0,
  internalContentEvents: 0,
  internalStatusEvents: 0,
  internalAllEvents: 0,
  eventLoopDriftsMs: [],
  failure: null,
};

let previousLoopAt = performance.now();
const loopTimer = setInterval(() => {
  const now = performance.now();
  const drift = Math.max(0, now - previousLoopAt - 50);
  previousLoopAt = now;
  metrics.eventLoopDriftsMs.push(drift);
  if (metrics.eventLoopDriftsMs.length > 20000) metrics.eventLoopDriftsMs.shift();
}, 50);
loopTimer.unref();

const backend = new ScriptedAgentRunBackend();
const run = new AgentRun({ context: backend.context, backend });
const unsubscribe = run.subscribeToEvents((runEvent) => {
  metrics.internalAllEvents += 1;
  if (runEvent.eventType === AgentRunEventType.SEGMENT_CONTENT) metrics.internalContentEvents += 1;
  if (runEvent.eventType === AgentRunEventType.AGENT_STATUS) metrics.internalStatusEvents += 1;
});

const commandRegistry = new AgentRunCommandRegistry();
const overlayStore = new AgentRunCommandStatusOverlayStore();
const statusProjectionService = new AgentRunStatusProjectionService({
  agentRunManager: { getActiveRun: (candidateRunId) => candidateRunId === runId ? run : null },
  metadataService: { readMetadata: async () => null },
  overlayStore,
  commandRegistry,
});
const streamHandler = new AgentStreamHandler(
  new AgentSessionManager(),
  {
    getAgentRun: (candidateRunId) => candidateRunId === runId ? run : null,
    recordRunActivity: async () => {},
  },
  undefined,
  undefined,
  undefined,
  statusProjectionService,
);

const app = fastify({ logger: false });
await app.register(websocket);
await registerAgentWebsocket(
  app,
  streamHandler,
  { connect: async () => null, handleMessage: async () => {}, disconnect: async () => {} },
);

const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};

app.get('/health', async () => ({ status: 'ok', started: metrics.started, finished: metrics.finished }));
app.get('/metrics', async () => ({
  ...metrics,
  eventLoopDriftSummary: {
    samples: metrics.eventLoopDriftsMs.length,
    meanMs: metrics.eventLoopDriftsMs.length
      ? metrics.eventLoopDriftsMs.reduce((sum, value) => sum + value, 0) / metrics.eventLoopDriftsMs.length
      : null,
    p95Ms: percentile(metrics.eventLoopDriftsMs, 0.95),
    maxMs: metrics.eventLoopDriftsMs.length ? Math.max(...metrics.eventLoopDriftsMs) : null,
  },
}));

let startPromise = null;
const runStream = async () => {
  metrics.started = true;
  metrics.startRequestedAt = new Date().toISOString();
  const startedAt = Date.now();
  let chunkIndex = 0;

  await backend.emitSource([
    event(AgentRunEventType.TURN_STARTED, { turn_id: 'turn-long' }),
    event(AgentRunEventType.SEGMENT_START, {
      id: 'segment-long',
      turn_id: 'turn-long',
      segment_type: 'text',
    }),
  ]);

  for (let tick = 0; tick < totalTicks; tick += 1) {
    if (tick > 0) {
      const targetAt = startedAt + tick * intervalMs;
      const delayMs = Math.max(0, targetAt - Date.now());
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const batch = [];
    for (let offset = 0; offset < eventsPerTick; offset += 1) {
      const delta = chunks[chunkIndex];
      chunkIndex += 1;
      batch.push(event(AgentRunEventType.SEGMENT_CONTENT, {
        id: 'segment-long',
        turn_id: 'turn-long',
        segment_type: 'text',
        delta,
      }));
    }
    const emittedAt = new Date().toISOString();
    if (!metrics.firstContentSourceAt) metrics.firstContentSourceAt = emittedAt;
    metrics.lastContentSourceAt = emittedAt;
    metrics.sourceContentEvents += batch.length;
    await backend.emitSource(batch);
  }

  await backend.emitSource([
    event(AgentRunEventType.SEGMENT_END, {
      id: 'segment-long',
      turn_id: 'turn-long',
      segment_type: 'text',
    }),
  ]);
  backend.setSnapshot(idleSnapshot());
  await backend.emitSource([
    event(AgentRunEventType.TURN_COMPLETED, { turn_id: 'turn-long' }),
  ]);
  metrics.finished = true;
  metrics.finishedAt = new Date().toISOString();
};

app.post('/control/start', async (_request, reply) => {
  if (!startPromise) {
    startPromise = runStream().catch((error) => {
      metrics.failure = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
      metrics.finished = true;
      metrics.finishedAt = new Date().toISOString();
    });
  }
  return reply.code(202).send({ accepted: true, alreadyStarted: metrics.started });
});

const address = await app.listen({ host: '127.0.0.1', port });
console.log(JSON.stringify({
  type: 'HARNESS_READY',
  address,
  runId,
  expectedContentEvents: totalContentEvents,
  expectedCharacters: targetLength,
  expectedSha256,
}));

const shutdown = async (signal) => {
  console.log(JSON.stringify({ type: 'HARNESS_SHUTDOWN', signal }));
  clearInterval(loopTimer);
  unsubscribe();
  await app.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
