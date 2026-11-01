import { describe, expect, it } from "vitest";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";

// autobyteus-358 (SR-005): a change sequence starts at 0 for every publisher, so it is named by the publisher's
// live sequence ID; a client compares sequence numbers only within one ID.
describe("RootEventPublisher live sequence", () => {
  it("names its change sequence once per instance and gives the name with every snapshot connection", async () => {
    const publisher = new RootEventPublisher<string>();
    const before = await publisher.openSnapshotConnection(() => "first");
    before.close();
    publisher.publish("event");
    const after = await publisher.openSnapshotConnection(() => "second");
    after.close();

    expect(before.liveSequenceId).toMatch(/\S/);
    expect(after).toMatchObject({ liveSequenceId: before.liveSequenceId, baseChangeSequence: 1 });
    expect(publisher.liveSequenceId).toBe(before.liveSequenceId);
  });

  it("reads its live sequence and current change sequence together (the Team open read, SR-006)", () => {
    const publisher = new TeamRunEventPublisher<string>();
    publisher.publish("a");
    publisher.publish("b");
    expect(publisher.getLivePosition()).toEqual({ liveSequenceId: publisher.liveSequenceId, changeSequence: 2 });
  });

  it("gives another instance (a stop and resume, or a restart) another name although its sequence starts again", async () => {
    const first = new RootEventPublisher<string>();
    first.publish("event");
    const second = new TeamRunEventPublisher<string>();

    const connection = await second.openSnapshotConnection(() => "snapshot");
    connection.close();
    expect(connection.baseChangeSequence).toBe(0);
    expect(connection.liveSequenceId).not.toBe(first.liveSequenceId);
  });
});
