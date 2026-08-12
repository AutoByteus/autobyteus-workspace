import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedTeamRunBackend } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent, type TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const persistentAddress = createTeamExecutionAddress({
  rootTeamRunId: "team-mixed-1",
  memberAddress: "/Reviewer",
});

const createBackendContext = () => {
  const coordinator = testAgentNode("/Coordinator", {
    agentRunId: "coord-run",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  });
  const reviewer = testAgentNode("/Reviewer", {
    agentRunId: "reviewer-run",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  });
  const config = testTeamRunConfig({
    rootTeamRunId: "team-mixed-1",
    rootTeamDefinitionId: "team-def-mixed-1",
    coordinatorAddress: coordinator.address,
    children: [coordinator, reviewer],
  });
  return new TeamRunContext({
    teamRunId: "team-mixed-1",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: "team-mixed-1",
        memberAddress: "/Coordinator",
      }),
      memberContexts: [
        new MixedAgentMemberContext({
          address: coordinator.address,
          agentRunId: coordinator.agentRunId,
          runtimeKind: coordinator.runtimeKind,
          platformAgentRunId: "thread-coord-1",
        }),
        new MixedAgentMemberContext({
          address: reviewer.address,
          agentRunId: reviewer.agentRunId,
          runtimeKind: reviewer.runtimeKind,
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
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    hasOpenExecutionWork: vi.fn(() => false),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    executeMemberCommand: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverResolvedInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    resolveRecipient: vi.fn(),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
    settleMember: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskAgentExecution: vi.fn().mockResolvedValue({ accepted: true }),
    releaseTaskAgentExecutionWork: vi.fn(),
    settleTaskAgentExecution: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    markTaskTeamExecutionActive: vi.fn(),
    releaseTaskTeamExecutionWork: vi.fn(),
    postMessageToTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    settleTaskTeamExecution: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
    publishEvent: vi.fn(),
    openTaskActivationEventLease: vi.fn(),
    assertTaskActivationEventLeaseWithinBudget: vi.fn(),
    commitTaskActivationEventLease: vi.fn(),
    abortTaskActivationEventLease: vi.fn(),
    subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    emit(event: TeamRunEvent) {
      listeners.forEach((listener) => listener(event));
    },
    setActive(value: boolean) { active = value; },
  };
};

afterEach(() => vi.clearAllMocks());

describe("MixedTeamRunBackend integration", () => {
  it("routes current exact-address operations through the Team manager", async () => {
    const manager = createManager();
    const context = createBackendContext();
    const backend = new MixedTeamRunBackend(context, manager as never);
    const userMessage = new AgentInputUserMessage("coordinate the mixed task");

    expect(backend.teamRunId).toBe("team-mixed-1");
    expect(backend.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(backend.isActive()).toBe(true);
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);
    await expect(backend.postMessage(userMessage, "/Coordinator")).resolves.toEqual({ accepted: true });
    expect(manager.postMessage).toHaveBeenCalledWith(userMessage, "/Coordinator", null);

    const intent = {
      recipientAddress: "/Reviewer",
      caller: { rootTeamRunId: "team-mixed-1", memberAddress: "/Coordinator" },
      content: "Please continue.",
      messageType: "agent_message",
    } as const;
    await expect(backend.deliverInterAgentMessage(intent)).resolves.toEqual({ accepted: true });
    expect(manager.deliverInterAgentMessage).toHaveBeenCalledWith(intent);

    await expect(backend.approveToolInvocation("/Reviewer", "inv-1", true, "approved"))
      .resolves.toEqual({ accepted: true });
    expect(manager.approveToolInvocation).toHaveBeenCalledWith(
      "/Reviewer", "inv-1", true, "approved", null, null,
    );
    await expect(backend.interruptMember("/Reviewer", "reviewer-run"))
      .resolves.toEqual({ accepted: true });
    expect(manager.interruptMember).toHaveBeenCalledWith("/Reviewer", "reviewer-run");
    await expect(backend.executeMemberCommand(persistentAddress, { kind: "interrupt" }))
      .resolves.toEqual({ accepted: true });
    expect(manager.executeMemberCommand).toHaveBeenCalledWith(
      persistentAddress,
      { kind: "interrupt" },
    );
  });

  it("returns validation and inactive-run failures before effect", async () => {
    const manager = createManager();
    const backend = new MixedTeamRunBackend(createBackendContext(), manager as never);

    await expect(backend.postMessage(new AgentInputUserMessage("hello"), null)).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_REQUIRED",
    });
    expect(manager.postMessage).not.toHaveBeenCalled();

    manager.setActive(false);
    await expect(backend.postMessage(new AgentInputUserMessage("hello"), "/Coordinator"))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(backend.deliverInterAgentMessage({} as never))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(backend.approveToolInvocation("/Reviewer", "inv-1", true))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    await expect(backend.interruptMember("/Reviewer", "reviewer-run"))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    expect(manager.postMessage).not.toHaveBeenCalled();
    expect(manager.deliverInterAgentMessage).not.toHaveBeenCalled();
    expect(manager.approveToolInvocation).not.toHaveBeenCalled();
    expect(manager.interruptMember).not.toHaveBeenCalled();
  });

  it("forwards the current Agent event unchanged from the manager subscription", () => {
    const manager = createManager();
    const backend = new MixedTeamRunBackend(createBackendContext(), manager as never);
    const observed: TeamRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => observed.push(event));
    const event: TeamRunEvent = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: createTeamAgentExecutionBinding({
        executionAddress: createTeamExecutionAddress({
          rootTeamRunId: "team-mixed-1",
          memberAddress: "/Coordinator",
        }),
        agentRunId: "coord-run",
      }),
      payload: {
        eventType: "SEGMENT_CONTENT",
        details: { segmentId: "seg-1", turnId: "turn-1", segmentType: "text", delta: "hello" },
        statusHint: null,
      },
    };

    manager.emit(event);
    expect(observed).toEqual([event]);
    unsubscribe();
    manager.emit(event);
    expect(observed).toEqual([event]);
  });
});
