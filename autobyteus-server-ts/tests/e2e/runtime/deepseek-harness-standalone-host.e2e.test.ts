/** DeepSeek Harness in the standalone application host (DEC-020): a real host from the current `dist/` runs no credential
 * proxy, so dsh is unavailable with that reason and an application's dsh launch is refused before dsh starts.
 * Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`). No dsh, no key: the fixture's `dsh`
 * stand-in answers `--version` and records any other start.
 * From root: RUN_DEEPSEEK_HARNESS_STANDALONE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/deepseek-harness-standalone-host.e2e.test.ts --no-watch
 * Optional TEST_DSH_STANDALONE_EVIDENCE_DIR receives the host log.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_DEEPSEEK_HARNESS_STANDALONE_E2E === "1" && process.platform !== "win32";

describe.skipIf(!enabled)("DeepSeek Harness in the standalone application host", () => {
  it("shows dsh unavailable for want of the credential proxy and refuses an application's dsh launch before dsh starts (DEC-020)", async () => {
    let stdout = "";
    try {
      const result = await promisify(execFile)(process.execPath, [resolve("tests/e2e/runtime/fixtures/deepseek-harness-standalone-host-fixture.mjs")], {
        cwd: process.cwd(), timeout: 150_000, maxBuffer: 8 * 1024 * 1024,
        env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, TEST_DSH_STANDALONE_EVIDENCE_DIR: process.env.TEST_DSH_STANDALONE_EVIDENCE_DIR },
      });
      stdout = result.stdout;
    } catch (error) {
      const output = error as Error & { stdout?: string; stderr?: string };
      throw new Error(`${output.message}\n${output.stdout ?? ""}\n${output.stderr ?? ""}`);
    }
    const receipt = JSON.parse(stdout.trim().split("\n").at(-1)!) as {
      result: string; error?: string; availability: { enabled: boolean; reason: string | null };
      launch: { started: boolean; error?: string }; dshStarts: string[]; rootRemoved: boolean;
    };
    console.log(JSON.stringify(receipt));
    expect(receipt.result, receipt.error).toBe("Pass");
    expect(receipt.availability.enabled).toBe(false);
    expect(receipt.availability.reason).toMatch(/credential proxy/i);
    expect(receipt.launch.started).toBe(false);
    expect(receipt.launch.error).toBeTruthy();
    expect(receipt.dshStarts, "dsh was never started for a run").toEqual([]);
    expect(receipt.rootRemoved).toBe(true);
  }, 160_000);
});
