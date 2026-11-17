/**
 * autobyteus-448 DS-004 (REQ-002, REQ-005), DEC-002: the restart reminder service keeps each run's pending reminder,
 * persisted until delivered, and hands it to exactly one taker: the run's next input (a preface, either dispatch kind)
 * or the wake's claim. The cause rule and the busy-run record's tolerant reader are covered here too.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestartReminderService } from "../../../src/restart-resume/restart-reminder-service.js";
import {
  readRestartReminderRecord,
  restartReminderRecordPath,
  type PendingRestartReminder,
} from "../../../src/restart-resume/restart-reminder-record.js";
import { restartCauseOf } from "../../../src/restart-resume/restart-cause.js";
import { busyRunRecordPath, readBusyRunRecord } from "../../../src/restart-resume/busy-run-record.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";

let appDataDir: string;
let recordPath: string;
const run = (runId: string) => ({ runId }) as never;
const reminder = (agentRunId: string, overrides: Partial<PendingRestartReminder> = {}): PendingRestartReminder => ({
  root: { rootSubjectKind: "agent", rootRunId: agentRunId }, agentRunId, place: "host",
  cause: "restart", version: "1.5.14", restartedAt: "2026-11-17T22:20:05.000Z", interruptedTurn: false, ...overrides,
});
const stored = async () => {
  const read = await readRestartReminderRecord(recordPath);
  return read.kind === "present" ? read.reminders.map((r) => [r.agentRunId, r.cause, r.interruptedTurn]) : read.kind;
};

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-reminders-"));
  recordPath = restartReminderRecordPath(appDataDir);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 20 }); });

describe("RestartReminderService", () => {
  it("persists added reminders and loads them in a new instance (they survive the next restart until delivered)", async () => {
    await new RestartReminderService({ recordPath }).add([reminder("a"), reminder("b", { cause: "update", interruptedTurn: true })]);
    expect(await stored()).toEqual([["a", "restart", false], ["b", "update", true]]);
    const next = new RestartReminderService({ recordPath });
    const preface = await next.takePreface(run("b"));
    expect(preface).toMatchObject({ presentation: { senderId: RESTART_RESUME_NOTICE_SENDER_ID } });
    expect(preface!.text).toContain("(reason: an update to v1.5.14)");
    expect(preface!.presentation.content).toBe(preface!.text);
  });

  it("a newer restart replaces a run's older reminder and keeps interruptedTurn when either had it", async () => {
    const service = new RestartReminderService({ recordPath });
    await service.add([reminder("a", { cause: "update", interruptedTurn: true })]);
    await service.add([reminder("a", { cause: "unexpected_stop", interruptedTurn: false })]);
    expect(await stored()).toEqual([["a", "unexpected_stop", true]]);
  });

  it("a preface is taken once: delivered removes and saves it, returned makes it pending again (either dispatch kind)", async () => {
    const service = new RestartReminderService({ recordPath });
    await service.add([reminder("a"), reminder("b")]);
    const first = await service.takePreface(run("a"), { dispatchKind: "append_to_active_turn" } as never);
    expect(first).not.toBeNull();
    expect(await service.takePreface(run("a"))).toBeNull(); // in flight
    expect(await service.claim("a")).toBeNull();
    service.prefaceDelivered(run("a"), first!);
    await vi.waitFor(async () => expect(await stored()).toEqual([["b", "restart", false]]));

    const second = await service.takePreface(run("b"), { dispatchKind: "start_turn" } as never);
    service.prefaceReturned(run("b"), second!);
    expect(await service.takePreface(run("b"))).not.toBeNull();
    expect(await service.takePreface(run("none"))).toBeNull();
  });

  it("a claim excludes the preface until settled; returned is pending again, delivered is gone", async () => {
    const service = new RestartReminderService({ recordPath });
    await service.add([reminder("a")]);
    const claim = await service.claim("a");
    expect(claim?.reminder.agentRunId).toBe("a");
    expect(await service.takePreface(run("a"))).toBeNull();
    service.settleClaim(claim!, "returned");
    const again = await service.claim("a");
    service.settleClaim(claim!, "delivered"); // a stale claim changes nothing
    expect(await service.takePreface(run("a"))).toBeNull();
    service.settleClaim(again!, "delivered");
    await vi.waitFor(async () => expect(await stored()).toBe("missing"));
  });

  it("prune drops the pending reminders a run must not get and saves; a failing check is logged, never thrown", async () => {
    const service = new RestartReminderService({ recordPath });
    await service.add([reminder("keep"), reminder("drop")]);
    await service.prune(async (r) => r.agentRunId === "keep");
    expect(await stored()).toEqual([["keep", "restart", false]]);
    await expect(service.prune(async () => { throw new Error("history unreadable"); })).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not be pruned"));
  });

  it("an unreadable reminders file is logged and replaced", async () => {
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await fs.writeFile(recordPath, "{ broken");
    const service = new RestartReminderService({ recordPath });
    expect(await service.takePreface(run("a"))).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("unreadable and are replaced"));
    await service.add([reminder("a")]);
    expect(await stored()).toEqual([["a", "restart", false]]);
  });

  it("add throws when the reminders cannot be saved (the take then keeps the busy-run record)", async () => {
    await fs.writeFile(path.join(appDataDir, "restart-resume"), "a file where the folder should be");
    await expect(new RestartReminderService({ recordPath }).add([reminder("a")])).rejects.toThrow();
  });
});

describe("restartCauseOf (DEC-002)", () => {
  it("update when another release recorded the entry; otherwise restart after a graceful stop, unexpected stop without one", () => {
    expect(restartCauseOf({ version: "1.0.0" }, null, "1.1.0")).toBe("update");
    expect(restartCauseOf({ version: "1.1.0" }, "2026-11-17T22:19:00.000Z", "1.1.0")).toBe("restart");
    expect(restartCauseOf({ version: "1.1.0" }, null, "1.1.0")).toBe("unexpected_stop");
    expect(restartCauseOf({ version: null }, "2026-11-17T22:19:00.000Z", "1.1.0")).toBe("restart");
    expect(restartCauseOf({ version: "1.0.0" }, null, null)).toBe("unexpected_stop");
  });
});

describe("readBusyRunRecord (Directly Usable — No Migration)", () => {
  it("reads a record of the release before autobyteus-448 as mid-turn entries without background tasks and without shutdownAt", async () => {
    const file = busyRunRecordPath(appDataDir);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ entries: [{ root: { rootSubjectKind: "agent", rootRunId: "r" }, agentRunId: "r", place: "host",
      status: "running", recordedAt: "2026-11-16T10:00:00.000Z", version: "1.5.13-beta.8" }] }));
    expect(await readBusyRunRecord(file)).toEqual({ kind: "present", record: { shutdownAt: null, entries: [{
      root: { rootSubjectKind: "agent", rootRunId: "r" }, agentRunId: "r", place: "host", status: "running", backgroundTasks: false,
      recordedAt: "2026-11-16T10:00:00.000Z", version: "1.5.13-beta.8" }] } });
  });
});
