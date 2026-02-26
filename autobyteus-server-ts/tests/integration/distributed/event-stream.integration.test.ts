import { describe, expect, it } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";

class FakeTeamStream {
  private queue: Array<AgentTeamStreamEvent | null> = [];
  private waiters: Array<(value: AgentTeamStreamEvent | null) => void> = [];
  private closed = false;

  push(event: AgentTeamStreamEvent): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(event);
      return;
    }
    this.queue.push(event);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(null);
      return;
    }
    this.queue.push(null);
  }

  private async next(): Promise<AgentTeamStreamEvent | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<AgentTeamStreamEvent, void, unknown> {
    while (true) {
      const event = await this.next();
      if (!event) {
        break;
      }
      yield event;
    }
  }
}

const waitForCondition = async (fn: () => boolean, timeoutMs = 2000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for condition");
};

describe("Distributed event stream integration", () => {
  it("attaches ordered team stream envelopes on streamed team events", async () => {
    const stream = new FakeTeamStream();
    const sentMessages: string[] = [];

    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamId: string) => (teamId === "team-1" ? { teamId } : null),
        getTeamEventStream: (teamId: string) => (teamId === "team-1" ? stream : null),
      } as any,
      {
        resolveActiveRun: () => ({
          teamId: "team-1",
          teamDefinitionId: "def-1",
          coordinatorMemberName: "leader",
          teamRunId: "run-1",
          runVersion: 4,
          hostNodeId: "node-host",
        }),
        issueToolApprovalTokenFromActiveRun: () => null,
      } as any,
      new TeamEventAggregator(),
    );

    const sessionId = await handler.connect(
      {
        send: (payload) => sentMessages.push(payload),
        close: () => undefined,
      },
      "team-1",
    );
    expect(sessionId).toBeTruthy();

    stream.push(
      new AgentTeamStreamEvent({
        team_id: "team-1",
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "leader",
          agent_event: new StreamEvent({
            event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
            data: { content: "one" },
            agent_id: "agent-1",
          }),
        }),
      }),
    );
    stream.push(
      new AgentTeamStreamEvent({
        team_id: "team-1",
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "helper",
          agent_event: new StreamEvent({
            event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
            data: { content: "two" },
            agent_id: "agent-2",
          }),
        }),
      }),
    );

    await waitForCondition(() => sentMessages.length >= 3);
    const first = JSON.parse(sentMessages[1] ?? "{}") as { payload: Record<string, any> };
    const second = JSON.parse(sentMessages[2] ?? "{}") as { payload: Record<string, any> };

    expect(first.payload.team_stream_event_envelope).toMatchObject({
      team_run_id: "run-1",
      run_version: 4,
      source_node_id: "node-host",
      origin: "local",
      sequence: 1,
    });
    expect(second.payload.team_stream_event_envelope).toMatchObject({
      team_run_id: "run-1",
      run_version: 4,
      source_node_id: "node-host",
      origin: "local",
      sequence: 2,
    });

    await handler.disconnect(sessionId!);
  });
});
