import { describe, expect, it, vi } from "vitest";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import type { AgentRunInputReservationResult } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

type ReservedAgentInput = Extract<AgentRunInputReservationResult, { reserved: true }>;

const createSubject = (options: Readonly<{
  persistence?: (orgRunId: string) => AgentOrgRunPersistenceCoordinator;
  settledTask?: boolean;
}> = {}) => {
  const orgRunId = "org-communication";
  const root = createAgentOrgRootExecutionIdentity(orgRunId);
  const direct = testOrgAgentNode("/director", "direct-run");
  const secondDirect = testOrgAgentNode("/observer", "observer-run");
  const mounted = testOrgAgentNode("/team/reviewer", "mounted-run");
  const secondMounted = testOrgAgentNode("/other/reviewer", "other-mounted-run");
  const team = testOrgTeamNode({
    address: "/team",
    teamRunId: "team-run",
    coordinatorAddress: mounted.address,
    members: [mounted, testOrgAgentNode("/team/second", "mounted-second-run")],
  });
  const otherTeam = testOrgTeamNode({
    address: "/other",
    teamRunId: "other-team-run",
    coordinatorAddress: secondMounted.address,
    members: [secondMounted],
  });
  const base = testAgentOrgExecutionTree({
    orgRunId,
    members: [direct, secondDirect, team, otherTeam],
  });
  const firstTask = {
    address: direct.address,
    agentRunId: "task-one-run",
    platformAgentRunId: null,
    startedAt: "2026-09-06T00:00:00.000Z",
    settledAt: options.settledTask ? "2026-09-06T00:01:00.000Z" : null,
  } as const;
  const secondTask = {
    address: mounted.address,
    agentRunId: "task-two-run",
    platformAgentRunId: null,
    startedAt: "2026-09-06T00:00:01.000Z",
    settledAt: null,
  } as const;
  const taskTeamMember = {
    address: mounted.address,
    agentRunId: "task-team-member-run",
    platformAgentRunId: null,
  } as const;
  const secondTaskTeamMember = {
    address: "/team/second",
    agentRunId: "task-team-member-two-run",
    platformAgentRunId: null,
  } as const;
  const taskTeam = {
    address: team.address,
    teamRunId: "task-team-run",
    members: [taskTeamMember, secondTaskTeamMember],
    taskExecutions: [],
    startedAt: "2026-09-06T00:00:02.000Z",
    settledAt: null,
  } as const;
  const tree = {
    ...base,
    rootOrg: { ...base.rootOrg, taskExecutions: [firstTask, secondTask, taskTeam] },
  };
  const order: string[] = [];
  const reservations: ReservedAgentInput[] = [];
  const events: AgentOrgRunEvent[] = [];
  const sequences: number[] = [];
  const publisher = new RootEventPublisher<AgentOrgRunEvent>();
  publisher.subscribe(({ event, changeSequence }) => {
    events.push(event);
    sequences.push(changeSequence);
    order.push(event.kind === "agent_presentation" ? event.message.type : event.kind);
  });
  function reservation(agentRunId: string): ReservedAgentInput {
    const value = {
      reserved: true as const,
      reservation: {
        agentRunId,
        cancel: vi.fn(),
        commit: vi.fn(() => {
          order.push("reservation_commit");
          return { release: vi.fn(() => { order.push("release"); }) };
        }),
      },
    };
    reservations.push(value);
    return value;
  }
  const reserveRootAgentInput = vi.fn(async (agentRunId: string): Promise<AgentRunInputReservationResult> => reservation(agentRunId));
  const run = new AgentOrgRun({
    root,
    tree,
    tasks: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: [] },
    messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
    rootAgents: {
      get: vi.fn(() => ({})),
      isActive: vi.fn(() => true),
      reserveInput: reserveRootAgentInput,
      listHandles: vi.fn(() => []),
    } as never,
    teams: {
      get: vi.fn(() => ({ isActive: () => true })),
      require: vi.fn(() => ({
        reserveDirectAgentInput: async (agentRunId: string) => reservation(agentRunId),
      })),
      list: vi.fn(() => []),
    } as never,
    callbacks: {} as never,
    persistence: options.persistence?.(orgRunId) ?? {
      commitCommunication: vi.fn(async (input) => {
        input.commitAfterDurability();
        return { committed: true as const };
      }),
    } as never,
    publisher,
    taskExecutionIdentity: {} as never,
  });
  run.activate();
  const sender = (agentRunId: string, memberAddress: string) => ({
    kind: "agent" as const,
    identity: createCollaborationMemberExecutionIdentity({ root, agentRunId, memberAddress }),
    displayName: memberAddress.split("/").at(-1) ?? agentRunId,
  });
  return {
    run,
    direct,
    secondDirect,
    mounted,
    secondMounted,
    firstTask,
    secondTask,
    taskTeamMember,
    secondTaskTeamMember,
    events,
    sequences,
    order,
    publisher,
    reservations,
    reserveRootAgentInput,
    sender,
  };
};

