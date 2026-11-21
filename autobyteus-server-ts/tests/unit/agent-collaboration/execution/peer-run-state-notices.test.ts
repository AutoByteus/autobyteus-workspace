import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerRunStateNotices, PEER_NOTICE_RETRY_MS, type PeerNoticeTaskSide } from "../../../../src/agent-collaboration/execution/remote/peer-run-state-notices.js";
import type { RemoteDeliveryReceipt, RemoteStartedRunRef } from "../../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { TaskExecutionReference } from "../../../../src/agent-collaboration/execution/task/task-execution-reference.js";

/**
 * autobyteus-591 DN-1, DN-1b, DN-3, DN-4: what a peer run's node is told of the run's delegation state, in the run's order,
 * owed until confirmed, and retried per peer.
 */

const B = "srv_node_b_000000000000000000000000000";
const C = "srv_node_c_000000000000000000000000000";
const RUN: TaskExecutionReference = { agentRunId: "publisher_r1" };
const TEAM: TaskExecutionReference = { teamRunId: "studio_team_b" };
const keyOf = (run: TaskExecutionReference) => "agentRunId" in run ? `agent:${run.agentRunId}` : `team:${run.teamRunId}`;
const accepted: RemoteDeliveryReceipt = Object.freeze({ accepted: true });
const refused = (code: string): RemoteDeliveryReceipt => ({ accepted: false, code, message: `refused: ${code}` });

