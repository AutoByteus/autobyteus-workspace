/**
 * autobyteus-285 D3 (REQ-002 to REQ-006; AC-003 to AC-005; SR-005): after an update restart the recorded runs are
 * resumed once, through their roots, at most 3 posts at a time; a root's delegated runs first, then its host and
 * members. Each run is restored without posting, re-checked, then sent a notice it admits only as its first input.
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
  ({ root, agentRunId, place, status: "running", recordedAt: "2026-11-01T09:59:58.000Z", version });
const exists = (target: string) => fs.access(target).then(() => true, () => false);

type Post = { agentRunId: string; via: "host" | "root"; message: AgentInputUserMessage; options: AgentRunInputOptions; inFlight: number };

/** Roots and runs as doubles: every post is recorded with its options and the in-flight count when it started. */
const harness = (options: { current?: string | null; concurrency?: number; postDelayMs?: number } = {}) => {
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
  const resumer = new RestartResumer({
    recordPath,
    version: () => (options.current === undefined ? "1.1.0" : options.current),
    liveRuns: { getActiveRun: (id: string) => (live.has(id) ? runOf(id) : null) as never },
    rootHistory: async (root) => history.get(keyOf(root)) ?? "present",
    rootResolver,
    now: () => new Date("2026-11-01T10:00:30.000Z"),
    concurrency: options.concurrency,
  });
  return { resumer, live, history, posts, refuse, published, order, rootResolver, roots, maxInFlight: () => maxInFlight };
};

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-resumer-"));
  recordPath = busyRunRecordPath(appDataDir);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appDataDir, { recursive: true, force: true }); });

describe("RestartResumer: the record", () => {
  it("does nothing without a record", async () => {
    const h = harness();
    await expect(h.resumer.resumeAfterUpdate()).resolves.toEqual({ recorded: 0, notUpdate: 0, skipped: 0, resumed: 0, failed: 0 });
    expect(h.posts).toEqual([]);
  });

  it("AC-005: logs and removes an unreadable or invalid record, resumes nothing and never throws", async () => {
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    for (const content of ["{ not json", JSON.stringify({ entries: [{ agentRunId: "x" }] })]) {
      await fs.writeFile(recordPath, content);
      const h = harness();
      await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 0 });
      expect(h.posts).toEqual([]);
      expect(await exists(recordPath)).toBe(false);
    }
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("was invalid and was removed"));
  });

  it("AC-004: a restart that is not an update resumes nothing and discards the record", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("a"), "a", "host", "1.1.0"), entry(agentRoot("b"), "b", "host", null)] });
    const h = harness({ current: "1.1.0" });
    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ recorded: 2, notUpdate: 2, resumed: 0 });
    expect(h.posts).toEqual([]);
    expect(h.rootResolver.resolveOrRestore).not.toHaveBeenCalled();
    expect(await exists(recordPath)).toBe(false);
  });

  it("a server without a release stamp resumes nothing", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("a"), "a", "host", "1.0.0")] });
    const h = harness({ current: null });
    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ notUpdate: 1, resumed: 0 });
    expect(h.posts).toEqual([]);
  });

  it("REQ-005: the record is gone before the first restore, so a crash during resume repeats nothing", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("a"), "a", "host")] });
    const h = harness();
    let existedAtRestore: boolean | null = null;
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => {
      existedAtRestore = await exists(recordPath);
      throw new Error("server crashed mid-resume");
    });
    await h.resumer.resumeAfterUpdate();
    expect(existedAtRestore).toBe(false);
    const again = harness();
    await again.resumer.resumeAfterUpdate();
    expect(again.posts).toEqual([]);
  });
});

