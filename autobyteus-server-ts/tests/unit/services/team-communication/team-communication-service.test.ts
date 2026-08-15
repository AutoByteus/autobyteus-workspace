import { describe, expect, it, vi } from "vitest";
import { buildDeliveryEndpointForParticipant } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { TeamMemberExecutionIdentity } from "../../../../src/agent-team-execution/domain/team-member-execution-identity.js";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import type { PreparedTeamMessageAppend } from "../../../../src/agent-team-execution/services/team-run-persistence-contract.js";
import { TeamCommunicationService } from "../../../../src/services/team-communication/team-communication-service.js";

const rootTeamRunId = "root-team-run";
const senderIdentity: TeamMemberExecutionIdentity = Object.freeze({
  rootTeamRunId,
  memberAddress: "/sender",
  agentRunId: "sender-run",
});
const receiverIdentity: TeamMemberExecutionIdentity = Object.freeze({
  rootTeamRunId,
  memberAddress: "/squad/receiver",
  agentRunId: "receiver-run",
});

const sender = buildDeliveryEndpointForParticipant(Object.freeze({
  kind: "agent" as const,
  identity: senderIdentity,
  displayName: "sender",
}));

const buildHarness = (input: {
  currentAgent?: (identity: TeamMemberExecutionIdentity) => boolean;
  commit?: (plan: PreparedTeamMessageAppend) => Promise<
    | { outcome: "committed" }
    | { outcome: "conflict"; code: "TEAM_MESSAGE_COMMIT_CONFLICT"; message: string }
  >;
} = {}) => {
  const cancel = vi.fn();
  const release = vi.fn();
  const reservationCommit = vi.fn(() => Object.freeze({ release }));
  const reserveDirectAgentInput = vi.fn(async () => ({
    reserved: true as const,
    reservation: Object.freeze({ agentRunId: receiverIdentity.agentRunId, cancel, commit: reservationCommit }),
  }));
  const publish = vi.fn();
  const replaceSnapshot = vi.fn();
  const commit = vi.fn(input.commit ?? (async (plan: PreparedTeamMessageAppend) => {
    const prepared = plan.prepareAgainstCurrent();
    if (!prepared.prepared) {
      return { outcome: "conflict" as const, code: prepared.code, message: prepared.message };
    }
    prepared.commit.commitAfterDurability();
    return { outcome: "committed" as const };
  }));
  const service = new TeamCommunicationService({
    rootTeamRunId,
    initial: Object.freeze({ schemaVersion: 1 as const, rootTeamRunId, messages: Object.freeze([]) }),
    isCurrentAgent: input.currentAgent ?? (() => true),
    requireContainingTeamRun: vi.fn(async () => ({ reserveDirectAgentInput }) as unknown as TeamRun),
    commit,
    publish,
    replaceSnapshot,
  });
  return { service, cancel, release, reservationCommit, reserveDirectAgentInput, publish, replaceSnapshot, commit };
};

const intent = (overrides: Record<string, unknown> = {}) => ({
  rootTeamRunId,
  sender,
  recipientAddress: "/squad/receiver",
  content: "Please review the attached report.",
  messageType: "handoff",
  referenceFiles: ["/tmp/report.md"],
  ...overrides,
});

describe("TeamCommunicationService", () => {
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
    expect(harness.commit).toHaveBeenCalledOnce();
    expect(harness.reservationCommit).toHaveBeenCalledOnce();
    expect(harness.release).toHaveBeenCalledOnce();
    expect(harness.cancel).not.toHaveBeenCalled();
    expect(harness.service.getSnapshot()).toMatchObject({
      schemaVersion: 1,
      rootTeamRunId,
      messages: [{
        senderAgentRunId: "sender-run",
        receiverAgentRunId: "receiver-run",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: ["/tmp/report.md"],
      }],
    });
    expect(harness.replaceSnapshot).toHaveBeenCalledWith(harness.service.getSnapshot());
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
    expect(harness.service.getSnapshot().messages).toEqual([]);
    expect(harness.reserveDirectAgentInput).not.toHaveBeenCalled();
    expect(harness.commit).not.toHaveBeenCalled();
  });
});
