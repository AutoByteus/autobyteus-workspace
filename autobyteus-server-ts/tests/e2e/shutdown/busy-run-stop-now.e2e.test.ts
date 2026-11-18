/** Stop-now regressions for busy runs, on real processes (autobyteus-284: REQ-001 to REQ-003, BEH-007, DEC-005).
 * - server: a real `dist/app.js` server process. A busy native run is Terminated through GraphQL (returns within 10 s,
 *   its foreground command gone); then SIGTERM with a busy run (exit 0 within 10 s, nothing it started left); then a
 *   relaunch on the same data shows `terminatedAt` only on the user-terminated run.
 * - application: a real standalone application host whose application terminates its busy run
 *   (`context.agentExecution.terminate`) within 10 s, with the foreground command gone.
 * Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`). Local scripted inference only, no credentials.
 * From root: RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch
 * Optional: TEST_BUSY_STOP_EVIDENCE_DIR receives the JSON records (TEST_BUSY_STOP_LABEL names them); BUSY_STOP_SERVER_DIR
 * runs the fixtures against another server build. macOS/Linux only (process-table checks).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const enabled = process.env.RUN_BUSY_STOP_NOW_E2E === '1' && process.platform !== 'win32';

const runFixture = async (file: string): Promise<Record<string, unknown>> => {
  try {
    const result = await promisify(execFile)(process.execPath, [resolve(`tests/e2e/shutdown/${file}`)], {
      cwd: process.cwd(), timeout: 150_000, maxBuffer: 8 * 1024 * 1024,
      env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, BUSY_STOP_SERVER_DIR: process.env.BUSY_STOP_SERVER_DIR,
        TEST_BUSY_STOP_EVIDENCE_DIR: process.env.TEST_BUSY_STOP_EVIDENCE_DIR, TEST_BUSY_STOP_LABEL: process.env.TEST_BUSY_STOP_LABEL },
    });
    const receipt = JSON.parse(result.stdout.trim().split('\n').at(-1)!) as Record<string, unknown>;
    console.log(JSON.stringify(receipt));
    return receipt;
  } catch (error) {
    const output = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`${output.message}\n${output.stdout ?? ''}\n${output.stderr ?? ''}`);
  }
};

describe.skipIf(!enabled)('stop now with a busy run', () => {
  it('server: Terminate and SIGTERM interrupt the busy turn, exit within the bound and leave nothing behind', async () => {
    const receipt = await runFixture('busy-run-stop-now-fixture.mjs');
    expect(receipt.result, String(receipt.error)).toBe('Pass');
    expect(receipt).toMatchObject({
      terminate: { result: { success: true }, foregroundGone: true },
      shutdown: { exit: { code: 0 }, survivors: [], markedLeft: [] },
      rootRemoved: true,
    });
    expect((receipt.history as { shutdownRun: { terminatedAt: unknown } }).shutdownRun.terminatedAt).toBeNull();
  }, 160_000);

  it('application: an application terminating its busy run interrupts the turn', async () => {
    const receipt = await runFixture('busy-application-terminate-fixture.mjs');
    expect(receipt.result, String(receipt.error)).toBe('Pass');
    expect(receipt).toMatchObject({ applicationTerminate: { foregroundGone: true }, close: { exitCode: 0 }, rootRemoved: true });
  }, 160_000);
});
