import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGrokAgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/strategies/grok-agent-runtime-strategy.js";
import { runAcpExtensionRequest } from "../../../../src/runtime-management/acp/acp-discovery-handshake.js";
import { grokBuildLaunchProfile } from "../../../../src/runtime-management/grok/grok-build-launch-profile.js";
import { createReadDeadline } from "../../../../src/runtime-management/read-deadline.js";
import { FAKE_GROK_CLI, readFixture, writeCustomFixture, type FixtureRow } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

/** Grok's `_x.ai/billing` over a short ACP process, against the fake ACP agent (no real Grok, no account). */
const ENV_KEYS = ["GROK_BUILD_COMMAND", "FAKE_ACP_FIXTURE", "FAKE_ACP_RECORD"] as const;
let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const INITIALIZE: FixtureRow[] = readFixture("handshake").slice(0, 2);
const BILLING = JSON.parse(fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname),
  "../../../fixtures/usage-limits/grok-billing.json"), "utf8")) as Record<string, unknown>;

const fakeCommand = (): string => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fake-grok-")), "grok");
  fs.writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GROK_CLI}" "$@"\n`, { mode: 0o755 });
  return file;
};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.GROK_BUILD_COMMAND = fakeCommand();
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
});

describe("Grok usage limits over ACP", () => {
  it("sends initialize then _x.ai/billing, opens no session, and maps the answer (AC-006)", async () => {
    const record = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acp-record-")), "client.jsonl");
    process.env.FAKE_ACP_RECORD = record;
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture([
      ...INITIALIZE,
      { dir: "out", msg: { jsonrpc: "2.0", id: 2, method: "_x.ai/billing", params: {} } },
      { dir: "in", msg: { jsonrpc: "2.0", id: 2, result: BILLING } },
    ]);
    const reading = await createGrokAgentRuntimeStrategy().readUsageLimits("grok", "/w", { deadline: createReadDeadline(15_000) });
    expect(reading).toEqual({
      state: "read",
      limits: [{ name: "Billing period", remainingPercent: null, resetsAt: "2026-10-29T00:00:00.000Z", exhausted: false, appliesTo: { kind: "runtime" } }],
      note: "Grok does not report how much of the period is used.",
    });
    const methods = fs.readFileSync(record, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line).method);
    expect(methods).toEqual(["initialize", "_x.ai/billing"]);
  }, 20_000);

  it("ends a request that never answers at the step deadline", async () => {
    process.env.FAKE_ACP_FIXTURE = writeCustomFixture([
      ...INITIALIZE,
      { dir: "out", msg: { jsonrpc: "2.0", id: 2, method: "_x.ai/billing", params: {} } },
      { dir: "out", msg: { jsonrpc: "2.0", id: 3, method: "never/sent", params: {} } },
    ]);
    const started = Date.now();
    await expect(runAcpExtensionRequest(grokBuildLaunchProfile, "_x.ai/billing", { deadline: createReadDeadline(1_500) }))
      .rejects.toMatchObject({ kind: "timeout" });
    expect(Date.now() - started).toBeLessThan(4_000);
    await expect(createGrokAgentRuntimeStrategy().readUsageLimits("grok", "/w", { deadline: createReadDeadline(1_000) }))
      .resolves.toEqual({ state: "unknown", reason: "Grok usage limits timed out" });
  }, 20_000);
});
