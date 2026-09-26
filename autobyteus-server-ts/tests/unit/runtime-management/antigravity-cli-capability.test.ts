import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import http from "node:http";

let directory: string;
let fakeCli: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "agy-discovery-unit-"));
  fakeCli = path.join(directory, "agy-fake");
  await writeFile(fakeCli, `#!/usr/bin/env node
const mode = process.env.AGY_FAKE_MODE;
const arg = process.argv[2];
if (arg === '--version') {
  if (mode === 'hang-version') { setInterval(() => {}, 1000); }
  else if (mode === 'oversized-version') process.stdout.write('x'.repeat(70 * 1024));
  else process.stdout.write(mode === 'bad-version' ? 'agy version 1.2.10\\n' : 'agy version 1.2.11\\n');
} else if (arg === '--help') {
  process.stdout.write(mode === 'bad-flags' ? '--agent\\n' : '--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n');
} else if (arg === 'models') {
  if (mode === 'failed-models') { process.stderr.write('secret /private/credential-path token=abc'); process.exitCode = 8; }
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
  vi.resetModules();
  return import("../../../src/runtime-management/antigravity-cli-capability.js");
};

describe("bounded AGY CLI discovery", () => {
  it("classifies a missing CLI without exposing its configured path", async () => {
    vi.stubEnv("ANTIGRAVITY_CLI_COMMAND", path.join(directory, "private-token-missing-cli"));
    vi.resetModules();
    const { probeAntigravityCli } = await import("../../../src/runtime-management/antigravity-cli-capability.js");
    const probe = await probeAntigravityCli();
    expect(probe).toMatchObject({ available: false, diagnostic: { code: "AGY_CLI_UNAVAILABLE" } });
    expect(probe.reason).not.toContain("private-token");
  });

  it("accepts a compatible CLI and returns dynamic model slugs", async () => {
    const { probeAntigravityCli, listAntigravityModels } = await capability("ready");
    await expect(probeAntigravityCli()).resolves.toMatchObject({ available: true, reason: null });
    await expect(listAntigravityModels()).resolves.toEqual([{ id: "gemini-test", name: "Gemini Test" }]);
    const { AntigravityModelCatalog } = await import("../../../src/llm-management/services/antigravity-model-catalog.js");
    await expect(new AntigravityModelCatalog().listModels()).resolves.toEqual([
      expect.objectContaining({ model_identifier: "gemini-test", display_name: "Gemini Test" }),
    ]);
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
    ["bad-version", "AGY_CLI_UNSUPPORTED"],
    ["bad-flags", "AGY_CLI_UNSUPPORTED"],
    ["invalid-models", "AGY_MODEL_CATALOG_INVALID"],
    ["failed-models", "AGY_MODEL_DISCOVERY_FAILED"],
    ["oversized-version", "AGY_MODEL_DISCOVERY_FAILED"],
  ])("returns a safe typed diagnostic for %s", async (mode, code) => {
    const { listAntigravityModels } = await capability(mode);
    const error = await listAntigravityModels().catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code } });
    expect(String(error)).not.toMatch(/secret|private|credential-path|token=abc|agy-fake/);
  });

  it("bounds a hung child and returns a sanitized timeout rather than hanging", async () => {
    const { listAntigravityModels } = await capability("hang-version");
    const started = Date.now();
    const error = await listAntigravityModels().catch((value: unknown) => value);
    expect(error).toMatchObject({ diagnostic: { code: "AGY_MODEL_DISCOVERY_TIMEOUT" } });
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 8_000);

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
