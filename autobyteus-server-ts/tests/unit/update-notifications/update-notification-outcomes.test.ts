import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateNotificationService } from "../../../src/update-notifications/services/update-notification-service.js";
import type { UpdateNotificationRecord, UpdateSourceState } from "../../../src/update-notifications/domain/update-notification.js";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const MINUTE = 60_000;

const pkg = (overrides: Partial<UpdateSourceState> = {}): UpdateSourceState => ({
  sourceId: "p1", displayName: "acme/agents", repositoryUrl: "https://github.com/acme/agents",
  defaultBranch: "main", installedRevision: A, latestRevision: B, lastCheckedAt: "2026-10-20T09:00:00.000Z", ...overrides,
});

const record = (overrides: Partial<UpdateNotificationRecord> = {}): UpdateNotificationRecord => ({
  kind: "AGENT_PACKAGE", sourceId: "p1", latestRevision: B, fromRevision: A,
  foundAt: "2026-10-20T08:00:00.000Z", read: true, handledRevision: null, handledAt: null,
  outcome: null, outcomeReason: null, outcomeAt: null, ...overrides,
});

const NOW = "2026-10-20T10:00:00.000Z";

const harness = (initial: { packages?: UpdateSourceState[]; records?: UpdateNotificationRecord[] } = {}) => {
  let packages = initial.packages ?? [pkg()];
  let records = structuredClone(initial.records ?? []);
  const publish = vi.fn();
  let now = new Date(NOW);
  const service = new UpdateNotificationService({
    sources: [{ kind: "AGENT_PACKAGE", listUpdateStates: () => packages }],
    store: { read: async () => structuredClone(records), write: async (next) => { records = structuredClone(next); } },
    publish,
    now: () => now,
  });
  return {
    service, publish,
    get records() { return records; },
    setPackages(next: UpdateSourceState[]) { packages = next; },
    setNow(next: string) { now = new Date(next); },
  };
};

afterEach(() => { vi.restoreAllMocks(); });

describe("UpdateNotificationService automatic outcomes (DS-008)", () => {
  it("AUTO_UPDATED applies to the handled record the pass picked and makes it unread", async () => {
    const h = harness({ packages: [pkg({ installedRevision: C, latestRevision: C })], records: [record()] });
    expect(await h.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_UPDATED", candidateFrom: A })).toBe("applied");
    expect(h.records).toEqual([record({
      handledRevision: C, handledAt: NOW, read: false, outcome: "AUTO_UPDATED", outcomeAt: NOW,
    })]);
    const [view] = await h.service.listNotifications();
    expect(view).toMatchObject({ state: "HANDLED", outcome: "AUTO_UPDATED", outcomeReason: null, read: false });
  });

  it("AUTO_UPDATED is not applied to a record still waiting, from another revision, or removed", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const waiting = harness({ records: [record()] });
    expect(await waiting.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_UPDATED", candidateFrom: A })).toBe("not_applied");
    expect(waiting.records).toEqual([record()]);

    const replaced = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [record({ fromRevision: C })] });
    expect(await replaced.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_UPDATED", candidateFrom: A })).toBe("not_applied");
    expect(replaced.records[0]?.outcome).toBeNull();

    const removed = harness({ packages: [], records: [record()] });
    expect(await removed.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_UPDATED", candidateFrom: A })).toBe("not_applied");
    expect(console.info).toHaveBeenCalledWith("UPDATE_NOTIFICATIONS_OUTCOME_NOT_APPLIED:AGENT_PACKAGE:p1:AUTO_UPDATED");
  });

  it("AUTO_FAILED applies to the waiting record of that revision; a repeat for the same revision stays read", async () => {
    const h = harness({ records: [record()] });
    expect(await h.service.recordOutcome("AGENT_PACKAGE", "p1",
      { outcome: "AUTO_FAILED", candidateLatest: B, reason: "disk full" })).toBe("applied");
    expect(h.records[0]).toMatchObject({ outcome: "AUTO_FAILED", outcomeReason: "disk full", outcomeAt: NOW, read: false });

    await h.service.markAllRead();
    h.setNow("2026-10-20T11:00:00.000Z");
    await h.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_FAILED", candidateLatest: B, reason: "still full" });
    expect(h.records[0]).toMatchObject({ outcomeReason: "still full", outcomeAt: "2026-10-20T11:00:00.000Z", read: true });
  });

  it("AUTO_FAILED or AUTO_WAITING for a revision that is no longer the waiting one is not applied", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const newer = harness({ records: [record({ latestRevision: C })], packages: [pkg({ latestRevision: C })] });
    expect(await newer.service.recordOutcome("AGENT_PACKAGE", "p1",
      { outcome: "AUTO_FAILED", candidateLatest: B, reason: "x" })).toBe("not_applied");
    const handled = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [record()] });
    expect(await handled.service.recordOutcome("AGENT_PACKAGE", "p1",
      { outcome: "AUTO_WAITING", candidateLatest: B, reason: "x" })).toBe("not_applied");
    expect(handled.records[0]?.outcome).toBeNull();
  });

  it("AUTO_WAITING: the first wait is unread; the identical wait every tick writes and announces nothing", async () => {
    const h = harness({ records: [record()] });
    const report = { outcome: "AUTO_WAITING", candidateLatest: B, reason: "Update unavailable while 2 agent(s) are running." } as const;
    await h.service.recordOutcome("AGENT_PACKAGE", "p1", report);
    expect(h.records[0]).toMatchObject({ outcome: "AUTO_WAITING", read: false });
    expect(h.publish).toHaveBeenCalledOnce();
    h.setNow("2026-10-20T10:01:00.000Z");
    expect(await h.service.recordOutcome("AGENT_PACKAGE", "p1", report)).toBe("applied");
    expect(h.publish).toHaveBeenCalledOnce();
    expect(h.records[0]?.outcomeAt).toBe(NOW);
  });

  it("a wait after a failure (another outcome) makes the record unread again", async () => {
    const h = harness({ records: [record({ outcome: "AUTO_FAILED", outcomeReason: "x", outcomeAt: NOW })] });
    await h.service.recordOutcome("AGENT_PACKAGE", "p1", { outcome: "AUTO_WAITING", candidateLatest: B, reason: "busy" });
    expect(h.records[0]).toMatchObject({ outcome: "AUTO_WAITING", read: false });
  });

  it("a newer revision replaces the record and clears its outcome", async () => {
    const h = harness({ packages: [pkg({ latestRevision: C })], records: [record({ outcome: "AUTO_FAILED", outcomeReason: "x", outcomeAt: NOW })] });
    await h.service.reconcile();
    expect(h.records).toEqual([record({ latestRevision: C, foundAt: NOW, read: false })]);
  });

  it("a manual update after a failure clears the outcome (plain Updated to …)", async () => {
    const h = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })],
      records: [record({ outcome: "AUTO_FAILED", outcomeReason: "x", outcomeAt: NOW })] });
    const [view] = await h.service.reconcile();
    expect(view).toMatchObject({ state: "HANDLED", outcome: null, outcomeReason: null, outcomeAt: null });
  });

  it("keeps an AUTO_UPDATED outcome on the handled record until a newer revision replaces it", async () => {
    const updated = record({ handledRevision: B, handledAt: NOW, outcome: "AUTO_UPDATED", outcomeAt: NOW });
    const h = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [updated] });
    await h.service.reconcile();
    expect(h.records).toEqual([updated]);
  });
});

