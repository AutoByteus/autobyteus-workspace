import { describe, expect, it } from "vitest";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { isStandaloneRootMessageEvent, type StandaloneRootEvent } from "../../../src/standalone-agent-run-root/domain/standalone-root-event.js";
import { isAgentOrgMessageEvent, type AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { isTeamRunMessageEvent, TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";

// autobyteus-358: a change sequence starts at 0 for every publisher, so it is named by the publisher's live sequence
// ID (SR-005); the publisher also keeps the sequence of its latest message event, by its root's predicate (SR-007,
// SR-008), so a client keeps its message lists across a reconnect in which no message was published.
const noMessages = { isMessageEvent: () => false };

describe("RootEventPublisher live sequence", () => {
  it("names its change sequence once per instance and gives the name with every snapshot connection", async () => {
    const publisher = new RootEventPublisher<string>(noMessages);
    const before = await publisher.openSnapshotConnection(() => "first");
    before.close();
    publisher.publish("event");
    const after = await publisher.openSnapshotConnection(() => "second");
    after.close();

    expect(before.liveSequenceId).toMatch(/\S/);
    expect(after).toMatchObject({ liveSequenceId: before.liveSequenceId, baseChangeSequence: 1 });
    expect(publisher.liveSequenceId).toBe(before.liveSequenceId);
  });

  it("reads its live sequence, change sequence and latest message sequence together (SR-006, SR-007)", async () => {
    const publisher = new TeamRunEventPublisher<string>({ isMessageEvent: (event) => event.startsWith("message") });
    expect(publisher.getLivePosition()).toEqual({ liveSequenceId: publisher.liveSequenceId, changeSequence: 0, lastMessageChangeSequence: 0 });
    publisher.publish("message 1");
    publisher.publish("presentation");
    publisher.publish("presentation");
    expect(publisher.getLivePosition()).toEqual({ liveSequenceId: publisher.liveSequenceId, changeSequence: 3, lastMessageChangeSequence: 1 });
    const connection = await publisher.openSnapshotConnection(() => "snapshot");
    connection.close();
    expect(connection).toMatchObject({ baseChangeSequence: 3, lastMessageChangeSequence: 1 });
  });

  it("gives another instance (a stop and resume, or a restart) another name although its sequence starts again", async () => {
    const first = new RootEventPublisher<string>(noMessages);
    first.publish("event");
    const second = new TeamRunEventPublisher<string>(noMessages);

    const connection = await second.openSnapshotConnection(() => "snapshot");
    connection.close();
    expect(connection.baseChangeSequence).toBe(0);
    expect(connection.liveSequenceId).not.toBe(first.liveSequenceId);
  });
});

describe("each root's message predicate (SR-008): a message advances the latest message sequence, a presentation does not", () => {
  it("Agent root", () => {
    const publisher = new RootEventPublisher<StandaloneRootEvent>({ isMessageEvent: isStandaloneRootMessageEvent });
    publisher.publish({ kind: "communication", message: {} } as never);
    publisher.publish({ kind: "agent_presentation", execution: {}, message: {} } as never);
    expect(publisher.getLivePosition()).toMatchObject({ changeSequence: 2, lastMessageChangeSequence: 1 });
  });

  it("Org", () => {
    const publisher = new RootEventPublisher<AgentOrgRunEvent>({ isMessageEvent: isAgentOrgMessageEvent });
    publisher.publish({ kind: "agent_presentation", execution: {}, message: {} } as never);
    publisher.publish({ kind: "communication", message: {} } as never);
    publisher.publish({ kind: "agent_presentation", execution: {}, message: {} } as never);
    expect(publisher.getLivePosition()).toMatchObject({ changeSequence: 3, lastMessageChangeSequence: 2 });
  });

  it("Team", () => {
    const publisher = new TeamRunEventPublisher<TeamRunEvent>({ isMessageEvent: isTeamRunMessageEvent });
    publisher.publish({ eventSourceType: TeamRunEventSourceType.COMMUNICATION, payload: {} } as never);
    publisher.publish({ eventSourceType: TeamRunEventSourceType.AGENT, execution: {}, payload: {} } as never);
    expect(publisher.getLivePosition()).toMatchObject({ changeSequence: 2, lastMessageChangeSequence: 1 });
  });
});
