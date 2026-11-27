import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SwitchRecord } from "../../../src/model-routing/domain/runtime-switch-types.js";
import { SwitchRecordLog } from "../../../src/model-routing/stores/switch-record-log.js";
import { AgentLaunchHistory } from "../../../src/run-history/services/agent-launch-history.js";

const record = (at: string, agentDefinitionId = "operator", outcome: SwitchRecord["outcome"] = "switched"): SwitchRecord => ({
  at, agentRunId: `run-${at}`, agentDefinitionId,
  from: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" },
  to: outcome === "no_fallback" ? null : { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" },
  chosenBy: outcome === "no_fallback" ? null : "agent_history",
  reason: outcome === "no_fallback" ? null : "most used by this agent in the last 30 days",
  routerFailure: "Model Routing is off", outcome,
});

describe("SwitchRecordLog (C-2)", () => {
  const dirs: string[] = [];
  afterEach(async () => { await Promise.all(dirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))); vi.restoreAllMocks(); });

  it("writes one line per record, exactly the C-2 fields; reads one agent's since a time, most recent first, across sealed files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switch-log-"));
    dirs.push(dir);
    const log = new SwitchRecordLog({ dir, rotationLimitBytes: 600 });
    await log.record(record("2026-10-01T00:00:00.000Z"));
    await log.record(record("2026-11-20T00:00:00.000Z"));
    await log.record(record("2026-11-21T00:00:00.000Z", "writer"));
    await log.record(record("2026-11-25T00:00:00.000Z", "operator", "no_fallback"));
    const names = (await fs.readdir(dir)).sort();
    expect(names.filter((name) => /^switches_\d{6}\.jsonl$/.test(name)).length).toBeGreaterThan(0);
    const first = JSON.parse((await fs.readFile(path.join(dir, names[0]!), "utf8")).split("\n")[0]!);
    expect(Object.keys(first)).toEqual(["at", "agentRunId", "agentDefinitionId", "from", "to", "chosenBy", "reason", "routerFailure", "outcome"]);
    const recent = await log.recentOf("operator", new Date("2026-10-28T00:00:00.000Z"));
    expect(recent.map((entry) => [entry.at, entry.outcome])).toEqual([["2026-11-25T00:00:00.000Z", "no_fallback"], ["2026-11-20T00:00:00.000Z", "switched"]]);
  });

  it("skips an unreadable line with a warning", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "switch-log-"));
    dirs.push(dir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await fs.writeFile(path.join(dir, "switches_active.jsonl"), `${JSON.stringify({ ...record("2026-11-20T00:00:00.000Z"), chosenBy: "history" })}\nnot json\n`
      + `${JSON.stringify(record("2026-11-22T00:00:00.000Z"))}\n`);
    await expect(new SwitchRecordLog({ dir }).recentOf("operator", new Date("2026-11-01T00:00:00.000Z")))
      .resolves.toMatchObject([{ at: "2026-11-22T00:00:00.000Z" }]);
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
      "Model Routing: switch log switches_active.jsonl line 1 is skipped (chosenBy is unknown).",
      "Model Routing: switch log switches_active.jsonl line 2 is skipped (not valid JSON).",
    ]);
  });
});

describe("AgentLaunchHistory (C-8)", () => {
  it("counts one agent's Agent runs and Team members of the last 30 days per runtime and model, most runs first", async () => {
    const history = new AgentLaunchHistory({
      now: () => new Date("2026-11-27T00:00:00.000Z"),
      agentRows: async () => [
        { runId: "a1", agentDefinitionId: "operator", createdAt: "2026-11-20T00:00:00.000Z" },
        { runId: "a2", agentDefinitionId: "operator", createdAt: "2026-11-21T00:00:00.000Z" },
        { runId: "a3", agentDefinitionId: "operator", createdAt: "2026-09-01T00:00:00.000Z" },
        { runId: "a4", agentDefinitionId: "writer", createdAt: "2026-11-21T00:00:00.000Z" },
        { runId: "a5", agentDefinitionId: "operator", createdAt: "2026-11-22T00:00:00.000Z" },
      ],
      agentLaunch: async (runId) => runId === "a5" ? Promise.reject(new Error("unreadable"))
        : { runtimeKind: runId === "a2" ? "claude_agent_sdk" : "codex_app_server", llmModelIdentifier: runId === "a2" ? "opus" : "gpt-sol" },
      teamRows: async () => [{ teamRunId: "t1", createdAt: "2026-11-24T00:00:00.000Z" }, { teamRunId: "t0", createdAt: "2026-10-01T00:00:00.000Z" }],
      teamMembers: async () => [
        { agentDefinitionId: "operator", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" },
        { agentDefinitionId: "writer", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" },
      ],
    });
    await expect(history.launchesOf("operator")).resolves.toEqual([
      { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", runs: 2, lastUsedAt: "2026-11-24T00:00:00.000Z" },
      { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", runs: 1, lastUsedAt: "2026-11-20T00:00:00.000Z" },
    ]);
  });
});
