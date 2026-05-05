import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { EventType } from "autobyteus-ts/events/event-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { AutoByteusTeamRunBackend } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  AutoByteusTeamMemberContext,
  AutoByteusTeamRunContext,
} from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamCommunicationService } from "../../../src/services/team-communication/team-communication-service.js";
import { RunFileChangeService } from "../../../src/services/run-file-changes/run-file-change-service.js";

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

  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  emit(eventType: string, payload?: unknown): void {
    for (const listener of this.listeners.get(eventType) ?? []) {
      listener(payload);
    }
  }
}

const waitForCondition = async (
  fn: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) {
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

const createTeamRunConfig = (input: {
  teamRunId?: string;
  memoryDir?: string;
  workspaceRootPath?: string | null;
} = {}) => {
  const teamRunId = input.teamRunId ?? "team-auto-1";
  return new TeamRunConfig({
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.AUTOBYTEUS,
    coordinatorMemberName: "Professor",
    memberConfigs: [
      {
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "professor-run",
        agentDefinitionId: "professor-def",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memoryDir: input.memoryDir
          ? path.join(input.memoryDir, "agent_teams", teamRunId, "professor-run")
          : null,
        workspaceRootPath: input.workspaceRootPath ?? null,
      },
      {
        memberName: "Student",
        memberRouteKey: "student",
        memberRunId: "student-run",
        agentDefinitionId: "student-def",
        llmModelIdentifier: "dummy-model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memoryDir: input.memoryDir
          ? path.join(input.memoryDir, "agent_teams", teamRunId, "student-run")
          : null,
        workspaceRootPath: input.workspaceRootPath ?? null,
      },
    ],
  });
};

const createRuntimeContext = () =>
  new AutoByteusTeamRunContext({
    coordinatorMemberRouteKey: "professor",
    memberContexts: [
      new AutoByteusTeamMemberContext({
        memberName: "Professor",
        memberRouteKey: "professor",
        memberRunId: "professor-run",
        nativeAgentId: "native-professor",
      }),
      new AutoByteusTeamMemberContext({
        memberName: "Student",
        memberRouteKey: "student",
        memberRunId: "student-run",
        nativeAgentId: "native-student",
      }),
    ],
  });

const createBackend = (
  overrides: Partial<FakeTeam> = {},
  options: {
    runtimeContext?: AutoByteusTeamRunContext | null;
    teamRunConfig?: TeamRunConfig | null;
  } = {},
) => {
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
    memberRunIdsByName: new Map([
      ["Professor", "professor-run"],
      ["Student", "student-run"],
    ]),
    runtimeContext: options.runtimeContext,
    teamRunConfig: options.teamRunConfig,
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
    expect(backend.teamBackendKind).toBe(TeamBackendKind.AUTOBYTEUS);
    expect(backend.getRuntimeContext()).toBeNull();
    expect(backend.getStatus()).toBe("IDLE");

    const userMessage = new AgentInputUserMessage("hello team");
    await expect(backend.postMessage(userMessage, "WorkerA")).resolves.toMatchObject({
      accepted: true,
      memberName: "WorkerA",
      memberRunId: "WorkerA",
    });
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
    ).resolves.toMatchObject({ accepted: true });

    const deliveredMessage = team.postMessage.mock.calls[1]?.[0] as AgentInputUserMessage;
    expect(deliveredMessage).toBeInstanceOf(AgentInputUserMessage);
    expect(deliveredMessage.content).toBe(
      "You received a message from sender name: Coordinator, sender id: member-sender-1\nmessage:\nPlease investigate.",
    );
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
        turn_id: "turn-42",
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
        turn_id: "turn-sub-7",
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

  it("processes AutoByteus team stream events through the default pipeline and enriches explicit references", async () => {
    const { backend, team } = createBackend({}, {
      runtimeContext: createRuntimeContext(),
      teamRunConfig: createTeamRunConfig(),
    });
    const observed: Array<Parameters<Parameters<typeof backend.subscribeToEvents>[0]>[0]> = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      observed.push(event);
    });

    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Student",
          agent_event: new StreamEvent({
            agent_id: "native-student",
            event_type: StreamEventType.INTER_AGENT_MESSAGE,
            data: {
              sender_agent_id: "native-professor",
              recipient_role_name: "student",
              content: "Please solve the attached problem.",
              message_type: "direct_message",
              reference_files: ["/tmp/math_problem.md"],
            },
          }),
        }),
      }),
    );

    await waitForCondition(() => observed.length === 1);
    unsubscribe();

    const interAgentEvents = observed.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.INTER_AGENT_MESSAGE,
    );

    expect(interAgentEvents).toHaveLength(1);
    expect(interAgentEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-auto-1",
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Student",
        memberRunId: "student-run",
        agentEvent: {
          eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
          runId: "student-run",
          payload: {
            team_run_id: "team-auto-1",
            sender_agent_id: "professor-run",
            sender_agent_name: "Professor",
            receiver_run_id: "student-run",
            receiver_agent_name: "Student",
            content: "Please solve the attached problem.",
            message_type: "direct_message",
            reference_files: ["/tmp/math_problem.md"],
            reference_file_entries: [
              expect.objectContaining({
                path: "/tmp/math_problem.md",
                type: "file",
              }),
            ],
          },
        },
      },
    });
    expect((interAgentEvents[0].data as any).agentEvent.payload.message_id).toEqual(expect.any(String));
  });

  it("processes AutoByteus write_file events into FILE_CHANGE events and persists team-member projections", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-file-changes-"));
    const workspaceRootPath = path.join(memoryDir, "workspace");
    await fs.mkdir(workspaceRootPath, { recursive: true });
    const teamRunConfig = createTeamRunConfig({
      memoryDir,
      workspaceRootPath,
    });
    const runtimeContext = createRuntimeContext();
    const { backend, team } = createBackend({}, {
      runtimeContext,
      teamRunConfig,
    });
    const teamRun = new TeamRun({
      context: new TeamRunContext({
        runId: "team-auto-1",
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        coordinatorMemberName: "Professor",
        config: teamRunConfig,
        runtimeContext,
      }),
      backend,
    });
    const fileChangeService = new RunFileChangeService({ memoryDir });
    const unsubscribeProjection = fileChangeService.attachToTeamRun(teamRun);
    const observed: Array<Parameters<Parameters<typeof backend.subscribeToEvents>[0]>[0]> = [];
    const unsubscribeStream = backend.subscribeToEvents((event) => {
      observed.push(event);
    });

    const targetPath = path.join(workspaceRootPath, "math_problem.md");
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Professor",
          agent_event: new StreamEvent({
            agent_id: "native-professor",
            event_type: StreamEventType.TOOL_EXECUTION_STARTED,
            data: {
              invocation_id: "write-1",
              tool_name: "write_file",
              turn_id: "turn-write-1",
              arguments: { path: targetPath },
            },
          }),
        }),
      }),
    );
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Professor",
          agent_event: new StreamEvent({
            agent_id: "native-professor",
            event_type: StreamEventType.TOOL_EXECUTION_SUCCEEDED,
            data: {
              invocation_id: "write-1",
              tool_name: "write_file",
              turn_id: "turn-write-1",
              result: { ok: true },
            },
          }),
        }),
      }),
    );

    await waitForCondition(() =>
      observed.some(
        (event) =>
          event.eventSourceType === TeamRunEventSourceType.AGENT &&
          (event.data as any).agentEvent.eventType === AgentRunEventType.FILE_CHANGE &&
          (event.data as any).agentEvent.payload.status === "available",
      ),
    );
    const projectionPath = path.join(
      memoryDir,
      "agent_teams",
      "team-auto-1",
      "professor-run",
      "file_changes.json",
    );
    await waitForCondition(async () => {
      try {
        const raw = await fs.readFile(projectionPath, "utf-8");
        return raw.includes("math_problem.md");
      } catch {
        return false;
      }
    });

    unsubscribeStream();
    unsubscribeProjection();

    const fileChangeEvents = observed.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.FILE_CHANGE,
    );
    expect(fileChangeEvents).toHaveLength(2);
    const availableFileChangeEvent = fileChangeEvents.find(
      (event) => (event.data as any).agentEvent.payload.status === "available",
    );
    expect(availableFileChangeEvent).toMatchObject({
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Professor",
        memberRunId: "professor-run",
        agentEvent: {
          eventType: AgentRunEventType.FILE_CHANGE,
          runId: "professor-run",
          payload: {
            runId: "professor-run",
            path: targetPath,
            status: "available",
            sourceTool: "write_file",
            sourceInvocationId: "write-1",
          },
        },
      },
    });
    const persistedProjection = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    expect(persistedProjection.entries).toEqual([
      expect.objectContaining({
        runId: "professor-run",
        path: "math_problem.md",
        status: "available",
        sourceTool: "write_file",
      }),
    ]);
  });

  it("processes each AutoByteus native event once before multi-subscriber fanout", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-fanout-"));
    const workspaceRootPath = path.join(memoryDir, "workspace");
    await fs.mkdir(workspaceRootPath, { recursive: true });
    const { backend, team } = createBackend({}, {
      runtimeContext: createRuntimeContext(),
      teamRunConfig: createTeamRunConfig({
        memoryDir,
        workspaceRootPath,
      }),
    });
    const observerA: Array<Parameters<Parameters<typeof backend.subscribeToEvents>[0]>[0]> = [];
    const observerB: Array<Parameters<Parameters<typeof backend.subscribeToEvents>[0]>[0]> = [];
    const unsubscribeA = backend.subscribeToEvents((event) => {
      observerA.push(event);
    });
    const unsubscribeB = backend.subscribeToEvents((event) => {
      observerB.push(event);
    });

    expect(team.notifier.listenerCount(EventType.TEAM_STREAM_EVENT)).toBe(1);

    const targetPath = path.join(workspaceRootPath, "shared.md");
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Professor",
          agent_event: new StreamEvent({
            agent_id: "native-professor",
            event_type: StreamEventType.TOOL_EXECUTION_STARTED,
            data: {
              invocation_id: "write-shared",
              tool_name: "write_file",
              turn_id: "turn-shared",
              arguments: { path: targetPath },
            },
          }),
        }),
      }),
    );
    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Professor",
          agent_event: new StreamEvent({
            agent_id: "native-professor",
            event_type: StreamEventType.TOOL_EXECUTION_SUCCEEDED,
            data: {
              invocation_id: "write-shared",
              tool_name: "write_file",
              turn_id: "turn-shared",
              result: { ok: true },
            },
          }),
        }),
      }),
    );

    await waitForCondition(() =>
      [observerA, observerB].every((observed) =>
        observed.some(
          (event) =>
            event.eventSourceType === TeamRunEventSourceType.AGENT &&
            (event.data as any).agentEvent.eventType === AgentRunEventType.FILE_CHANGE &&
            (event.data as any).agentEvent.payload.status === "available",
        ),
      ),
    );

    const fileChangeEventsA = observerA.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.FILE_CHANGE,
    );
    const fileChangeEventsB = observerB.filter(
      (event) =>
        event.eventSourceType === TeamRunEventSourceType.AGENT &&
        (event.data as any).agentEvent.eventType === AgentRunEventType.FILE_CHANGE,
    );

    expect(fileChangeEventsA.map((event) => (event.data as any).agentEvent.payload.status)).toEqual([
      "pending",
      "available",
    ]);
    expect(fileChangeEventsB.map((event) => (event.data as any).agentEvent.payload.status)).toEqual([
      "pending",
      "available",
    ]);

    unsubscribeA();
    expect(team.notifier.listenerCount(EventType.TEAM_STREAM_EVENT)).toBe(1);
    unsubscribeB();
    await waitForCondition(() => team.notifier.listenerCount(EventType.TEAM_STREAM_EVENT) === 0);
  });

  it("persists AutoByteus explicit team communication references from enriched team events", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-message-refs-"));
    const teamRunConfig = createTeamRunConfig({ memoryDir });
    const runtimeContext = createRuntimeContext();
    const { backend, team } = createBackend({}, {
      runtimeContext,
      teamRunConfig,
    });
    const teamRun = new TeamRun({
      context: new TeamRunContext({
        runId: "team-auto-1",
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        coordinatorMemberName: "Professor",
        config: teamRunConfig,
        runtimeContext,
      }),
      backend,
    });
    const communicationService = new TeamCommunicationService({ memoryDir });
    const unsubscribeProjection = communicationService.attachToTeamRun(teamRun);
    const unsubscribeStream = backend.subscribeToEvents(() => undefined);

    team.notifier.emit(
      EventType.TEAM_STREAM_EVENT,
      new AgentTeamStreamEvent({
        team_id: team.teamId,
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "Student",
          agent_event: new StreamEvent({
            agent_id: "native-student",
            event_type: StreamEventType.INTER_AGENT_MESSAGE,
            data: {
              sender_agent_id: "native-professor",
              recipient_role_name: "student",
              content: "The worksheet is attached.",
              message_type: "direct_message",
              reference_files: ["/tmp/math_problem.md"],
            },
          }),
        }),
      }),
    );

    const projectionPath = path.join(
      memoryDir,
      "agent_teams",
      "team-auto-1",
      "team_communication_messages.json",
    );
    await waitForCondition(async () => {
      try {
        const raw = await fs.readFile(projectionPath, "utf-8");
        return raw.includes("/tmp/math_problem.md");
      } catch {
        return false;
      }
    });

    unsubscribeStream();
    unsubscribeProjection();

    const persistedProjection = JSON.parse(await fs.readFile(projectionPath, "utf-8"));
    expect(persistedProjection.messages).toEqual([
      expect.objectContaining({
        teamRunId: "team-auto-1",
        senderRunId: "professor-run",
        senderMemberName: "Professor",
        receiverRunId: "student-run",
        receiverMemberName: "Student",
        content: "The worksheet is attached.",
        messageType: "direct_message",
        referenceFiles: [
          expect.objectContaining({
            path: "/tmp/math_problem.md",
            type: "file",
          }),
        ],
      }),
    ]);
  });
});
