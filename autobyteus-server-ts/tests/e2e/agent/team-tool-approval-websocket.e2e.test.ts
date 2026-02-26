import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { getDefaultTeamCommandIngressService } from "../../../src/distributed/bootstrap/default-distributed-runtime-composition.js";
import type {
  TeamCommandIngressService,
  ToolApprovalToken,
} from "../../../src/distributed/ingress/team-command-ingress-service.js";

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

const waitForOpen = (socket: WebSocket, timeoutMs = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

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

describe("Team tool-approval websocket e2e", () => {
  let app: FastifyInstance | null = null;
  let socket: WebSocket | null = null;

  afterEach(async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    socket = null;
    if (app) {
      await app.close();
      app = null;
    }
    vi.restoreAllMocks();
  });

  it("routes approval requests and approvals across websocket boundary using canonical member target", async () => {
    const teamId = `team-e2e-${Date.now()}`;
    const teamStream = new FakeTeamStream();

    const teamManager = AgentTeamRunManager.getInstance();
    const ingress = getDefaultTeamCommandIngressService() as TeamCommandIngressService;

    const getTeamRunSpy = vi
      .spyOn(teamManager, "getTeamRun")
      .mockImplementation((requestedTeamId: string) =>
        requestedTeamId === teamId ? ({ teamId } as unknown as ReturnType<typeof teamManager.getTeamRun>) : null,
      );
    const getTeamEventStreamSpy = vi
      .spyOn(teamManager, "getTeamEventStream")
      .mockImplementation((requestedTeamId: string) =>
        requestedTeamId === teamId
          ? (teamStream as unknown as ReturnType<typeof teamManager.getTeamEventStream>)
          : null,
      );

    const issueTokenSpy = vi
      .spyOn(ingress, "issueToolApprovalTokenFromActiveRun")
      .mockImplementation((input) => ({
        teamRunId: "run-e2e-1",
        runVersion: 3,
        invocationId: input.invocationId,
        invocationVersion: 1,
        targetMemberName: input.targetMemberName,
      }));

    const dispatchToolApprovalSpy = vi
      .spyOn(ingress, "dispatchToolApproval")
      .mockImplementation(async (input) => ({
        teamId: input.teamId,
        teamRunId: input.token.teamRunId,
        runVersion: input.token.runVersion,
      }));

    app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(app);

    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const baseUrl = `ws://${url.hostname}:${url.port}`;

    socket = new WebSocket(`${baseUrl}/ws/agent-team/${teamId}`);
    const receivedMessages: string[] = [];
    socket.on("message", (data) => {
      receivedMessages.push(data.toString());
    });
    await waitForOpen(socket);

    await waitForCondition(() => receivedMessages.length >= 1);
    const connected = JSON.parse(receivedMessages[0] ?? "{}") as {
      type: string;
      payload: { team_id: string };
    };
    expect(connected.type).toBe("CONNECTED");
    expect(connected.payload.team_id).toBe(teamId);

    const approvalRequestedEvent = new AgentTeamStreamEvent({
      team_id: teamId,
      event_source_type: "AGENT",
      data: new AgentEventRebroadcastPayload({
        agent_name: "professor",
        agent_event: new StreamEvent({
          event_type: StreamEventType.TOOL_APPROVAL_REQUESTED,
          data: {
            invocation_id: "inv-e2e-1",
            tool_name: "send_message_to",
            arguments: { target_member_name: "student", message: "hello" },
          },
          agent_id: "member-professor",
        }),
      }),
    });
    const baselineMessageCount = receivedMessages.length;
    teamStream.push(approvalRequestedEvent);

    await waitForCondition(() => receivedMessages.length > baselineMessageCount);
    const approvalRequestedMessage = JSON.parse(
      receivedMessages[baselineMessageCount] ?? "{}",
    ) as {
      type: string;
      payload: {
        invocation_id?: string;
        approval_token?: ToolApprovalToken;
      };
    };
    expect(approvalRequestedMessage.type).toBe("TOOL_APPROVAL_REQUESTED");
    expect(approvalRequestedMessage.payload.invocation_id).toBe("inv-e2e-1");
    expect(approvalRequestedMessage.payload.approval_token).toMatchObject({
      teamRunId: "run-e2e-1",
      runVersion: 3,
      invocationId: "inv-e2e-1",
      targetMemberName: "professor",
    });

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: {
          invocation_id: "inv-e2e-1",
          reason: "approved",
          agent_name: "nested-team/professor",
          approval_token: approvalRequestedMessage.payload.approval_token,
        },
      }),
    );

    await waitForCondition(() => dispatchToolApprovalSpy.mock.calls.length === 1);
    const firstApprovalInput = dispatchToolApprovalSpy.mock.calls[0]?.[0];
    expect(firstApprovalInput).toMatchObject({
      teamId,
      isApproved: true,
      reason: "approved",
      agentName: "professor",
    });
    expect(firstApprovalInput?.token).toMatchObject({
      targetMemberName: "professor",
      invocationId: "inv-e2e-1",
    });

    socket.send(
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: {
          invocation_id: "inv-e2e-2",
          reason: "approved-without-token",
          agent_name: "professor",
        },
      }),
    );

    await waitForCondition(() => dispatchToolApprovalSpy.mock.calls.length === 2);
    expect(dispatchToolApprovalSpy.mock.calls[1]?.[0]).toMatchObject({
      teamId,
      isApproved: true,
      reason: "approved-without-token",
      agentName: "professor",
      token: {
        invocationId: "inv-e2e-2",
        targetMemberName: "professor",
      },
    });

    expect(issueTokenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId,
        invocationId: "inv-e2e-2",
        targetMemberName: "professor",
      }),
    );
    expect(getTeamRunSpy).toHaveBeenCalledWith(teamId);
    expect(getTeamEventStreamSpy).toHaveBeenCalledWith(teamId);

    await teamStream.close();
  });
});
