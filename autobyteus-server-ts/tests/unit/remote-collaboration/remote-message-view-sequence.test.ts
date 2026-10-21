import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { RootCommunicationEngine } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { delegatedRunEndpoint } from "../../../src/agent-collaboration/execution/remote/remote-endpoint.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createTeamRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher, type SequencedRootEvent } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { AgentOrgCommunicationAdapter } from "../../../src/agent-org-execution/services/agent-org-communication-adapter.js";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { PreparedTeamMessageAppend } from "../../../src/agent-team-execution/services/team-run-persistence-contract.js";
import { COORDINATING_LOG } from "../../../src/run-history/store/task-agent-message-logs.js";
import { projectAgentCollaborationEvent } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectAgentOrgExecutionEvent } from "../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectSequencedTeamRunEvent } from "../../../src/services/agent-streaming/team-execution-view-projector.js";
import { TeamCommunicationAdapter } from "../../../src/services/team-communication/team-communication-adapter.js";
import type { StandaloneRootEvent } from "../../../src/standalone-agent-run-root/domain/standalone-root-event.js";
import { StandaloneRootCommunicationAdapter } from "../../../src/standalone-agent-run-root/services/standalone-root-communication-adapter.js";

/**
 * CR-001: a message with a remote endpoint stays in the root's message state, but is not published to the
 * root's view stream, so the projected stream keeps consecutive change sequences (every web client treats a
 * gap as "reopen required") and its communication events have both endpoints in the tree.
 */

const REMOTE = "remote-run";
const LEAD = "lead-run";
const WRITER = "writer-run";

const member = (root: RootExecutionIdentity, agentRunId: string): CollaborationMemberExecutionIdentity =>
  Object.freeze({ root, memberAddress: `/${agentRunId}`, agentRunId });
const reservation = (agentRunId: string) => Object.freeze({ agentRunId, cancel: vi.fn(), commit: vi.fn(() => Object.freeze({ release: vi.fn() })) });
const persistence = () => ({
  commitCommunication: vi.fn(async (input: { commitAfterDurability(): void }) => { input.commitAfterDurability(); return { committed: true as const }; }),
});

/** Local message, message to the remote run, reply from it, local message: the order a delegator's view sees. */
const runConversation = async (engine: RootCommunicationEngine, root: RootExecutionIdentity) => {
  const deliverLocal = (content: string) => engine.deliver({
    senderIdentity: member(root, LEAD), senderDisplayName: "lead", senderAddress: null,
    receiverIdentity: member(root, WRITER), receiverDisplayName: "writer", content,
  });
  await expect(deliverLocal("first local")).resolves.toMatchObject({ accepted: true });
  const endpoint = delegatedRunEndpoint({ kind: "agent", address: "/publisher", agentRunId: REMOTE, nodeId: "srv_peer", delegatorAgentRunId: LEAD, startedAt: "2026-10-20T09:00:00.000Z" });
  const prepared = engine.prepareRemoteSend({ senderIdentity: member(root, LEAD), endpoint, content: "to remote" });
  if (!prepared.ok) throw new Error(prepared.refusal.message);
  await expect(engine.commitSentToRemote(prepared)).resolves.toMatchObject({ accepted: true });
  const reply: CollaborationCommunicationMessage = Object.freeze({
    messageId: "msg_from_remote", senderAgentRunId: REMOTE, receiverAgentRunId: LEAD, content: "reply from remote",
    messageType: "agent_message", referenceFiles: Object.freeze([]), createdAt: "2026-10-20T10:00:00.000Z",
  });
  await expect(engine.acceptFromRemote({ message: reply, endpoint, receiverIdentity: member(root, LEAD), receiverDisplayName: "lead", senderNodeName: "docker" }))
    .resolves.toMatchObject({ accepted: true });
  await expect(deliverLocal("second local")).resolves.toMatchObject({ accepted: true });
  // The root's message state keeps both remote messages (logs and the local agent's stream show them).
  expect(engine.getMessages().map((message) => message.content)).toEqual(["first local", "to remote", "reply from remote", "second local"]);
};

const collect = <TEvent>(publisher: RootEventPublisher<TEvent>) => {
  const events: SequencedRootEvent<TEvent>[] = [];
  publisher.subscribe((event) => events.push(event));
  return events;
};

const expectConsecutive = (sequences: readonly number[]) => {
  expect(sequences.length).toBeGreaterThan(0);
  expect(sequences).toEqual(sequences.map((_, index) => index + 1));
};

