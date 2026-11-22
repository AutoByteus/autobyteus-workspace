import { messageFeedInto } from "../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import type { RootMessageAppend } from "../../../src/agent-collaboration/execution/communication/root-message-append.js";
import { runAppendDurably } from "../agent-collaboration/helpers/communication-port-double.js";
import { describe, expect, it, vi } from "vitest";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RunViewStream } from "../../../src/agent-collaboration/delegation/run-view-stream.js";
import type { AgentRunInputReservationResult } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { agentOrgMessageEvent, isAgentOrgMessageEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { CrossRunMessageDelivery } from "../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgentRunIds } from "../../helpers/run-agents-reader.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL } from "../../helpers/explicit-host-collaborators.js";

type ReservedAgentInput = Extract<AgentRunInputReservationResult, { reserved: true }>;

const createSubject = (options: Readonly<{
  persistence?: (orgRunId: string) => AgentOrgRunPersistenceCoordinator;
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
  const tree = base;
  const order: string[] = [];
  const reservations: ReservedAgentInput[] = [];
  const events: AgentOrgRunEvent[] = [];
  const sequences: number[] = [];
  const publisher = new RunViewStream<AgentOrgRunEvent>({ isMessageEvent: isAgentOrgMessageEvent });
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
  const run = new AgentOrgRun({ remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, delegationIndex: noDelegations(), taskRecords: openTaskRecords(),
    root,
    tree,
    messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
    rootAgents: {
      get: vi.fn(() => ({})),
      isActive: vi.fn(() => true),
      reserveInput: reserveRootAgentInput,
      listHandles: vi.fn(() => []),
      getStatusSnapshots: vi.fn(() => []),
      isTaskLive: vi.fn(() => true),
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
      commitMessageAppend: vi.fn(runAppendDurably),
    } as never,
    publisher, messageFeed: messageFeedInto(publisher, agentOrgMessageEvent, root),
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
        commitMessageAppend: vi.fn(async (append: RootMessageAppend) => {
          const prepared = append.prepare();
          if (prepared.kind !== "append") return { outcome: prepared.kind };
          append.cancelBeforeDurability();
          return { outcome: "not_committed" as const, cause: new Error("write failed") };
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
        communicationStore: {
          appendMessage: vi.fn(async () => ({ outcome: "committed" as const, file: "communication_messages" })),
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


it("correlates a committed receiver presentation against the retained tree identity rather than runtime liveness", async () => {
  const { AgentInputUserMessage } = await import("autobyteus-ts/agent/message/agent-input-user-message.js");
  const subject = createSubject();
  const message = { messageId: "committed-before-settlement", senderAgentRunId: "direct-run", receiverAgentRunId: "mounted-run",
    content: "Accepted work", messageType: "agent_message", referenceFiles: [], createdAt: "2026-09-06T00:00:59.000Z" };
  // Exercise only the post-commit callback, not a new admission (which would wake a shut-down child).
  const committed = (subject.run as unknown as { delivery: { presentCommittedCommunication(message: unknown, receiverInput: unknown): void } }).delivery;
  expect(() => committed.presentCommittedCommunication(message, new AgentInputUserMessage("Accepted work"))).not.toThrow();
  expect(subject.events).toHaveLength(1);
  expect(subject.events[0]).toMatchObject({ kind: "agent_presentation", execution: { agentRunId: "mounted-run" },
    message: { type: "MEMBER_INPUT_MESSAGE", payload: { content: "Accepted work" } } });
  expect(subject.reserveRootAgentInput).not.toHaveBeenCalled();
});

it("a message from a run the Org delegated to is presented and the Org stays up, by run ID and by address (autobyteus-461 CR-461-018)", async () => {
  const enterPersistenceFailStop = vi.fn();
  const subject = createSubject({
    persistence: (orgRunId) => new AgentOrgRunPersistenceCoordinator({
      orgRunId, orgMemoryDir: "/memory/org-communication", executionTreeStore: {} as never,
      communicationStore: { appendMessage: vi.fn(async () => ({ outcome: "committed" as const, file: "communication_messages" })) } as never,
      enterPersistenceFailStop,
    }),
  });
  // The Org's director delegated Task T4 to a copy of a team; its lead messages the director back (contract §5.3 O6/O7).
  const org = createAgentOrgRootExecutionIdentity("org-communication");
  const devTeam = { rootSubjectKind: "agent_team" as const, rootRunId: "dev-team-copy" };
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (run) =>
    run.rootRunId === "dev-team-copy" ? ["dev-lead-run"] : run.rootRunId === "org-communication" ? ["direct-run", "observer-run"] : null));
  tree.build(); tasks.setEntriesListener(tree); tasks.addTask("T4");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T4", recipientAddress: "/dev_team",
    delegatedFrom: { delegatingRun: org, delegatorAgentRunId: "direct-run" }, execution: { teamRunId: "dev-team-copy" }, teamCoordinatorAgentRunId: "dev-lead-run" });
  await tasks.markStarted({ teamRunId: "dev-team-copy" });
  const senderLog: string[] = [];
  let next = 0;
  const delivery = new CrossRunMessageDelivery({ runningAgents: { rootOf: () => null }, activeReceiverRoot: () => null, runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null }, tree: () => tree, peerNotices: { changed: async () => ({ confirmed: true as const }) }, tasks: () => tasks, senderAddress: async () => null,
    senderRoot: () => ({
      prepareSendToRun: (input: { senderIdentity: { agentRunId: string }; receiverAgentRunId: string; content: string }) => ({ ok: true as const,
        message: { messageId: `cross-${++next}`, senderAgentRunId: input.senderIdentity.agentRunId, receiverAgentRunId: input.receiverAgentRunId,
          content: input.content, messageType: "agent_message", referenceFiles: [], createdAt: "2026-11-12T00:00:00.000Z" } }),
      commitSentToRun: async (message: { messageId: string }) => { senderLog.push(message.messageId); },
    }) as never,
    receiverRoot: async (run) => run.rootRunId === "org-communication" ? subject.run : null,
  });
  const sender = createCollaborationMemberExecutionIdentity({ root: devTeam, memberAddress: "/dev_lead", agentRunId: "dev-lead-run" });
  const send = (shownAs?: string) => delivery.route({ sender, senderDisplayName: "dev_lead", targetAgentRunId: "direct-run",
    ...(shownAs ? { shownAs } : {}), content: "The release is ready for sign-off.", messageType: "agent_message", referenceFiles: [] });

  await expect(send()).resolves.toMatchObject({ accepted: true, agentRunId: "direct-run", message: "Message delivered." });
  await expect(send("/director")).resolves.toMatchObject({ accepted: true, agentRunId: "direct-run", message: "Delivered message to /director." });

  // The sender's run records both; the director's input is presented; the Org did not fail-stop.
  expect(senderLog).toEqual(["cross-1", "cross-2"]);
  expect(subject.events.filter((event) => event.kind === "agent_presentation")).toEqual([
    expect.objectContaining({ execution: expect.objectContaining({ agentRunId: "direct-run" }) }),
    expect.objectContaining({ execution: expect.objectContaining({ agentRunId: "direct-run" }) }),
  ]);
  await Promise.resolve();
  expect(enterPersistenceFailStop).not.toHaveBeenCalled();
  expect(subject.run.isActive()).toBe(true);
});