describe("UpdateNotificationService candidates and reading", () => {
  it("lists the kind's waiting records, except an automatic failure within the retry interval", async () => {
    const h = harness({
      packages: [pkg(), pkg({ sourceId: "p2" }), pkg({ sourceId: "p3" }), pkg({ sourceId: "p4", installedRevision: B, latestRevision: B })],
      records: [
        record(),
        record({ sourceId: "p2", outcome: "AUTO_FAILED", outcomeReason: "x", outcomeAt: "2026-10-20T09:45:00.000Z" }),
        record({ sourceId: "p3", outcome: "AUTO_FAILED", outcomeReason: "x", outcomeAt: "2026-10-20T09:15:00.000Z" }),
        record({ sourceId: "p4", handledRevision: B, handledAt: NOW }),
      ],
    });
    const candidates = await h.service.listAutomationCandidates("AGENT_PACKAGE", 30 * MINUTE);
    expect(candidates).toEqual([
      { sourceId: "p1", latestRevision: B, fromRevision: A },
      { sourceId: "p3", latestRevision: B, fromRevision: A },
    ]);
    expect(await h.service.listAutomationCandidates("SKILL_SOURCE", 30 * MINUTE)).toEqual([]);
  });

  it("a waiting automatic outcome stays a candidate (retried every tick)", async () => {
    const h = harness({ records: [record({ outcome: "AUTO_WAITING", outcomeReason: "busy", outcomeAt: NOW })] });
    expect(await h.service.listAutomationCandidates("AGENT_PACKAGE", 30 * MINUTE)).toHaveLength(1);
  });

  it("markAllRead also marks unread automatic updates read, and leaves other handled records as they are", async () => {
    const h = harness({
      packages: [pkg({ installedRevision: B, latestRevision: B }), pkg({ sourceId: "p2", installedRevision: B, latestRevision: B })],
      records: [
        record({ handledRevision: B, handledAt: NOW, outcome: "AUTO_UPDATED", outcomeAt: NOW, read: false }),
        record({ sourceId: "p2", handledRevision: B, handledAt: NOW, read: false }),
      ],
    });
    await h.service.markAllRead();
    expect(h.records.map((entry) => entry.read)).toEqual([true, false]);
  });
});

describe("UpdateNotificationService runtime source", () => {
  const runtime = (overrides: Partial<UpdateSourceState> = {}): UpdateSourceState => ({
    sourceId: "codex_app_server", displayName: "codex_app_server", repositoryUrl: null, defaultBranch: null,
    installedRevision: "0.49.0", latestRevision: "0.50.0", lastCheckedAt: NOW, ...overrides,
  });

  it("lists runtime records only while a runtime source is attached", async () => {
    const h = harness({ packages: [] });
    h.service.setRuntimeSource({ kind: "AGENT_RUNTIME", listUpdateStates: () => [runtime()] });
    expect(await h.service.reconcile()).toEqual([expect.objectContaining({
      kind: "AGENT_RUNTIME", sourceId: "codex_app_server", name: "codex_app_server", repositoryUrl: null,
      defaultBranch: null, installedRevision: "0.49.0", latestRevision: "0.50.0", state: "WAITING",
    })]);
    h.service.setRuntimeSource(null);
    expect(await h.service.listNotifications()).toEqual([]);
    expect(h.records).toEqual([]);
  });
});
