import { RunViewStreams } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";
import { describe, expect, it } from "vitest";

/**
 * autobyteus-461 SR-062, SR-063: each run has one view stream for the life of the process, base's publisher moved out of
 * the root. A stop and a restore of the run build a new root on the same stream, so the view keeps its live sequence and
 * its numbers; a server restart (a new registry) starts another live sequence.
 */
const isMessageEvent = (event: { kind: string }) => event.kind === "message";
const streamsOf = () => new RunViewStreams({ agent: isMessageEvent as never, agent_team: isMessageEvent as never, agent_org: isMessageEvent as never }, { tree: { chainOf: (run) => [run] }, scope: new MessageViewScope({ tree: { collaborationTreeOf: () => ({ rows: () => [] }) as never } }), events: { agent: (message) => message, agent_team: (message) => message, agent_org: (message) => message } });
const TEAM = { rootSubjectKind: "agent_team" as const, rootRunId: "squad" };

describe("RunViewStreams", () => {
  it("one stream per run: a restored root takes the same stream, so the live sequence and the numbers continue", () => {
    const streams = streamsOf();
    const first = streams.streamOf<{ kind: string }>(TEAM);
    first.publish({ kind: "message" });
    const restored = streams.streamOf<{ kind: string }>(TEAM);
    expect(restored).toBe(first);
    expect(restored.publish({ kind: "status" }).changeSequence).toBe(2);
    expect(restored.getLivePosition()).toMatchObject({ liveSequenceId: first.liveSequenceId, changeSequence: 2, lastMessageChangeSequence: 1 });
  });

  it("another run, or a server restart, has another live sequence", () => {
    const streams = streamsOf();
    const team = streams.streamOf<{ kind: string }>(TEAM);
    expect(streams.streamOf({ rootSubjectKind: "agent", rootRunId: "squad" })).not.toBe(team);
    expect(streamsOf().streamOf(TEAM).liveSequenceId).not.toBe(team.liveSequenceId);
  });
});
