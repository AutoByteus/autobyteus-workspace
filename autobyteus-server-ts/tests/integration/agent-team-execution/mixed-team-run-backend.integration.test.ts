import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { MixedTeamRunBackend } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createBackendContext = () => {
  const config = new TeamRunConfig({
    teamDefinitionId: "team-def-mixed-1",
    teamBackendKind: TeamBackendKind.MIXED,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentDefinitionId: "agent-coordinator",
        llmModelIdentifier: "gpt-5.4-mini",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        workspaceId: "workspace-coordinator",
        llmConfig: { reasoning_effort: "medium" },
      },
      {
        memberName: "Reviewer",
        memberRouteKey: "reviewer-route",
        memberRunId: "reviewer-run",
        agentDefinitionId: "agent-reviewer",
        llmModelIdentifier: "haiku",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        workspaceId: "workspace-reviewer",
        llmConfig: { reasoning_effort: "medium" },
      },
    ],
  });

  return new TeamRunContext({
    runId: "team-mixed-1",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "coord-route",
      memberContexts: [
        new MixedAgentMemberContext({
          memberName: "Coordinator",
          memberPath: ["Coordinator"],
          memberRouteKey: "coord-route",
          memberRunId: "coord-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "thread-coord-1",
        }),
        new MixedAgentMemberContext({
          memberName: "Reviewer",
          memberPath: ["Reviewer"],
          memberRouteKey: "reviewer-route",
          memberRunId: "reviewer-run",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          platformAgentRunId: "session-reviewer-1",
        }),
      ],
    }),
  });
};

const createManager = () => {
  let active = true;
  const listeners = new Set<TeamRunEventListener>();

  return {
    hasActiveMembers: vi.fn(() => active),
    getStatusSnapshot: vi.fn(() => ({ status: "idle" })),
    getMemberStatusSnapshots: vi.fn(() => []),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
    subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    emit(event: TeamRunEvent) {
      for (const listener of listeners) {
        listener(event);
      }
    },
    setActive(value: boolean) {
      active = value;
    },
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("MixedTeamRunBackend integration", () => {
  it("routes backend operations through the team manager and exposes runtime state", async () => {
    const manager = createManager();
    const context = createBackendContext();
    const backend = new MixedTeamRunBackend(context, manager as any);

    expect(backend.runId).toBe("team-mixed-1");
    expect(backend.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(backend.isActive()).toBe(true);
    expect(backend.getStatusSnapshot()).toEqual({ status: "idle" });
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);

    const userMessage = new AgentInputUserMessage("coordinate the mixed task");
    await expect(
      backend.postMessage(userMessage, { kind: "route_key", memberRouteKey: "coord-route" }),
    ).resolves.toEqual({
      accepted: true,
    });
    expect(manager.postMessage).toHaveBeenCalledWith(userMessage, {
      kind: "route_key",
      memberRouteKey: "coord-route",
    });

    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "coord-run",
        senderSelector: { kind: "route_key", memberRouteKey: "coord-route" },
        senderMemberName: "Coordinator",
        senderPath: ["Coordinator"],
        senderRouteKey: "coord-route",
        teamRunId: "team-mixed-1",
        recipientSelector: { kind: "route_key", memberRouteKey: "reviewer-route" },
        recipientMemberName: "Reviewer",
        recipientPath: ["Reviewer"],
        recipientRouteKey: "reviewer-route",
        content: "Please continue.",
        messageType: "agent_message",
      }),
    ).resolves.toEqual({ accepted: true });
    expect(manager.deliverInterAgentMessage).toHaveBeenCalledWith({
      senderRunId: "coord-run",
      senderSelector: { kind: "route_key", memberRouteKey: "coord-route" },
      senderMemberName: "Coordinator",
      senderPath: ["Coordinator"],
      senderRouteKey: "coord-route",
      teamRunId: "team-mixed-1",
      recipientSelector: { kind: "route_key", memberRouteKey: "reviewer-route" },
      recipientMemberName: "Reviewer",
      recipientPath: ["Reviewer"],
      recipientRouteKey: "reviewer-route",
      content: "Please continue.",
      messageType: "agent_message",
    });

    await expect(
      backend.approveToolInvocation(
        { kind: "route_key", memberRouteKey: "reviewer-route" },
        "inv-1",
        true,
        "approved",
      ),
    ).resolves.toEqual({ accepted: true });
    expect(manager.approveToolInvocation).toHaveBeenCalledWith(
      { kind: "route_key", memberRouteKey: "reviewer-route" },
      "inv-1",
      true,
      "approved",
    );

    await expect(backend.interrupt()).resolves.toEqual({ accepted: true });
    expect(manager.interrupt).toHaveBeenCalledTimes(1);

    await expect(backend.terminate()).resolves.toEqual({ accepted: true });
    expect(manager.terminate).toHaveBeenCalledTimes(1);
  });

  it("returns validation and inactive-run failures before delegating", async () => {
    const manager = createManager();
    const backend = new MixedTeamRunBackend(createBackendContext(), manager as any);

    await expect(
      backend.postMessage(new AgentInputUserMessage("hello"), null),
    ).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_REQUIRED",
    });
    expect(manager.postMessage).not.toHaveBeenCalled();

    manager.setActive(false);

    await expect(
      backend.postMessage(
        new AgentInputUserMessage("hello"),
        { kind: "route_key", memberRouteKey: "coord-route" },
      ),
    ).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "coord-run",
        senderSelector: { kind: "route_key", memberRouteKey: "coord-route" },
        senderMemberName: "Coordinator",
        senderPath: ["Coordinator"],
        senderRouteKey: "coord-route",
        teamRunId: "team-mixed-1",
        recipientSelector: { kind: "route_key", memberRouteKey: "reviewer-route" },
        recipientMemberName: "Reviewer",
        recipientPath: ["Reviewer"],
        recipientRouteKey: "reviewer-route",
        content: "hello",
      }),
    ).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(
      backend.approveToolInvocation(
        { kind: "route_key", memberRouteKey: "reviewer-route" },
        "inv-1",
        true,
      ),
    ).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(backend.interrupt()).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(backend.terminate()).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    expect(backend.getStatusSnapshot()).toEqual({ status: "idle" });
  });

  it("forwards team events from the manager subscription", () => {
    const manager = createManager();
    const backend = new MixedTeamRunBackend(createBackendContext(), manager as any);
    const observed: TeamRunEvent[] = [];

    const unsubscribe = backend.subscribeToEvents((event) => {
      observed.push(event);
    });

    manager.emit({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-mixed-1",
      sourcePath: ["Coordinator"],
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "Coordinator",
        memberPath: ["Coordinator"],
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentEvent: {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          runId: "coord-run",
          payload: {
            id: "seg-1",
            segment_type: "text",
            delta: "hello",
          },
        },
      },
    });

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-mixed-1",
      sourcePath: ["Coordinator"],
      data: {
        memberName: "Coordinator",
        memberPath: ["Coordinator"],
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentEvent: {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
        },
      },
    });

    unsubscribe();
    manager.emit({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-mixed-1",
      sourcePath: [],
      data: {
        status: "idle",
      },
    });
    expect(observed).toHaveLength(1);
  });
});
