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
if (arg === '--version') {
  // Only the compaction-detection probe reads the version; admission (help + models) never does.
  if (process.env.AGY_FAKE_VERSION_OUTPUT === undefined) throw new Error('Version probing must not be used for admission');
  process.stdout.write(process.env.AGY_FAKE_VERSION_OUTPUT);
} else if (arg === '--help') {
  if (mode === 'hang-help') { setInterval(() => {}, 1000); }
  else if (mode === 'oversized-help') process.stdout.write('x'.repeat(70 * 1024));
  else if (mode === 'oversized-help-stderr') process.stderr.write('x'.repeat(70 * 1024));
  else if (mode === 'failed-help') { process.stderr.write('secret /private/credential-path token=abc'); process.exitCode = 8; }
  else {
    const help = (process.env.AGY_FAKE_VERSION ?? 'agy version 1.2.11') + '\\n' +
      (mode === 'bad-flags' ? '--agent\\n' : '--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n');
    (mode === 'stderr-help' ? process.stderr : process.stdout).write(help);
  }
} else if (arg === 'models') {
  if (mode === 'failed-models') { process.stderr.write('secret /private/credential-path token=abc'); process.exitCode = 8; }
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
    expect(error).toMatchObject({ diagnostic: { code: "AGY_CLI_UNAVAILABLE" } });
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

  it.each([
    ["bad-flags", "AGY_CLI_UNSUPPORTED"],
    ["invalid-models", "AGY_MODEL_CATALOG_INVALID"],
    ["failed-models", "AGY_MODEL_DISCOVERY_FAILED"],
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
    expect(String(error)).not.toMatch(/secret|private|credential-path|token=abc|agy-fake|version/i);
    if (mode === "bad-flags") expect(await readFile(path.join(directory, "commands.log"), "utf8")).toBe("--help\n");
  });

  it.each([["hang-help", 5_000], ["hang-models", 17_000]] as const)(
    "bounds %s and returns a sanitized timeout rather than hanging", async (mode, limit) => {
    const { listAntigravityModels } = await capability(mode);
    const started = Date.now();
    const error = await listAntigravityModels().catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
    expect(Date.now() - started).toBeLessThan(limit);
  }, 20_000);

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
