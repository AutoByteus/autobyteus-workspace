import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdatePass, type UpdatePassDependencies } from "../../../src/update-notifications/services/update-pass.js";
import type { UpdateNotificationKind } from "../../../src/update-notifications/domain/update-notification.js";
import type { AutomationCandidate } from "../../../src/update-notifications/services/update-notification-service.js";
import type { RuntimeUpdateResult, RuntimeUpdateState } from "../../../src/runtime-management/agent-runtimes/agent-runtime-types.js";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const MINUTE = 60_000;
const minutesAgo = (minutes: number): string => new Date(NOW.getTime() - minutes * MINUTE).toISOString();

type Source = { sourceId: string; lastCheckedAt: string | null };
const src = (sourceId: string, lastCheckedAt: string | null): Source => ({ sourceId, lastCheckedAt });
const candidate = (sourceId: string): AutomationCandidate => ({ sourceId, latestRevision: `${sourceId}-new`, fromRevision: `${sourceId}-old` });

/**
 * A pass over fake owners. `log` records every owner call in order (`check:pkg:p1`, `update:skill:s1`, ...).
 * The fakes mark a checked source checked now, as the owners do.
 */
const harness = (options: {
  packages?: Source[]; skills?: Source[]; runtimes?: Source[] | null;
  intervals?: Partial<Record<UpdateNotificationKind, number>>;
  automatic?: Partial<Record<UpdateNotificationKind, boolean>>;
  candidates?: Partial<Record<UpdateNotificationKind, AutomationCandidate[]>>;
  random?: () => number;
  onCall?: (entry: string) => void;
  runUpdate?: (kind: string) => RuntimeUpdateResult;
} = {}) => {
  const log: string[] = [];
  const state = { enabled: true, webBlocked: false, automatic: { ...options.automatic } };
  const call = (entry: string) => { log.push(entry); options.onCall?.(entry); };
  const packages = options.packages ?? [];
  const skills = options.skills ?? [];
  const runtimes = options.runtimes === undefined ? [] : options.runtimes;
  const markChecked = (list: Source[], id: string) => { const entry = list.find((s) => s.sourceId === id); if (entry) entry.lastCheckedAt = NOW.toISOString(); };
  const lists = { packages: vi.fn(async () => structuredClone(packages)), skills: vi.fn(async () => structuredClone(skills)) };
  const notifications = {
    listAutomationCandidates: vi.fn(async (kind: UpdateNotificationKind, _retryMs: number) => options.candidates?.[kind] ?? []),
    recordOutcome: vi.fn(async () => "applied" as const),
    reconcile: vi.fn(async () => []),
  };
  const deps: UpdatePassDependencies = {
    packages: {
      listGitHubSourceUpdateStates: lists.packages as never,
      checkAgentPackageUpdates: (async (ids: string[]) => { call(`check:pkg:${ids[0]}`); markChecked(packages, ids[0]!); return []; }) as never,
      updateAgentPackage: (async (id: string) => { call(`update:pkg:${id}`); if (id.startsWith("bad")) throw new Error(`cannot update ${id}`); }) as never,
    },
    skillSources: {
      listGitHubSourceUpdateStates: lists.skills as never,
      checkGitHubSkillSourceUpdates: (async (ids: string[]) => { call(`check:skill:${ids[0]}`); markChecked(skills, ids[0]!); }) as never,
      updateGitHubSkillSource: (async (id: string) => { call(`update:skill:${id}`); }) as never,
    },
    runtimes: runtimes === null ? null : {
      listUpdateStates: () => runtimes.map((entry): RuntimeUpdateState => ({
        runtimeKind: entry.sourceId as never, checked: entry.lastCheckedAt !== null, installedVersion: "1.0.0", latestVersion: "1.0.0",
        checkFailed: false, lastCheckedAt: entry.lastCheckedAt === null ? null : new Date(entry.lastCheckedAt),
      })),
      checkInBackground: async (kind) => { call(`check:runtime:${kind}`); markChecked(runtimes, kind); },
      runUpdate: async (kind) => { call(`update:runtime:${kind}`); return options.runUpdate?.(kind) ?? { result: "updated", fromVersion: "1", toVersion: "2" }; },
    },
    notifications,
    settings: {
      intervalMinutes: (kind) => options.intervals?.[kind] ?? 30,
      isAutomatic: (kind) => state.automatic[kind] ?? false,
    },
    checks: { isEnabled: () => state.enabled },
    gate: { isBlocked: (family) => family === "web" && state.webBlocked },
    now: () => NOW,
    random: options.random ?? (() => 0),
  };
  return { pass: new UpdatePass(deps), log, state, notifications, lists };
};

afterEach(() => { vi.restoreAllMocks(); });

