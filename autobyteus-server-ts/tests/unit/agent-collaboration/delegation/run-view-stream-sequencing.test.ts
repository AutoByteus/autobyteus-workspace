import { describe, expect, it } from "vitest";
import { RunViewStreams } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";

/**
 * autobyteus-461 SR-062, SR-063 (the design's "Sequencing tests"): one view sequence per run, owned by the view. Every
 * frame of a run's view (its own events, the rows' events, the rows' statuses) is numbered in one order; a snapshot
 * reads its base with the rows in one synchronous step, and a connection gets exactly the frames after it, each once.
 */
type Frame = Readonly<{ kind: "message" | "row" | "status" }>;
const streams = () => new RunViewStreams({ agent: ((event: Frame) => event.kind === "message") as never,
  agent_team: ((event: Frame) => event.kind === "message") as never, agent_org: ((event: Frame) => event.kind === "message") as never },
  { tree: { chainOf: (run) => [run] }, scope: new MessageViewScope({ tree: { collaborationTreeOf: () => ({ rows: () => [] }) as never } }), events: { agent: (message) => message, agent_team: (message) => message, agent_org: (message) => message } });
const TEAM = { rootSubjectKind: "agent_team" as const, rootRunId: "squad" };

describe("a run's view sequence", () => {
  it("own events, row events and status events are consecutive frames of one sequence; only the run's own messages move lastMessageChangeSequence", () => {
    const stream = streams().streamOf<Frame>(TEAM);
    expect([stream.publish({ kind: "row" }), stream.publish({ kind: "message" }), stream.publish({ kind: "status" }), stream.publish({ kind: "row" })]
      .map((frame) => frame.changeSequence)).toEqual([1, 2, 3, 4]);
    expect(stream.getLivePosition()).toMatchObject({ changeSequence: 4, lastMessageChangeSequence: 2 });
  });

  it("a snapshot taken between frames is followed by exactly the frames after it", async () => {
    const stream = streams().streamOf<Frame>(TEAM);
    stream.publish({ kind: "row" }); stream.publish({ kind: "status" });
    const connection = await stream.openSnapshotConnection(() => "snapshot");
    stream.publish({ kind: "row" });
    const seen: number[] = [];
    connection.subscribe((frame) => seen.push(frame.changeSequence));
    stream.publish({ kind: "status" });
    expect(connection.baseChangeSequence).toBe(2);
    expect(seen).toEqual([3, 4]);
  });

  it("a row change and a status change during an async stored capture appear once, after the snapshot, not in it", async () => {
    const stream = streams().streamOf<Frame>(TEAM);
    let rowsAtBase: number | null = null;
    const connection = await stream.openSnapshotConnection(async () => {
      // The synchronous step: the base and the rows (here: the frames so far) together.
      rowsAtBase = stream.getCurrentChangeSequence();
      await Promise.resolve();
      // Committed while the stored parts are read: after the base.
      stream.publish({ kind: "row" }); stream.publish({ kind: "status" });
      return "stored parts";
    });
    const seen: string[] = [];
    connection.subscribe((frame) => seen.push(`${frame.changeSequence}:${frame.event.kind}`));
    expect(rowsAtBase).toBe(connection.baseChangeSequence);
    expect(seen).toEqual(["1:row", "2:status"]);
  });

  it("a stored-to-live switch keeps the sequence: the in-band snapshot is at the current sequence, under the same live sequence", async () => {
    const registry = streams();
    const stored = registry.streamOf<Frame>(TEAM);
    const first = await stored.openSnapshotConnection(() => "stored");
    first.subscribe(() => undefined);
    stored.publish({ kind: "row" }); stored.publish({ kind: "status" });
    // The team restores: its root takes the same stream; the switch is a snapshot through it.
    const live = await registry.streamOf<Frame>(TEAM).openSnapshotConnection(() => "live");
    expect(live.baseChangeSequence).toBe(2);
    expect(live.liveSequenceId).toBe(first.liveSequenceId);
    expect(registry.streamOf<Frame>(TEAM).publish({ kind: "message" }).changeSequence).toBe(3);
  });

  it("a checkpoint around a stored hydration sees a child's status frame move the sequence, so the recovery retries", () => {
    const stream = streams().streamOf<Frame>(TEAM);
    const before = stream.getCurrentChangeSequence();
    stream.publish({ kind: "status" });
    expect(stream.getCurrentChangeSequence()).not.toBe(before);
  });
});
