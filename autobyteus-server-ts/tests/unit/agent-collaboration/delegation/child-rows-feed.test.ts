import { describe, expect, it, vi } from "vitest";
import { ChildRowsFeed, type ChildRowsEvent } from "../../../../src/agent-collaboration/delegation/child-rows-feed.js";
import type { ChildRowsChange, DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { ChildRowsStreamSession } from "../../../../src/services/agent-streaming/child-rows-stream-session.js";

/** autobyteus-461 DS-8, SR-042 … SR-044 (ARCH-REV-019 residual): the feed to open views and each stream's order. */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const OTHER = { rootSubjectKind: "agent_team" as const, rootRunId: "eng" };
const child = (agentRunId: string, nodeId?: string): DelegatedChild => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, ...(nodeId ? { nodeId } : {}) });
const row = (agentRunId: string) => ({ kind: "local" as const, row: { agentRunId } as never });

type RowOf = (parent: unknown, child: DelegatedChild) => Promise<ReturnType<typeof row> | null>;
const harness = (rowOf: ReturnType<typeof vi.fn<RowOf>> = vi.fn<RowOf>(async (_parent, c) => row("agentRunId" in c.run ? c.run.agentRunId : "team"))) => {
  let report: (change: ChildRowsChange) => void = () => undefined;
  const feed = new ChildRowsFeed({ rowOf });
  feed.follow({ subscribeChildRows: (listener) => { report = listener; return () => undefined; } });
  return { feed, rowOf, report: (change: ChildRowsChange) => report(change) };
};

describe("ChildRowsFeed", () => {
  it("publishes each change to the run's open views only, with the added rows as the views project them", async () => {
    const h = harness();
    const mine: ChildRowsEvent[] = [], second: ChildRowsEvent[] = [], other: ChildRowsEvent[] = [];
    h.feed.open(M, (event) => mine.push(event));
    h.feed.open(M, (event) => second.push(event));
    h.feed.open(OTHER, (event) => other.push(event));
    h.report({ run: M, added: [child("writer")], removed: [{ teamRunId: "old" }] });
    await h.feed.settled();
    expect(mine).toEqual([{ run: M, added: [row("writer")], removed: [{ teamRunId: "old" }] }]);
    expect(second).toEqual(mine);
    expect(other).toEqual([]);
  });

  it("does no work for a run with no open view, and stops after a view closes", async () => {
    const h = harness();
    h.report({ run: M, added: [child("writer")], removed: [] });
    await h.feed.settled();
    expect(h.rowOf).not.toHaveBeenCalled();
    const events: ChildRowsEvent[] = [];
    const close = h.feed.open(M, (event) => events.push(event));
    close();
    h.report({ run: M, added: [], removed: [{ agentRunId: "writer" }] });
    await h.feed.settled();
    expect(events).toEqual([]);
  });

  it("publishes in reported order even when an earlier row is slower to read; an unreadable row is left out", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => { release = resolve; });
    const h = harness(vi.fn<RowOf>(async (_parent, c) => {
      if ("agentRunId" in c.run && c.run.agentRunId === "slow") { await slow; return row("slow"); }
      return "agentRunId" in c.run && c.run.agentRunId === "missing" ? null : row("x");
    }));
    const events: ChildRowsEvent[] = [];
    h.feed.open(M, (event) => events.push(event));
    h.report({ run: M, added: [child("slow")], removed: [] });
    h.report({ run: M, added: [], removed: [{ agentRunId: "slow" }] });
    h.report({ run: M, added: [child("missing")], removed: [] });
    release();
    await h.feed.settled();
    expect(events.map((event) => [event.added.length, event.removed.length])).toEqual([[1, 0], [0, 1]]);
  });
});

describe("ChildRowsStreamSession", () => {
  it("holds the events published while its snapshot is built and sends them after it, in published order, each once", async () => {
    const h = harness();
    const sent: string[] = [];
    const session = new ChildRowsStreamSession(h.feed, M, (event) => sent.push(`${event.added.map((r) => (r.row as { agentRunId: string }).agentRunId).join()}|${event.removed.length}`));
    h.report({ run: M, added: [child("a")], removed: [] });
    h.report({ run: M, added: [], removed: [{ agentRunId: "a" }] });
    h.report({ run: M, added: [child("b")], removed: [] });
    await h.feed.settled();
    expect(sent).toEqual([]);
    sent.push("SNAPSHOT");
    session.snapshotSent();
    expect(sent).toEqual(["SNAPSHOT", "a|0", "|1", "b|0"]);
    session.snapshotSent();
    h.report({ run: M, added: [child("c")], removed: [] });
    await h.feed.settled();
    expect(sent).toEqual(["SNAPSHOT", "a|0", "|1", "b|0", "c|0"]);
    session.dispose();
    h.report({ run: M, added: [child("d")], removed: [] });
    await h.feed.settled();
    expect(sent).toHaveLength(5);
  });
});
