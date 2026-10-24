import { describe, expect, it, vi } from "vitest";
import { COORDINATING_LOG } from "../../../../src/run-history/store/task-agent-message-logs.js";
import { buildDeliveryEndpointForParticipant } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { CollaborationMemberExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import type { RootMessageAppend } from "../../../../src/agent-collaboration/execution/communication/root-message-append.js";
import { RootCommunicationEngine } from "../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { InterAgentMessageDeliveryIntent } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { createTeamCommunicationPort } from "../../../../src/services/team-communication/team-communication-port.js";
import { runAppendDurably } from "../../agent-collaboration/helpers/communication-port-double.js";

const rootTeamRunId = "root-team-run";
const root = Object.freeze({ rootSubjectKind: "agent_team" as const, rootRunId: rootTeamRunId });
const senderIdentity: CollaborationMemberExecutionIdentity = Object.freeze({
  root,
  memberAddress: "/sender",
  agentRunId: "sender-run",
});
const receiverIdentity: CollaborationMemberExecutionIdentity = Object.freeze({
  root,
  memberAddress: "/squad/receiver",
  agentRunId: "receiver-run",
});

const sender = buildDeliveryEndpointForParticipant(Object.freeze({
  kind: "agent" as const,
  identity: senderIdentity,
  displayName: "sender",
}));

const buildHarness = (input: {
  assertDeliveryAllowed?: (senderAgentRunId: string, receiverAgentRunId: string) => void;
  currentAgent?: (identity: CollaborationMemberExecutionIdentity) => boolean;
  commit?: (append: RootMessageAppend) => Promise<{ outcome: "committed" } | { outcome: "conflict" }>;
} = {}) => {
  const cancel = vi.fn();
  const release = vi.fn();
  const reservationCommit = vi.fn(() => Object.freeze({ release }));
  const reserveDirectAgentInput = vi.fn(async () => ({
    reserved: true as const,
    reservation: Object.freeze({ agentRunId: receiverIdentity.agentRunId, cancel, commit: reservationCommit }),
  }));
  const publish = vi.fn();
  const commit = vi.fn(input.commit ?? runAppendDurably);
  const assertDeliveryAllowed = vi.fn(input.assertDeliveryAllowed ?? (() => undefined));
  const engine = new RootCommunicationEngine(createTeamCommunicationPort({
    rootTeamRunId,
    initial: Object.freeze({ schemaVersion: 1 as const, rootTeamRunId, messages: Object.freeze([]) }),
    assertDeliveryAllowed,
    isCurrentAgent: input.currentAgent ?? (() => true),
    messageLogOwnerOf: () => COORDINATING_LOG,
    requireContainingTeamRun: vi.fn(async () => ({ reserveDirectAgentInput }) as unknown as TeamRun),
    commitMessageAppend: commit,
    publish,
  }));
  /** The Team root's delivery hands the engine one intent at a time (TeamRunMessageDelivery). */
  const service = {
    deliver: (delivery: { intent: InterAgentMessageDeliveryIntent; receiverIdentity: CollaborationMemberExecutionIdentity; receiverDisplayName: string }) => engine.deliver({
      senderIdentity: delivery.intent.sender.participant.identity,
      senderDisplayName: delivery.intent.sender.participant.displayName,
      senderAddress: null,
      receiverIdentity: delivery.receiverIdentity,
      receiverDisplayName: delivery.receiverDisplayName,
      content: delivery.intent.content,
      messageType: delivery.intent.messageType,
      referenceFiles: delivery.intent.referenceFiles,
    }),
    getMessages: () => engine.getMessages(),
    closeAdmission: () => engine.closeAdmission(),
  };
  return { service, assertDeliveryAllowed, cancel, release, reservationCommit, reserveDirectAgentInput, publish, commit };
};

const intent = (overrides: Record<string, unknown> = {}): InterAgentMessageDeliveryIntent => ({
  rootTeamRunId,
  sender,
  recipientAddress: "/squad/receiver",
  content: "Please review the attached report.",
  messageType: "handoff",
  referenceFiles: ["/tmp/report.md"],
  ...overrides,
}) as never;

describe("RootCommunicationEngine with the Team port", () => {
  it("does not reserve or persist input when the current lifetime fence rejects delivery", async () => {
    const harness = buildHarness({ assertDeliveryAllowed: () => { throw new Error("TASK_LIFETIME_CLOSED"); } });
    await expect(harness.service.deliver({ intent: intent(), receiverIdentity, receiverDisplayName: "receiver" }))
      .rejects.toThrow("TASK_LIFETIME_CLOSED");
    expect(harness.assertDeliveryAllowed).toHaveBeenCalledWith(senderIdentity.agentRunId, receiverIdentity.agentRunId);
    expect(harness.reserveDirectAgentInput).not.toHaveBeenCalled();
    expect(harness.commit).not.toHaveBeenCalled();
    expect(harness.release).not.toHaveBeenCalled();
    expect(harness.service.getMessages()).toEqual([]);
  });
  it("commits one root-owned message and only then releases exact receiver input", async () => {
    const harness = buildHarness();

    await expect(harness.service.deliver({
      intent: intent(),
      receiverIdentity,
      receiverDisplayName: "receiver",
    })).resolves.toEqual({ accepted: true, agentRunId: "receiver-run", displayName: "receiver" });

    expect(harness.reserveDirectAgentInput).toHaveBeenCalledWith(
      "receiver-run",
      expect.objectContaining({
        content: expect.stringContaining("Please review the attached report."),
        metadata: expect.objectContaining({
          team_run_id: rootTeamRunId,
          sender_agent_id: "sender-run",
          receiver_member_address: "/squad/receiver",
          reference_files: ["/tmp/report.md"],
        }),
      }),
    );
    expect(harness.assertDeliveryAllowed).toHaveBeenCalledWith(senderIdentity.agentRunId, receiverIdentity.agentRunId);
    expect(harness.commit).toHaveBeenCalledOnce();
    expect(harness.reservationCommit).toHaveBeenCalledOnce();
    expect(harness.release).toHaveBeenCalledOnce();
    expect(harness.cancel).not.toHaveBeenCalled();
    expect(harness.service.getMessages()).toMatchObject([{
        senderAgentRunId: "sender-run",
        receiverAgentRunId: "receiver-run",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: ["/tmp/report.md"],
      }]);
    expect(harness.publish.mock.calls.map(([event]) => event.eventSourceType)).toEqual([
      TeamRunEventSourceType.COMMUNICATION,
      TeamRunEventSourceType.MEMBER_INPUT,
    ]);
  });

  it("rejects a self target before reservation or persistence", async () => {
    const harness = buildHarness();

    await expect(harness.service.deliver({
      intent: intent({ recipientAddress: "/sender" }),
      receiverIdentity: senderIdentity,
      receiverDisplayName: "sender",
    })).resolves.toMatchObject({ accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED" });
    expect(harness.reserveDirectAgentInput).not.toHaveBeenCalled();
    expect(harness.commit).not.toHaveBeenCalled();
  });

  it("rejects stale execution identity before reserving receiver input", async () => {
    const harness = buildHarness({ currentAgent: (identity) => identity.agentRunId !== "receiver-run" });

    await expect(harness.service.deliver({
      intent: intent(),
      receiverIdentity,
      receiverDisplayName: "receiver",
    })).resolves.toMatchObject({ accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED" });
    expect(harness.reserveDirectAgentInput).not.toHaveBeenCalled();
  });

  it("closes admission without fallback and leaves the V1 snapshot unchanged", async () => {
    const harness = buildHarness();
    harness.service.closeAdmission();

    await expect(harness.service.deliver({
      intent: intent(),
      receiverIdentity,
      receiverDisplayName: "receiver",
    })).resolves.toMatchObject({ accepted: false, code: "TEAM_RUN_NOT_ACCEPTING_MESSAGES" });
    expect(harness.service.getMessages()).toEqual([]);
    expect(harness.reserveDirectAgentInput).not.toHaveBeenCalled();
    expect(harness.commit).not.toHaveBeenCalled();
  });
});
