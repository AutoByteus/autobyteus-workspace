import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  MemberTeamContext,
  type AgentMemberTeamDescriptor,
  type MemberTeamRecipientDescriptor,
  type ParentBoundaryCommunicationContext,
} from "../../../src/agent-team-execution/domain/member-team-context.js";
import { buildTeamMemberAddress } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { composeMemberRunInstructions } from "../../../src/agent-team-execution/services/member-run-instruction-composer.js";

const agentDescriptor = (input: {
  teamRunId: string;
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind;
  role?: string | null;
  description?: string | null;
}): AgentMemberTeamDescriptor => {
  const memberPath = input.memberRouteKey.split("/");
  return {
    memberKind: "agent",
    memberName: input.memberName,
    memberPath,
    memberRouteKey: input.memberRouteKey,
    memberRunId: input.memberRunId,
    runtimeKind: input.runtimeKind ?? RuntimeKind.CODEX_APP_SERVER,
    role: input.role ?? null,
    description: input.description ?? null,
    address: buildTeamMemberAddress({
      teamRunId: input.teamRunId,
      memberPath,
      memberRouteKey: input.memberRouteKey,
    }),
  };
};

const recipient = (input: {
  teamRunId: string;
  recipientName: string;
  scope: MemberTeamRecipientDescriptor["scope"];
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  role?: string | null;
  description?: string | null;
}): MemberTeamRecipientDescriptor => {
  const memberPath = input.memberRouteKey.split("/");
  return {
    recipientName: input.recipientName,
    scope: input.scope,
    participant: {
      memberKind: "agent",
      memberName: input.memberName,
      memberPath,
      memberRouteKey: input.memberRouteKey,
      memberRunId: input.memberRunId,
      address: buildTeamMemberAddress({
        teamRunId: input.teamRunId,
        memberPath,
        memberRouteKey: input.memberRouteKey,
      }),
      platformRunId: null,
      teamDefinitionId: null,
      representedSubTeam: null,
    },
    delivery: {
      teamRunId: input.teamRunId,
      selector: { kind: "route_key", memberRouteKey: input.memberRouteKey },
    },
    role: input.role ?? null,
    description: input.description ?? null,
  };
};

