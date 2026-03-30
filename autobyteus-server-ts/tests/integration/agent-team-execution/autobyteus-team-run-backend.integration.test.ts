import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
  SubTeamEventRebroadcastPayload,
} from "autobyteus-ts";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { EventType } from "autobyteus-ts/events/event-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AutoByteusTeamRunBackend } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

class FakeNotifier {
  private readonly listeners = new Map<string, Set<(payload?: unknown) => void>>();

  subscribe(eventType: string, listener: (payload?: unknown) => void): void {
    const listeners = this.listeners.get(eventType) ?? new Set();
    listeners.add(listener);
    this.listeners.set(eventType, listeners);
  }

  unsubscribe(eventType: string, listener: (payload?: unknown) => void): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  emit(eventType: string, payload?: unknown): void {
    for (const listener of this.listeners.get(eventType) ?? []) {
      listener(payload);
    }
  }
}

const waitForCondition = async (fn: () => boolean, timeoutMs = 2000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition.");
};

type FakeTeam = {
  teamId: string;
  notifier: FakeNotifier;
  currentStatus: string;
  postMessage: ReturnType<typeof vi.fn>;
  postToolExecutionApproval: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const createBackend = (overrides: Partial<FakeTeam> = {}) => {
  const team: FakeTeam = {
    teamId: "team-auto-1",
    notifier: new FakeNotifier(),
    currentStatus: "IDLE",
    postMessage: vi.fn().mockResolvedValue(undefined),
    postToolExecutionApproval: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  let isActive = true;
  const backend = new AutoByteusTeamRunBackend(team, {
    isActive: () => isActive,
    removeTeamRun: vi.fn().mockResolvedValue(true),
  });

  return {
    team,
    backend,
    setActive: (value: boolean) => {
      isActive = value;
    },
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("AutoByteusTeamRunBackend integration", () => {
  it("routes direct team commands and inter-agent delivery through the native team", async () => {
    const { backend, team } = createBackend();

    expect(backend.runId).toBe("team-auto-1");
    expect(backend.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
    expect(backend.getRuntimeContext()).toEqual({ teamId: "team-auto-1" });
    expect(backend.getStatus()).toBe("IDLE");

    const userMessage = new AgentInputUserMessage("hello team");
    await expect(backend.postMessage(userMessage, "WorkerA")).resolves.toEqual({ accepted: true });
    expect(team.postMessage).toHaveBeenCalledWith(userMessage, "WorkerA");

    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "member-sender-1",
        senderMemberName: "Coordinator",
        teamRunId: "team-auto-1",
        recipientMemberName: "WorkerA",
        content: "Please investigate.",
        messageType: "agent_message",
      }),
    ).resolves.toEqual({ accepted: true });

    const deliveredMessage = team.postMessage.mock.calls[1]?.[0] as AgentInputUserMessage;
    expect(deliveredMessage).toBeInstanceOf(AgentInputUserMessage);
    expect(deliveredMessage.content).toBe("Please investigate.");
    expect(deliveredMessage.senderType).toBe(SenderType.AGENT);
    expect(deliveredMessage.metadata).toMatchObject({
      sender_agent_id: "member-sender-1",
      sender_agent_name: "Coordinator",
      original_message_type: "agent_message",
      team_run_id: "team-auto-1",
    });
    expect(team.postMessage.mock.calls[1]?.[1]).toBe("WorkerA");

    await expect(
      backend.approveToolInvocation("WorkerA", "inv-1", true, "approved"),
    ).resolves.toEqual({ accepted: true });
    expect(team.postToolExecutionApproval).toHaveBeenCalledWith(
      "WorkerA",
      "inv-1",
      true,
      "approved",
    );

    await expect(backend.interrupt()).resolves.toEqual({ accepted: true });
    expect(team.stop).toHaveBeenCalledTimes(1);

    await expect(backend.terminate()).resolves.toEqual({ accepted: true });
  });

  it("returns RUN_NOT_FOUND when the team is inactive", async () => {
    const { backend, setActive } = createBackend();
    setActive(false);

    await expect(
      backend.postMessage(new AgentInputUserMessage("hello"), "WorkerA"),
    ).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "sender-1",
        teamRunId: "team-auto-1",
        recipientMemberName: "WorkerA",
        content: "hello",
      }),
    ).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(
      backend.approveToolInvocation("WorkerA", "inv-1", true),
    ).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(backend.interrupt()).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
  });

  it("rebroadcasts agent, team, task-plan, and sub-team events into TeamRunEvent", async () => {
    const { backend, team } = createBackend();
    const observed: Array<Parameters<Parameters<typeof backend.subscribeToEvents>[0]>[0]> = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      observed.push(event);
    });

    const agentEvent = new StreamEvent({
      agent_id: "agent-42",
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_CONTENT",
        segment_id: "seg-42",
        segment_type: "text",
        payload: { delta: "hello" },
      },
    });
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "WorkerA",
          agent_event: agentEvent,
        }),
      }),
    );

    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "TEAM",
        data: new AgentTeamStatusUpdateData({
          old_status: "PROCESSING",
          new_status: "IDLE",
        }),
      }),
    );

    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "TASK_PLAN",
        data: {
          team_id: team.teamId,
          tasks: [],
        },
      }),
    );

    const nestedAgentEvent = new StreamEvent({
      agent_id: "agent-sub-7",
      event_type: StreamEventType.TOOL_EXECUTION_SUCCEEDED,
      data: {
        invocation_id: "inv-sub-1",
        tool_name: "read_file",
        result: { ok: true },
      },
    });
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "SUB_TEAM",
        data: new SubTeamEventRebroadcastPayload({
          sub_team_node_name: "ResearchTeam",
          sub_team_event: new AgentTeamStreamEvent({
            team_id: team.teamId,
            event_source_type: "AGENT",
            data: new AgentEventRebroadcastPayload({
              agent_name: "SubWorker",
              agent_event: nestedAgentEvent,
            }),
          }),
        }),
      }),
    );

    await waitForCondition(() => observed.length === 4);
    unsubscribe();

    expect(observed[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-auto-1",
      subTeamNodeName: null,
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "WorkerA",
        memberRunId: "agent-42",
        agentEvent: {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          runId: "agent-42",
          payload: {
            id: "seg-42",
            segment_type: "text",
            delta: "hello",
          },
        },
      },
    });

    expect(observed[1]).toEqual({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-auto-1",
      data: {
        old_status: "PROCESSING",
        new_status: "IDLE",
      },
      subTeamNodeName: null,
    });

    expect(observed[2]).toEqual({
      eventSourceType: TeamRunEventSourceType.TASK_PLAN,
      teamRunId: "team-auto-1",
      data: {
        team_id: "team-auto-1",
        tasks: [],
      },
      subTeamNodeName: null,
    });

    expect(observed[3]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-auto-1",
      subTeamNodeName: "ResearchTeam",
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "SubWorker",
        memberRunId: "agent-sub-7",
        agentEvent: {
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: "agent-sub-7",
          payload: {
            invocation_id: "inv-sub-1",
            tool_name: "read_file",
            result: { ok: true },
          },
        },
      },
    });
  });
});
