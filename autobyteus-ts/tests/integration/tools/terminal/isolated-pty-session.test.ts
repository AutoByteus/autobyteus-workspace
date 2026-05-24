import { describe, it, expect } from 'vitest';
import { chmod, mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectNodePtyRuntimeAvailable } from './pty-runtime.js';
import {
  resolveNodePtySpawnHelperPath
} from '../../../../src/tools/terminal/node-pty-bootstrap.js';

let IsolatedPtySessionClass:
  | typeof import('../../../../src/tools/terminal/isolated-pty-session.js').IsolatedPtySession
  | null = null;
let nodePtyAvailable = await detectNodePtyRuntimeAvailable();
const helperPath = nodePtyAvailable
  ? await resolveNodePtySpawnHelperPath()
  : null;

try {
  ({ IsolatedPtySession: IsolatedPtySessionClass } = await import('../../../../src/tools/terminal/isolated-pty-session.js'));
} catch {
  nodePtyAvailable = false;
}

const runIntegration = nodePtyAvailable && helperPath && process.platform !== 'win32'
  ? describe
  : describe.skip;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-isolated-pty-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readUntil(
  session: InstanceType<NonNullable<typeof IsolatedPtySessionClass>>,
  predicate: (output: Buffer) => boolean,
  attempts: number = 30
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

runIntegration('IsolatedPtySession integration', () => {
  if (!IsolatedPtySessionClass || !helperPath) {
    return;
  }

  it('repairs non-executable node-pty spawn-helper before starting the bridge', async () => {
    const originalMode = (await stat(helperPath)).mode & 0o777;
    const nonExecutableMode = originalMode & ~0o111;
    let session: InstanceType<NonNullable<typeof IsolatedPtySessionClass>> | null = null;

    try {
      await chmod(helperPath, nonExecutableMode);
      expect((await stat(helperPath)).mode & 0o111).toBe(0);

      await withTempDir(async (tempDir) => {
        session = new IsolatedPtySessionClass('isolated-spawn-helper-repair');
        await session.start(tempDir);

        expect((await stat(helperPath)).mode & 0o111).not.toBe(0);
        expect(session.isAlive).toBe(true);

        await session.write(Buffer.from('echo ISOLATED_PTY_HELPER_REPAIRED\n'));
        const output = await readUntil(session, (data) =>
          data.toString('utf8').includes('ISOLATED_PTY_HELPER_REPAIRED')
        );
        expect(output.toString('utf8')).toContain('ISOLATED_PTY_HELPER_REPAIRED');
      });
    } finally {
      await session?.close().catch(() => undefined);
      await chmod(helperPath, originalMode).catch(() => undefined);
    }

    expect((await stat(helperPath)).mode & 0o777).toBe(originalMode);
  }, 20_000);
});