const buildReviewLeadContext = (): MemberTeamContext => {
  const parentBoundary: ParentBoundaryCommunicationContext = {
    parentTeamRunId: "team-parent",
    parentTeamDefinitionId: "delivery-leadership-team",
    parentTeamName: "Delivery Leadership Team",
    representedSubTeam: {
      memberKind: "agent_team",
      memberName: "BuildSquad",
      memberPath: ["BuildSquad"],
      memberRouteKey: "BuildSquad",
      memberRunId: "run-build-squad",
      teamDefinitionId: "build-squad-team",
      childTeamRunId: "team-child",
      address: buildTeamMemberAddress({
        teamRunId: "team-parent",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
      }),
    },
    parentMembers: [
      agentDescriptor({
        teamRunId: "team-parent",
        memberName: "program_manager",
        memberRouteKey: "program_manager",
        memberRunId: "run-program-manager",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
    ],
  };
  return new MemberTeamContext({
    teamRunId: "team-child",
    teamDefinitionId: "build-squad-team",
    teamName: "BuildSquad",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "review_lead",
    memberPath: ["review_lead"],
    memberRouteKey: "review_lead",
    memberRunId: "run-review-lead",
    coordinatorMemberRouteKey: "review_lead",
    teamInstruction: "Coordinate carefully.",
    members: [
      agentDescriptor({
        teamRunId: "team-child",
        memberName: "review_lead",
        memberRouteKey: "review_lead",
        memberRunId: "run-review-lead",
      }),
      agentDescriptor({
        teamRunId: "team-child",
        memberName: "qa_specialist",
        memberRouteKey: "qa_specialist",
        memberRunId: "run-qa",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
    ],
    parentBoundary,
    communicationRecipients: [
      recipient({
        teamRunId: "team-child",
        recipientName: "qa_specialist",
        scope: "local_agent",
        memberName: "qa_specialist",
        memberRouteKey: "qa_specialist",
        memberRunId: "run-qa",
      }),
      recipient({
        teamRunId: "team-parent",
        recipientName: "program_manager",
        scope: "parent_boundary_agent",
        memberName: "program_manager",
        memberRouteKey: "program_manager",
        memberRunId: "run-program-manager",
      }),
    ],
    allowedRecipientNames: ["qa_specialist", "program_manager"],
    sendMessageToEnabled: true,
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  });
};

describe("member-run-instruction-composer", () => {
  it("composes definition instructions separately from runtime constraints", () => {
    const memberTeamContext = buildReviewLeadContext();
    const composition = composeMemberRunInstructions({
      teamInstruction: "Coordinate with the team and hand off clearly.",
      agentInstruction: "You focus on implementation details.",
      memberTeamContext,
      sendMessageToEnabled: true,
    });

    expect(composition.teamInstruction).toBe("Coordinate with the team and hand off clearly.");
    expect(composition.agentInstruction).toBe("You focus on implementation details.");
    expect(composition.runtimeInstruction).toContain("Current team member: review_lead");
    expect(composition.runtimeInstruction).toContain(
      "If you use `send_message_to`, set `recipient_name` to exactly match one allowed recipient name from the team membership roster below.",
    );
    expect(composition.runtimeInstruction).toContain(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    expect(composition.runtimeInstruction).toContain(
      "When sending files the teammate may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files` for Team Communication messages.",
    );
    expect(composition.runtimeInstruction).toContain(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
  });

  it("renders AC-032 nested recipient instructions as a team membership roster manifest", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildReviewLeadContext(),
      sendMessageToEnabled: true,
    });

    expect(composition.runtimeInstruction).toContain("Team membership roster");
    expect(composition.runtimeInstruction).toContain("You are: review_lead");
    expect(composition.runtimeInstruction).toContain("1. BuildSquad");
    expect(composition.runtimeInstruction).toContain("Your role: coordinator");
    expect(composition.runtimeInstruction).toContain("- review_lead (you, coordinator)");
    expect(composition.runtimeInstruction).toContain("- qa_specialist");
    expect(composition.runtimeInstruction).toContain("2. Delivery Leadership Team");
    expect(composition.runtimeInstruction).toContain("Your role: BuildSquad representative");
    expect(composition.runtimeInstruction).toContain("- program_manager");
    expect(composition.runtimeInstruction).toContain("- review_lead (you, representing BuildSquad)");
    expect(composition.runtimeInstruction).toContain(
      "When using send_message_to, recipient_name must exactly match one of:",
    );
    expect(composition.runtimeInstruction).toContain("- qa_specialist");
    expect(composition.runtimeInstruction).toContain("- program_manager");
    expect(composition.runtimeInstruction).not.toContain("Teammates:");
    expect(composition.runtimeInstruction).not.toContain("local_agent");
    expect(composition.runtimeInstruction).not.toContain("parent_boundary_agent");
    expect(composition.runtimeInstruction).not.toContain("local child-team recipients");
    expect(composition.runtimeInstruction).not.toContain("parent-boundary recipients");
  });

  it("degrades cleanly when only one instruction source exists", () => {
    const memberTeamContext = new MemberTeamContext({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberName: "Professor",
      memberRouteKey: "professor",
      memberRunId: "run-professor",
    });
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: "Only the agent instruction is available.",
      memberTeamContext,
      sendMessageToEnabled: false,
    });

    expect(composition.teamInstruction).toBeNull();
    expect(composition.agentInstruction).toBe("Only the agent instruction is available.");
    expect(composition.runtimeInstruction).toContain("Current team member: Professor");
    expect(composition.runtimeInstruction).not.toContain("Do not attempt `send_message_to`");
  });

  it("warns about send_message_to only when recipients exist but the tool is not exposed", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildReviewLeadContext(),
      sendMessageToEnabled: false,
    });

    expect(composition.runtimeInstruction).toContain(
      "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
    );
  });
});
