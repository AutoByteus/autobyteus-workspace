/**
 * autobyteus-646 C-1/C-1b: the run event log (JSONL, sealed at the rotation limit, unreadable lines skipped, other kinds
 * kept and ignored, read newest file first back to a time) and the hub (log first, then the kind's listeners one after
 * another, isolated; publish never throws). Temporary data root only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunEventHub } from "../../../src/run-events/run-event-hub.js";
import { RunEventLog } from "../../../src/run-events/run-event-log.js";
import type { RunEvent } from "../../../src/run-events/run-event-types.js";

let appDataDir: string;
const event = (at: string, agentRunId = "run-1", model = "gpt-6.1-terra"): RunEvent<"usage_limit_reached"> => ({
  at, kind: "usage_limit_reached", agentRunId,
  data: { runtimeKind: "codex_app_server", llmModelIdentifier: model, blockedModels: [model], resetAt: "2026-11-27T09:00:00.000Z" },
});

beforeEach(async () => { appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-events-")); });
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appDataDir, { recursive: true, force: true }); });

describe("RunEventLog", () => {
  it("appends one envelope per line in run-events/events_active.jsonl and reads the kind back", async () => {
    const log = new RunEventLog({ appDataDir });
    await log.append(event("2026-11-25T06:42:41.000Z"));
    const text = await fs.readFile(path.join(appDataDir, "run-events", "events_active.jsonl"), "utf8");
    expect(text.trim().split("\n").map((line) => JSON.parse(line))).toEqual([event("2026-11-25T06:42:41.000Z")]);
    expect(await log.readSince("usage_limit_reached", new Date("2026-11-01T00:00:00Z"))).toEqual([event("2026-11-25T06:42:41.000Z")]);
  });

  it("seals the active file at the limit, reads newest file first and stops at a file older than the time", async () => {
    const log = new RunEventLog({ appDataDir, rotationLimitBytes: 10, now: () => new Date("2026-10-20T00:00:00Z") });
    await log.append(event("2026-10-01T00:00:00.000Z", "old"));
    await log.append(event("2026-11-25T00:00:00.000Z", "new"));
    expect((await fs.readdir(path.join(appDataDir, "run-events"))).sort()).toEqual(["events_000001.jsonl", "events_000002.jsonl"]);
    const read = await log.readSince("usage_limit_reached", new Date("2026-11-01T00:00:00Z"));
    expect(read.map((entry) => entry.agentRunId)).toEqual(["new"]);
  });

  it("R-14: removes sealed files whose last line is past 31 days, at startup and after each seal; the active file stays", async () => {
    let now = new Date("2026-10-10T00:00:00Z");
    const log = new RunEventLog({ appDataDir, rotationLimitBytes: 10, now: () => now });
    await log.append(event("2026-10-01T00:00:00.000Z", "run-old"));
    await log.append(event("2026-11-20T00:00:00.000Z", "run-new"));
    now = new Date("2026-11-25T00:00:00Z");
    await log.append(event("2026-11-24T00:00:00.000Z", "run-newest"));
    expect((await fs.readdir(path.join(appDataDir, "run-events"))).sort()).toEqual(["events_000002.jsonl", "events_000003.jsonl"]);
    now = new Date("2027-01-01T00:00:00Z");
    await fs.writeFile(path.join(appDataDir, "run-events", "events_active.jsonl"), `${JSON.stringify(event("2026-12-31T00:00:00.000Z", "run-active"))}\n`);
    await expect(log.removeExpired()).resolves.toEqual(["events_000002.jsonl", "events_000003.jsonl"]);
    expect(await fs.readdir(path.join(appDataDir, "run-events"))).toEqual(["events_active.jsonl"]);
  });

  it("skips an unreadable line with a warning, and keeps an unknown kind out of a kind's read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await fs.mkdir(path.join(appDataDir, "run-events"), { recursive: true });
    await fs.writeFile(path.join(appDataDir, "run-events", "events_active.jsonl"), [
      "{ not json",
      JSON.stringify({ at: "2026-11-25T00:00:00.000Z", kind: "cost_budget_reached", agentRunId: "run-2", data: { spent: 3 } }),
      JSON.stringify({ ...event("2026-11-25T00:00:01.000Z"), data: { runtimeKind: "codex_app_server" } }),
      JSON.stringify(event("2026-11-25T00:00:02.000Z")),
    ].join("\n") + "\n");
    const read = await new RunEventLog({ appDataDir }).readSince("usage_limit_reached", new Date("2026-11-01T00:00:00Z"));
    expect(read).toEqual([event("2026-11-25T00:00:02.000Z")]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("line 1 is skipped (not valid JSON)"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("line 3 is skipped"));
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("RunEventHub", () => {
  it("logs the event first, then tells the kind's listeners one after another; a failing listener stops nothing", async () => {
    const order: string[] = [];
    const log = { append: vi.fn(async () => { order.push("log"); }) };
    const hub = new RunEventHub({ log });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    hub.subscribe("usage_limit_reached", async () => { order.push("first"); throw new Error("boom"); });
    hub.subscribe("usage_limit_reached", async () => { order.push("second"); });
    await expect(hub.publish(event("2026-11-25T00:00:00.000Z"))).resolves.toBeUndefined();
    expect(order).toEqual(["log", "first", "second"]);
  });

  it("still tells the listeners when the log write fails, and an unsubscribed listener hears nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const hub = new RunEventHub({ log: { append: async () => { throw new Error("disk full"); } } });
    const heard = vi.fn(async () => undefined);
    const gone = vi.fn(async () => undefined);
    hub.subscribe("usage_limit_reached", heard);
    hub.subscribe("usage_limit_reached", gone)();
    await hub.publish(event("2026-11-25T00:00:00.000Z"));
    expect(heard).toHaveBeenCalledOnce();
    expect(gone).not.toHaveBeenCalled();
  });
});