describe("UpdatePass checks (DS-001, REQ-001..003)", () => {
  it("checks due sources one at a time: packages, skills, runtimes; never-checked and oldest first", async () => {
    const h = harness({
      packages: [src("recent", minutesAgo(10)), src("old", minutesAgo(40)), src("older", minutesAgo(90)), src("never", null), src("garbage", "not a date")],
      skills: [src("s-due", minutesAgo(31)), src("s-fresh", minutesAgo(29))],
      runtimes: [src("codex_app_server", minutesAgo(61)), src("claude_agent_sdk", minutesAgo(59))],
      intervals: { AGENT_RUNTIME: 60 },
    });
    await h.pass.run();
    expect(h.log).toEqual([
      "check:pkg:never", "check:pkg:garbage", "check:pkg:older", "check:pkg:old",
      "check:skill:s-due",
      "check:runtime:codex_app_server",
    ]);
    expect(h.notifications.reconcile).toHaveBeenCalledOnce();
  });

  it("uses each kind's own interval and a per-process spreading delay of at most a fifth of it, capped at 5 minutes", async () => {
    // random 0.5: 30 min -> 2.5 min (cap 5); 15 min -> 1.5 min (a fifth: 3).
    const h = harness({
      packages: [src("p-not-yet", minutesAgo(32)), src("p-due", minutesAgo(32.5))],
      skills: [src("s-not-yet", minutesAgo(16.4)), src("s-due", minutesAgo(16.5))],
      intervals: { AGENT_PACKAGE: 30, SKILL_SOURCE: 15 },
      random: () => 0.5,
    });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:p-due", "check:skill:s-due"]);
  });

  it("a 24-hour interval spreads by at most 5 minutes", async () => {
    const h = harness({
      packages: [src("not-yet", minutesAgo(1440 + 4.9)), src("due", minutesAgo(1440 + 5))],
      intervals: { AGENT_PACKAGE: 1440 }, random: () => 0.9999,
    });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:due"]);
  });

  it("does nothing, not even listing, while Update checks is off; reconciles nothing when nothing ran", async () => {
    const h = harness({ packages: [src("p1", null)], automatic: { AGENT_PACKAGE: true }, candidates: { AGENT_PACKAGE: [candidate("p1")] } });
    h.state.enabled = false;
    await h.pass.run();
    expect(h.log).toEqual([]);
    expect(h.lists.packages).not.toHaveBeenCalled();
    expect(h.notifications.listAutomationCandidates).not.toHaveBeenCalled();
    expect(h.notifications.reconcile).not.toHaveBeenCalled();
  });

  it("stops the GitHub kinds at the source after GitHub's web gate closes; runtimes still run (R-2)", async () => {
    const h = harness({
      packages: [src("p1", null), src("p2", null)], skills: [src("s1", null)], runtimes: [src("codex_app_server", null)],
      onCall: (entry) => { if (entry === "check:pkg:p1") h.state.webBlocked = true; },
    });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:p1", "check:runtime:codex_app_server"]);
  });

  it("stops when Update checks is turned off during the pass", async () => {
    const h = harness({
      packages: [src("p1", null), src("p2", null)], skills: [src("s1", null)],
      onCall: (entry) => { if (entry === "check:pkg:p1") h.state.enabled = false; },
    });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:p1"]);
  });

  it("logs a failing check and goes on with the next source; a failing list skips only that kind", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const h = harness({ packages: [src("p1", null)], skills: [src("s1", null)] });
    h.lists.packages.mockRejectedValueOnce(new Error("registry unreadable"));
    await h.pass.run();
    expect(h.log).toEqual(["check:skill:s1"]);
    expect(warn).toHaveBeenCalledWith("UPDATE_PASS_CHECKS_FAILED:AGENT_PACKAGE", expect.any(Error));
  });

  it("checks no runtime where this node has none (not the desktop's embedded node)", async () => {
    const h = harness({ runtimes: null, automatic: { AGENT_RUNTIME: true } });
    await h.pass.run();
    expect(h.log).toEqual([]);
    expect(h.notifications.listAutomationCandidates).not.toHaveBeenCalledWith("AGENT_RUNTIME", expect.anything());
  });

  it("close() stops the pass before the next source", async () => {
    const h = harness({ packages: [src("p1", null), src("p2", null)], onCall: () => h.pass.close() });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:p1"]);
  });
});

