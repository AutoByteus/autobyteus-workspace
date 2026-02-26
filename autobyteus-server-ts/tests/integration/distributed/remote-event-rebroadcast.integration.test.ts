import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";
import { RemoteEventRebroadcastService } from "../../../src/distributed/event-aggregation/remote-event-rebroadcast-service.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerHostDistributedEventRoutes } from "../../../src/distributed/transport/internal-http/register-host-distributed-event-routes.js";

class FakeTeamStream {
  private queue: Array<{ value: unknown } | null> = [];
  private waiters: Array<(value: { value: unknown } | null) => void> = [];
  private closed = false;

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(null);
    } else {
      this.queue.push(null);
    }
  }

  private async next(): Promise<{ value: unknown } | null> {
    if (this.queue.length > 0) {
      return this.queue.shift() ?? null;
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<any, void, unknown> {
    while (true) {
      const item = await this.next();
      if (!item) {
        break;
      }
      yield item.value;
    }
  }
}

describe("Remote event rebroadcast integration", () => {
  it("rebroadcasts accepted remote events to host websocket team sessions", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";
    const sentMessages: string[] = [];
    const stream = new FakeTeamStream();

    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamRunId: string) => (teamRunId === "team-1" ? { teamRunId } : null),
        getTeamEventStream: (teamRunId: string) => (teamRunId === "team-1" ? stream : null),
      } as any,
      {
        issueToolApprovalTokenFromActiveRun: () => null,
        resolveActiveRun: () => null,
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

    const rebroadcastService = new RemoteEventRebroadcastService({
      teamRunLocator: {
        resolveByTeamRunId: (teamRunId: string) =>
          teamRunId === "run-1"
            ? {
                teamId: "team-1",
                teamDefinitionId: "def-1",
                coordinatorMemberName: "leader",
                teamRunId: "run-1",
                runVersion: 3,
                hostNodeId: "node-host",
              }
            : null,
      } as any,
      teamStreamProjector: handler,
    });

    const signer = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      now: () => now,
    });
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });

    const app = fastify();
    await registerHostDistributedEventRoutes(app, {
      teamEventAggregator: new TeamEventAggregator(),
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
      remoteEventRebroadcastService: rebroadcastService,
    });

    const payload = {
      teamRunId: "run-1",
      runVersion: 3,
      sourceNodeId: "node-worker",
      sourceEventId: "evt-1",
      eventType: "assistant_complete_response",
      memberName: "helper",
      agentRunId: "agent-remote-1",
      payload: {
        content: "remote hello",
      },
    };

    const response = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/events",
      payload,
      headers: signer.signRequest({ body: payload, securityMode: "strict_signed" }),
    });

    expect(response.statusCode).toBe(202);
    expect(sentMessages).toHaveLength(2);

    const distributedMessage = JSON.parse(sentMessages[1] ?? "{}");
    expect(distributedMessage.type).toBe("ASSISTANT_COMPLETE");
    expect(distributedMessage.payload.agent_name).toBe("helper");
    expect(distributedMessage.payload.agent_id).toBe("agent-remote-1");
    expect(distributedMessage.payload.team_stream_event_envelope).toMatchObject({
      team_run_id: "run-1",
      run_version: 3,
      source_node_id: "node-worker",
      origin: "remote",
      event_type: "assistant_complete_response",
    });

    await handler.disconnect(sessionId!);
    await app.close();
  });

  it("preserves nested member_route_key and leaf agent_name for remote rebroadcast payloads", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";
    const sentMessages: string[] = [];
    const stream = new FakeTeamStream();

    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamRunId: string) => (teamRunId === "team-1" ? { teamRunId } : null),
        getTeamEventStream: (teamRunId: string) => (teamRunId === "team-1" ? stream : null),
      } as any,
      {
        issueToolApprovalTokenFromActiveRun: () => null,
        resolveActiveRun: () => null,
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

    const rebroadcastService = new RemoteEventRebroadcastService({
      teamRunLocator: {
        resolveByTeamRunId: (teamRunId: string) =>
          teamRunId === "run-1"
            ? {
                teamId: "team-1",
                teamDefinitionId: "def-1",
                coordinatorMemberName: "leader",
                teamRunId: "run-1",
                runVersion: 3,
                hostNodeId: "node-host",
              }
            : null,
      } as any,
      teamStreamProjector: handler,
    });

    const signer = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      now: () => now,
    });
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });

    const app = fastify();
    await registerHostDistributedEventRoutes(app, {
      teamEventAggregator: new TeamEventAggregator(),
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
      remoteEventRebroadcastService: rebroadcastService,
    });

    const payload = {
      teamRunId: "run-1",
      runVersion: 3,
      sourceNodeId: "node-worker",
      sourceEventId: "evt-nested-1",
      eventType: "assistant_complete_response",
      memberName: "sub-team/worker-b",
      agentRunId: "agent-remote-b",
      payload: {
        content: "nested hello",
        agent_name: "worker-b",
        member_route_key: "sub-team/worker-b",
        event_scope: "member_scoped",
      },
    };

    const response = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/events",
      payload,
      headers: signer.signRequest({ body: payload, securityMode: "strict_signed" }),
    });

    expect(response.statusCode).toBe(202);
    expect(sentMessages).toHaveLength(2);

    const distributedMessage = JSON.parse(sentMessages[1] ?? "{}");
    expect(distributedMessage.type).toBe("ASSISTANT_COMPLETE");
    expect(distributedMessage.payload.agent_name).toBe("worker-b");
    expect(distributedMessage.payload.member_route_key).toBe("sub-team/worker-b");
    expect(distributedMessage.payload.agent_id).toBe("agent-remote-b");

    await handler.disconnect(sessionId!);
    await app.close();
  });
});
