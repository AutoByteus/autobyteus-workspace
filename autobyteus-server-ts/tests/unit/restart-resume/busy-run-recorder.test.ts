/**
 * autobyteus-285 D2 (REQ-001, AC-001): at shutdown the busy runs held by a root are recorded with their place and
 * version; idle runs and runs without a root are not. The recorder writes only with entries, merges with a record not
 * yet consumed, never deletes, and never throws. Temporary data root only.
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
const standalone = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent", rootRunId });
const team = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_team", rootRunId });

/** Live runs by id with a status; `places` says which root holds each (absent: no root). */
const harness = (runs: Record<string, string>, places: Record<string, { root: RootExecutionIdentity; place: "host" | "member" | "delegated" }>) => ({
  liveRuns: {
    listActiveRuns: () => Object.keys(runs),
    getActiveRun: (id: string) => (runs[id] ? { getStatusSnapshot: () => ({ status: runs[id] }) } : null) as never,
  },
  roots: { placeOf: (id: string) => places[id] ?? null },
});

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "busy-run-recorder-"));
  recordPath = busyRunRecordPath(appDataDir);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appDataDir, { recursive: true, force: true }); });

describe("BusyRunRecorder", () => {
  it("AC-001: records exactly the busy runs a root holds, with place, status and this release", async () => {
    const h = harness(
      { host: "running", child: "initializing", member: "running", idle: "idle", offline: "offline", app: "running" },
      {
        host: { root: standalone("host"), place: "host" },
        child: { root: standalone("host"), place: "delegated" },
        member: { root: team("team-1"), place: "member" },
        idle: { root: team("team-1"), place: "member" },
        offline: { root: standalone("off"), place: "host" },
      },
    );
    await new BusyRunRecorder({ ...h, recordPath, version: () => "1.0.0", now: () => new Date("2026-11-01T10:00:00.000Z") }).record();

    const read = await readBusyRunRecord(recordPath);
    expect(read.kind).toBe("present");
    expect(read.kind === "present" && read.record.entries).toEqual([
      { root: standalone("host"), agentRunId: "host", place: "host", status: "running", recordedAt: "2026-11-01T10:00:00.000Z", version: "1.0.0" },
      { root: standalone("host"), agentRunId: "child", place: "delegated", status: "initializing", recordedAt: "2026-11-01T10:00:00.000Z", version: "1.0.0" },
      { root: team("team-1"), agentRunId: "member", place: "member", status: "running", recordedAt: "2026-11-01T10:00:00.000Z", version: "1.0.0" },
    ]);
  });

  it("with no busy runs writes nothing and never removes a record not yet consumed (AR-005)", async () => {
    const pending: BusyRunEntry = { root: standalone("r"), agentRunId: "r", place: "host", status: "running", recordedAt: "2026-10-31T10:00:00.000Z", version: "0.9.0" };
    await writeBusyRunRecord(recordPath, { entries: [pending] });
    await new BusyRunRecorder({ ...harness({ idle: "idle" }, {}), recordPath, version: () => "1.0.0" }).record();
    const read = await readBusyRunRecord(recordPath);
    expect(read.kind === "present" && read.record.entries).toEqual([pending]);
  });

  it("merges: keeps entries of runs not recorded now (with their own version) and replaces the ones recorded again", async () => {
    const older = (agentRunId: string): BusyRunEntry => ({ root: standalone(agentRunId), agentRunId, place: "host", status: "running", recordedAt: "2026-10-31T10:00:00.000Z", version: "0.9.0" });
    await writeBusyRunRecord(recordPath, { entries: [older("kept"), older("again")] });
    const h = harness({ again: "running" }, { again: { root: standalone("again"), place: "host" } });
    await new BusyRunRecorder({ ...h, recordPath, version: () => "1.0.0", now: () => new Date("2026-11-01T10:00:00.000Z") }).record();
    const read = await readBusyRunRecord(recordPath);
    expect(read.kind === "present" && read.record.entries.map((entry) => [entry.agentRunId, entry.version])).toEqual([["kept", "0.9.0"], ["again", "1.0.0"]]);
  });

  it("replaces an invalid record, and logs it", async () => {
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await fs.writeFile(recordPath, "{ broken");
    const h = harness({ a: "running" }, { a: { root: standalone("a"), place: "host" } });
    await new BusyRunRecorder({ ...h, recordPath, version: () => null }).record();
    const read = await readBusyRunRecord(recordPath);
    expect(read.kind === "present" && read.record.entries.map((entry) => [entry.agentRunId, entry.version])).toEqual([["a", null]]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("previous one was invalid"));
  });

  it("never throws: a failing write is logged", async () => {
    await fs.writeFile(path.join(appDataDir, "restart-resume"), "a file where the folder should be");
    const h = harness({ a: "running" }, { a: { root: standalone("a"), place: "host" } });
    await expect(new BusyRunRecorder({ ...h, recordPath, version: () => "1.0.0" }).record()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not be recorded"));
  });
});
