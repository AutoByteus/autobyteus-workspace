import { createHash } from 'node:crypto';
import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL CHECK (length(nonce) = 12),
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16)
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
    encryption_domain_id BLOB NOT NULL UNIQUE CHECK (length(encryption_domain_id) = 16),
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL CHECK (length(verifier_nonce) = 12),
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL CHECK (length(verifier_authentication_tag) = 16)
  );
`;

const EVENT_PREFIX = 'SECRET_VAULT_WORKER_EVENT ';
const workerPath = path.join(
  import.meta.dirname,
  'fixtures',
  'secret-vault-initializer-worker.mjs',
);
const serverRoot = path.resolve(import.meta.dirname, '../../..');

type WorkerEvent = {
  type: string;
  rootKeyDigest?: string;
  encryptionDomainId?: string;
  message?: string;
};

type WorkerController = {
  name: string;
  child: ChildProcessWithoutNullStreams;
  events: WorkerEvent[];
  output: string[];
  spawnError: Error | null;
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const startWorker = (
  name: string,
  mode: 'holder' | 'contender',
  databaseUrl: string,
): WorkerController => {
  const child = spawn(process.execPath, [workerPath, mode, databaseUrl], {
    cwd: serverRoot,
    env: {
      ...process.env,
      REPOSITORY_PRISMA_LOG_QUERIES: 'false',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const controller: WorkerController = {
    name,
    child,
    events: [],
    output: [],
    spawnError: null,
  };
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    controller.output.push(`stdout: ${line}`);
    if (!line.startsWith(EVENT_PREFIX)) return;
    controller.events.push(JSON.parse(line.slice(EVENT_PREFIX.length)) as WorkerEvent);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim()) controller.output.push(`stderr: ${line}`);
    }
  });
  child.once('error', (error) => {
    controller.spawnError = error;
  });
  return controller;
};

const workerEvidence = (worker: WorkerController) => [
  `${worker.name} exit=${String(worker.child.exitCode)} signal=${String(worker.child.signalCode)}`,
  ...worker.output,
].join('\n');

const waitForEvent = async (
  worker: WorkerController,
  type: string,
  timeoutMs = 10_000,
): Promise<WorkerEvent> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = worker.events.find((candidate) => candidate.type === type);
    if (event) return event;
    if (worker.spawnError) throw worker.spawnError;
    if (worker.child.exitCode !== null) {
      throw new Error(
        `${worker.name} exited before ${type}.\n${workerEvidence(worker)}`,
      );
    }
    await sleep(10);
  }
  throw new Error(
    `${worker.name} did not emit ${type} within ${timeoutMs}ms.\n${workerEvidence(worker)}`,
  );
};

const waitForExit = async (
  worker: WorkerController,
  timeoutMs = 10_000,
): Promise<void> => {
  if (worker.child.exitCode !== null) return;
  await Promise.race([
    new Promise<void>((resolve) => {
      worker.child.once('exit', () => resolve());
    }),
    sleep(timeoutMs).then(() => {
      throw new Error(
        `${worker.name} did not exit within ${timeoutMs}ms.\n${workerEvidence(worker)}`,
      );
    }),
  ]);
};

const stopWorker = async (worker: WorkerController | null): Promise<void> => {
  if (!worker || worker.child.exitCode !== null) return;
  worker.child.kill('SIGTERM');
  try {
    await waitForExit(worker, 2_000);
  } catch {
    worker.child.kill('SIGKILL');
    await waitForExit(worker, 2_000).catch(() => undefined);
  }
};

describe('secret vault independent-process initialization', () => {
  it('serializes two package compositions on one SQLite target and publishes one key/domain', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'secret-vault-independent-process-'),
    );
    if (process.platform !== 'win32') await fs.chmod(directory, 0o700);
    const databasePath = path.join(directory, 'application.db');
    const databaseUrl = pathToFileURL(databasePath).href;
    const database = new DatabaseSync(databasePath);
    database.exec(TABLES);
    database.close();

    let holder: WorkerController | null = null;
    let contender: WorkerController | null = null;
    try {
      holder = startWorker('holder', 'holder', databaseUrl);
      await waitForEvent(holder, 'PACKAGE_READY');
      await waitForEvent(holder, 'LOCK_REQUESTED');
      await waitForEvent(holder, 'LOCK_CALLBACK_ENTERED');
      await waitForEvent(holder, 'INITIALIZATION_HELD_AFTER_KEY_PUBLICATION');

      contender = startWorker('contender', 'contender', databaseUrl);
      expect(contender.child.pid).not.toBe(holder.child.pid);
      await waitForEvent(contender, 'PACKAGE_READY');
      await waitForEvent(contender, 'LOCK_REQUESTED');
      await waitForEvent(contender, 'CONTENTION_OBSERVATION_WINDOW_ELAPSED');

      expect(
        contender.events.map((event) => event.type),
        workerEvidence(contender),
      ).not.toContain('LOCK_CALLBACK_ENTERED');
      expect(
        contender.events.map((event) => event.type),
        workerEvidence(contender),
      ).not.toContain('ROOT_KEY_INSPECTION_ENTERED');
      expect(
        contender.events.map((event) => event.type),
        workerEvidence(contender),
      ).not.toContain('READY');

      holder.child.stdin.write('RELEASE\n');
      const [holderReady, contenderReady] = await Promise.all([
        waitForEvent(holder, 'READY'),
        waitForEvent(contender, 'READY'),
      ]);
      await Promise.all([waitForExit(holder), waitForExit(contender)]);

      expect(holder.child.exitCode, workerEvidence(holder)).toBe(0);
      expect(contender.child.exitCode, workerEvidence(contender)).toBe(0);
      expect(contender.events.map((event) => event.type)).toContain('LOCK_CALLBACK_ENTERED');
      expect(contender.events.map((event) => event.type)).toContain('ROOT_KEY_INSPECTION_ENTERED');
      expect(contenderReady.rootKeyDigest).toBe(holderReady.rootKeyDigest);
      expect(contenderReady.encryptionDomainId).toBe(holderReady.encryptionDomainId);

      const observer = new DatabaseSync(databasePath, { readOnly: true });
      const metadataCount = observer.prepare(
        'SELECT COUNT(*) AS count FROM secret_encryption_metadata',
      ).get() as { count: number };
      const metadata = observer.prepare(
        'SELECT encryption_domain_id FROM secret_encryption_metadata WHERE singleton_id = 1',
      ).get() as { encryption_domain_id: Uint8Array };
      observer.close();

      const rootKeyPath = `${databasePath}.secret.key`;
      const rootKey = await fs.readFile(rootKeyPath);
      const rootKeyDigest = createHash('sha256').update(rootKey).digest('hex');
      const keyFiles = (await fs.readdir(directory)).filter((file) =>
        file.endsWith('.secret.key'));
      expect(metadataCount.count).toBe(1);
      expect(Buffer.from(metadata.encryption_domain_id).toString('hex')).toBe(
        holderReady.encryptionDomainId,
      );
      expect(rootKeyDigest).toBe(holderReady.rootKeyDigest);
      expect(keyFiles).toEqual(['application.db.secret.key']);
      rootKey.fill(0);
    } finally {
      await Promise.all([stopWorker(contender), stopWorker(holder)]);
      await fs.rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
