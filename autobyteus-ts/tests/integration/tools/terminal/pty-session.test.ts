import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let PtySessionClass: typeof import('../../../../src/tools/terminal/pty-session.js').PtySession | null = null;
let nodePtyAvailable = true;

try {
  await import('node-pty');
  ({ PtySession: PtySessionClass } = await import('../../../../src/tools/terminal/pty-session.js'));
} catch {
  nodePtyAvailable = false;
}

const runIntegration = nodePtyAvailable ? describe : describe.skip;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readUntil(
  session: InstanceType<NonNullable<typeof PtySessionClass>>,
  predicate: (output: Buffer) => boolean,
  attempts: number = 20
): Promise<Buffer> {
  let output = Buffer.alloc(0);
  for (let i = 0; i < attempts; i += 1) {
    const data = await session.read(0.1);
    if (data) {
      output = Buffer.concat([output, data]);
      if (predicate(output)) {
        break;
      }
    }
    await sleep(100);
  }
  return output;
}

runIntegration('PtySession Integration', () => {
  if (!PtySessionClass) {
    return;
  }

  it('starts and reports alive', async () => {
    await withTempDir(async (tempDir) => {
        const session = new PtySessionClass('test');
      try {
        await session.start(tempDir);
        expect(session.isAlive).toBe(true);
      } finally {
        await session.close();
      }
      expect(session.isAlive).toBe(false);
    });
  });

  it('writes command and reads output', async () => {
    await withTempDir(async (tempDir) => {
      const session = new PtySessionClass('test');
      try {
        await session.start(tempDir);
        await session.write(Buffer.from('echo hello\n'));

        const output = await readUntil(session, (data) => data.toString('utf8').includes('hello'));
        expect(output.toString('utf8')).toContain('hello');
      } finally {
        await session.close();
      }
    });
  });

  it('persists working directory across commands', async () => {
    await withTempDir(async (tempDir) => {
      const subdir = path.join(tempDir, 'subdir');
      await mkdir(subdir);

      const session = new PtySessionClass('test');
      try {
        await session.start(tempDir);
        await session.write(Buffer.from('cd subdir\n'));
        await sleep(200);
        await session.write(Buffer.from('pwd\n'));

        const output = await readUntil(session, (data) => data.toString('utf8').includes('subdir'));
        expect(output.toString('utf8')).toContain('subdir');
      } finally {
        await session.close();
      }
    });
  });

  it('persists environment variables', async () => {
    await withTempDir(async (tempDir) => {
      const session = new PtySessionClass('test');
      try {
        await session.start(tempDir);
        await session.write(Buffer.from('export TEST_VAR=hello_world\n'));
        await sleep(200);
        await session.write(Buffer.from('echo $TEST_VAR\n'));

        const output = await readUntil(session, (data) => data.toString('utf8').includes('hello_world'));
        expect(output.toString('utf8')).toContain('hello_world');
      } finally {
        await session.close();
      }
    });
  });

  it('resizes without error', async () => {
    await withTempDir(async (tempDir) => {
      const session = new PtySessionClass('test');
      try {
        await session.start(tempDir);
        session.resize(40, 120);
      } finally {
        await session.close();
      }
    });
  });
});
