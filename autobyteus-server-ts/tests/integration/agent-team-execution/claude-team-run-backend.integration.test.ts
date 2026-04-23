import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeTeamRunBackend } from "../../../src/agent-team-execution/backends/claude/claude-team-run-backend.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";

const createMemberContext = (input: {
  memberName: string;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  sessionId?: string | null;
}) =>
  new ClaudeTeamMemberContext({
    memberName: input.memberName,
    memberRouteKey: input.memberRouteKey ?? input.memberName,
    memberRunId: input.memberRunId ?? input.memberName,
    sessionId: input.sessionId ?? null,
    agentRunConfig: new AgentRunConfig({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      agentDefinitionId: `agent-${input.memberName}`,
      llmModelIdentifier: "haiku",
      autoExecuteTools: false,
      workspaceId: `workspace-${input.memberName}`,
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: SkillAccessMode.NONE,
    }),
  });

const createBackendContext = () => {
  const config = new TeamRunConfig({
    teamDefinitionId: "team-def-claude-1",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentDefinitionId: "agent-coordinator",
        llmModelIdentifier: "haiku",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        workspaceId: "workspace-coordinator",
        llmConfig: { reasoning_effort: "medium" },
      },
    ],
  });

  return new TeamRunContext({
    runId: "team-claude-1",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    config,
    runtimeContext: new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: "coord-route",
      memberContexts: [
        createMemberContext({
          memberName: "Coordinator",
          memberRouteKey: "coord-route",
          memberRunId: "coord-run",
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

describe("ClaudeTeamRunBackend integration", () => {
  it("routes backend operations through the team manager and exposes runtime state", async () => {
    const manager = createManager();
    const context = createBackendContext();
    const backend = new ClaudeTeamRunBackend(context, {
      claudeTeamManager: manager as any,
    });

    expect(backend.runId).toBe("team-claude-1");
    expect(backend.teamBackendKind).toBe(TeamBackendKind.CLAUDE_AGENT_SDK);
    expect(backend.isActive()).toBe(true);
    expect(backend.getStatus()).toBe("IDLE");
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);

    const userMessage = new AgentInputUserMessage("coordinate the task");
    await expect(backend.postMessage(userMessage, "  Coordinator  ")).resolves.toEqual({
      accepted: true,
    });
    expect(manager.postMessage).toHaveBeenCalledWith(userMessage, "Coordinator");

    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "sender-run-1",
        senderMemberName: "Lead",
        teamRunId: "team-claude-1",
        recipientMemberName: "Coordinator",
        content: "Please continue.",
        messageType: "agent_message",
      }),
    ).resolves.toEqual({ accepted: true });
    expect(manager.deliverInterAgentMessage).toHaveBeenCalledWith({
      senderRunId: "sender-run-1",
      senderMemberName: "Lead",
      teamRunId: "team-claude-1",
      recipientMemberName: "Coordinator",
      content: "Please continue.",
      messageType: "agent_message",
    });

    await expect(
      backend.approveToolInvocation("Coordinator", "inv-1", true, "approved"),
    ).resolves.toEqual({ accepted: true });
    expect(manager.approveToolInvocation).toHaveBeenCalledWith(
      "Coordinator",
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
    const backend = new ClaudeTeamRunBackend(createBackendContext(), {
      claudeTeamManager: manager as any,
    });

    await expect(
      backend.postMessage(new AgentInputUserMessage("hello"), null),
    ).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_REQUIRED",
    });
    expect(manager.postMessage).not.toHaveBeenCalled();

    manager.setActive(false);

    await expect(
      backend.postMessage(new AgentInputUserMessage("hello"), "Coordinator"),
    ).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(
      backend.deliverInterAgentMessage({
        senderRunId: "sender-run-1",
        teamRunId: "team-claude-1",
        recipientMemberName: "Coordinator",
        content: "hello",
      }),
    ).resolves.toMatchObject({
      accepted: false,
      code: "RUN_NOT_FOUND",
    });
    await expect(
      backend.approveToolInvocation("Coordinator", "inv-1", true),
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
    expect(backend.getStatus()).toBeNull();
  });

  it("forwards team events from the manager subscription", () => {
    const manager = createManager();
    const backend = new ClaudeTeamRunBackend(createBackendContext(), {
      claudeTeamManager: manager as any,
    });
    const observed: TeamRunEvent[] = [];

    const unsubscribe = backend.subscribeToEvents((event) => {
      observed.push(event);
    });

    manager.emit({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-claude-1",
      data: {
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberName: "Coordinator",
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
      teamRunId: "team-claude-1",
      data: {
        memberName: "Coordinator",
        memberRunId: "coord-run",
        agentEvent: {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
        },
      },
    });

    unsubscribe();
    manager.emit({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-claude-1",
      data: {
        old_status: "PROCESSING",
        new_status: "IDLE",
      },
    });
    expect(observed).toHaveLength(1);
  });
});
