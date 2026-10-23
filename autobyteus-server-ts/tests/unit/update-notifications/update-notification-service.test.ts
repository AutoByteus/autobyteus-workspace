import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateNotificationService } from "../../../src/update-notifications/services/update-notification-service.js";
import type { UpdateNotificationRecord } from "../../../src/update-notifications/domain/update-notification.js";
import type { GitHubSourceUpdateState } from "../../../src/integrations/github/github-source-update-state.js";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

const pkg = (overrides: Partial<GitHubSourceUpdateState> = {}): GitHubSourceUpdateState => ({
  sourceId: "github:acme/agents", displayName: "acme/agents", repositoryUrl: "https://github.com/acme/agents",
  defaultBranch: "main", installedRevision: A, latestRevision: A, lastCheckedAt: "2026-10-20T09:00:00.000Z", ...overrides,
});

/** A service over in-memory sources and store, with a fixed clock. */
const harness = (initial: { packages?: GitHubSourceUpdateState[]; skills?: GitHubSourceUpdateState[]; records?: UpdateNotificationRecord[] } = {}) => {
  let packages = initial.packages ?? [];
  let skills = initial.skills ?? [];
  let records: UpdateNotificationRecord[] = structuredClone(initial.records ?? []);
  const writes: UpdateNotificationRecord[][] = [];
  const publish = vi.fn();
  let now = new Date("2026-10-20T10:00:00.000Z");
  const service = new UpdateNotificationService({
    sources: [
      { kind: "AGENT_PACKAGE", listUpdateStates: async () => packages },
      { kind: "SKILL_SOURCE", listUpdateStates: () => skills },
    ],
    store: {
      read: async () => structuredClone(records),
      write: async (next) => { records = structuredClone(next); writes.push(structuredClone(next)); },
    },
    publish,
    now: () => now,
  });
  return {
    service, publish, writes,
    get records() { return records; },
    setPackages(next: GitHubSourceUpdateState[]) { packages = next; },
    setSkills(next: GitHubSourceUpdateState[]) { skills = next; },
    setNow(next: string) { now = new Date(next); },
  };
};

const waiting = (overrides: Partial<UpdateNotificationRecord> = {}): UpdateNotificationRecord => ({
  kind: "AGENT_PACKAGE", sourceId: "github:acme/agents", latestRevision: B, fromRevision: A,
  foundAt: "2026-10-20T08:00:00.000Z", read: true, handledRevision: null, handledAt: null,
  outcome: null, outcomeReason: null, outcomeAt: null, ...overrides,
});

