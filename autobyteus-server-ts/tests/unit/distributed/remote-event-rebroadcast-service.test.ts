import { describe, expect, it, vi } from "vitest";
import { RemoteEventRebroadcastService } from "../../../src/distributed/event-aggregation/remote-event-rebroadcast-service.js";

describe("RemoteEventRebroadcastService", () => {
  it("projects remote events into active team stream sessions", async () => {
    const publishDistributedEnvelopeToTeamStream = vi.fn(() => 2);
    const service = new RemoteEventRebroadcastService({
      teamRunLocator: {
        resolveByTeamRunId: () => ({
          teamId: "team-1",
          teamDefinitionId: "def-1",
          coordinatorMemberName: "leader",
          teamRunId: "run-1",
          runVersion: 1,
          hostNodeId: "node-host",
        }),
      } as any,
      teamStreamProjector: {
        publishDistributedEnvelopeToTeamStream,
      },
    });

    const result = await service.rebroadcastRemoteEvent({
      aggregatedEvent: {
        teamRunId: "run-1",
        runVersion: 1,
        sequence: 5,
        sourceNodeId: "node-worker",
        memberName: "helper",
        agentId: "agent-2",
        origin: "remote",
        eventType: "ASSISTANT_CHUNK",
        payload: { content: "hi" },
        receivedAtIso: "2026-02-12T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      published: true,
      publishedSessionCount: 2,
    });
    expect(publishDistributedEnvelopeToTeamStream).toHaveBeenCalledWith({
      teamId: "team-1",
      projection: expect.objectContaining({
        teamRunId: "run-1",
        sourceNodeId: "node-worker",
        eventType: "ASSISTANT_CHUNK",
      }),
    });
  });

  it("returns RUN_NOT_ACTIVE when team run cannot be resolved", async () => {
    const service = new RemoteEventRebroadcastService({
      teamRunLocator: {
        resolveByTeamRunId: () => null,
      } as any,
      teamStreamProjector: {
        publishDistributedEnvelopeToTeamStream: vi.fn(() => 0),
      },
    });

    const result = await service.rebroadcastRemoteEvent({
      aggregatedEvent: {
        teamRunId: "missing",
        runVersion: 1,
        sequence: 1,
        sourceNodeId: "node-worker",
        memberName: null,
        agentId: null,
        origin: "remote",
        eventType: "UNKNOWN_EVENT",
        payload: {},
        receivedAtIso: "2026-02-12T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      published: false,
      publishedSessionCount: 0,
      reason: "RUN_NOT_ACTIVE",
    });
  });
});
