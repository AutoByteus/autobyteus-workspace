import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import http from "node:http";

let directory: string;
let fakeCli: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "agy-discovery-unit-"));
  fakeCli = path.join(directory, "agy-fake");
  await writeFile(fakeCli, `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
const mode = process.env.AGY_FAKE_MODE;
const arg = process.argv[2];
appendFileSync(process.env.AGY_FAKE_COMMAND_LOG, arg + '\\n');
if (process.env.AGY_FAKE_PID_LOG) appendFileSync(process.env.AGY_FAKE_PID_LOG, arg + ' ' + process.pid + '\\n');
if (arg === '--version') {
  // Only the compaction-detection probe reads the version; admission (help + models) never does.
  if (mode === 'hang-version') { setInterval(() => {}, 1000); }
  else if (process.env.AGY_FAKE_VERSION_OUTPUT === undefined) throw new Error('Version probing must not be used for admission');
  process.stdout.write(process.env.AGY_FAKE_VERSION_OUTPUT);
} else if (arg === '--help') {
  if (mode === 'hang-help') { setInterval(() => {}, 1000); }
  else if (mode === 'oversized-help') process.stdout.write('x'.repeat(70 * 1024));
  else if (mode === 'oversized-help-stderr') process.stderr.write('x'.repeat(70 * 1024));
  else if (mode === 'failed-help') { process.stderr.write('secret /private/credential-path token=abc'); process.exitCode = 8; }
  // FU-008: the CLI answers and exits at once, but a process it leaves behind holds its stdout for 4 s, so the parent
  // sees the exit long before the close (as on a busy host). It logs "exited --help" as it exits.
  else if (mode === 'exited-help-late-close') {
    process.stdout.write('agy version 1.2.11\\n--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n');
    require('node:child_process').spawn('/bin/sleep', ['4'], { stdio: ['ignore', 'inherit', 'ignore'], detached: true }).unref();
    process.on('exit', () => appendFileSync(process.env.AGY_FAKE_COMMAND_LOG, 'exited --help\\n'));
  }
  else {
    const help = (process.env.AGY_FAKE_VERSION ?? 'agy version 1.2.11') + '\\n' +
      (mode === 'bad-flags' ? '--agent\\n' : '--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n');
    (mode === 'stderr-help' ? process.stderr : process.stdout).write(help);
  }
} else if (arg === 'models') {
  if (mode === 'failed-models') { process.stderr.write('secret /private/credential-path token=abc'); process.exitCode = 8; }
  // Real agy 1.3.3 output when the CLI has no sign-in (plus a secret-looking string that must never surface).
  else if (mode === 'signin-models') { process.stderr.write('Error: Please sign in to view available models. Launch the CLI without arguments to sign in. token=abc /private/credential-path\\n'); process.exitCode = 1; }
  else if (mode === 'signin-models-stdout') { process.stdout.write('You are not logged into Antigravity.\\n'); process.exitCode = 1; }
  // Real agy output for a network failure: a failure, but not a sign-in problem.
  else if (mode === 'network-models') { process.stderr.write('Error: Eligibility check failed: Post "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused\\n'); process.exitCode = 1; }
  // Sign-in wording on a successful listing is not a failure.
  else if (mode === 'signin-wording-success') { process.stderr.write('Please sign in again soon.\\n'); process.stdout.write('gemini-test\\tGemini Test\\n'); }
  else if (mode === 'hang-models') { setInterval(() => {}, 1000); }
  else if (mode === 'oversized-models') process.stdout.write('x'.repeat(1024 * 1024 + 1));
  else if (mode === 'oversized-models-stderr') process.stderr.write('x'.repeat(1024 * 1024 + 1));
  else if (mode === 'empty-models') process.stdout.write('');
  else if (mode === 'invalid-models') process.stdout.write('not-a-model\\n');
  else if (mode === 'slow-models') setTimeout(() => process.stdout.write('gemini-test\\tGemini Test\\n'), 500);
  else process.stdout.write('gemini-test\\tGemini Test\\n');
}
`, "utf8");
  await chmod(fakeCli, 0o755);
});

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

