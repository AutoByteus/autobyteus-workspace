#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const evidenceDir = path.dirname(scriptPath);
const ticketDir = path.dirname(evidenceDir);
const repoDir = path.resolve(evidenceDir, '../../../..');
const webDir = path.join(repoDir, 'autobyteus-web');
const serverDir = path.join(repoDir, 'autobyteus-server-ts');
const harnessPath = path.join(evidenceDir, 'long-stream-production-harness.mjs');
const fixturePagePath = path.join(webDir, 'pages/api-e2e-runtime-streaming-performance.vue');
const routePath = '/api-e2e-runtime-streaming-performance';
const webRequire = createRequire(path.join(webDir, 'package.json'));
const { chromium } = webRequire('playwright-core');

const getArg = (name, fallback) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const durationMs = Number(getArg('duration-ms', '600000'));
const timeoutMs = Number(getArg('timeout-ms', String(durationMs + 120000)));
const outputDir = path.resolve(getArg('output-dir', evidenceDir));
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));
const runId = 'api-e2e-long-stream';

const evidence = {
  startedAt: new Date().toISOString(),
  topology: 'production AgentRun/default lifecycle/handler/WebSocket egress -> real WebSocket -> production WebSocketClient/AgentStreamingService -> production AIMessage/TextSegment live/final renderers',
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  durationMs,
  browserExecutable: executablePath || 'playwright-default',
  ports: {},
  processes: {},
  settings: {},
  livePresentation: {},
  performance: {},
  finalPresentation: {},
  assertions: [],
  browserEvents: [],
  failures: [],
  cleanup: {},
};

