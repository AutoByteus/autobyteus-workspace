import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECK_INTERVAL_MS,
  INITIAL_DELAY_MS,
  TICK_INTERVAL_MS,
  UpdateCheckScheduler,
  type CheckedSourceOwner,
} from "../../../src/update-notifications/services/update-check-scheduler.js";
import type { GitHubSourceUpdateState } from "../../../src/integrations/github/github-source-update-state.js";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const hoursAgo = (hours: number): string => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const state = (sourceId: string, lastCheckedAt: string | null): GitHubSourceUpdateState => ({
  sourceId, displayName: sourceId, repositoryUrl: `https://github.com/acme/${sourceId}`, defaultBranch: "main",
  installedRevision: "a".repeat(40), latestRevision: "a".repeat(40), lastCheckedAt,
});

const owner = (name: string, states: GitHubSourceUpdateState[], checked: string[], onCheck?: (id: string) => void): CheckedSourceOwner => ({
  name,
  listGitHubSourceUpdateStates: () => states,
  check: async (id) => { checked.push(`${name}:${id}`); onCheck?.(id); },
});

describe("UpdateCheckScheduler (DS-006)", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("checks due sources one at a time: packages first, then skills, oldest check first; never-checked first (REQ-001, REQ-002)", async () => {
    const checked: string[] = [];
    const afterPass = vi.fn(async () => undefined);
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => false, afterPass, now: () => NOW,
      owners: [
        owner("pkg", [state("recent", hoursAgo(1)), state("old", hoursAgo(30)), state("older", hoursAgo(40)), state("never", null)], checked),
        owner("skill", [state("s6", hoursAgo(6)), state("s5", hoursAgo(5.9))], checked),
      ],
    });
    await scheduler.runPass();
    expect(checked).toEqual(["pkg:never", "pkg:older", "pkg:old", "skill:s6"]);
    expect(afterPass).toHaveBeenCalledOnce();
  });

  it("makes no check when the setting is off (REQ-013, AC-015)", async () => {
    const checked: string[] = [];
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => false, isRateLimited: () => false, afterPass: async () => undefined, now: () => NOW,
      owners: [owner("pkg", [state("never", null)], checked)],
    });
    await scheduler.runPass();
    expect(checked).toEqual([]);
  });

  it("stops the pass at the source after the gate closes (REQ-003, AC-013)", async () => {
    const checked: string[] = [];
    let limited = false;
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => limited, afterPass: async () => undefined, now: () => NOW,
      owners: [
        owner("pkg", [state("p1", null), state("p2", null)], checked, () => { limited = true; }),
        owner("skill", [state("s1", null)], checked),
      ],
    });
    await scheduler.runPass();
    expect(checked).toEqual(["pkg:p1"]);
  });

  it("stops the pass when the setting is turned off during it", async () => {
    const checked: string[] = [];
    let enabled = true;
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => enabled, isRateLimited: () => false, afterPass: async () => undefined, now: () => NOW,
      owners: [owner("pkg", [state("p1", null), state("p2", null)], checked, () => { enabled = false; })],
    });
    await scheduler.runPass();
    expect(checked).toEqual(["pkg:p1"]);
  });

  it("makes no request at all while the gate is closed", async () => {
    const list = vi.fn(() => [state("p1", null)]);
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => true, afterPass: async () => undefined, now: () => NOW,
      owners: [{ name: "pkg", listGitHubSourceUpdateStates: list, check: vi.fn() }],
    });
    await scheduler.runPass();
    expect(list).not.toHaveBeenCalled();
  });

  it("logs a failing check and continues with the next source", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const checked: string[] = [];
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => false, afterPass: async () => undefined, now: () => NOW,
      owners: [owner("pkg", [state("p1", null), state("p2", null)], checked, (id) => { if (id === "p1") throw new Error("offline"); })],
    });
    await scheduler.runPass();
    expect(checked).toEqual(["pkg:p1", "pkg:p2"]);
  });

  it("runs the first pass after the initial delay, then every tick, and close() stops further ticks", async () => {
    const checks: string[] = [];
    let lastCheckedAt: string | null = null;
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => false, afterPass: async () => undefined,
      owners: [{
        name: "pkg", listGitHubSourceUpdateStates: () => [state("p1", lastCheckedAt)],
        check: async (id) => { checks.push(id); lastCheckedAt = new Date().toISOString(); },
      }],
    });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(INITIAL_DELAY_MS - 1);
    expect(checks).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(checks).toEqual(["p1"]);
    // Not due again until 6 hours after its check, although the scheduler ticks every 30 minutes.
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS - TICK_INTERVAL_MS);
    expect(checks).toEqual(["p1"]);
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    expect(checks).toEqual(["p1", "p1"]);
    scheduler.close();
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS * 2);
    expect(checks).toEqual(["p1", "p1"]);
  });

  it("checks nothing after a restart within 6 hours of the last check (AC-014)", async () => {
    const checked: string[] = [];
    const scheduler = new UpdateCheckScheduler({
      isEnabled: () => true, isRateLimited: () => false, afterPass: async () => undefined, now: () => NOW,
      owners: [owner("pkg", [state("p1", hoursAgo(1))], checked)],
    });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(INITIAL_DELAY_MS);
    expect(checked).toEqual([]);
    scheduler.close();
  });
});