describe("UpdateNotificationService reconcile (DS-007)", () => {
  it("creates one waiting, unread record when the known latest differs from installed (REQ-004), and announces it", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B })] });
    const views = await h.service.reconcile();
    expect(views).toEqual([{
      kind: "AGENT_PACKAGE", sourceId: "github:acme/agents", name: "acme/agents", repositoryUrl: "https://github.com/acme/agents",
      defaultBranch: "main", installedRevision: A, latestRevision: B, foundAt: "2026-10-20T10:00:00.000Z", read: false,
      state: "WAITING", handledRevision: null, handledAt: null, outcome: null, outcomeReason: null, outcomeAt: null,
    }]);
    expect(h.publish).toHaveBeenCalledOnce();
    expect(h.writes).toHaveLength(1);
  });

  it("does not persist or announce when nothing changed", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B })], records: [waiting()] });
    await h.service.reconcile();
    expect(h.writes).toHaveLength(0);
    expect(h.publish).not.toHaveBeenCalled();
  });

  it("replaces a waiting record with the newer revision and makes it unread again (REQ-005, AC-008)", async () => {
    const h = harness({ packages: [pkg({ latestRevision: C })], records: [waiting({ read: true })] });
    const [view] = await h.service.reconcile();
    expect(h.records).toHaveLength(1);
    expect(view).toMatchObject({ latestRevision: C, installedRevision: A, read: false, state: "WAITING", foundAt: "2026-10-20T10:00:00.000Z" });
  });

  it("keeps a waiting record after a failed check that kept the known latest (REQ-006, AC-012)", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B, lastCheckedAt: "2026-10-20T09:59:00.000Z" })], records: [waiting()] });
    const [view] = await h.service.reconcile();
    expect(view).toMatchObject({ state: "WAITING", latestRevision: B });
    expect(h.writes).toHaveLength(0);
  });

  it("marks a waiting record handled when the installed revision moved since it was found (REQ-008, AC-011)", async () => {
    const h = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [waiting()] });
    const [view] = await h.service.reconcile();
    expect(view).toMatchObject({ state: "HANDLED", handledRevision: B, handledAt: "2026-10-20T10:00:00.000Z", installedRevision: A, latestRevision: B });
  });

  it("removes a waiting record when nothing was installed and the update is no longer offered (DEC-015)", async () => {
    const h = harness({ packages: [pkg({ installedRevision: A, latestRevision: A })], records: [waiting()] });
    expect(await h.service.reconcile()).toEqual([]);
    expect(h.records).toEqual([]);
  });

  it("deletes the record of a removed source (REQ-008)", async () => {
    const h = harness({ packages: [], records: [waiting()] });
    expect(await h.service.reconcile()).toEqual([]);
    expect(h.records).toEqual([]);
  });

  it("creates no record while the installed revision is unknown, and leaves an existing one as it is", async () => {
    const h = harness({ packages: [pkg({ installedRevision: null, latestRevision: B })] });
    expect(await h.service.reconcile()).toEqual([]);
    const h2 = harness({ packages: [pkg({ installedRevision: null, latestRevision: C })], records: [waiting()] });
    await h2.service.reconcile();
    expect(h2.records).toEqual([waiting()]);
  });

  it("keeps a handled record until a newer revision replaces it with a new waiting one", async () => {
    const handled = waiting({ handledRevision: B, handledAt: "2026-10-20T09:00:00.000Z" });
    const h = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [handled] });
    expect((await h.service.reconcile())[0]).toMatchObject({ state: "HANDLED" });
    h.setPackages([pkg({ installedRevision: B, latestRevision: C })]);
    expect((await h.service.reconcile())[0]).toMatchObject({ state: "WAITING", installedRevision: B, latestRevision: C, read: false });
  });

  it("keeps a never-checked source's waiting record", async () => {
    const h = harness({ packages: [pkg({ latestRevision: null, lastCheckedAt: null })], records: [waiting()] });
    expect(await h.service.reconcile()).toHaveLength(1);
  });

  it("keeps package and skill records apart by kind (compound identity)", async () => {
    const skill = pkg({ sourceId: "github:acme/agents", displayName: "acme/skills", latestRevision: C });
    const h = harness({ packages: [pkg({ latestRevision: B })], skills: [skill] });
    const views = await h.service.reconcile();
    expect(views.map((view) => [view.kind, view.latestRevision])).toEqual([["AGENT_PACKAGE", B], ["SKILL_SOURCE", C]]);
  });

});

