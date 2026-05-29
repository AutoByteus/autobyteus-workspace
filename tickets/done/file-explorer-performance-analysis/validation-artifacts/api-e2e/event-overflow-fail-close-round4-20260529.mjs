import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis';
const serverRoot = path.join(repoRoot, 'autobyteus-server-ts');
const artifactRoot = path.join(repoRoot, 'tickets/in-progress/file-explorer-performance-analysis/validation-artifacts/api-e2e');
const outputPath = path.join(artifactRoot, 'event-overflow-fail-close-round4-20260529.json');

const { EventBatcher } = await import(pathToFileURL(path.join(serverRoot, 'dist/file-explorer/watcher/event-batcher.js')).href);
const { FileExplorerStreamHandler } = await import(pathToFileURL(path.join(serverRoot, 'dist/services/file-explorer-streaming/file-explorer-stream-handler.js')).href);
const { FileExplorerSessionManager } = await import(pathToFileURL(path.join(serverRoot, 'dist/services/file-explorer-streaming/file-explorer-session-manager.js')).href);

async function* burstSource() {
  for (let i = 0; i < 10; i += 1) {
    yield JSON.stringify({ changes: [{ type: 'modify', path: `overflow-${i}.txt` }] });
  }
}

const watcherLease = {
  reason: 'overflow-validation',
  releaseCalls: 0,
  async release() { this.releaseCalls += 1; },
};
const fileExplorerLease = {
  releaseCalls: 0,
  fileExplorer: null,
  async release() { this.releaseCalls += 1; },
};
const fileExplorer = {
  async acquireWatcherLease(reason) {
    watcherLease.reason = reason;
    return watcherLease;
  },
  subscribe() {
    return new EventBatcher(burstSource(), 0.05, 2).getBatchedEvents();
  },
};
fileExplorerLease.fileExplorer = fileExplorer;
const workspace = {
  async acquireFileExplorer() {
    return fileExplorerLease;
  },
};
const workspaceManager = {
  async getOrCreateWorkspace(workspaceId) {
    return workspace;
  },
};

const sent = [];
const closed = [];
const connection = {
  send(payload) { sent.push(JSON.parse(payload)); },
  close(code) { closed.push(code); },
};

const handler = new FileExplorerStreamHandler(new FileExplorerSessionManager(), workspaceManager);
const sessionId = await handler.connect(connection, 'overflow-ws');
assert.ok(sessionId, 'session should connect before overflow');

const deadline = Date.now() + 2000;
while (!closed.includes(1011) && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

const result = {
  startedAt: new Date().toISOString(),
  sessionId,
  sentTypes: sent.map((message) => message.type),
  closeCodes: closed,
  watcherLeaseReleaseCalls: watcherLease.releaseCalls,
  fileExplorerLeaseReleaseCalls: fileExplorerLease.releaseCalls,
  activeSessionClosed: closed.includes(1011),
  connectedBeforeOverflow: sent.some((message) => message.type === 'CONNECTED'),
  pass: closed.includes(1011)
    && sent.some((message) => message.type === 'CONNECTED')
    && watcherLease.releaseCalls === 1
    && fileExplorerLease.releaseCalls === 1,
  finishedAt: new Date().toISOString(),
};
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.pass) {
  process.exitCode = 1;
}