const fixtureSource = `<template>
  <main class="min-h-screen bg-slate-50 p-6 text-slate-900" data-test="runtime-streaming-performance-fixture">
    <header class="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 class="text-2xl font-semibold">Runtime streaming performance validation</h1>
      <p data-test="fixture-state">{{ context.isSubscribed ? 'connected' : 'disconnected' }} · {{ streamFinished ? 'complete' : 'active' }} · {{ streamContent.length }} chars</p>
    </header>

    <section class="mb-5 grid gap-4 lg:grid-cols-2" data-test="settings-validation">
      <div>
        <p data-test="bound-node">Bound: {{ nodeStore.nodeId }} / {{ nodeStore.nodeBaseUrl }}</p>
        <LiveResponseStreamingCard />
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 class="text-lg font-semibold">Production interaction controls</h2>
        <div data-test="member-controls" class="mt-3 space-y-1">
          <TeamMemberRow
            data-test="member-a"
            member-name="Member A"
            member-route-key="member-a"
            :member-context="null"
            :is-focused="focusedMember === 'member-a'"
            :is-coordinator="true"
            @select="selectMember"
          />
          <TeamMemberRow
            data-test="member-b"
            member-name="Member B"
            member-route-key="member-b"
            :member-context="null"
            :is-focused="focusedMember === 'member-b'"
            :is-coordinator="false"
            @select="selectMember"
          />
        </div>
        <div data-test="static-rich-actions" class="mt-4" @click.capture="captureReferenceClick">
          <TextSegment
            :content="staticActionContent"
            :presentation-complete="true"
            :enable-event-monitor-file-actions="true"
            @file-path-action="recordFileAction"
          />
        </div>
        <p data-test="interaction-state">member={{ focusedMember }} file={{ fileActionCount }} reference={{ referenceClickCount }}</p>
      </div>
    </section>

    <section class="mb-5 rounded-2xl border border-blue-200 bg-white p-4" data-test="reasoning-output">
      <ThinkSegment :content="reasoningContent" :presentation-complete="reasoningComplete" />
    </section>

    <section class="rounded-2xl border border-emerald-200 bg-white p-4" data-test="stream-output">
      <AIMessage
        v-if="aiMessage"
        :message="aiMessage"
        :run-id="runId"
        agent-name="Deterministic Runtime"
        :message-index="0"
      />
      <p v-else data-test="awaiting-stream">Awaiting stream content</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import ThinkSegment from '~/components/conversation/segments/ThinkSegment.vue';
import TeamMemberRow from '~/components/workspace/running/TeamMemberRow.vue';
import LiveResponseStreamingCard from '~/components/settings/LiveResponseStreamingCard.vue';
import { AgentStreamingService } from '~/services/agentStreaming/AgentStreamingService';
import { WebSocketClient } from '~/services/agentStreaming/transport';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useServerSettingsStore } from '~/stores/serverSettings';

const route = useRoute();
const runId = String(route.query.runId || 'api-e2e-long-stream');
const wsEndpoint = String(route.query.wsEndpoint || '');
const conversation = reactive({ id: runId, messages: [], updatedAt: new Date().toISOString() });
const state = reactive(new AgentRunState(runId, conversation as any));
const context = reactive(new AgentContext({
  agentDefinitionId: 'api-e2e-long-stream-agent',
  agentDefinitionName: 'Deterministic Runtime',
  agentAvatarUrl: null,
  llmModelIdentifier: 'deterministic-production-path',
  runtimeKind: 'autobyteus',
  workspaceId: null,
  workspaceMetadata: null,
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  isLocked: true,
  llmConfig: null,
}, state));

const nodeStore = useWindowNodeContextStore();
const settingsStore = useServerSettingsStore();
const aiMessage = computed(() => context.conversation.messages.findLast((message: any) => message.type === 'ai') as any);
const textSegment = computed(() => aiMessage.value?.segments?.find((segment: any) => segment.type === 'text') ?? null);
const streamContent = computed(() => String(textSegment.value?.content || ''));
const segmentPresentationComplete = computed(() => Boolean(
  aiMessage.value?.isComplete || textSegment.value?.__streamPresentation?.presentationComplete,
));
const streamFinished = computed(() => Boolean(aiMessage.value?.isComplete));
const reasoningContent = '# Reasoning live source\\n\\n<strong>must stay literal while active</strong>\\n\\n**rich after completion**';
const reasoningComplete = ref(false);
const staticActionContent = '[fixture.md](/tmp/autobyteus-api-e2e-fixture.md) · [Reference](https://example.com/reference)';
const focusedMember = ref('member-a');
const fileActionCount = ref(0);
const referenceClickCount = ref(0);
const messageCounts = reactive({ total: 0, content: 0, status: 0, other: 0 });
const visibleLatenciesMs: number[] = [];
const rendererDriftsMs: number[] = [];
let lastContentReceiptAt: number | null = null;
let driftTimer: ReturnType<typeof setInterval> | null = null;
let previousDriftAt = 0;
let richMountCount = 0;
let started = false;

const wsClient = new WebSocketClient({ autoReconnect: false });
wsClient.on('onMessage', (raw: string) => {
  const receivedAt = performance.now();
  try {
    const message = JSON.parse(raw);
    messageCounts.total += 1;
    if (message.type === 'SEGMENT_CONTENT') {
      messageCounts.content += 1;
      lastContentReceiptAt = receivedAt;
    } else if (message.type === 'AGENT_STATUS') {
      messageCounts.status += 1;
    } else {
      messageCounts.other += 1;
    }
  } catch {
    messageCounts.other += 1;
  }
});
const service = new AgentStreamingService(wsEndpoint, { wsClient });

watch(streamContent, async () => {
  const receiptAt = lastContentReceiptAt;
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (receiptAt !== null) visibleLatenciesMs.push(Math.max(0, performance.now() - receiptAt));
});

watch(segmentPresentationComplete, (value, previous) => {
  if (value && !previous) richMountCount += 1;
});

watch(streamFinished, (value) => {
  if (!value) return;
  reasoningComplete.value = true;
  if (driftTimer) {
    clearInterval(driftTimer);
    driftTimer = null;
  }
});

const selectMember = (routeKey: string) => { focusedMember.value = routeKey; };
const recordFileAction = () => { fileActionCount.value += 1; };
const captureReferenceClick = (event: MouseEvent) => {
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (anchor?.getAttribute('href') === 'https://example.com/reference') {
    event.preventDefault();
    referenceClickCount.value += 1;
  }
};

const startStream = () => {
  if (started) return;
  started = true;
  previousDriftAt = performance.now();
  driftTimer = setInterval(() => {
    const now = performance.now();
    rendererDriftsMs.push(Math.max(0, now - previousDriftAt - 50));
    previousDriftAt = now;
  }, 50);
  service.connect(runId, context as any);
};

const bindNode = async (nodeId: string, baseUrl: string) => {
  nodeStore.bindNodeContext(nodeId, baseUrl);
  await settingsStore.reloadServerSettings();
  return settingsStore.effectiveStreamingContentFlushIntervalMs;
};

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const snapshot = async () => ({
  subscribed: context.isSubscribed,
  finished: streamFinished.value,
  contentLength: streamContent.value.length,
  contentSha256: await sha256(streamContent.value),
  messageCounts: { ...messageCounts },
  visibleLatenciesMs: [...visibleLatenciesMs],
  rendererDriftsMs: [...rendererDriftsMs],
  richMountCount,
  reasoningComplete: reasoningComplete.value,
  effectiveSetting: settingsStore.effectiveStreamingContentFlushIntervalMs,
  bindingRevision: nodeStore.bindingRevision,
  nodeId: nodeStore.nodeId,
  nodeBaseUrl: nodeStore.nodeBaseUrl,
  focusedMember: focusedMember.value,
  fileActionCount: fileActionCount.value,
  referenceClickCount: referenceClickCount.value,
  xssExecuted: (window as any).__apiE2eXss === true,
  dom: {
    liveRenderers: document.querySelectorAll('[data-test="stream-output"] [data-testid="live-text-renderer"]').length,
    richRenderers: document.querySelectorAll('[data-test="stream-output"] .markdown-renderer-segments').length,
    headings: document.querySelectorAll('[data-test="stream-output"] h1, [data-test="stream-output"] h2').length,
    codeBlocks: document.querySelectorAll('[data-test="stream-output"] pre code').length,
    katex: document.querySelectorAll('[data-test="stream-output"] .katex').length,
    mermaidContainers: document.querySelectorAll('[data-test="stream-output"] .mermaid-segment-container').length,
    mermaidSvgs: document.querySelectorAll('[data-test="stream-output"] .mermaid-segment-container svg').length,
    images: document.querySelectorAll('[data-test="stream-output"] img').length,
    unsafeOnErrorAttributes: document.querySelectorAll('[data-test="stream-output"] [onerror]').length,
    liveText: document.querySelector('[data-test="stream-output"] [data-testid="live-text-renderer"]')?.textContent || '',
    reasoningLiveRenderers: document.querySelectorAll('[data-test="reasoning-output"] [data-testid="live-text-renderer"]').length,
    reasoningRichRenderers: document.querySelectorAll('[data-test="reasoning-output"] .markdown-renderer-segments').length,
    reasoningStrong: document.querySelectorAll('[data-test="reasoning-output"] strong').length,
  },
});

onBeforeUnmount(() => {
  if (driftTimer) clearInterval(driftTimer);
  service.disconnect();
});

onMounted(() => {
  (window as any).__streamingPerformanceProbe = { startStream, bindNode, snapshot };
});
</script>`;