/** CR-001: one owner that cannot be listed (an unreadable skill source registry) must not stop the other kinds. */
describe("UpdateNotificationService with an owner that cannot be read", () => {
  const skillRecord = (overrides: Partial<UpdateNotificationRecord> = {}): UpdateNotificationRecord =>
    waiting({ kind: "SKILL_SOURCE", sourceId: "s1", latestRevision: C, ...overrides });

  const harnessWithFailingSkills = (records: UpdateNotificationRecord[], packages: GitHubSourceUpdateState[]) => {
    let stored = structuredClone(records);
    const publish = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = new UpdateNotificationService({
      sources: [
        { kind: "AGENT_PACKAGE", listUpdateStates: async () => packages },
        { kind: "SKILL_SOURCE", listUpdateStates: () => { throw new Error("GitHub skill sources unavailable"); } },
      ],
      store: { read: async () => structuredClone(stored), write: async (next) => { stored = structuredClone(next); } },
      publish,
      now: () => new Date("2026-10-20T10:00:00.000Z"),
    });
    return { service, publish, warn, get stored() { return stored; } };
  };

  afterEach(() => { vi.restoreAllMocks(); });

  it("still reconciles, persists and lists the other kinds, and names the failing owner in a warning", async () => {
    const h = harnessWithFailingSkills([skillRecord()], [pkg({ latestRevision: B })]);
    const views = await h.service.listNotifications();
    expect(views.map((view) => [view.kind, view.sourceId])).toEqual([["AGENT_PACKAGE", "github:acme/agents"]]);
    expect(h.publish).toHaveBeenCalledOnce();
    expect(h.warn).toHaveBeenCalledWith("UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:SKILL_SOURCE", expect.any(Error));
  });

  it("keeps the failing kind's stored records (hidden, not deleted as source gone)", async () => {
    const h = harnessWithFailingSkills([skillRecord(), waiting()], [pkg({ installedRevision: B, latestRevision: B })]);
    await h.service.reconcile();
    expect(h.stored).toEqual([
      skillRecord(),
      waiting({ handledRevision: B, handledAt: "2026-10-20T10:00:00.000Z" }),
    ]);
  });

  it("marks the listed kinds read and clears their handled records; hidden records are not touched", async () => {
    const handledPackage = waiting({ sourceId: "p2", handledRevision: B, handledAt: "2026-10-20T09:00:00.000Z" });
    const h = harnessWithFailingSkills(
      [skillRecord({ read: false }), waiting({ read: false }), handledPackage],
      [pkg({ latestRevision: B }), pkg({ sourceId: "p2", installedRevision: B, latestRevision: B })],
    );
    const read = await h.service.markAllRead();
    expect(read.find((view) => view.sourceId === "github:acme/agents")?.read).toBe(true);
    expect(h.stored.find((record) => record.kind === "SKILL_SOURCE")?.read).toBe(false);

    await h.service.clear("AGENT_PACKAGE", "p2");
    expect(h.stored.map((record) => record.sourceId)).toEqual(["s1", "github:acme/agents"]);
    await expect(h.service.clear("SKILL_SOURCE", "s1")).rejects.toThrow("Update notification not found.");
  });

  it("shows the kind's records again once its owner can be read", async () => {
    let failing = true;
    let stored = [skillRecord()];
    const service = new UpdateNotificationService({
      sources: [{ kind: "SKILL_SOURCE", listUpdateStates: () => {
        if (failing) throw new Error("unavailable");
        return [pkg({ sourceId: "s1", displayName: "acme/skills", latestRevision: C })];
      } }],
      store: { read: async () => structuredClone(stored), write: async (next) => { stored = structuredClone(next); } },
      publish: vi.fn(),
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await service.listNotifications()).toEqual([]);
    failing = false;
    expect((await service.listNotifications()).map((view) => view.sourceId)).toEqual(["s1"]);
  });
});

describe("UpdateNotificationService commands", () => {
  it("markAllRead marks every waiting record read and persists it (REQ-010)", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B })], records: [waiting({ read: false })] });
    const views = await h.service.markAllRead();
    expect(views[0]!.read).toBe(true);
    expect(h.records[0]!.read).toBe(true);
    expect(h.publish).toHaveBeenCalledOnce();
    await h.service.markAllRead();
    expect(h.publish).toHaveBeenCalledOnce();
  });

  it("clear removes a handled record permanently (REQ-009, AC-009)", async () => {
    const handled = waiting({ handledRevision: B, handledAt: "2026-10-20T09:00:00.000Z" });
    const h = harness({ packages: [pkg({ installedRevision: B, latestRevision: B })], records: [handled] });
    expect(await h.service.clear("AGENT_PACKAGE", "github:acme/agents")).toEqual([]);
    expect(h.records).toEqual([]);
    expect(await h.service.listNotifications()).toEqual([]);
  });

  it("clear refuses a waiting or unknown record (no dismiss)", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B })], records: [waiting()] });
    await expect(h.service.clear("AGENT_PACKAGE", "github:acme/agents")).rejects.toThrow("Only an updated notification can be cleared.");
    await expect(h.service.clear("SKILL_SOURCE", "github:acme/agents")).rejects.toThrow("Update notification not found.");
    expect(h.records).toEqual([waiting()]);
  });

  it("runs operations one at a time, so concurrent reconciles never write stale records", async () => {
    const h = harness({ packages: [pkg({ latestRevision: B })] });
    await Promise.all([h.service.reconcile(), h.service.markAllRead(), h.service.reconcile()]);
    expect(h.records).toHaveLength(1);
    expect(h.records[0]!.read).toBe(true);
  });
});