type Sent = { nodeId: string; run: RemoteStartedRunRef; open: boolean; answer(receipt: RemoteDeliveryReceipt): void };
const setup = (input: { owedAtStart?: Array<{ run: TaskExecutionReference; nodeId: string }>; channel?: boolean } = {}) => {
  const open = new Map<string, boolean>();
  const owed = new Set<string>();
  const tasks: PeerNoticeTaskSide = {
    isOpen: (run) => open.get(keyOf(run)) ?? false,
    setPeerNoticeOwed: vi.fn(async (run, value) => { if (value) owed.add(keyOf(run)); else owed.delete(keyOf(run)); }),
    owedPeerNotices: () => input.owedAtStart ?? [],
  };
  (input.owedAtStart ?? []).forEach(({ run }) => owed.add(keyOf(run)));
  const sent: Sent[] = [];
  const pending: Sent[] = [];
  const channel = {
    deliveredRunState: vi.fn((nodeId: string, run: RemoteStartedRunRef, state: boolean) => new Promise<RemoteDeliveryReceipt>((resolve) => {
      const entry = { nodeId, run, open: state, answer: resolve };
      sent.push(entry);
      pending.push(entry);
    })),
  };
  const notices = new PeerRunStateNotices({ channel: () => input.channel === false ? null : channel, tasks });
  /** Answers the oldest unanswered notice, then lets the sequence go on. */
  const answer = async (receipt: RemoteDeliveryReceipt = accepted) => { await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0)); pending.shift()!.answer(receipt); };
  return { open, owed, tasks, sent, pending, channel, notices, answer };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PeerRunStateNotices", () => {
  it("DN-1, DN-3: a change is marked owed, sends the state read at send time, and clears the mark on the node's confirmation", async () => {
    const f = setup();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const done = f.notices.changed({ run: TEAM, nodeId: B });
    await vi.waitFor(() => expect(f.sent).toHaveLength(1));
    expect(f.owed.has("team:studio_team_b")).toBe(true);
    expect(f.sent[0]).toMatchObject({ nodeId: B, run: { kind: "agent_team", runId: "studio_team_b" }, open: false });
    await f.answer();
    await expect(done).resolves.toEqual({ confirmed: true });
    expect(f.owed.size).toBe(0);
    f.notices.close();
  });

  it("DN-1b: one notice in flight per run; a re-delegation meanwhile waits for its answer, then sends open (AR-001)", async () => {
    const f = setup();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const closing = f.notices.changed({ run: RUN, nodeId: B });
    await vi.waitFor(() => expect(f.sent).toHaveLength(1));
    // The run is given a Task again while "closed" is in flight.
    f.open.set("agent:publisher_r1", true);
    const reopening = f.notices.changed({ run: RUN, nodeId: B });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(f.sent).toHaveLength(1);
    await f.answer();
    // The state changed in flight: the same turn sends it again at once.
    await vi.waitFor(() => expect(f.sent).toHaveLength(2));
    expect(f.sent[1]!.open).toBe(true);
    await f.answer();
    await expect(closing).resolves.toEqual({ confirmed: true });
    await expect(reopening).resolves.toEqual({ confirmed: true });
    expect(f.sent.map((sent) => sent.open)).toEqual([false, true]);
    expect(f.owed.size).toBe(0);
    f.notices.close();
  });

  it("other runs are not held behind one run's notice", async () => {
    const f = setup();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    void f.notices.changed({ run: RUN, nodeId: B });
    void f.notices.changed({ run: TEAM, nodeId: B });
    await vi.waitFor(() => expect(f.sent).toHaveLength(2));
    f.notices.close();
  });

  it("DN-4: a transport failure keeps it owed; the peer's timer sends it again, one run at a time, until confirmed", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const f = setup();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = f.notices.changed({ run: RUN, nodeId: B });
    await f.answer(refused("PEER_UNREACHABLE"));
    await expect(first).resolves.toMatchObject({ confirmed: false, code: "PEER_UNREACHABLE" });
    expect(warn).toHaveBeenCalledWith("TASK_PEER_NOTICE_OWED", expect.objectContaining({ nodeId: B, code: "PEER_UNREACHABLE" }));
    expect(f.owed.has("agent:publisher_r1")).toBe(true);
    vi.advanceTimersByTime(PEER_NOTICE_RETRY_MS);
    await vi.waitFor(() => expect(f.sent).toHaveLength(2));
    // A tick while the previous retry still sends is skipped.
    vi.advanceTimersByTime(PEER_NOTICE_RETRY_MS);
    await f.answer();
    await vi.waitFor(() => expect(f.owed.size).toBe(0));
    vi.advanceTimersByTime(PEER_NOTICE_RETRY_MS * 3);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(f.sent).toHaveLength(2);
    f.notices.close();
  });

  it("DN-4, S-3: owed notices loaded at start are sent on their peer's timer; a host without peers runs no timer", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const f = setup({ owedAtStart: [{ run: RUN, nodeId: B }, { run: TEAM, nodeId: C }] });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    f.notices.start();
    expect(f.sent).toHaveLength(0);
    vi.advanceTimersByTime(PEER_NOTICE_RETRY_MS);
    await vi.waitFor(() => expect(f.sent.map((sent) => sent.nodeId).sort()).toEqual([B, C]));
    await f.answer();
    await f.answer();
    await vi.waitFor(() => expect(f.owed.size).toBe(0));
    f.notices.close();

    const none = setup({ owedAtStart: [{ run: RUN, nodeId: B }], channel: false });
    none.notices.start();
    vi.advanceTimersByTime(PEER_NOTICE_RETRY_MS * 2);
    expect(vi.getTimerCount()).toBe(0);
    await expect(none.notices.changed({ run: RUN, nodeId: B })).resolves.toMatchObject({ confirmed: false, code: "REMOTE_COLLABORATION_OFF" });
    expect(none.owed.has("agent:publisher_r1")).toBe(true);
  });

  it("drops a notice with nothing to stop: no such run, not this node's delegation, a node that is no longer a peer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const code of ["REMOTE_TARGET_NOT_FOUND", "REMOTE_TARGET_NOT_PERMITTED", "PEER_NOT_REGISTERED"]) {
      const f = setup();
      const done = f.notices.changed({ run: RUN, nodeId: B });
      await f.answer(refused(code));
      await expect(done).resolves.toMatchObject({ confirmed: false, code });
      expect(f.owed.size).toBe(0);
      expect(warn).toHaveBeenCalledWith("TASK_PEER_NOTICE_DROPPED", expect.objectContaining({ code }));
      f.notices.close();
    }
  });

  it("a node that refused the Stop, or a peer to pair again, keeps it owed; a repeated reason is logged once", async () => {
    const f = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const code of ["DELEGATED_RUN_NOT_STOPPED", "PEER_NOT_PAIRED", "PEER_NOT_PAIRED"]) {
      const done = f.notices.changed({ run: TEAM, nodeId: B });
      await f.answer(refused(code));
      await expect(done).resolves.toMatchObject({ confirmed: false, code });
      expect(f.owed.has("team:studio_team_b")).toBe(true);
    }
    expect(warn.mock.calls.map(([event, detail]) => [event, (detail as { code: string }).code])).toEqual([
      ["TASK_PEER_NOTICE_OWED", "DELEGATED_RUN_NOT_STOPPED"], ["TASK_PEER_NOTICE_OWED", "PEER_NOT_PAIRED"]]);
    f.notices.close();
  });
});