describe("RestartResumer: restore, re-check, post a first-input-only notice", () => {
  it("AC-002: restores each run through its root, then posts one notice that only its first input may be", async () => {
    await writeBusyRunRecord(recordPath, { entries: [
      entry(agentRoot("host-1"), "host-1", "host"),
      entry(teamRoot("team-1"), "worker-1", "member"),
      entry(agentRoot("host-2"), "copy-1", "delegated"),
    ] });
    const h = harness();

    await expect(h.resumer.resumeAfterUpdate()).resolves.toEqual({ recorded: 3, notUpdate: 0, skipped: 0, resumed: 3, failed: 0 });

    expect(h.posts.map((post) => [post.agentRunId, post.via]).sort()).toEqual([["copy-1", "root"], ["host-1", "host"], ["worker-1", "root"]]);
    for (const post of h.posts) {
      expect(post.options.onlyAsFirstInput).toBe(true);
      expect(post.message.senderType).toBe(SenderType.SYSTEM);
      expect(post.message.metadata.sender_id).toBe(RESTART_RESUME_NOTICE_SENDER_ID);
      expect(post.message.content).toContain("after an update to 1.1.0");
    }
    // The host is made ready before the post; nothing is posted by the restore itself.
    expect(h.order.indexOf("ready:host-1")).toBeLessThan(h.order.indexOf("post:host-1"));
    expect(h.roots.get("agent_team:team-1")!.executeAgentCommand).toHaveBeenCalledWith("worker-1", expect.objectContaining({ kind: "post_message" }));
  });

  it("D4: every place shows the notice as the run's own system notice once the input is forwarded", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker-1", "member")] });
    const h = harness();
    await h.resumer.resumeAfterUpdate();
    const noticeOf = (id: string) => h.posts.find((post) => post.agentRunId === id)!.message.content;
    expect(h.published).toEqual(expect.arrayContaining([
      { eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "host-1", statusHint: null,
        payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: noticeOf("host-1"), turn_id: "turn-host-1" } },
      { eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: "worker-1", statusHint: null,
        payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: noticeOf("worker-1"), turn_id: "turn-worker-1" } },
    ]));
    expect(h.published).toHaveLength(2);
  });

  it("AC-003: the pre-filter skips live runs and runs whose root was stopped on purpose, archived or deleted, restoring nothing", async () => {
    await writeBusyRunRecord(recordPath, { entries: [
      entry(agentRoot("live"), "live", "host"),
      entry(agentRoot("stopped"), "stopped", "host"),
      entry(teamRoot("archived"), "member", "member"),
      entry(agentRoot("deleted"), "copy", "delegated"),
      entry(agentRoot("ok"), "ok", "host"),
    ] });
    const h = harness();
    h.live.add("live");
    h.history.set("agent:stopped", "terminated");
    h.history.set("agent_team:archived", "archived");
    h.history.set("agent:deleted", "gone");

    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 1, skipped: 4, failed: 0 });
    expect(h.posts.map((post) => post.agentRunId)).toEqual(["ok"]);
    expect(h.rootResolver.resolveOrRestore).toHaveBeenCalledTimes(1);
  });

  it("SR-005: a root stopped or archived while it was being restored gets no notice (the re-check after the restore)", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker", "member")] });
    const h = harness();
    const restore = h.rootResolver.resolveOrRestore.getMockImplementation()!;
    h.rootResolver.resolveOrRestore.mockImplementation(async (root: RootExecutionIdentity) => {
      const resolved = await restore(root);
      h.history.set(keyOf(root), root.rootSubjectKind === "agent" ? "archived" : "terminated");
      return resolved;
    });
    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 0, skipped: 2 });
    expect(h.posts).toEqual([]);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("archived (after the restore)"));
  });

  it("SR-005 / F-API-001: input that reached the run first wins; the notice is refused and not counted as resumed", async () => {
    await writeBusyRunRecord(recordPath, { entries: [entry(agentRoot("host-1"), "host-1", "host"), entry(teamRoot("team-1"), "worker", "member")] });
    const h = harness();
    h.refuse.set("host-1", { code: "AGENT_RUN_INPUT_NOT_FIRST", message: "AgentRun already had input." });
    h.refuse.set("worker", { code: "AGENT_RUN_INPUT_NOT_FIRST", message: "AgentRun already had input." });
    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 0, skipped: 2, failed: 0 });
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("skipped host run 'host-1' of agent 'host-1': the run already had input"));
    expect(h.published).toEqual([]);
  });

  it("AR-003: resumes a root's delegated runs first; its host is told only the accepted ones", async () => {
    await writeBusyRunRecord(recordPath, { entries: [
      entry(agentRoot("host-1"), "host-1", "host"),
      entry(agentRoot("host-1"), "copy-ok", "delegated"),
      entry(agentRoot("host-1"), "copy-closed", "delegated"),
    ] });
    const h = harness();
    h.refuse.set("copy-closed", { code: "TASK_AGENT_RESOURCE_CLOSED", message: "Task 7 is DONE." });

    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 2, failed: 1 });
    expect(h.posts.map((post) => post.agentRunId).slice(-1)).toEqual(["host-1"]);
    const hostNotice = h.posts.find((post) => post.agentRunId === "host-1")!.message.content;
    expect(hostNotice).toContain("These runs you delegated were resumed too and are working: Name copy-ok (copy-ok).");
    expect(hostNotice).not.toContain("copy-closed");
    expect(h.posts.find((post) => post.agentRunId === "copy-ok")!.message.content).not.toContain("you delegated");
  });

  it("tells every resumed member of a Team the delegated runs accepted in its root", async () => {
    await writeBusyRunRecord(recordPath, { entries: [
      entry(teamRoot("team-1"), "coordinator", "member"),
      entry(teamRoot("team-1"), "worker", "member"),
      entry(teamRoot("team-1"), "team-copy", "delegated"),
    ] });
    const h = harness();
    await h.resumer.resumeAfterUpdate();
    for (const member of ["coordinator", "worker"]) {
      expect(h.posts.find((post) => post.agentRunId === member)!.message.content).toContain("Name team-copy (team-copy)");
    }
  });

  it("DEC-002: runs at most 3 posts at a time", async () => {
    await writeBusyRunRecord(recordPath, { entries: Array.from({ length: 8 }, (_, i) => entry(agentRoot(`r${i}`), `r${i}`, "host")) });
    const h = harness({ postDelayMs: 10 });
    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 8 });
    expect(h.maxInFlight()).toBe(3);
  });

  it("N-7: three roots with delegated runs under the cap of 3 never deadlock (a waiting host holds no slot)", async () => {
    await writeBusyRunRecord(recordPath, { entries: ["h1", "h2", "h3"].flatMap((host) => [
      entry(agentRoot(host), host, "host"),
      entry(agentRoot(host), `${host}-copy-a`, "delegated"),
      entry(agentRoot(host), `${host}-copy-b`, "delegated"),
    ]) });
    const h = harness({ postDelayMs: 10 });
    const outcome = await Promise.race([
      h.resumer.resumeAfterUpdate(),
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
    await writeBusyRunRecord(recordPath, { entries: [
      entry(teamRoot("broken"), "member", "member"),
      entry(agentRoot("not-eligible"), "not-eligible", "host"),
      entry(agentRoot("ok"), "ok", "host"),
    ] });
    const h = harness();
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => { throw new Error("TEAM_RUN_STATE_PACKAGE_INVALID: damaged"); });
    h.rootResolver.resolveOrRestore.mockImplementationOnce(async () => null);

    await expect(h.resumer.resumeAfterUpdate()).resolves.toMatchObject({ resumed: 1, failed: 2 });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("damaged"));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("could not resume host run 'not-eligible'"));
  });
});
