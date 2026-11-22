import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverGrokBuildModels, probeGrokBuildCli } from "../../../../src/runtime-management/grok/grok-build-capability.js";
import { FAKE_GROK_CLI, fixturePath, makeTestTempDir, readFixture, removeTestTempDirs, writeCustomFixture, type FixtureRow } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

// The cases spawn the real fake-CLI wrapper (a shell, then node): a loaded host can exceed the 10 s production bound.
// They pass a long bound; the first case proves a short one still ends in the diagnostic.
const LOADED_HOST = { timeoutMs: 30_000 };
const ENV_KEYS = ["GROK_BUILD_COMMAND", "FAKE_GROK_VERSION", "FAKE_GROK_AGENT_HELP", "FAKE_ACP_FIXTURE", "FAKE_ACP_EXIT_AT_END"] as const;
let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const fakeCommand = (): string => {
  const file = path.join(makeTestTempDir("fake-grok-"), "grok");
  fs.writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GROK_CLI}" "$@"\n`, { mode: 0o755 });
  return file;
};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.GROK_BUILD_COMMAND = fakeCommand();
  process.env.FAKE_ACP_FIXTURE = fixturePath("handshake");
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
});

afterAll(removeTestTempDirs);

describe("Grok Build capability", () => {
  // autobyteus-576 FU-008 (AC-008): a probe that runs past its bound is a time-out, never an unsupported CLI, and the
  // time-out is logged with the command and the bound.
  it("ends a hanging CLI in the time-out diagnostic once the bound passes, logging the command and the bound", async () => {
    const hanging = path.join(makeTestTempDir("hanging-grok-"), "grok");
    fs.writeFileSync(hanging, "#!/bin/sh\nexec sleep 30\n", { mode: 0o755 });
    process.env.GROK_BUILD_COMMAND = hanging;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const startedAt = Date.now();
      expect(await probeGrokBuildCli({ timeoutMs: 100 })).toMatchObject({
        available: false,
        diagnostic: { code: "GROK_MODEL_DISCOVERY_TIMEOUT" },
      });
      expect(Date.now() - startedAt).toBeLessThan(5_000);
      expect(warn).toHaveBeenCalledWith("RUNTIME_PROBE_TIMED_OUT", { runtime: "grok", command: `${hanging} --version`, boundMs: 100 });
    } finally { warn.mockRestore(); }
  });

  // FU-008 (AC-008): `--version` answers and exits at once, but a process it leaves behind holds its stdout, so its close
  // comes after the bound fires. The probe waits for the close and reads the real version: the CLI is supported.
  it("reads the real result of a command that exited before its bound but whose close comes after it", async () => {
    const dir = makeTestTempDir("late-close-grok-");
    const marker = path.join(dir, "exited");
    const late = path.join(dir, "grok");
    fs.writeFileSync(late, `#!/bin/sh\nif [ "$1" = "--version" ]; then\n  echo "grok 1.2.0"\n  sleep 4 &\n  echo exited > "${marker}"\n  exit 0\nfi\nexec "${process.execPath}" "${FAKE_GROK_CLI}" "$@"\n`, { mode: 0o755 });
    process.env.GROK_BUILD_COMMAND = late;
    const realWait = async (ms: number) => {
      const until = performance.now() + ms;
      while (performance.now() < until) await new Promise((resolve) => setImmediate(resolve));
    };
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let outcome: unknown = "pending";
      void probeGrokBuildCli({ timeoutMs: 3_000 }).then((value) => { outcome = value; });
      const started = performance.now();
      while (!fs.existsSync(marker) && performance.now() - started < 10_000) await realWait(20);
      await realWait(1_000); // the parent processes the exit; the stdout stays open for the sleep
      expect(outcome).toBe("pending");
      await vi.advanceTimersByTimeAsync(3_000); // the bound fires after the exit
      expect(outcome).toBe("pending");
      const until = performance.now() + 15_000; // real time only: the close comes when the sleep ends
      while (outcome === "pending" && performance.now() < until) await realWait(50);
      expect(outcome).toEqual({ available: true, diagnostic: null });
    } finally { vi.useRealTimers(); }
  }, 30_000);

  it("is available for a supported CLI with ACP agent mode (AC-001)", async () => {
    expect(await probeGrokBuildCli(LOADED_HOST)).toEqual({ available: true, diagnostic: null });
  });

  it("reports a missing command safely", async () => {
    process.env.GROK_BUILD_COMMAND = path.join(os.tmpdir(), "definitely-missing-grok-binary");
    const probe = await probeGrokBuildCli(LOADED_HOST);
    expect(probe).toMatchObject({ available: false, diagnostic: { code: "GROK_CLI_UNAVAILABLE" } });
    expect(probe.diagnostic?.message).not.toContain("definitely-missing");
  });

  it("rejects versions below the minimum and CLIs without agent-mode flags", async () => {
    process.env.FAKE_GROK_VERSION = "1.0.40";
    expect((await probeGrokBuildCli(LOADED_HOST)).diagnostic?.code).toBe("GROK_CLI_UNSUPPORTED");
    // SemVer precedence: a prerelease of the minimum is below it.
    process.env.FAKE_GROK_VERSION = "1.0.41-rc.1";
    expect((await probeGrokBuildCli(LOADED_HOST)).diagnostic?.code).toBe("GROK_CLI_UNSUPPORTED");
    process.env.FAKE_GROK_VERSION = "1.2.0";
    process.env.FAKE_GROK_AGENT_HELP = "Commands:\n  stdio\n";
    expect((await probeGrokBuildCli(LOADED_HOST)).diagnostic?.code).toBe("GROK_CLI_UNSUPPORTED");
  });

  // autobyteus-551 REQ-002: with a fresh cache Grok announces nothing, so discovery waits the whole 3 s for it (the real
  // window) and keeps the list in Grok's answer.
  it("discovers models through an initialize-only handshake (no session, no prompt), keeping the answer's list when Grok announces none", async () => {
    const started = performance.now();
    const models = await discoverGrokBuildModels(LOADED_HOST);
    expect(models.map((model) => model.model_identifier)).toEqual(["grok-4.7"]);
    expect(performance.now() - started).toBeGreaterThanOrEqual(2_900);
  }, 20_000);

  // autobyteus-551 REQ-002 (AC-003): while its sign-in is expired Grok answers `initialize` with its built-in list and
  // announces xAI's list right after its refresh (`_x.ai/models/update`, P15/P16); discovery offers the announced list,
  // also when the announcement comes before the answer.
  describe("Grok's models announcement", () => {
    const BUILT_IN = { currentModelId: "grok-4.6", availableModels: [
      { modelId: "grok-4.6", name: "Grok 4.6" }, { modelId: "grok-4.5", name: "Grok 4.5" }] };
    const [initializeRequest, initializeAnswer] = readFixture("handshake").slice(0, 2);
    const builtInAnswer = { ...initializeAnswer!, msg: { ...initializeAnswer!.msg, result: { ...initializeAnswer!.msg.result,
      _meta: { ...initializeAnswer!.msg.result._meta, modelState: BUILT_IN } } } };
    const announced = { jsonrpc: "2.0", method: "_x.ai/models/update",
      params: initializeAnswer!.msg.result._meta.modelState as Record<string, unknown> };
    const pause = (ms: number) => ({ dir: "pause", ms }) as unknown as FixtureRow;

    it("offers the announced list over the built-in one in the answer", async () => {
      process.env.FAKE_ACP_FIXTURE = writeCustomFixture([initializeRequest!, builtInAnswer, pause(200), { dir: "in", msg: announced }]);
      const started = performance.now();
      const models = await discoverGrokBuildModels(LOADED_HOST);
      expect(models.map((model) => model.model_identifier)).toEqual(["grok-4.7"]);
      expect(models[0]).toMatchObject({ max_context_tokens: 500000, config_schema: expect.any(Object) });
      expect(performance.now() - started).toBeLessThan(2_900); // the announcement ended the wait
    }, 20_000);

    it("offers the announced list when the announcement comes before the answer", async () => {
      process.env.FAKE_ACP_FIXTURE = writeCustomFixture([initializeRequest!, { dir: "in", msg: announced }, builtInAnswer]);
      const models = await discoverGrokBuildModels(LOADED_HOST);
      expect(models.map((model) => model.model_identifier)).toEqual(["grok-4.7"]);
    }, 20_000);

    it("offers the built-in list when Grok announces nothing", async () => {
      process.env.FAKE_ACP_FIXTURE = writeCustomFixture([initializeRequest!, builtInAnswer]);
      const models = await discoverGrokBuildModels(LOADED_HOST);
      expect(models.map((model) => model.model_identifier)).toEqual(["grok-4.6", "grok-4.5"]);
    }, 20_000);
  });

  it("classifies an empty catalog and a failed handshake without provider output", { timeout: 20_000 }, async () => {
    const rows = readFixture("handshake").map((row) => row.dir === "in" && row.msg.result?.agentCapabilities
      ? { ...row, msg: { ...row.msg, result: { ...row.msg.result, _meta: {} } } } : row);
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture(rows);
    await expect(discoverGrokBuildModels(LOADED_HOST)).rejects.toMatchObject({ diagnostic: { code: "GROK_MODEL_CATALOG_INVALID" } });
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture([]);
    process.env.FAKE_ACP_EXIT_AT_END = "1";
    await expect(discoverGrokBuildModels(LOADED_HOST)).rejects.toMatchObject({ diagnostic: { code: "GROK_MODEL_DISCOVERY_FAILED" } });
  });
});