describe("UpdatePass automatic updates (DS-002, REQ-005..009, 021, 022)", () => {
  it("updates nothing for a kind whose switch is off, and does not ask for its candidates", async () => {
    const h = harness({ candidates: { AGENT_PACKAGE: [candidate("p1")] } });
    await h.pass.run();
    expect(h.notifications.listAutomationCandidates).not.toHaveBeenCalled();
    expect(h.log).toEqual([]);
  });

  it("after the checks, updates each candidate through the owner and records the outcome for the record it picked", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const h = harness({
      packages: [src("p-due", null)],
      automatic: { AGENT_PACKAGE: true, SKILL_SOURCE: true },
      intervals: { AGENT_PACKAGE: 45 },
      candidates: { AGENT_PACKAGE: [candidate("p1"), candidate("bad1")], SKILL_SOURCE: [candidate("s1")] },
    });
    await h.pass.run();
    expect(h.log).toEqual(["check:pkg:p-due", "update:pkg:p1", "update:pkg:bad1", "update:skill:s1"]);
    expect(h.notifications.listAutomationCandidates).toHaveBeenCalledWith("AGENT_PACKAGE", 45 * MINUTE);
    expect(h.notifications.recordOutcome.mock.calls).toEqual([
      ["AGENT_PACKAGE", "p1", { outcome: "AUTO_UPDATED", candidateFrom: "p1-old" }],
      ["AGENT_PACKAGE", "bad1", { outcome: "AUTO_FAILED", candidateLatest: "bad1-new", reason: "cannot update bad1" }],
      ["SKILL_SOURCE", "s1", { outcome: "AUTO_UPDATED", candidateFrom: "s1-old" }],
    ]);
    expect(h.notifications.reconcile).toHaveBeenCalledOnce();
  });

  it("stops a kind's updates when its switch is turned off, Update checks is turned off or the web gate closes", async () => {
    for (const stop of [
      (h: ReturnType<typeof harness>) => { h.state.automatic.AGENT_PACKAGE = false; },
      (h: ReturnType<typeof harness>) => { h.state.enabled = false; },
      (h: ReturnType<typeof harness>) => { h.state.webBlocked = true; },
    ]) {
      const h: ReturnType<typeof harness> = harness({
        automatic: { AGENT_PACKAGE: true }, candidates: { AGENT_PACKAGE: [candidate("p1"), candidate("p2")] },
        onCall: (entry) => { if (entry === "update:pkg:p1") stop(h); },
      });
      await h.pass.run();
      expect(h.log).toEqual(["update:pkg:p1"]);
    }
  });

  it("does not start GitHub updates while GitHub asked this node to wait, but updates runtimes", async () => {
    const h = harness({
      automatic: { AGENT_PACKAGE: true, AGENT_RUNTIME: true },
      candidates: { AGENT_PACKAGE: [candidate("p1")], AGENT_RUNTIME: [candidate("codex_app_server")] },
    });
    h.state.webBlocked = true;
    await h.pass.run();
    expect(h.log).toEqual(["update:runtime:codex_app_server"]);
  });

  it("maps a runtime update's result: updated, failed, agents running (waiting), busy or not installed (nothing)", async () => {
    const results: Record<string, RuntimeUpdateResult> = {
      codex_app_server: { result: "updated", fromVersion: "1", toVersion: "2" },
      claude_agent_sdk: { result: "failed", error: "npm ERR! EACCES" },
      antigravity_cli: { result: "refused", reason: "AGENTS_RUNNING", runningAgents: 2 },
      grok_build: { result: "refused", reason: "BUSY", runningAgents: 0 },
      other: { result: "refused", reason: "NOT_INSTALLED", runningAgents: 0 },
    };
    const h = harness({
      automatic: { AGENT_RUNTIME: true },
      candidates: { AGENT_RUNTIME: Object.keys(results).map(candidate) },
      runUpdate: (kind) => results[kind]!,
    });
    await h.pass.run();
    expect(h.notifications.recordOutcome.mock.calls).toEqual([
      ["AGENT_RUNTIME", "codex_app_server", { outcome: "AUTO_UPDATED", candidateFrom: "codex_app_server-old" }],
      ["AGENT_RUNTIME", "claude_agent_sdk", { outcome: "AUTO_FAILED", candidateLatest: "claude_agent_sdk-new", reason: "npm ERR! EACCES" }],
      ["AGENT_RUNTIME", "antigravity_cli", { outcome: "AUTO_WAITING", candidateLatest: "antigravity_cli-new",
        reason: "Update unavailable while 2 agent(s) are running." }],
    ]);
  });

  it("logs a failing candidate list and continues with the next kind", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const h = harness({ automatic: { AGENT_PACKAGE: true, SKILL_SOURCE: true }, candidates: { SKILL_SOURCE: [candidate("s1")] } });
    h.notifications.listAutomationCandidates.mockRejectedValueOnce(new Error("disk"));
    await h.pass.run();
    expect(h.log).toEqual(["update:skill:s1"]);
    expect(warn).toHaveBeenCalledWith("UPDATE_PASS_AUTOMATIC_UPDATES_FAILED:AGENT_PACKAGE", expect.any(Error));
  });
});
