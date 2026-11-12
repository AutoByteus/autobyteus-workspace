import { describe, expect, it } from "vitest";
import { RunViewStreams } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";

/**
 * autobyteus-461 SR-062, SR-063: each run has one view stream for the life of the process, base's publisher moved out of
 * the root. A stop and a restore of the run build a new root on the same stream, so the view keeps its live sequence and
 * its numbers; a server restart (a new registry) starts another live sequence.
 */
const isMessageEvent = (event: { kind: string }) => event.kind === "message";
const TEAM = { rootSubjectKind: "agent_team" as const, rootRunId: "squad" };

describe("RunViewStreams", () => {
  it("one stream per run: a restored root takes the same stream, so the live sequence and the numbers continue", () => {
    const streams = new RunViewStreams();
    const first = streams.streamOf(TEAM, { isMessageEvent });
    first.publish({ kind: "message" });
    const restored = streams.streamOf(TEAM, { isMessageEvent });
    expect(restored).toBe(first);
    expect(restored.publish({ kind: "status" }).changeSequence).toBe(2);
    expect(restored.getLivePosition()).toMatchObject({ liveSequenceId: first.liveSequenceId, changeSequence: 2, lastMessageChangeSequence: 1 });
  });

  it("another run, or a server restart, has another live sequence", () => {
    const streams = new RunViewStreams();
    const team = streams.streamOf(TEAM, { isMessageEvent });
    expect(streams.streamOf({ rootSubjectKind: "agent", rootRunId: "squad" }, { isMessageEvent })).not.toBe(team);
    expect(new RunViewStreams().streamOf(TEAM, { isMessageEvent }).liveSequenceId).not.toBe(team.liveSequenceId);
  });
});
