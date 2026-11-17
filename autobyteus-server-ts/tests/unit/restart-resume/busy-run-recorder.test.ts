/**
 * autobyteus-448 DS-001 (REQ-001, REQ-004): the recorder keeps the live list of runs held by a root that are mid-turn
 * or have a running background task, rewriting `busy-runs.json` only on change (removing it when empty); nothing is
 * written before `startSession()`; at a graceful stop the final list (Codex idle runs through their background-task
 * view, bounded) is written with `shutdownAt`. It never throws. Temporary data root only; short check interval.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BusyRunRecorder } from "../../../src/restart-resume/busy-run-recorder.js";
import { busyRunRecordPath, readBusyRunRecord, writeBusyRunRecord, type BusyRunEntry } from "../../../src/restart-resume/busy-run-record.js";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

let appDataDir: string;
let recordPath: string;
const recorders: BusyRunRecorder[] = [];
const standalone = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent", rootRunId });
const team = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_team", rootRunId });

type Run = { status: string; background?: boolean; inspect?: () => Promise<unknown> };

/** Live runs by id; `places` says which root holds each (absent: no root). Mutable between checks. */
const harness = (runs: Record<string, Run>, places: Record<string, { root: RootExecutionIdentity; place: "host" | "member" }>) => ({
  liveRuns: {
    listActiveRuns: () => Object.keys(runs),
    getActiveRun: (id: string) => (runs[id] ? {
      getStatusSnapshot: () => ({ status: runs[id]!.status }),
      hasRunningBackgroundTasks: () => runs[id]!.background === true,
      inspectBackgroundTasks: runs[id]!.inspect ?? (async () => ({ kind: "event-stream", agentRunId: id })),
    } : null) as never,
  },
  roots: { placeOf: (id: string) => places[id] ?? null },
});

let clock = 0;
const recorder = (h: ReturnType<typeof harness>, extra: Partial<ConstructorParameters<typeof BusyRunRecorder>[0]> = {}) => {
  const created = new BusyRunRecorder({ ...h, recordPath, version: () => "1.0.0", intervalMs: 10,
    now: () => new Date(Date.UTC(2026, 10, 17, 10, 0, clock++)), ...extra });
  recorders.push(created);
  return created;
};
const read = async () => {
  const result = await readBusyRunRecord(recordPath);
  return result.kind === "present" ? result.record : result.kind;
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "busy-run-recorder-"));
  recordPath = busyRunRecordPath(appDataDir);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => {
  for (const created of recorders.splice(0)) await created.record();
  vi.restoreAllMocks();
  await fs.rm(appDataDir, { recursive: true, force: true });
});

describe("BusyRunRecorder: the live session", () => {
  it("AC-001/AC-003: records the runs a root holds that are mid-turn or idle with a background task, nothing else", async () => {
    const h = harness(
      { host: { status: "running" }, child: { status: "initializing", background: true }, waiting: { status: "idle", background: true },
        idle: { status: "idle" }, offline: { status: "offline", background: true }, app: { status: "running" }, member: { status: "running" } },
      { host: { root: standalone("host"), place: "host" }, child: { root: standalone("child"), place: "host" },
        waiting: { root: standalone("waiting"), place: "host" }, idle: { root: team("t"), place: "member" },
        offline: { root: standalone("off"), place: "host" }, member: { root: team("t"), place: "member" } },
    );
    recorder(h).startSession();
    await vi.waitFor(async () => expect(await read()).not.toBe("missing"));
    const record = await read();
    expect(record).toMatchObject({ shutdownAt: null });
    expect(typeof record !== "string" && record.entries.map((e) => [e.agentRunId, e.place, e.status, e.backgroundTasks, e.version])).toEqual([
      ["child", "host", "initializing", true, "1.0.0"],
      ["host", "host", "running", false, "1.0.0"],
      ["member", "member", "running", false, "1.0.0"],
      ["waiting", "host", "idle", true, "1.0.0"],
    ]);
  });

  it("rewrites only when the list changes (recordedAt is not a change), and removes the record when the list is empty", async () => {
    const runs: Record<string, Run> = { a: { status: "running" } };
    const h = harness(runs, { a: { root: standalone("a"), place: "host" }, b: { root: standalone("b"), place: "host" } });
    recorder(h).startSession();
    await vi.waitFor(async () => expect(await read()).not.toBe("missing"));
    const first = await read();
    await pause(80); // several checks, same list
    expect(await read()).toEqual(first);

    runs.b = { status: "idle", background: true };
    await vi.waitFor(async () => {
      const record = await read();
      expect(typeof record !== "string" && record.entries.map((e) => e.agentRunId)).toEqual(["a", "b"]);
    });
    delete runs.a; delete runs.b;
    await vi.waitFor(async () => expect(await read()).toBe("missing"));
  });

  it("MP-002: writes nothing before startSession(), so a failed start leaves the previous record untouched", async () => {
    const previous: BusyRunEntry = { root: standalone("r"), agentRunId: "r", place: "host", status: "running", backgroundTasks: false,
      recordedAt: "2026-11-16T10:00:00.000Z", version: "0.9.0" };
    await writeBusyRunRecord(recordPath, { entries: [previous], shutdownAt: null });
    const h = harness({ a: { status: "running" } }, { a: { root: standalone("a"), place: "host" } });
    await recorder(h).record();
    expect(await read()).toEqual({ entries: [previous], shutdownAt: null });
  });
});

