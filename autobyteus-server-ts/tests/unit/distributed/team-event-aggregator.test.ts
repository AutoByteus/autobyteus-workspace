import { describe, expect, it, vi } from "vitest";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";

describe("TeamEventAggregator", () => {
  it("assigns monotonically increasing sequence per run across local and remote events", () => {
    const aggregator = new TeamEventAggregator();

    const local = aggregator.publishLocalEvent({
      teamRunId: "run-1",
      runVersion: 2,
      sourceNodeId: "node-host",
      eventType: "TEAM_READY",
      payload: {},
    });

    const remote = aggregator.publishRemoteEvent({
      teamRunId: "run-1",
      runVersion: 2,
      sourceNodeId: "node-worker-1",
      eventType: "AGENT_REPLY",
      payload: { text: "hello" },
    });

    expect(local.sequence).toBe(1);
    expect(remote.sequence).toBe(2);
    expect(remote.origin).toBe("remote");
  });

  it("keeps independent sequence counters per run", () => {
    const aggregator = new TeamEventAggregator();

    const run1 = aggregator.publishLocalEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-host",
      eventType: "A",
      payload: {},
    });
    const run2 = aggregator.publishLocalEvent({
      teamRunId: "run-2",
      runVersion: 1,
      sourceNodeId: "node-host",
      eventType: "A",
      payload: {},
    });

    expect(run1.sequence).toBe(1);
    expect(run2.sequence).toBe(1);
  });

  it("publishes normalized events to sink when provided", () => {
    const publishSink = vi.fn();
    const aggregator = new TeamEventAggregator({ publishSink });

    const event = aggregator.publishRemoteEvent({
      teamRunId: "run-1",
      runVersion: 3,
      sourceNodeId: "node-worker-2",
      eventType: "TOOL_APPROVAL_REQUESTED",
      payload: { toolInvocationId: "tool-1" },
    });

    expect(publishSink).toHaveBeenCalledTimes(1);
    expect(publishSink).toHaveBeenCalledWith(event);
  });

  it("evicts run sequence state when finalized", () => {
    const aggregator = new TeamEventAggregator();

    aggregator.publishLocalEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-host",
      eventType: "A",
      payload: {},
    });
    aggregator.publishLocalEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-host",
      eventType: "B",
      payload: {},
    });

    expect(aggregator.finalizeRun("run-1")).toBe(true);

    const next = aggregator.publishLocalEvent({
      teamRunId: "run-1",
      runVersion: 2,
      sourceNodeId: "node-host",
      eventType: "C",
      payload: {},
    });
    expect(next.sequence).toBe(1);
    expect(aggregator.finalizeRun("run-missing")).toBe(false);
  });
});