describe("messages with a remote endpoint keep the root view stream consecutive (CR-001)", () => {
  it("Team root: no COMMUNICATION event for them; the member-input of the reply follows without a gap", async () => {
    const root = createTeamRootExecutionIdentity("team-root");
    const publisher = new RootEventPublisher<TeamRunEvent>();
    const events = collect(publisher);
    const adapter = new TeamCommunicationAdapter({
      rootTeamRunId: "team-root",
      initial: Object.freeze({ schemaVersion: 1 as const, rootTeamRunId: "team-root", messages: Object.freeze([]) }),
      isCurrentAgent: () => true,
      messageLogOwnerOf: () => COORDINATING_LOG,
      assertDeliveryAllowed: () => undefined,
      requireContainingTeamRun: vi.fn(async () => ({
        reserveDirectAgentInput: vi.fn(async (agentRunId: string) => ({ reserved: true as const, reservation: reservation(agentRunId) })),
      }) as unknown as TeamRun),
      commit: vi.fn(async (plan: PreparedTeamMessageAppend) => {
        const prepared = plan.prepareAgainstCurrent();
        if (!prepared.prepared) return { outcome: "conflict" as const, code: prepared.code, message: prepared.message };
        prepared.commit.commitAfterDurability();
        return { outcome: "committed" as const };
      }),
      publish: (event) => { publisher.publish(event); },
      replaceSnapshot: vi.fn(),
    }, () => true);

    await runConversation(new RootCommunicationEngine(adapter), root);

    const projected = events.map((event) => projectSequencedTeamRunEvent({} as never, event) as { type: string; payload: Record<string, any> });
    expectConsecutive(projected.map((message) => message.payload.change_sequence));
    expect(projected.map((message) => message.type)).toEqual([
      "TEAM_COMMUNICATION_MESSAGE", "MEMBER_INPUT_MESSAGE", // first local
      "MEMBER_INPUT_MESSAGE", // the reply from the remote run, to the lead
      "TEAM_COMMUNICATION_MESSAGE", "MEMBER_INPUT_MESSAGE", // second local
    ]);
    expect(projected[2]!.payload).toMatchObject({ recipient_agent_run_id: LEAD, sender_agent_run_id: REMOTE });
    for (const message of projected.filter((entry) => entry.type === "TEAM_COMMUNICATION_MESSAGE")) {
      expect([message.payload.message.sender_agent_run_id, message.payload.message.receiver_agent_run_id]).not.toContain(REMOTE);
    }
    expect(events.filter((event) => event.event.eventSourceType === TeamRunEventSourceType.COMMUNICATION)).toHaveLength(2);
  });

  it.each([
    {
      kind: "Agent root (standalone)",
      root: createAgentRootExecutionIdentity(LEAD),
      build: (root: RootExecutionIdentity, publisher: RootEventPublisher<StandaloneRootEvent>) => new StandaloneRootCommunicationAdapter({
        root, persistence: persistence() as never, initial: { schemaVersion: 1, subjectKind: "agent", hostRunId: LEAD, messages: [] },
        isOpen: () => true, isCurrentAgent: () => true, messageLogOwnerOf: () => COORDINATING_LOG, assertDeliveryAllowed: () => undefined,
        reserveRecipientInput: vi.fn(async (agentRunId: string) => ({ reserved: true as const, reservation: reservation(agentRunId) })),
        replaceMessages: vi.fn(), publish: (message) => { publisher.publish({ kind: "communication", message }); }, presentCommittedMessage: vi.fn(),
      }),
      project: (event: SequencedRootEvent<StandaloneRootEvent>) => projectAgentCollaborationEvent(LEAD, {} as never, event),
    },
    {
      kind: "Org root",
      root: createAgentOrgRootExecutionIdentity("org-root"),
      build: (root: RootExecutionIdentity, publisher: RootEventPublisher<AgentOrgRunEvent>) => new AgentOrgCommunicationAdapter({
        root, persistence: persistence() as never, initial: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [] },
        isOpen: () => true, isCurrentAgent: () => true, messageLogOwnerOf: () => COORDINATING_LOG, assertDeliveryAllowed: () => undefined,
        reserveRecipientInput: vi.fn(async (agentRunId: string) => ({ reserved: true as const, reservation: reservation(agentRunId) })),
        replaceMessages: vi.fn(), publish: (message) => { publisher.publish({ kind: "communication", message }); }, presentCommittedMessage: vi.fn(),
      }),
      project: (event: SequencedRootEvent<AgentOrgRunEvent>) => projectAgentOrgExecutionEvent({ orgRunId: "org-root" } as never, event),
    },
  ] as const)("$kind: only the local messages are published, with consecutive sequences", async ({ root, build, project }) => {
    const publisher = new RootEventPublisher<never>();
    const events = collect(publisher);
    await runConversation(new RootCommunicationEngine(build(root, publisher as never) as never), root);

    const projected = events.map((event) => project(event as never));
    expectConsecutive(projected.map((dto) => dto!.change_sequence));
    expect(projected.map((dto) => (dto!.event as { message: { content: string } }).message.content)).toEqual(["first local", "second local"]);
  });
});
