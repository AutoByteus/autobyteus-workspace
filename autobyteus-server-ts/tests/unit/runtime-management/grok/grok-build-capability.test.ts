import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverGrokBuildModels, probeGrokBuildCli } from "../../../../src/runtime-management/grok/grok-build-capability.js";
import { FAKE_GROK_CLI, fixturePath, readFixture, writeCustomFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const ENV_KEYS = ["GROK_BUILD_COMMAND", "FAKE_GROK_VERSION", "FAKE_GROK_AGENT_HELP", "FAKE_ACP_FIXTURE", "FAKE_ACP_EXIT_AT_END"] as const;
let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const fakeCommand = (): string => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fake-grok-")), "grok");
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

describe("Grok Build capability", () => {
  it("is available for a supported CLI with ACP agent mode (AC-001)", async () => {
    expect(await probeGrokBuildCli()).toEqual({ available: true, diagnostic: null });
  });

  it("reports a missing command safely", async () => {
    process.env.GROK_BUILD_COMMAND = path.join(os.tmpdir(), "definitely-missing-grok-binary");
    const probe = await probeGrokBuildCli();
    expect(probe).toMatchObject({ available: false, diagnostic: { code: "GROK_CLI_UNAVAILABLE" } });
    expect(probe.diagnostic?.message).not.toContain("definitely-missing");
  });

  it("rejects versions below the minimum and CLIs without agent-mode flags", async () => {
    process.env.FAKE_GROK_VERSION = "1.0.40";
    expect((await probeGrokBuildCli()).diagnostic?.code).toBe("GROK_CLI_UNSUPPORTED");
    process.env.FAKE_GROK_VERSION = "1.2.0";
    process.env.FAKE_GROK_AGENT_HELP = "Commands:\n  stdio\n";
    expect((await probeGrokBuildCli()).diagnostic?.code).toBe("GROK_CLI_UNSUPPORTED");
  });

  it("discovers models through an initialize-only handshake (no session, no prompt)", async () => {
    const models = await discoverGrokBuildModels();
    expect(models.map((model) => model.model_identifier)).toEqual(["grok-4.7"]);
  });

  it("classifies an empty catalog and a failed handshake without provider output", async () => {
    const rows = readFixture("handshake").map((row) => row.dir === "in" && row.msg.result?.agentCapabilities
      ? { ...row, msg: { ...row.msg, result: { ...row.msg.result, _meta: {} } } } : row);
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture(rows);
    await expect(discoverGrokBuildModels()).rejects.toMatchObject({ diagnostic: { code: "GROK_MODEL_CATALOG_INVALID" } });
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture([]);
    process.env.FAKE_ACP_EXIT_AT_END = "1";
    await expect(discoverGrokBuildModels()).rejects.toMatchObject({ diagnostic: { code: "GROK_MODEL_DISCOVERY_FAILED" } });
  });
});
