/**
 * autobyteus-448 DS-002/DS-003 (REQ-002 to REQ-005, AC-004) on autobyteus-285 D3: at start the previous session's
 * entries become pending restart reminders (persisted before the record is removed); update entries are woken through
 * their roots, at most 3 posts at a time, each delivering its claimed reminder exactly once. Every run is its own root (autobyteus-461 DS-9): roots
 * are resumed bottom-up along `delegatedFrom` (from the Task entries), and a run's notice lists the resumed runs it
 * delegated to, one hop. Each run is restored without posting, re-checked, then sent a notice it admits only as its first input.
 * Temporary data root; roots and runs are doubles.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RestartResumer, type RootHistoryState } from "../../../src/restart-resume/restart-resumer.js";
import { busyRunRecordPath, writeBusyRunRecord, type BusyRunEntry } from "../../../src/restart-resume/busy-run-record.js";
import { RestartReminderService } from "../../../src/restart-resume/restart-reminder-service.js";
import { readRestartReminderRecord, restartReminderRecordPath } from "../../../src/restart-resume/restart-reminder-record.js";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentRunInputOptions } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

let appDataDir: string;
let recordPath: string;
const agentRoot = (id: string): RootExecutionIdentity => ({ rootSubjectKind: "agent", rootRunId: id });
const teamRoot = (id: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_team", rootRunId: id });
const keyOf = (root: RootExecutionIdentity) => `${root.rootSubjectKind}:${root.rootRunId}`;
const entry = (root: RootExecutionIdentity, agentRunId: string, place: BusyRunEntry["place"], version: string | null = "1.0.0"): BusyRunEntry =>
  ({ root, agentRunId, place, status: "running", backgroundTasks: false, recordedAt: "2026-11-01T09:59:58.000Z", version });
const SHUTDOWN = "2026-11-01T09:59:59.000Z";
/** A graceful previous session (`shutdownAt` set) unless the record says otherwise. */
const writeRecord = (record: { entries: BusyRunEntry[]; shutdownAt?: string | null }) =>
  writeBusyRunRecord(recordPath, { shutdownAt: SHUTDOWN, ...record });
const exists = (target: string) => fs.access(target).then(() => true, () => false);

type Post = { agentRunId: string; via: "host" | "root"; message: AgentInputUserMessage; options: AgentRunInputOptions; inFlight: number };