/** The fake CLI has started `command` (it logs its argument first): the parent's timer for it is set by then. */
const commandStarted = async (command: string) => {
  const deadline = performance.now() + 10_000;
  while (!(await readFile(path.join(directory, "commands.log"), "utf8")).split("\n").includes(command)) {
    if (performance.now() > deadline) throw new Error(`the fake CLI never started ${command}`);
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/** Waits real time while `setTimeout` is faked. */
const realWait = async (ms: number) => {
  const until = performance.now() + ms;
  while (performance.now() < until) await new Promise((resolve) => setImmediate(resolve));
};

const capability = async (mode: string) => {
  vi.stubEnv("ANTIGRAVITY_CLI_COMMAND", fakeCli);
  vi.stubEnv("AGY_FAKE_MODE", mode);
  vi.stubEnv("AGY_FAKE_COMMAND_LOG", path.join(directory, "commands.log"));
  await writeFile(path.join(directory, "commands.log"), "");
  vi.resetModules();
  return import("../../../src/runtime-management/antigravity-cli-capability.js");
};

describe("bounded AGY CLI discovery", () => {
  it("classifies a missing CLI without exposing its configured path", async () => {
    vi.stubEnv("ANTIGRAVITY_CLI_COMMAND", path.join(directory, "private-token-missing-cli"));
    vi.resetModules();
    const { listAntigravityModels } = await import("../../../src/runtime-management/antigravity-cli-capability.js");
    const error = await listAntigravityModels().catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code: "AGY_CLI_UNAVAILABLE",
      message: "Antigravity CLI is not installed or not on this node's PATH. Install it, or set ANTIGRAVITY_CLI_COMMAND, then try again." } });
    expect(String(error)).not.toContain("private-token");
  });

  it("accepts a compatible CLI and returns dynamic model slugs", async () => {
    const { listAntigravityModels } = await capability("ready");
    await expect(listAntigravityModels()).resolves.toEqual([{ id: "gemini-test", name: "Gemini Test" }]);
    const { AntigravityModelCatalog } = await import("../../../src/llm-management/services/antigravity-model-catalog.js");
    await expect(new AntigravityModelCatalog().listModels()).resolves.toEqual([
      expect.objectContaining({ model_identifier: "gemini-test", display_name: "Gemini Test" }),
    ]);
  });

  it.each(["1.2.10", "1.2.11", "1.2.12", "99.0.0", "unparseable release", ""])(
    "ignores release text %j and never requests --version", async (version) => {
      const { listAntigravityModels } = await capability("ready");
      vi.stubEnv("AGY_FAKE_VERSION", version);
      await expect(listAntigravityModels()).resolves.toEqual([{ id: "gemini-test", name: "Gemini Test" }]);
      expect(await readFile(path.join(directory, "commands.log"), "utf8")).toBe("--help\nmodels\n");
    },
  );

  it("accepts required help flags on stderr", async () => {
    const { listAntigravityModels } = await capability("stderr-help");
    await expect(listAntigravityModels()).resolves.toHaveLength(1);
  });

  it("enables AGY availability using capabilities rather than release text", async () => {
    await capability("ready");
    vi.stubEnv("AGY_FAKE_VERSION", "future release");
    const { getRuntimeAvailabilityService } = await import("../../../src/runtime-management/runtime-availability-service.js");
    const { RuntimeKind } = await import("../../../src/runtime-management/runtime-kind-enum.js");
    await expect(getRuntimeAvailabilityService().getRuntimeAvailability(RuntimeKind.ANTIGRAVITY_CLI))
      .resolves.toMatchObject({ enabled: true, reason: null });
  });

  it("makes AGY runtime availability await discovery and report only a safe failure", async () => {
    await capability("failed-models");
    const { getRuntimeAvailabilityService } = await import("../../../src/runtime-management/runtime-availability-service.js");
    const { RuntimeKind } = await import("../../../src/runtime-management/runtime-kind-enum.js");
    const availability = await getRuntimeAvailabilityService().getRuntimeAvailability(RuntimeKind.ANTIGRAVITY_CLI);
    expect(availability).toMatchObject({ enabled: false,
      reason: "Antigravity model discovery failed; check authentication or network and retry." });
    expect(availability.reason).not.toMatch(/secret|private|credential-path|token=abc|agy-fake/);
  });

  it("reports a signed-out CLI as not signed in with the recovery step and no CLI output", async () => {
    await capability("signin-models");
    const { getRuntimeAvailabilityService } = await import("../../../src/runtime-management/runtime-availability-service.js");
    const { RuntimeKind } = await import("../../../src/runtime-management/runtime-kind-enum.js");
    const availability = await getRuntimeAvailabilityService().getRuntimeAvailability(RuntimeKind.ANTIGRAVITY_CLI);
    expect(availability).toMatchObject({ enabled: false,
      reason: "Not signed in on this node. Run `agy` to sign in." });
    expect(availability.reason).not.toMatch(/secret|private|credential-path|token=abc|agy-fake|view available models/);
  });

  it("keeps a successful listing usable even when its output mentions signing in", async () => {
    const { listAntigravityModels } = await capability("signin-wording-success");
    await expect(listAntigravityModels()).resolves.toEqual([{ id: "gemini-test", name: "Gemini Test" }]);
  });

  it("names the update step for a CLI missing required options", async () => {
    const { listAntigravityModels } = await capability("bad-flags");
    await expect(listAntigravityModels()).rejects.toMatchObject({ message:
      "Antigravity CLI is too old for AutoByteus (required options are missing). Run `agy update`, then try again." });
  });

  it.each([
    ["bad-flags", "AGY_CLI_UNSUPPORTED"],
    ["invalid-models", "AGY_MODEL_CATALOG_INVALID"],
    ["failed-models", "AGY_MODEL_DISCOVERY_FAILED"],
    ["signin-models", "AGY_SIGN_IN_REQUIRED"],
    ["signin-models-stdout", "AGY_SIGN_IN_REQUIRED"],
    ["network-models", "AGY_MODEL_DISCOVERY_FAILED"],
    ["empty-models", "AGY_MODEL_CATALOG_INVALID"],
    ["failed-help", "AGY_MODEL_DISCOVERY_FAILED"],
    ["oversized-help", "AGY_MODEL_DISCOVERY_FAILED"],
    ["oversized-help-stderr", "AGY_MODEL_DISCOVERY_FAILED"],
    ["oversized-models", "AGY_MODEL_DISCOVERY_FAILED"],
    ["oversized-models-stderr", "AGY_MODEL_DISCOVERY_FAILED"],
  ])("returns a safe typed diagnostic for %s", async (mode, code) => {
    const { listAntigravityModels } = await capability(mode);
    const error = await listAntigravityModels().catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code } });
    expect(String(error)).not.toMatch(/secret|private|credential-path|token=abc|agy-fake|version|eligibility|proxyconnect/i);
    if (mode === "bad-flags") expect(await readFile(path.join(directory, "commands.log"), "utf8")).toBe("--help\n");
  });

  // e06-delegation-wait-margin REQ-003: without a caller's deadline, `--help` and `--version` get 10 s and `models` 30 s
  // (room for a busy computer); a hung CLI still ends in a sanitized timeout. Only the timers are fake: the CLI is real.
  it.each([
    ["hang-help", "--help", 10_000],
    ["hang-models", "models", 30_000],
  ] as const)("bounds %s (`%s`) at %d ms and returns a sanitized timeout rather than hanging", async (mode, command, bound) => {
    const { listAntigravityModels } = await capability(mode);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let outcome: unknown = "pending";
      void listAntigravityModels().then((value) => { outcome = value; }, (error: unknown) => { outcome = error; });
      await commandStarted(command);
      await vi.advanceTimersByTimeAsync(bound - 1);
      expect(outcome).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(outcome).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
    } finally { vi.useRealTimers(); }
  });

  // autobyteus-576 FU-008 (AC-008): the bound fires after the child has exited but before its close is processed. The
  // probe waits for the close (up to 1 s more of its own timers) and returns the real result, not a time-out.
  it("returns the real result of a `--help` that exited before its bound but whose close comes after it", async () => {
    const { listAntigravityModels } = await capability("exited-help-late-close");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let outcome: unknown = "pending";
      void listAntigravityModels().then((value) => { outcome = value; }, (error: unknown) => { outcome = error; });
      await commandStarted("exited --help");
      await realWait(1_500); // the parent processes the child's exit
      expect(outcome).toBe("pending"); // its stdout is still open
      await vi.advanceTimersByTimeAsync(10_000); // the `--help` bound fires: the child has exited, so no time-out
      expect(outcome).toBe("pending");
      // Real time only (vi.waitFor would advance the faked timers and so the grace): the close comes when the sleep ends.
      const until = performance.now() + 10_000;
      while (outcome === "pending" && performance.now() < until) await realWait(50);
      expect(outcome).toEqual([{ id: "gemini-test", name: "Gemini Test" }]);
    } finally { vi.useRealTimers(); }
  }, 20_000);

  it("times out a `--help` that exited but whose close does not come within the grace, logging the command and bound", async () => {
    const { listAntigravityModels } = await capability("exited-help-late-close");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let outcome: unknown = "pending";
      void listAntigravityModels().then((value) => { outcome = value; }, (error: unknown) => { outcome = error; });
      await commandStarted("exited --help");
      await realWait(1_500);
      await vi.advanceTimersByTimeAsync(10_000 + 999);
      expect(outcome).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(outcome).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
      expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "antigravity", command: `${fakeCli} --help`, boundMs: 10_000 });
    } finally { vi.useRealTimers(); warn.mockRestore(); }
  });

  it("bounds a hung `--version` at 10 s and reads no version", async () => {
    const { readAntigravityCliVersion } = await capability("hang-version");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let outcome: unknown = "pending";
      void readAntigravityCliVersion().then((value) => { outcome = value; });
      await commandStarted("--version");
      await vi.advanceTimersByTimeAsync(9_999);
      expect(outcome).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(outcome).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("shares one step deadline across --help and models: a hanging second command ends by it and is killed (AR-002)", async () => {
    const { listAntigravityModels } = await capability("hang-models");
    const { createReadDeadline } = await import("../../../src/runtime-management/read-deadline.js");
    const pidLog = path.join(directory, "pids.log");
    await writeFile(pidLog, "");
    vi.stubEnv("AGY_FAKE_PID_LOG", pidLog);
    const started = Date.now();
    const error = await listAntigravityModels({ deadline: createReadDeadline(1_500) }).catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
    // Without the deadline `models` alone may run 30 s; with it the whole step ends at 1.5 s.
    expect(Date.now() - started).toBeLessThan(3_000);
    const modelsPid = Number((await readFile(pidLog, "utf8")).split("\n").find((line) => line.startsWith("models "))?.split(" ")[1]);
    expect(modelsPid).toBeGreaterThan(0);
    await vi.waitFor(() => expect(() => process.kill(modelsPid, 0)).toThrow(), { timeout: 2_000 });
  }, 10_000);

  it("starts no command once the step deadline has passed", async () => {
    const { listAntigravityModels } = await capability("ready");
    const { createReadDeadline } = await import("../../../src/runtime-management/read-deadline.js");
    const error = await listAntigravityModels({ deadline: createReadDeadline(0) }).catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
    expect(await readFile(path.join(directory, "commands.log"), "utf8")).toBe("");
  });

  it("keeps a concurrent health request responsive while model discovery waits", async () => {
    const { listAntigravityModels } = await capability("slow-models");
    const server = http.createServer((_request, response) => { response.end("healthy"); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP address");
      let catalogFinished = false;
      const models = listAntigravityModels().finally(() => { catalogFinished = true; });
      const health = await Promise.race([
        fetch(`http://127.0.0.1:${address.port}/rest/health`).then((response) => response.text()),
        new Promise<string>((resolve) => setTimeout(() => resolve("timed out"), 250)),
      ]);
      expect(health).toBe("healthy");
      expect(catalogFinished).toBe(false);
      await expect(models).resolves.toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }, 8_000);
});

describe("AGY compaction detection version gate", () => {
  it.each([
    ["1.2.16", true], ["1.2.17", true], ["1.3.0", true], ["1.10.0", true], ["2.0.0", true], ["agy version 1.2.16\n", true],
    ["1.2.15", false], ["1.1.99", false], ["0.9.30", false], ["", false], ["garbage", false], [null, false],
    // SemVer precedence: a prerelease of the minimum is below it.
    ["1.2.16-rc.1", false], ["1.2.17-rc.1", true],
  ] as const)("treats CLI version %j as supported=%s", async (version, expected) => {
    const { isAgyCompactionDetectionSupported } = await capability("ok");
    expect(isAgyCompactionDetectionSupported(version)).toBe(expected);
  });

  it("reads the trimmed `agy --version` output once per process", async () => {
    vi.stubEnv("AGY_FAKE_VERSION_OUTPUT", "1.2.16\n");
    const { readAntigravityCliVersion } = await capability("ok");
    await expect(readAntigravityCliVersion()).resolves.toBe("1.2.16");
    await expect(readAntigravityCliVersion()).resolves.toBe("1.2.16");
    const commands = (await readFile(path.join(directory, "commands.log"), "utf8")).split("\n").filter(Boolean);
    expect(commands).toEqual(["--version"]);
  });

  it("returns null for an unreadable version without caching the failure", async () => {
    const { readAntigravityCliVersion } = await capability("ok");
    await expect(readAntigravityCliVersion()).resolves.toBeNull();
    vi.stubEnv("AGY_FAKE_VERSION_OUTPUT", "1.2.16");
    await expect(readAntigravityCliVersion()).resolves.toBe("1.2.16");
  });

  it("returns null when the CLI is missing", async () => {
    vi.stubEnv("ANTIGRAVITY_CLI_COMMAND", path.join(directory, "missing-cli"));
    vi.resetModules();
    const { readAntigravityCliVersion } = await import("../../../src/runtime-management/antigravity-cli-capability.js");
    await expect(readAntigravityCliVersion()).resolves.toBeNull();
  });
});