describe("BusyRunRecorder: the graceful stop", () => {
  it("writes the final list with shutdownAt and stops checking; with nobody to tell it removes the record", async () => {
    const runs: Record<string, Run> = { a: { status: "running" } };
    const h = harness(runs, { a: { root: standalone("a"), place: "host" } });
    const live = recorder(h);
    live.startSession();
    await vi.waitFor(async () => expect(await read()).not.toBe("missing"));
    await live.record();
    const record = await read();
    expect(typeof record !== "string" && [record.entries.map((e) => e.agentRunId), Number.isNaN(Date.parse(record.shutdownAt ?? ""))]).toEqual([["a"], false]);
    delete runs.a;
    await pause(60);
    expect(await read()).toEqual(record); // no more checks after record()

    const empty = recorder(harness({ idle: { status: "idle" } }, { idle: { root: standalone("idle"), place: "host" } }));
    empty.startSession();
    await empty.record();
    expect(await read()).toBe("missing");
  });

  it("R-2: the final write waits for a check's write in progress, so shutdownAt is never overwritten", async () => {
    const runs: Record<string, Run> = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`r${i}`, { status: "running" }]));
    const places = Object.fromEntries(Object.keys(runs).map((id) => [id, { root: standalone(id), place: "host" as const }]));
    const live = recorder(harness(runs, places), { intervalMs: 1 });
    live.startSession();
    await vi.waitFor(() => expect((live as unknown as { writing: unknown }).writing).not.toBeNull(), { interval: 1 });
    await live.record();
    const record = await read();
    expect(typeof record !== "string" && record.shutdownAt).toEqual(expect.any(String));
  });

  it("REQ-004: an idle Codex run is asked through its background-task view at the stop; one that does not answer in time is left out", async () => {
    const running = { kind: "snapshot", agentRunId: "codex", runInstanceId: "i", observedAt: "t",
      tasks: [{ taskId: "1", kind: "shell", description: "", command: null, status: "running", exitCode: null, startedAt: "t" }] };
    const h = harness({
      codex: { status: "idle", inspect: async () => running },
      done: { status: "idle", inspect: async () => ({ ...running, tasks: [{ ...running.tasks[0], status: "completed" }] }) },
      slow: { status: "idle", inspect: () => new Promise((resolve) => setTimeout(() => resolve(running), 5_000)) },
    }, { codex: { root: standalone("codex"), place: "host" }, done: { root: standalone("done"), place: "host" }, slow: { root: standalone("slow"), place: "host" } });
    const live = recorder(h, { inspectionBudgetMs: 100 });
    live.startSession();
    const started = Date.now();
    await live.record();
    expect(Date.now() - started).toBeLessThan(1_000);
    const record = await read();
    expect(typeof record !== "string" && record.entries.map((e) => [e.agentRunId, e.status, e.backgroundTasks])).toEqual([["codex", "idle", true]]);
  });

  it("never throws: a failing write is logged", async () => {
    await fs.writeFile(path.join(appDataDir, "restart-resume"), "a file where the folder should be");
    const live = recorder(harness({ a: { status: "running" } }, { a: { root: standalone("a"), place: "host" } }));
    live.startSession();
    await pause(40);
    await expect(live.record()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not be recorded"));
  });
});
