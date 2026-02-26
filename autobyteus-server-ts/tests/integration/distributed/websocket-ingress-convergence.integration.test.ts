import { describe, expect, it, vi } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
} from "autobyteus-ts";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";

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

describe("Distributed websocket ingress convergence integration", () => {
  it("routes send-message and approval commands through TeamCommandIngressService", async () => {
    const stream = new FakeTeamStream();
    const sentMessages: string[] = [];
    const closedCodes: number[] = [];

    const dispatchUserMessage = vi.fn(async () => ({
      teamId: "team-1",
      teamRunId: "run-1",
      runVersion: 2,
    }));
    const dispatchToolApproval = vi.fn(async () => ({
      teamId: "team-1",
      teamRunId: "run-1",
      runVersion: 2,
    }));
    const issueToolApprovalTokenFromActiveRun = vi.fn((input: { invocationId: string; targetMemberName: string }) => ({
      teamRunId: "run-1",
      runVersion: 2,
      invocationId: input.invocationId,
      invocationVersion: 1,
      targetMemberName: input.targetMemberName,
    }));

    const handler = new AgentTeamStreamHandler(
      new AgentSessionManager(),
      {
        getTeamRun: (teamId: string) => (teamId === "team-1" ? { teamId } : null),
        getTeamEventStream: (teamId: string) => (teamId === "team-1" ? stream : null),
      } as any,
      {
        dispatchUserMessage,
        dispatchToolApproval,
        issueToolApprovalTokenFromActiveRun,
        resolveActiveRun: () => ({
          teamId: "team-1",
          teamDefinitionId: "def-1",
          coordinatorMemberName: "leader",
          teamRunId: "run-1",
          runVersion: 2,
          hostNodeId: "node-host",
        }),
      } as any,
    );

    const sessionId = await handler.connect(
      {
        send: (payload) => sentMessages.push(payload),
        close: (code) => {
          if (typeof code === "number") {
            closedCodes.push(code);
          }
        },
      },
      "team-1",
    );

    expect(sessionId).toBeTruthy();
    expect(JSON.parse(sentMessages[0] ?? "{}")).toMatchObject({
      type: "CONNECTED",
      payload: { team_id: "team-1" },
    });

    await handler.handleMessage(
      sessionId!,
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          content: "hello",
          target_member_name: "helper",
          context_file_paths: ["/tmp/a.txt"],
          image_urls: ["https://example.com/a.png"],
        },
      }),
    );

    await waitForCondition(() => dispatchUserMessage.mock.calls.length === 1);
    expect(dispatchUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        targetMemberName: "helper",
      }),
    );

    const userMessage = dispatchUserMessage.mock.calls[0]?.[0]?.userMessage;
    expect(userMessage?.content).toBe("hello");
    expect(userMessage?.contextFiles).toHaveLength(2);

    await handler.handleMessage(
      sessionId!,
      JSON.stringify({
        type: "APPROVE_TOOL",
        payload: {
          invocation_id: "inv-2",
          agent_name: "helper",
          reason: "ok",
          approval_token: {
            teamRunId: "run-1",
            runVersion: 2,
            invocationId: "inv-2",
            invocationVersion: 1,
            targetMemberName: "helper",
          },
        },
      }),
    );

    await waitForCondition(() => dispatchToolApproval.mock.calls.length === 1);
    expect(dispatchToolApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        isApproved: true,
        agentName: "helper",
      }),
    );

    const teamEvent = new AgentTeamStreamEvent({
      team_id: "team-1",
      event_source_type: "AGENT",
      data: new AgentEventRebroadcastPayload({
        agent_name: "helper",
        agent_event: new StreamEvent({
          event_type: StreamEventType.TOOL_APPROVAL_REQUESTED,
          data: { invocation_id: "inv-9", tool_name: "run_bash", arguments: { command: "pwd" } },
          agent_id: "agent-helper",
        }),
      }),
    });
    stream.push(teamEvent);

    await waitForCondition(() => sentMessages.length >= 2);
    const streamedMessage = JSON.parse(sentMessages[1] ?? "{}") as {
      type: string;
      payload: Record<string, unknown>;
    };
    expect(streamedMessage.type).toBe("TOOL_APPROVAL_REQUESTED");
    expect(streamedMessage.payload.approval_token).toMatchObject({
      teamRunId: "run-1",
      runVersion: 2,
      invocationId: "inv-9",
      targetMemberName: "helper",
    });
    expect(issueToolApprovalTokenFromActiveRun).toHaveBeenCalled();

    await handler.disconnect(sessionId!);
    expect(closedCodes).toEqual([]);
  });
});
