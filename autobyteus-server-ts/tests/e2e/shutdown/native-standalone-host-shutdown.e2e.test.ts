/** Full standalone host ownership regression (AC-004/005).
 * Prerequisite: current server/core/SDK builds. Local scripted inference only, no credentials.
 * From root: RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch
 * Optional TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR receives JSON/logs. macOS/Linux native process coverage, not Windows certification.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const enabled = process.env.RUN_NATIVE_STANDALONE_SHUTDOWN_E2E === '1' && process.platform !== 'win32';
describe.skipIf(!enabled)('full standalone native command ownership', () => {
  it('drains active and ended-run resistant/adopted survivors without touching unrelated resources', async () => {
    try {
      const result = await promisify(execFile)(process.execPath, [resolve('tests/e2e/shutdown/native-standalone-host-fixture.mjs')], {
        cwd: process.cwd(), timeout: 150_000, maxBuffer: 8 * 1024 * 1024,
        env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR,
          TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR: process.env.TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR },
      });
      const receipt = JSON.parse(result.stdout.trim().split('\n').at(-1)!);
      console.log(JSON.stringify(receipt));
      expect(receipt.result).toBe('Pass');
      expect(receipt.observations).toHaveLength(4);
      expect(receipt.observations.every((entry: { absent: boolean; anchorAbsent: boolean }) => entry.absent && entry.anchorAbsent)).toBe(true);
      expect(receipt.rootRemoved).toBe(true);
    } catch (error) {
      const output = error as Error & { stdout?: string; stderr?: string };
      throw new Error(`${output.message}\n${output.stdout ?? ''}\n${output.stderr ?? ''}`);
    }
  }, 160_000);
});