/** Roots and runs as doubles: every post is recorded with its options and the in-flight count when it started. */
/** `parents`: child root key → the run that delegated to it (its Task entry's `delegatedFrom.delegatingRun`). */
const harness = (options: { current?: string | null; concurrency?: number; postDelayMs?: number; parents?: Record<string, RootExecutionIdentity>; closed?: readonly string[] } = {}) => {
  const live = new Set<string>();
  const history = new Map<string, RootHistoryState>();
  const posts: Post[] = [];
  const refuse = new Map<string, { code: string; message: string }>();
  const published: unknown[] = [];
  const order: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  /** A run instance as AgentRun.publishEvent sees it. */
  const runOf = (runId: string) => ({ runId, publishEvent: vi.fn(async (event: unknown) => { published.push(event); }) });
  const post = async (agentRunId: string, via: Post["via"], message: AgentInputUserMessage, postOptions: AgentRunInputOptions = {}) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    posts.push({ agentRunId, via, message, options: postOptions, inFlight });
    order.push(`post:${agentRunId}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, options.postDelayMs ?? 1));
      const refusal = refuse.get(agentRunId);
      if (refusal) return { accepted: false, ...refusal };
      live.add(agentRunId);
      postOptions.lifecycleObserver?.({ kind: "forwarded", dispatchKind: "start_turn", turnId: `turn-${agentRunId}` });
      return { accepted: true, displayName: `Name ${agentRunId}` };
    } finally { inFlight -= 1; }
  };
  const roots = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  const rootResolver = {
    resolveActive: vi.fn(() => null),
    resolveOrRestore: vi.fn(async (root: RootExecutionIdentity) => {
      if (history.get(keyOf(root)) === "gone") return null;
      order.push(`restore:${keyOf(root)}`);
      const resolved = roots.get(keyOf(root)) ?? {
        ensureHostReady: vi.fn(async () => { order.push(`ready:${root.rootRunId}`); live.add(root.rootRunId); return runOf(root.rootRunId); }),
        postHostUserMessage: vi.fn(async (input: { message: AgentInputUserMessage; postOptions: AgentRunInputOptions }) => {
          const result = await post(root.rootRunId, "host", input.message, input.postOptions);
          return { kind: "posted", run: runOf(root.rootRunId), post: result };
        }),
        executeAgentCommand: vi.fn((id: string, command: { message: AgentInputUserMessage; postOptions?: AgentRunInputOptions }) =>
          post(id, "root", command.message, command.postOptions)),
      };
      roots.set(keyOf(root), resolved);
      return { kind: root.rootSubjectKind, root: resolved } as never;
    }),
  };
  const reminders = new RestartReminderService({ recordPath: restartReminderRecordPath(appDataDir) });
  const resumer = new RestartResumer({
    reminders,
    recordPath,
    version: () => (options.current === undefined ? "1.1.0" : options.current),
    liveRuns: { getActiveRun: (id: string) => (live.has(id) ? runOf(id) : null) as never },
    rootHistory: async (root) => history.get(keyOf(root)) ?? "present",
    rootResolver,
    tree: { parentOf: (run: { agentRunId?: string; teamRunId?: string }) => {
      const parent = options.parents?.["agentRunId" in run ? `agent:${run.agentRunId}` : `agent_team:${run.teamRunId}`];
      return parent ? { delegatingRun: parent, delegatorAgentRunId: parent.rootRunId } : null;
    } } as never,
    now: () => new Date("2026-11-01T10:00:30.000Z"),
    concurrency: options.concurrency,
    closedTasks: { refusal: async (root: RootExecutionIdentity) => options.closed?.includes(root.rootRunId) ? { accepted: false as const, code: "TASK_AGENT_RESOURCE_CLOSED" as const, message: "closed" } : null },
  });
  /** The startup: take the previous session, then (after listening) wake its update entries. */
  const run = async () => resumer.resumeAfterRestart(await resumer.takePreviousSession());
  return { resumer, reminders, run, live, history, posts, refuse, published, order, rootResolver, roots, maxInFlight: () => maxInFlight };
};

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-resumer-"));
  recordPath = busyRunRecordPath(appDataDir);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
// A delivered reminder's save may still be writing when a test ends: the removal retries until it is done.
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 20 }); });

describe("RestartResumer: the record", () => {
  it("does nothing without a record", async () => {
    const h = harness();
    await expect(h.run()).resolves.toEqual({ recorded: 0, reminded: 0, skipped: 0, resumed: 0, failed: 0 });
    expect(h.posts).toEqual([]);
  });

  it("AC-005: logs and removes an unreadable or invalid record, resumes nothing and never throws", async () => {
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    for (const content of ["{ not json", JSON.stringify({ entries: [{ agentRunId: "x" }] })]) {
      await fs.writeFile(recordPath, content);
      const h = harness();
      await expect(h.run()).resolves.toMatchObject({ resumed: 0 });
      expect(h.posts).toEqual([]);
      expect(await exists(recordPath)).toBe(false);
    }
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("was invalid and is removed"));
  });

  it("DEC-001 B: entries of a graceful restart or an unexpected stop become reminders for the next input; nothing is woken", async () => {
    await writeRecord({ entries: [entry(agentRoot("a"), "a", "host", "1.1.0"), { ...entry(agentRoot("b"), "b", "host", null), status: "idle", backgroundTasks: true }] });
    const h = harness({ current: "1.1.0" });
    await expect(h.run()).resolves.toMatchObject({ recorded: 2, reminded: 2, resumed: 0 });
    expect(h.posts).toEqual([]);
    expect(h.rootResolver.resolveOrRestore).not.toHaveBeenCalled();
    expect(await exists(recordPath)).toBe(false);
    const stored = await readRestartReminderRecord(restartReminderRecordPath(appDataDir));
    expect(stored.kind === "present" && stored.reminders.map((r) => [r.agentRunId, r.cause, r.interruptedTurn, r.version])).toEqual([
      ["a", "restart", true, "1.1.0"], ["b", "restart", false, "1.1.0"]]);
  });

  it("DEC-002: a record without shutdownAt (the previous session crashed) gives the cause unexpected_stop; another release gives update", async () => {
    await writeRecord({ entries: [entry(agentRoot("a"), "a", "host", "1.1.0"), entry(agentRoot("u"), "u", "host", "1.0.0")], shutdownAt: null });
    const h = harness({ current: "1.1.0" });
    await expect(h.run()).resolves.toMatchObject({ recorded: 2, reminded: 1, resumed: 1 });
    expect(h.posts.map((post) => post.agentRunId)).toEqual(["u"]);
    const preface = await h.reminders.takePreface({ runId: "a" } as never);
    expect(preface?.text).toContain("(reason: an unexpected stop (a crash, a forced quit or a power loss)).");
  });

  it("a server without a release stamp wakes nothing; its runs are told with their next input", async () => {
    await writeRecord({ entries: [entry(agentRoot("a"), "a", "host", "1.0.0")] });
    const h = harness({ current: null });
    await expect(h.run()).resolves.toMatchObject({ reminded: 1, resumed: 0 });
    expect(h.posts).toEqual([]);
    expect((await h.reminders.takePreface({ runId: "a" } as never))?.text).toContain("(reason: a restart)");
  });

  it("REQ-005: the reminders are saved before the record is removed; a crash during the wake loses no reminder and wakes nothing twice", async () => {
    await writeRecord({ entries: [entry(agentRoot("a"), "a", "host")] });
    const h = harness();
    let existedAtRestore: boolean | null = null;
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => {
      existedAtRestore = await exists(recordPath);
      throw new Error("server crashed mid-resume");
    });
    await h.run();
    expect(existedAtRestore).toBe(false);
    // The next start: no record to wake from; the reminder is still pending for the run's next input.
    const again = harness();
    await again.run();
    expect(again.posts).toEqual([]);
    expect((await again.reminders.takePreface({ runId: "a" } as never))?.text).toContain("an update to v1.1.0");
  });

  it("R-6: when the reminders cannot be saved, the record is kept and nothing is woken", async () => {
    await writeRecord({ entries: [entry(agentRoot("a"), "a", "host")] });
    const h = harness();
    vi.spyOn(h.reminders, "add").mockRejectedValueOnce(new Error("EACCES"));
    await expect(h.run()).resolves.toMatchObject({ recorded: 0, resumed: 0 });
    expect(h.posts).toEqual([]);
    expect(await exists(recordPath)).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not be saved; the busy-run record is kept"));
  });

  it("REQ-005: at the take, a run whose Task is closed or whose root is archived, terminated or gone gets no reminder", async () => {
    await writeRecord({ entries: ["closed", "archived", "terminated", "gone", "ok"].map((id) => ({ ...entry(agentRoot(id), id, "host", "1.1.0") })) });
    const h = harness({ current: "1.1.0", closed: ["closed"] });
    h.history.set("agent:archived", "archived");
    h.history.set("agent:terminated", "terminated");
    h.history.set("agent:gone", "gone");
    await h.run();
    const stored = await readRestartReminderRecord(restartReminderRecordPath(appDataDir));
    expect(stored.kind === "present" && stored.reminders.map((r) => r.agentRunId)).toEqual(["ok"]);
  });
});

describe("RestartResumer: each reminder delivered exactly once (REQ-005, DS-003/DS-004)", () => {
  it("input first: the next input carries the reminder, the wake finds nothing to claim and posts nothing", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host")] });
    const h = harness();
    const previous = await h.resumer.takePreviousSession();
    const preface = await h.reminders.takePreface({ runId: "host-1" } as never);
    expect(preface?.text).toContain("Your previous turn was interrupted");
    h.reminders.prefaceDelivered({ runId: "host-1" } as never, preface!);
    await expect(h.resumer.resumeAfterRestart(previous)).resolves.toMatchObject({ resumed: 0, skipped: 1 });
    expect(h.posts).toEqual([]);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("its next input carried the reminder"));
    // Delivered: removed, and saved (the save follows the settle).
    await vi.waitFor(async () => expect(await readRestartReminderRecord(restartReminderRecordPath(appDataDir))).toEqual({ kind: "missing" }));
  });

  it("wake first, input arriving during the post: that input carries none; the refused wake returns it and the next input carries it", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host")] });
    const h = harness({ postDelayMs: 300 });
    h.refuse.set("host-1", { code: "AGENT_RUN_INPUT_NOT_FIRST", message: "AgentRun already had input." });
    const waking = h.run();
    await vi.waitFor(() => expect(h.posts).toHaveLength(1), { interval: 2 });
    expect(await h.reminders.takePreface({ runId: "host-1" } as never)).toBeNull();
    await expect(waking).resolves.toMatchObject({ resumed: 0, skipped: 1 });
    const later = await h.reminders.takePreface({ runId: "host-1" } as never);
    expect(later?.text).toBe(h.posts[0]!.message.content);
  });

  it("a delivered wake removes the reminder; a failed post returns it", async () => {
    await writeRecord({ entries: [entry(agentRoot("ok"), "ok", "host"), entry(agentRoot("broken"), "broken", "host")] });
    const h = harness();
    h.refuse.set("broken", { code: "RUNTIME_COMMAND_FAILED", message: "provider down" });
    await expect(h.run()).resolves.toMatchObject({ resumed: 1, failed: 1 });
    expect(await h.reminders.takePreface({ runId: "ok" } as never)).toBeNull();
    expect(await h.reminders.takePreface({ runId: "broken" } as never)).not.toBeNull();
    await vi.waitFor(async () => {
      const stored = await readRestartReminderRecord(restartReminderRecordPath(appDataDir));
      expect(stored.kind === "present" && stored.reminders.map((r) => r.agentRunId)).toEqual(["broken"]);
    });
  });
});

describe("RestartResumer: restore, re-check, post a first-input-only notice", () => {
  it("DS-15: a run whose Task is closed is not restored and gets no notice; the others are resumed", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(agentRoot("copy-1"), "copy-1", "host"),
      entry(teamRoot("team-1"), "worker-1", "member")] });
    const h = harness({ closed: ["copy-1", "team-1"] });

    await expect(h.run()).resolves.toEqual({ recorded: 3, reminded: 0, skipped: 2, resumed: 1, failed: 0 });
    expect(h.posts.map((post) => post.agentRunId)).toEqual(["host-1"]);
    expect(h.rootResolver.resolveOrRestore.mock.calls.map(([root]) => (root as RootExecutionIdentity).rootRunId)).toEqual(["host-1"]);
    expect(h.order.filter((step) => step.includes("copy-1") || step.includes("team-1") || step.includes("worker-1"))).toEqual([]);
  });

  it("AC-002: restores each run through its root, then posts one notice that only its first input may be", async () => {
    await writeRecord({ entries: [
      entry(agentRoot("host-1"), "host-1", "host"),
      entry(teamRoot("team-1"), "worker-1", "member"),
      entry(agentRoot("copy-1"), "copy-1", "host"),
    ] });
    const h = harness();

    await expect(h.run()).resolves.toEqual({ recorded: 3, reminded: 0, skipped: 0, resumed: 3, failed: 0 });

    expect(h.posts.map((post) => [post.agentRunId, post.via]).sort()).toEqual([["copy-1", "host"], ["host-1", "host"], ["worker-1", "root"]]);
    for (const post of h.posts) {
      expect(post.options.onlyAsFirstInput).toBe(true);
      expect(post.message.senderType).toBe(SenderType.SYSTEM);
      expect(post.message.metadata.sender_id).toBe(RESTART_RESUME_NOTICE_SENDER_ID);
      expect(post.message.content).toContain("(reason: an update to v1.1.0)");
    }
    // The host is made ready before the post; nothing is posted by the restore itself.
    expect(h.order.indexOf("ready:host-1")).toBeLessThan(h.order.indexOf("post:host-1"));
    expect(h.roots.get("agent_team:team-1")!.executeAgentCommand).toHaveBeenCalledWith("worker-1", expect.objectContaining({ kind: "post_message" }));
  });

  it("D4: every place shows the notice as the run's own system notice once the input is forwarded", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker-1", "member")] });
    const h = harness();
    await h.run();
    const noticeOf = (id: string) => h.posts.find((post) => post.agentRunId === id)!.message.content;
    expect(h.published).toEqual(expect.arrayContaining([
      { eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "host-1", statusHint: null,
        payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: noticeOf("host-1"), message_id: expect.stringMatching(/^restart-resume:.*:host-1$/), turn_id: "turn-host-1" } },
      { eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "worker-1", statusHint: null,
        payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: noticeOf("worker-1"), message_id: expect.stringMatching(/^restart-resume:.*:worker-1$/), turn_id: "turn-worker-1" } },
    ]));
    expect(h.published).toHaveLength(2);
  });

  it("AC-003: the pre-filter skips live runs and runs whose root was stopped on purpose, archived or deleted, restoring nothing", async () => {
    await writeRecord({ entries: [
      entry(agentRoot("live"), "live", "host"),
      entry(agentRoot("stopped"), "stopped", "host"),
      entry(teamRoot("archived"), "member", "member"),
      entry(agentRoot("deleted"), "deleted", "host"),
      entry(agentRoot("ok"), "ok", "host"),
    ] });
    const h = harness();
    h.live.add("live");
    h.history.set("agent:stopped", "terminated");
    h.history.set("agent_team:archived", "archived");
    h.history.set("agent:deleted", "gone");

    await expect(h.run()).resolves.toMatchObject({ resumed: 1, skipped: 4, failed: 0 });
    expect(h.posts.map((post) => post.agentRunId)).toEqual(["ok"]);
    expect(h.rootResolver.resolveOrRestore).toHaveBeenCalledTimes(1);
  });

  it("SR-005: a root stopped or archived while it was being restored gets no notice (the re-check after the restore)", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker", "member")] });
    const h = harness();
    const restore = h.rootResolver.resolveOrRestore.getMockImplementation()!;
    h.rootResolver.resolveOrRestore.mockImplementation(async (root: RootExecutionIdentity) => {
      const resolved = await restore(root);
      h.history.set(keyOf(root), root.rootSubjectKind === "agent" ? "archived" : "terminated");
      return resolved;
    });
    await expect(h.run()).resolves.toMatchObject({ resumed: 0, skipped: 2 });
    expect(h.posts).toEqual([]);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("archived (after the restore)"));
  });

  it("SR-005 / F-API-001: input that reached the run first wins; the wake is refused, not counted as resumed, and the reminder waits for the next input", async () => {
    await writeRecord({ entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker", "member")] });
    const h = harness();
    h.refuse.set("host-1", { code: "AGENT_RUN_INPUT_NOT_FIRST", message: "AgentRun already had input." });
    h.refuse.set("worker", { code: "AGENT_RUN_INPUT_NOT_FIRST", message: "AgentRun already had input." });
    await expect(h.run()).resolves.toMatchObject({ resumed: 0, skipped: 2, failed: 0 });
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("skipped host run 'host-1' of agent 'host-1': the run already had input"));
    expect(h.published).toEqual([]);
    expect(await h.reminders.takePreface({ runId: "worker" } as never)).not.toBeNull();
  });

  it("DS-9: resumes a delegated run before the run that delegated to it; its delegator is told only the accepted ones", async () => {
    await writeRecord({ entries: [
      entry(agentRoot("host-1"), "host-1", "host"),
      entry(agentRoot("copy-ok"), "copy-ok", "host"),
      entry(agentRoot("copy-closed"), "copy-closed", "host"),
    ] });
    const h = harness({ parents: { "agent:copy-ok": agentRoot("host-1"), "agent:copy-closed": agentRoot("host-1") } });
    h.refuse.set("copy-closed", { code: "TASK_AGENT_RESOURCE_CLOSED", message: "Task 7 is DONE." });

    await expect(h.run()).resolves.toMatchObject({ resumed: 2, failed: 1 });
    expect(h.posts.map((post) => post.agentRunId).slice(-1)).toEqual(["host-1"]);
    const hostNotice = h.posts.find((post) => post.agentRunId === "host-1")!.message.content;
    expect(hostNotice).toContain("These runs you delegated were resumed too and are working: Name copy-ok (copy-ok).");
    expect(hostNotice).not.toContain("copy-closed");
    expect(h.posts.find((post) => post.agentRunId === "copy-ok")!.message.content).not.toContain("you delegated");
  });

  it("DS-9: every resumed member of a Team is told the runs its team run delegated to; a chain resumes deepest first", async () => {
    await writeRecord({ entries: [
      entry(teamRoot("team-1"), "coordinator", "member"),
      entry(teamRoot("team-1"), "worker", "member"),
      entry(teamRoot("team-copy"), "team-copy-lead", "member"),
      entry(agentRoot("grandchild"), "grandchild", "host"),
    ] });
    const h = harness({ parents: { "agent_team:team-copy": teamRoot("team-1"), "agent:grandchild": teamRoot("team-copy") } });
    await h.run();
    for (const member of ["coordinator", "worker"]) {
      expect(h.posts.find((post) => post.agentRunId === member)!.message.content).toContain("Name team-copy-lead (team-copy-lead)");
    }
    // One hop only: the team run's members are not told of the grandchild; the delegated team is.
    expect(h.posts.find((post) => post.agentRunId === "coordinator")!.message.content).not.toContain("grandchild");
    expect(h.posts.find((post) => post.agentRunId === "team-copy-lead")!.message.content).toContain("Name grandchild (grandchild)");
    const order = h.posts.map((post) => post.agentRunId);
    expect(order.indexOf("grandchild")).toBeLessThan(order.indexOf("team-copy-lead"));
    expect(order.indexOf("team-copy-lead")).toBeLessThan(order.indexOf("coordinator"));
  });

  it("DEC-002: runs at most 3 posts at a time", async () => {
    await writeRecord({ entries: Array.from({ length: 8 }, (_, i) => entry(agentRoot(`r${i}`), `r${i}`, "host")) });
    const h = harness({ postDelayMs: 10 });
    await expect(h.run()).resolves.toMatchObject({ resumed: 8 });
    expect(h.maxInFlight()).toBe(3);
  });

  it("N-7: three runs with delegated runs under the cap of 3 never deadlock (a waiting delegator holds no slot)", async () => {
    await writeRecord({ entries: ["h1", "h2", "h3"].flatMap((host) => [
      entry(agentRoot(host), host, "host"),
      entry(agentRoot(`${host}-copy-a`), `${host}-copy-a`, "host"),
      entry(agentRoot(`${host}-copy-b`), `${host}-copy-b`, "host"),
    ]) });
    const parents = Object.fromEntries(["h1", "h2", "h3"].flatMap((host) => [[`agent:${host}-copy-a`, agentRoot(host)], [`agent:${host}-copy-b`, agentRoot(host)]]));
    const h = harness({ postDelayMs: 10, parents });
    const outcome = await Promise.race([
      h.run(),
      new Promise((resolve) => setTimeout(() => resolve("deadlocked"), 3_000)),
    ]);
    expect(outcome).toMatchObject({ resumed: 9 });
    expect(h.maxInFlight()).toBeLessThanOrEqual(3);
    for (const host of ["h1", "h2", "h3"]) {
      const order = h.posts.map((post) => post.agentRunId);
      expect(order.indexOf(host)).toBeGreaterThan(order.indexOf(`${host}-copy-a`));
      expect(order.indexOf(host)).toBeGreaterThan(order.indexOf(`${host}-copy-b`));
    }
  });

  it("REQ-006: a failed restore, a root not on this node or a refused post is logged and left stopped; the others continue", async () => {
    await writeRecord({ entries: [
      entry(teamRoot("broken"), "member", "member"),
      entry(agentRoot("not-eligible"), "not-eligible", "host"),
      entry(agentRoot("ok"), "ok", "host"),
    ] });
    const h = harness();
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => { throw new Error("TEAM_RUN_STATE_PACKAGE_INVALID: damaged"); });
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => null);

    await expect(h.run()).resolves.toMatchObject({ resumed: 1, failed: 2 });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("damaged"));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not resume host run 'not-eligible'"));
  });
});