describe("AgentOrg committed communication presentation", () => {
  it("publishes one root row then the configured receiver input before releasing delivery", async () => {
    const subject = createSubject();

    await expect(subject.run.deliverExactAgentMessage({
      sender: subject.sender(subject.direct.agentRunId, subject.direct.address),
      targetAgentRunId: subject.mounted.agentRunId,
      content: "Review this result.",
      messageType: "handoff",
      referenceFiles: ["/workspace/result.md"],
    })).resolves.toMatchObject({ accepted: true, agentRunId: subject.mounted.agentRunId });

    expect(subject.order).toEqual([
      "reservation_commit",
      "communication",
      "MEMBER_INPUT_MESSAGE",
      "release",
    ]);
    expect(subject.sequences).toEqual([1, 2]);
    expect(subject.run.getCommunicationSnapshot().messages).toHaveLength(1);
    const communication = subject.events[0];
    const receiverInput = subject.events[1];
    expect(communication).toMatchObject({ kind: "communication", message: {
      senderAgentRunId: subject.direct.agentRunId,
      receiverAgentRunId: subject.mounted.agentRunId,
      referenceFiles: ["/workspace/result.md"],
    } });
    expect(receiverInput).toMatchObject({
      kind: "agent_presentation",
      execution: { agentRunId: subject.mounted.agentRunId, memberAddress: subject.mounted.address },
      message: { type: "MEMBER_INPUT_MESSAGE", payload: {
        sender_agent_run_id: subject.direct.agentRunId,
      } },
    });
    if (communication?.kind !== "communication" || receiverInput?.kind !== "agent_presentation") {
      throw new Error("Expected correlated communication presentation events.");
    }
    expect(receiverInput.message.payload).toMatchObject({
      parent_communication_message_id: communication.message.messageId,
      received_at: communication.message.createdAt,
    });
  });

  it.each([
    ["direct to direct", "direct-run", "/director", "observer-run"],
    ["mounted to direct", "mounted-run", "/team/reviewer", "direct-run"],
    ["mounted to mounted across Teams", "mounted-run", "/team/reviewer", "other-mounted-run"],
  ])("keeps configured-pair presentation exact for %s", async (
    _label,
    senderAgentRunId,
    senderAddress,
    targetAgentRunId,
  ) => {
    const subject = createSubject();

    await expect(subject.run.deliverExactAgentMessage({
      sender: subject.sender(senderAgentRunId, senderAddress),
      targetAgentRunId,
      content: "Configured-pair update.",
    })).resolves.toMatchObject({ accepted: true, agentRunId: targetAgentRunId });

    expect(subject.order).toEqual([
      "reservation_commit",
      "communication",
      "MEMBER_INPUT_MESSAGE",
      "release",
    ]);
    expect(subject.sequences).toEqual([1, 2]);
    expect(subject.events).toHaveLength(2);
    expect(subject.events[1]).toMatchObject({
      kind: "agent_presentation",
      execution: { agentRunId: targetAgentRunId },
      message: { type: "MEMBER_INPUT_MESSAGE" },
    });
  });

  it.each([
    ["configured to task", "direct-run", "/director", "task-one-run"],
    ["task to configured", "task-one-run", "/director", "mounted-run"],
    ["task to task", "task-one-run", "/director", "task-two-run"],
    ["configured to task-Team member", "direct-run", "/director", "task-team-member-run"],
    ["task-Team member to configured", "task-team-member-run", "/team/reviewer", "direct-run"],
    ["task to task-Team member", "task-one-run", "/director", "task-team-member-run"],
    ["task-Team member to task", "task-team-member-run", "/team/reviewer", "task-one-run"],
    ["task-Team member to task-Team member", "task-team-member-run", "/team/reviewer", "task-team-member-two-run"],
  ])("presents accepted %s delivery once for the exact receiver", async (
    _label,
    senderAgentRunId,
    senderAddress,
    targetAgentRunId,
  ) => {
    const subject = createSubject();

    await expect(subject.run.deliverExactAgentMessage({
      sender: subject.sender(senderAgentRunId, senderAddress),
      targetAgentRunId,
      content: "Task-scoped update.",
    })).resolves.toMatchObject({ accepted: true, agentRunId: targetAgentRunId });

    expect(subject.order).toEqual(["reservation_commit", "communication", "MEMBER_INPUT_MESSAGE", "release"]);
    expect(subject.sequences).toEqual([1, 2]);
    expect(subject.events).toHaveLength(2);
    expect(subject.events[1]).toMatchObject({ kind: "agent_presentation",
      execution: { agentRunId: targetAgentRunId }, message: { type: "MEMBER_INPUT_MESSAGE",
        payload: { content: expect.stringContaining("Task-scoped update."), sender_agent_run_id: senderAgentRunId } } });
    expect(subject.events[0]?.kind).toBe("communication");
    expect(subject.run.getCommunicationSnapshot().messages).toHaveLength(1);
  });

  it("keeps rejected and pre-durability-failed configured messages out of both presentations", async () => {
    const rejected = createSubject();
    rejected.reserveRootAgentInput.mockResolvedValueOnce({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: "Agent input is not accepting work.",
    });

    await expect(rejected.run.deliverExactAgentMessage({
      sender: rejected.sender(rejected.mounted.agentRunId, rejected.mounted.address),
      targetAgentRunId: rejected.direct.agentRunId,
      content: "Do not present this rejected message.",
    })).resolves.toMatchObject({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT" });
    expect(rejected.events).toEqual([]);
    expect(rejected.run.getCommunicationSnapshot().messages).toEqual([]);

    const uncommitted = createSubject({
      persistence: () => ({
        commitCommunication: vi.fn(async (input) => {
          input.cancelBeforeDurability();
          return {
            committed: false as const,
            code: "AGENT_ORG_MESSAGE_HISTORY_COMMIT_FAILED",
            message: "write failed",
          };
        }),
      } as never),
    });
    await expect(uncommitted.run.deliverExactAgentMessage({
      sender: uncommitted.sender(uncommitted.mounted.agentRunId, uncommitted.mounted.address),
      targetAgentRunId: uncommitted.direct.agentRunId,
      content: "Do not present this uncommitted message.",
    })).resolves.toMatchObject({
      accepted: false,
      code: "AGENT_ORG_MESSAGE_HISTORY_COMMIT_FAILED",
    });
    expect(uncommitted.events).toEqual([]);
    expect(uncommitted.run.getCommunicationSnapshot().messages).toEqual([]);
    expect(uncommitted.reservations[0]?.reservation.cancel).toHaveBeenCalledTimes(1);
    expect(uncommitted.reservations[0]?.reservation.commit).not.toHaveBeenCalled();
  });

  it("releases durable input and fail-stops persistence if receiver presentation fails", async () => {
    const enterPersistenceFailStop = vi.fn();
    const subject = createSubject({
      persistence: (orgRunId) => new AgentOrgRunPersistenceCoordinator({
        orgRunId,
        orgMemoryDir: "/memory/org-communication",
        executionTreeStore: {} as never,
        taskRecordsStore: {} as never,
        communicationStore: {
          write: vi.fn(async () => ({ outcome: "committed" as const, file: "communication_messages" })),
        } as never,
        enterPersistenceFailStop,
      }),
    });
    const publish = subject.publisher.publish.bind(subject.publisher);
    vi.spyOn(subject.publisher, "publish").mockImplementation((event) => {
      if (event.kind === "agent_presentation") throw new Error("receiver presentation failed");
      return publish(event);
    });

    await expect(subject.run.deliverExactAgentMessage({
      sender: subject.sender(subject.direct.agentRunId, subject.direct.address),
      targetAgentRunId: subject.mounted.agentRunId,
      content: "Durable before presentation failure.",
    })).rejects.toMatchObject({
      name: "RootTaskPersistenceFinalizationIndeterminateError",
      stage: "post_durability_publication",
    });
    expect(subject.order).toEqual(["reservation_commit", "communication", "release"]);
    expect(subject.run.getCommunicationSnapshot().messages).toHaveLength(1);
    expect(enterPersistenceFailStop).toHaveBeenCalledTimes(1);

    await expect(subject.run.deliverExactAgentMessage({
      sender: subject.sender(subject.direct.agentRunId, subject.direct.address),
      targetAgentRunId: subject.secondDirect.agentRunId,
      content: "Must remain blocked after fail-stop.",
    })).rejects.toMatchObject({ name: "AgentOrgPersistenceFailStoppedError" });
    expect(subject.reservations[1]?.reservation.cancel).toHaveBeenCalledTimes(1);
    expect(subject.events).toHaveLength(1);
  });
});


it("correlates a committed receiver presentation against retained rather than live-only task identity", async () => {
  const { AgentInputUserMessage } = await import("autobyteus-ts/agent/message/agent-input-user-message.js");
  const subject = createSubject({ settledTask: true });
  const message = { messageId: "committed-before-settlement", senderAgentRunId: "direct-run", receiverAgentRunId: "task-one-run",
    content: "Accepted work", messageType: "agent_message", referenceFiles: [], createdAt: "2026-09-06T00:00:59.000Z" };
  // Exercise only the post-commit callback, not a new admission to a settled task.
  const committed = subject.run as unknown as { presentCommittedCommunication(message: unknown, receiverInput: unknown): void };
  expect(() => committed.presentCommittedCommunication(message, new AgentInputUserMessage("Accepted work"))).not.toThrow();
  expect(subject.events).toHaveLength(1);
  expect(subject.events[0]).toMatchObject({ kind: "agent_presentation", execution: { agentRunId: "task-one-run" },
    message: { type: "MEMBER_INPUT_MESSAGE", payload: { content: "Accepted work" } } });
  expect(subject.reserveRootAgentInput).not.toHaveBeenCalled();
});