const assert = (condition, id, description, details = undefined) => {
  const record = { id, description, pass: Boolean(condition), details };
  evidence.assertions.push(record);
  if (!condition) {
    const error = new Error(`${id}: ${description}`);
    error.details = details;
    throw error;
  }
};

const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const summarize = (values) => ({
  samples: values.length,
  mean: mean(values),
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  max: values.length ? Math.max(...values) : null,
});

const choosePort = async () => await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const selected = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(selected));
  });
});

const waitFor = async (description, fn, timeout = timeoutMs, interval = 100) => {
  const startedAt = Date.now();
  let lastValue;
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await fn();
      if (lastValue) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}${lastError ? `; error=${lastError.message}` : ''}`);
};

const waitForHttp = async (url, timeout = 120000) => await waitFor(
  `HTTP 200 from ${url}`,
  async () => {
    const response = await fetch(url);
    return response.ok;
  },
  timeout,
  250,
);

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = async (child, timeout) => {
  if (childExited(child)) return true;
  return await new Promise((resolve) => {
    const onExit = () => finish(true);
    const finish = (value) => {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(value);
    };
    child.once('exit', onExit);
    const timer = setTimeout(() => finish(childExited(child)), timeout);
  });
};

const killOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  const details = { pid: child.pid, initialExitCode: child.exitCode, initialSignalCode: child.signalCode };
  if (!childExited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    details.exitedAfterSigterm = await waitForChildExit(child, 10000);
    if (!details.exitedAfterSigterm) {
      if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
      else child.kill('SIGKILL');
      details.exitedAfterSigkill = await waitForChildExit(child, 10000);
    }
  }
  details.finalExitCode = child.exitCode;
  details.finalSignalCode = child.signalCode;
  details.exited = childExited(child);
  return details;
};

const spawnLogged = async (name, command, args, options, logPath) => {
  const log = createWriteStream(logPath, { flags: 'w' });
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  evidence.processes[name] = { pid: child.pid, command: [command, ...args].join(' '), logPath };
  child.once('exit', (code, signal) => {
    evidence.processes[name].exitCode = code;
    evidence.processes[name].signal = signal;
    log.end();
  });
  return child;
};

const readSettingFileValue = async (dataDir) => {
  const filePath = path.join(dataDir, '.env');
  const content = await fs.readFile(filePath, 'utf8');
  const match = content.match(/^AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS=(.*)$/m);
  return { filePath, value: match?.[1]?.trim() ?? null };
};

const clickAndWait = async (page, kind, index) => {
  const startedAt = performance.now();
  if (kind === 'panel') {
    const button = page.locator('[data-test="reasoning-output"] .think-toggle-button');
    const wasActive = await button.evaluate((element) => element.classList.contains('is-active'));
    await button.click();
    await page.waitForFunction(
      (expected) => document.querySelector('[data-test="reasoning-output"] .think-toggle-button')?.classList.contains('is-active') === expected,
      !wasActive,
    );
  } else if (kind === 'member') {
    const target = index % 2 === 0 ? 'member-b' : 'member-a';
    await page.locator(`[data-test="${target}"]`).click();
    await page.waitForFunction((expected) => document.querySelector('[data-test="interaction-state"]')?.textContent?.includes(`member=${expected}`), target);
  } else if (kind === 'file') {
    const before = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot().then((value) => value.fileActionCount));
    await page.locator('[data-test="static-rich-actions"] [data-event-monitor-file-action-id]').first().click();
    await page.waitForFunction((expected) => window.__streamingPerformanceProbe.snapshot().then((value) => value.fileActionCount > expected), before);
  } else if (kind === 'reference') {
    const before = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot().then((value) => value.referenceClickCount));
    await page.locator('[data-test="static-rich-actions"] a[href="https://example.com/reference"]').click();
    await page.waitForFunction((expected) => window.__streamingPerformanceProbe.snapshot().then((value) => value.referenceClickCount > expected), before);
  }
  return performance.now() - startedAt;
};

await fs.mkdir(outputDir, { recursive: true });
const summaryPath = path.join(outputDir, 'long-stream-browser-summary.json');
const liveScreenshotPath = path.join(outputDir, 'long-stream-browser-live.png');
const finalScreenshotPath = path.join(outputDir, 'long-stream-browser-final.png');
const nodeARoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-api-e2e-node-a-'));
const nodeBRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-api-e2e-node-b-'));
let harnessChild;
let nodeAChild;
let nodeBChild;
let webChild;
let browser;

try {
  assert(!existsSync(fixturePagePath), 'SETUP-001', 'Temporary fixture route does not overwrite an existing page', { fixturePagePath });
  await fs.writeFile(fixturePagePath, fixtureSource, 'utf8');

  const [harnessPort, nodeAPort, nodeBPort, webPort] = await Promise.all([
    choosePort(), choosePort(), choosePort(), choosePort(),
  ]);
  Object.assign(evidence.ports, { harnessPort, nodeAPort, nodeBPort, webPort });
  const harnessBase = `http://127.0.0.1:${harnessPort}`;
  const nodeABase = `http://127.0.0.1:${nodeAPort}`;
  const nodeBBase = `http://127.0.0.1:${nodeBPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;

  await fs.writeFile(path.join(nodeARoot, '.env'), [
    'APP_ENV=production',
    `AUTOBYTEUS_SERVER_HOST=${nodeABase}`,
    'DISABLE_HTTP_REQUEST_LOGS=true',
    'LOG_LEVEL=ERROR',
    '',
  ].join('\n'));
  await fs.writeFile(path.join(nodeBRoot, '.env'), [
    'APP_ENV=production',
    `AUTOBYTEUS_SERVER_HOST=${nodeBBase}`,
    'DISABLE_HTTP_REQUEST_LOGS=true',
    'LOG_LEVEL=ERROR',
    '',
  ].join('\n'));

  harnessChild = await spawnLogged(
    'harness',
    process.execPath,
    [harnessPath, '--port', String(harnessPort), '--duration-ms', String(durationMs)],
    { cwd: repoDir, env: { ...process.env } },
    path.join(outputDir, 'long-stream-production-harness.log'),
  );
  nodeAChild = await spawnLogged(
    'nodeA',
    process.execPath,
    ['dist/app.js', '--host', '127.0.0.1', '--port', String(nodeAPort), '--data-dir', nodeARoot],
    { cwd: serverDir, env: { ...process.env } },
    path.join(outputDir, 'long-stream-node-a.log'),
  );
  nodeBChild = await spawnLogged(
    'nodeB',
    process.execPath,
    ['dist/app.js', '--host', '127.0.0.1', '--port', String(nodeBPort), '--data-dir', nodeBRoot],
    { cwd: serverDir, env: { ...process.env } },
    path.join(outputDir, 'long-stream-node-b.log'),
  );

  await Promise.all([
    waitForHttp(`${harnessBase}/health`),
    waitForHttp(`${nodeABase}/rest/health`),
    waitForHttp(`${nodeBBase}/rest/health`),
  ]);

  webChild = await spawnLogged(
    'nuxt',
    'pnpm',
    ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)],
    {
      cwd: webDir,
      env: {
        ...process.env,
        BACKEND_NODE_BASE_URL: nodeABase,
        BACKEND_AGENT_WS_ENDPOINT: `ws://127.0.0.1:${harnessPort}/ws/agent`,
      },
    },
    path.join(outputDir, 'long-stream-nuxt.log'),
  );
  await waitForHttp(webBase);

  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const contextBrowser = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await contextBrowser.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }));
  page.on('response', (response) => {
    if (response.status() >= 400) evidence.browserEvents.push({ type: `response:${response.status()}`, text: response.url() });
  });

  const pageUrl = `${webBase}${routePath}?runId=${encodeURIComponent(runId)}&wsEndpoint=${encodeURIComponent(`ws://127.0.0.1:${harnessPort}/ws/agent`)}`;
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-test="runtime-streaming-performance-fixture"]').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__streamingPerformanceProbe), null, { timeout: 120000 });

  const bind = async (nodeId, baseUrl) => await page.evaluate(
    ({ nodeId, baseUrl }) => window.__streamingPerformanceProbe.bindNode(nodeId, baseUrl),
    { nodeId, baseUrl },
  );
  const input = page.locator('[data-testid="live-response-streaming-input"]');
  const save = page.locator('[data-testid="live-response-streaming-save"]');
  const reset = page.locator('[data-testid="live-response-streaming-reset"]');

  evidence.settings.nodeAInitial = await bind('node-a', nodeABase);
  assert(evidence.settings.nodeAInitial === 500, 'SET-001', 'Absent node A configuration reports effective 500', evidence.settings);
  await input.fill('99');
  evidence.settings.invalid99 = { saveDisabled: await save.isDisabled(), alert: await page.locator('[data-test="settings-validation"] [role="alert"]').textContent() };
  assert(evidence.settings.invalid99.saveDisabled, 'SET-002', 'Below-range browser value is rejected', evidence.settings.invalid99);
  await input.fill('100.5');
  evidence.settings.invalidDecimal = { saveDisabled: await save.isDisabled(), alert: await page.locator('[data-test="settings-validation"] [role="alert"]').textContent() };
  assert(evidence.settings.invalidDecimal.saveDisabled, 'SET-003', 'Non-integer browser value is rejected', evidence.settings.invalidDecimal);
  await input.fill('1000');
  await save.click();
  await waitFor('node A effective 1000', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).effectiveSetting === 1000);
  evidence.settings.nodeAAfterSave = { effective: 1000, persisted: await readSettingFileValue(nodeARoot) };
  assert(evidence.settings.nodeAAfterSave.persisted.value === '1000', 'SET-004', 'Node A browser save persists 1000 through the real API', evidence.settings.nodeAAfterSave);

  evidence.settings.nodeBInitial = await bind('node-b', nodeBBase);
  assert(evidence.settings.nodeBInitial === 500, 'SET-005', 'Rebinding reads node B default without leaking node A state', evidence.settings);
  await input.fill('2000');
  await save.click();
  await waitFor('node B effective 2000', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).effectiveSetting === 2000);
  evidence.settings.nodeBAfterSave = { effective: 2000, persisted: await readSettingFileValue(nodeBRoot) };
  assert(evidence.settings.nodeBAfterSave.persisted.value === '2000', 'SET-006', 'Node B browser save persists 2000 only to node B', evidence.settings.nodeBAfterSave);

  evidence.settings.nodeAAfterRebind = await bind('node-a', nodeABase);
  assert(evidence.settings.nodeAAfterRebind === 1000, 'SET-007', 'Rebinding to node A restores node A value', evidence.settings);
  await reset.click();
  await waitFor('node A reset 500', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).effectiveSetting === 500);
  evidence.settings.nodeAReset = await readSettingFileValue(nodeARoot);
  assert(evidence.settings.nodeAReset.value === '500', 'SET-008', 'Node A reset persists 500', evidence.settings.nodeAReset);

  evidence.settings.nodeBAfterSecondRebind = await bind('node-b', nodeBBase);
  assert(evidence.settings.nodeBAfterSecondRebind === 2000, 'SET-009', 'Node B retains its independent value after node A reset', evidence.settings);
  await reset.click();
  await waitFor('node B reset 500', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).effectiveSetting === 500);
  evidence.settings.nodeBReset = await readSettingFileValue(nodeBRoot);
  assert(evidence.settings.nodeBReset.value === '500', 'SET-010', 'Node B reset persists 500', evidence.settings.nodeBReset);

  evidence.cleanup.nodeAAfterSettings = await killOwnedProcess(nodeAChild);
  nodeAChild = null;
  evidence.cleanup.nodeBAfterSettings = await killOwnedProcess(nodeBChild);
  nodeBChild = null;

  await page.evaluate(() => window.__streamingPerformanceProbe.startStream());
  await waitFor('production AgentStreamingService subscription', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).subscribed, 30000);
  const startResponse = await fetch(`${harnessBase}/control/start`, { method: 'POST' });
  assert(startResponse.status === 202, 'PERF-SETUP-001', 'Deterministic production-path stream start was accepted', { status: startResponse.status });

  await waitFor('first live content', async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).contentLength >= 200, 30000);
  await page.locator('[data-test="reasoning-output"] .think-toggle-button').click();
  await page.locator('[data-test="reasoning-output"] .think-content').waitFor({ state: 'visible' });
  const liveSnapshot = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot());
  evidence.livePresentation = {
    contentLength: liveSnapshot.contentLength,
    liveRenderers: liveSnapshot.dom.liveRenderers,
    richRenderers: liveSnapshot.dom.richRenderers,
    headings: liveSnapshot.dom.headings,
    images: liveSnapshot.dom.images,
    literalUnsafeMarkupVisible: liveSnapshot.dom.liveText.includes('<img src="data:image/gif'),
    reasoningLiveRenderers: liveSnapshot.dom.reasoningLiveRenderers,
    reasoningStrong: liveSnapshot.dom.reasoningStrong,
  };
  assert(liveSnapshot.dom.liveRenderers === 1 && liveSnapshot.dom.richRenderers === 0, 'LIVE-001', 'Active streamed text uses only the production live renderer', evidence.livePresentation);
  assert(liveSnapshot.dom.headings === 0 && liveSnapshot.dom.images === 0 && evidence.livePresentation.literalUnsafeMarkupVisible, 'LIVE-002', 'Active Markdown/HTML remains literal and does not mount rich DOM', evidence.livePresentation);
  assert(liveSnapshot.dom.reasoningLiveRenderers === 1 && liveSnapshot.dom.reasoningStrong === 0, 'LIVE-003', 'Expanded incomplete reasoning uses escaped live text', evidence.livePresentation);
  await page.screenshot({ path: liveScreenshotPath, fullPage: false });

  const browserCdp = await browser.newBrowserCDPSession();
  let previousCpuSample = null;
  const rendererCpuPercentSamples = [];
  const healthLatenciesMs = [];
  const interactionLatenciesMs = [];
  const interactionKinds = ['panel', 'member', 'file', 'reference'];
  const streamWallStart = Date.now();
  let nextInteractionIndex = 0;
  let nextInteractionAt = streamWallStart + Math.min(15000, Math.max(1000, durationMs / 40));
  const interactionSpacingMs = Math.max(1000, (durationMs - Math.min(30000, durationMs / 10)) / 20);

  while (Date.now() - streamWallStart < timeoutMs) {
    const sampleStartedAt = performance.now();
    const response = await fetch(`${harnessBase}/health`);
    await response.text();
    healthLatenciesMs.push(performance.now() - sampleStartedAt);

    const processInfo = await browserCdp.send('SystemInfo.getProcessInfo');
    const rendererCpuById = new Map(
      processInfo.processInfo
        .filter((entry) => entry.type === 'renderer')
        .map((entry) => [String(entry.id), Number(entry.cpuTime)]),
    );
    const cpuSampleAt = performance.now();
    if (previousCpuSample) {
      const wallSeconds = Math.max(0.001, (cpuSampleAt - previousCpuSample.at) / 1000);
      let cpuSeconds = 0;
      for (const [id, cpuTime] of rendererCpuById) {
        const previous = previousCpuSample.byId.get(id);
        if (Number.isFinite(cpuTime) && Number.isFinite(previous) && cpuTime >= previous) cpuSeconds += cpuTime - previous;
      }
      rendererCpuPercentSamples.push((cpuSeconds / wallSeconds) * 100);
    }
    previousCpuSample = { at: cpuSampleAt, byId: rendererCpuById };

    if (nextInteractionIndex < 20 && Date.now() >= nextInteractionAt) {
      const kind = interactionKinds[nextInteractionIndex % interactionKinds.length];
      const latency = await clickAndWait(page, kind, nextInteractionIndex);
      interactionLatenciesMs.push(latency);
      nextInteractionIndex += 1;
      nextInteractionAt += interactionSpacingMs;
    }

    const current = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot());
    const harnessMetrics = await (await fetch(`${harnessBase}/metrics`)).json();
    if (current.finished && harnessMetrics.finished) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const finalSnapshot = await waitFor(
    'browser completion and final rich presentation',
    async () => {
      const snapshot = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot());
      if (!snapshot.finished || snapshot.dom.richRenderers !== 1) return null;
      return snapshot;
    },
    120000,
    250,
  );
  await waitFor(
    'final Mermaid SVG',
    async () => (await page.evaluate(() => window.__streamingPerformanceProbe.snapshot())).dom.mermaidSvgs >= 1,
    30000,
    250,
  );
  const reasoningToggle = page.locator('[data-test="reasoning-output"] .think-toggle-button');
  if (!(await reasoningToggle.evaluate((element) => element.classList.contains('is-active')))) {
    await reasoningToggle.click();
    await page.locator('[data-test="reasoning-output"] .think-content').waitFor({ state: 'visible' });
  }
  const finalWithMermaid = await page.evaluate(() => window.__streamingPerformanceProbe.snapshot());
  const harnessMetrics = await (await fetch(`${harnessBase}/metrics`)).json();
  await page.screenshot({ path: finalScreenshotPath, fullPage: false });

  while (nextInteractionIndex < 20) {
    const kind = interactionKinds[nextInteractionIndex % interactionKinds.length];
    interactionLatenciesMs.push(await clickAndWait(page, kind, nextInteractionIndex));
    nextInteractionIndex += 1;
  }

  const sourceFirst = Date.parse(harnessMetrics.firstContentSourceAt);
  const sourceLast = Date.parse(harnessMetrics.lastContentSourceAt);
  const activeSeconds = (sourceLast - sourceFirst) / 1000;
  const internalRate = harnessMetrics.internalContentEvents / activeSeconds;
  const contentOutputRate = finalWithMermaid.messageCounts.content / activeSeconds;
  const reductionPercent = (1 - finalWithMermaid.messageCounts.content / harnessMetrics.internalContentEvents) * 100;
  const driftSummary = summarize(finalWithMermaid.rendererDriftsMs);
  const visibleLatencySummary = summarize(finalWithMermaid.visibleLatenciesMs);
  const cpuSummary = summarize(rendererCpuPercentSamples);
  const healthSummary = summarize(healthLatenciesMs);
  const interactionSummary = summarize(interactionLatenciesMs);

  evidence.performance = {
    activeSeconds,
    internalContentEvents: harnessMetrics.internalContentEvents,
    sourceContentEvents: harnessMetrics.sourceContentEvents,
    internalStatusEvents: harnessMetrics.internalStatusEvents,
    internalRatePerSecond: internalRate,
    clientMessageCounts: finalWithMermaid.messageCounts,
    contentOutputRatePerSecond: contentOutputRate,
    contentFrameReductionPercent: reductionPercent,
    expectedCharacters: harnessMetrics.configuration.expectedCharacters,
    observedCharacters: finalWithMermaid.contentLength,
    expectedSha256: harnessMetrics.configuration.expectedSha256,
    observedSha256: finalWithMermaid.contentSha256,
    rendererDriftMs: driftSummary,
    websocketReceiptToVisibleMs: visibleLatencySummary,
    rendererCpuPercentOneCore: cpuSummary,
    backendHealthLatencyMs: healthSummary,
    backendEventLoopDriftMs: harnessMetrics.eventLoopDriftSummary,
    interactions: { count: interactionLatenciesMs.length, byKind: interactionKinds, latencyMs: interactionSummary },
    host: { platform: process.platform, arch: process.arch, cpus: os.cpus().length, model: os.cpus()[0]?.model },
  };

  assert(activeSeconds >= 600 || durationMs < 600000, 'PERF-001', 'The representative active stream lasts at least 10 minutes', { activeSeconds, durationMs });
  assert(harnessMetrics.internalContentEvents === harnessMetrics.configuration.expectedContentEvents, 'PERF-002', 'Every deterministic source content event remains visible to the internal canonical subscriber', evidence.performance);
  assert(internalRate >= 30, 'PERF-003', 'Internal content input rate is at least 30 events/s', { internalRate });
  assert(finalWithMermaid.contentLength >= 120000 || durationMs < 600000, 'PERF-004', 'Accumulated browser content is at least 120,000 characters', evidence.performance);
  assert(finalWithMermaid.contentLength === harnessMetrics.configuration.expectedCharacters && finalWithMermaid.contentSha256 === harnessMetrics.configuration.expectedSha256, 'PERF-EXACT-001', 'Final browser content length and SHA-256 exactly match deterministic input', evidence.performance);
  assert(contentOutputRate <= 2.2, 'PERF-005', 'Default-window ordinary content output remains no greater than 2.2/s', { contentOutputRate });
  assert(reductionPercent >= 90, 'PERF-006', 'Client content-frame reduction is at least 90%', { reductionPercent });
  assert(finalWithMermaid.messageCounts.status >= harnessMetrics.internalContentEvents, 'PERF-007', 'Routine running status companions remain client-visible and undeduplicated', { clientStatusFrames: finalWithMermaid.messageCounts.status, internalContentEvents: harnessMetrics.internalContentEvents });
  assert(driftSummary.p95 <= 50 && driftSummary.max <= 250, 'PERF-008', '50 ms renderer probe meets p95 drift and maximum-stall thresholds', driftSummary);
  assert(cpuSummary.samples > 0 && cpuSummary.mean <= 25 && cpuSummary.p95 <= 50, 'PERF-009', 'Renderer CPU mean/p95 remain within one-core thresholds', cpuSummary);
  assert(interactionLatenciesMs.length === 20 && interactionSummary.p95 <= 250, 'PERF-010', 'Twenty file/reference/member/panel interactions meet click-to-visible p95', { values: interactionLatenciesMs, summary: interactionSummary });
  assert(healthSummary.p95 <= 20, 'PERF-011', 'Backend health p95 remains no greater than 20 ms', healthSummary);
  assert(visibleLatencySummary.p95 <= 150, 'PERF-012', 'Frontend adds no stacked cadence; WebSocket receipt-to-visible p95 is no greater than 150 ms', visibleLatencySummary);

  evidence.finalPresentation = {
    richMountCount: finalWithMermaid.richMountCount,
    liveRenderers: finalWithMermaid.dom.liveRenderers,
    richRenderers: finalWithMermaid.dom.richRenderers,
    headings: finalWithMermaid.dom.headings,
    codeBlocks: finalWithMermaid.dom.codeBlocks,
    katex: finalWithMermaid.dom.katex,
    mermaidContainers: finalWithMermaid.dom.mermaidContainers,
    mermaidSvgs: finalWithMermaid.dom.mermaidSvgs,
    images: finalWithMermaid.dom.images,
    unsafeOnErrorAttributes: finalWithMermaid.dom.unsafeOnErrorAttributes,
    xssExecuted: finalWithMermaid.xssExecuted,
    reasoningRichRenderers: finalWithMermaid.dom.reasoningRichRenderers,
    reasoningStrong: finalWithMermaid.dom.reasoningStrong,
  };
  assert(finalWithMermaid.richMountCount === 1 && finalWithMermaid.dom.liveRenderers === 0 && finalWithMermaid.dom.richRenderers === 1, 'FINAL-001', 'Streamed text switches once from live to rich presentation', evidence.finalPresentation);
  assert(finalWithMermaid.dom.headings >= 2 && finalWithMermaid.dom.codeBlocks >= 1 && finalWithMermaid.dom.katex >= 1 && finalWithMermaid.dom.mermaidSvgs >= 1, 'FINAL-002', 'Completed output restores headings, highlighted code, math, and Mermaid', evidence.finalPresentation);
  assert(finalWithMermaid.dom.unsafeOnErrorAttributes === 0 && !finalWithMermaid.xssExecuted, 'FINAL-003', 'Completed rich output sanitizes authored event-handler markup', evidence.finalPresentation);
  assert(finalWithMermaid.dom.reasoningRichRenderers === 1 && finalWithMermaid.dom.reasoningStrong >= 1, 'FINAL-004', 'Completed reasoning switches to rich presentation', evidence.finalPresentation);
  assert(!harnessMetrics.failure, 'HARNESS-001', 'Production-path deterministic harness completed without failure', harnessMetrics.failure);

  evidence.result = 'Pass';
  evidence.completedAt = new Date().toISOString();
} catch (error) {
  evidence.result = 'Fail';
  evidence.completedAt = new Date().toISOString();
  evidence.failures.push({
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
} finally {
  try { if (browser) await browser.close(); evidence.cleanup.browser = 'closed'; } catch (error) { evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await killOwnedProcess(webChild); } catch (error) { evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { evidence.cleanup.nodeA = await killOwnedProcess(nodeAChild); } catch (error) { evidence.cleanup.nodeA = `failed: ${error.message}`; }
  try { evidence.cleanup.nodeB = await killOwnedProcess(nodeBChild); } catch (error) { evidence.cleanup.nodeB = `failed: ${error.message}`; }
  try { evidence.cleanup.harness = await killOwnedProcess(harnessChild); } catch (error) { evidence.cleanup.harness = `failed: ${error.message}`; }
  try { await fs.rm(fixturePagePath, { force: true }); evidence.cleanup.fixturePage = 'removed'; } catch (error) { evidence.cleanup.fixturePage = `failed: ${error.message}`; }
  try { await fs.rm(nodeARoot, { recursive: true, force: true }); evidence.cleanup.nodeARoot = 'removed'; } catch (error) { evidence.cleanup.nodeARoot = `failed: ${error.message}`; }
  try { await fs.rm(nodeBRoot, { recursive: true, force: true }); evidence.cleanup.nodeBRoot = 'removed'; } catch (error) { evidence.cleanup.nodeBRoot = `failed: ${error.message}`; }
  await fs.writeFile(summaryPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ result: evidence.result, summaryPath, failures: evidence.failures }, null, 2));
}
