import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";

describe("MemberTeamContextBuilder", () => {
  it("derives teammate manifest, allowed recipients, and send-message capability once", async () => {
    const deliverInterAgentMessage = vi.fn().mockResolvedValue({ accepted: true });
    const builder = new MemberTeamContextBuilder({
      getDefinitionById: vi.fn().mockResolvedValue({
        instructions: "Coordinate carefully.",
      }),
    } as any);

    const result = await builder.build({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "Professor",
      currentMemberRouteKey: "professor",
      currentMemberRunId: "run-professor",
      members: [
        {
          memberName: "Professor",
          memberPath: ["professor"],
          memberRouteKey: "professor",
          memberRunId: "run-professor",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          role: "lead",
          description: "Leads the work.",
        },
        {
          memberName: "Writer",
          memberPath: ["writer"],
          memberRouteKey: "writer",
          memberRunId: "run-writer",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          role: "writer",
          description: "Drafts the answer.",
        },
      ],
      deliverInterAgentMessage,
    });

    expect(result.teamInstruction).toBe("Coordinate carefully.");
    expect(result.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(result.memberName).toBe("Professor");
    expect(result.members).toEqual([
      expect.objectContaining({ memberName: "Professor", runtimeKind: RuntimeKind.AUTOBYTEUS }),
      expect.objectContaining({ memberName: "Writer", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
    ]);
    expect(result.allowedRecipientNames).toEqual(["Writer"]);
    expect(result.sendMessageToEnabled).toBe(true);
    expect(result.deliverInterAgentMessage).toBe(deliverInterAgentMessage);
  });

  it("exposes subteam representatives by visible leaf name while preserving represented-subteam identity", async () => {
    const builder = new MemberTeamContextBuilder({
      getDefinitionById: vi.fn().mockResolvedValue({ instructions: "" }),
    } as any);

    const result = await builder.build({
      teamRunId: "team-parent",
      teamDefinitionId: "team-def",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "program_manager",
      currentMemberPath: ["program_manager"],
      currentMemberRouteKey: "program_manager",
      currentMemberRunId: "run-program-manager",
      members: [
        {
          memberName: "program_manager",
          memberPath: ["program_manager"],
          memberRouteKey: "program_manager",
          memberRunId: "run-program-manager",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        },
        {
          memberKind: "agent_team",
          memberName: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
          memberRunId: "run-build-squad",
          teamDefinitionId: "build-squad-team",
          coordinatorMemberRouteKey: "BuildSquad/review_lead",
          representative: {
            memberKind: "agent",
            memberName: "review_lead",
            memberPath: ["BuildSquad", "review_lead"],
            memberRouteKey: "BuildSquad/review_lead",
            memberRunId: "run-review-lead",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            role: "reviewer",
            description: "Coordinates implementation review.",
          },
        },
      ],
      deliverInterAgentMessage: vi.fn(),
    });

    expect(result.allowedRecipientNames).toEqual(["review_lead"]);
    expect(result.communicationRecipients).toHaveLength(1);
    expect(result.communicationRecipients[0]).toEqual(expect.objectContaining({
      recipientName: "review_lead",
      scope: "subteam_representative",
      delivery: {
        teamRunId: "team-parent",
        selector: { kind: "route_key", memberRouteKey: "BuildSquad/review_lead" },
      },
    }));
    expect(result.communicationRecipients[0]?.participant).toEqual(expect.objectContaining({
      memberName: "review_lead",
      memberRouteKey: "BuildSquad/review_lead",
      representedSubTeam: expect.objectContaining({
        memberName: "BuildSquad",
        memberRouteKey: "BuildSquad",
      }),
    }));
  });

  it("adds parent boundary recipients only for the represented child coordinator", async () => {
    const builder = new MemberTeamContextBuilder({
      getDefinitionById: vi.fn().mockResolvedValue({ instructions: "" }),
    } as any);
    const parentMember = {
      memberKind: "agent" as const,
      memberName: "program_manager",
      memberPath: ["program_manager"],
      memberRouteKey: "program_manager",
      memberRunId: "run-program-manager",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      role: "manager",
      description: "Owns the parent plan.",
      address: {
        teamRunId: "team-parent",
        memberPath: ["program_manager"],
        memberRouteKey: "program_manager",
      },
    };
    const baseInput = {
      teamRunId: "team-child",
      teamDefinitionId: "child-team",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "review_lead",
      members: [
        {
          memberName: "review_lead",
          memberPath: ["review_lead"],
          memberRouteKey: "review_lead",
          memberRunId: "run-review-lead",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
        {
          memberName: "qa_specialist",
          memberPath: ["qa_specialist"],
          memberRouteKey: "qa_specialist",
          memberRunId: "run-qa",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        },
      ],
      parentBoundary: {
        parentTeamRunId: "team-parent",
        representedSubTeam: {
          memberKind: "agent_team" as const,
          memberName: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
          memberRunId: "run-build-squad",
          teamDefinitionId: "child-team",
          address: {
            teamRunId: "team-parent",
            memberPath: ["BuildSquad"],
            memberRouteKey: "BuildSquad",
          },
        },
        parentMembers: [parentMember],
      },
      deliverInterAgentMessage: vi.fn(),
    };

    const coordinator = await builder.build({
      ...baseInput,
      currentMemberName: "review_lead",
      currentMemberPath: ["review_lead"],
      currentMemberRouteKey: "review_lead",
      currentMemberRunId: "run-review-lead",
    });
    expect(coordinator.allowedRecipientNames).toEqual(["qa_specialist", "program_manager"]);
    expect(coordinator.communicationRecipients.map((recipient) => recipient.scope)).toEqual([
      "local_agent",
      "parent_boundary_agent",
    ]);
    expect(coordinator.communicationRecipients[1]?.delivery).toEqual({
      teamRunId: "team-parent",
      selector: { kind: "route_key", memberRouteKey: "program_manager" },
    });

    const sibling = await builder.build({
      ...baseInput,
      currentMemberName: "qa_specialist",
      currentMemberPath: ["qa_specialist"],
      currentMemberRouteKey: "qa_specialist",
      currentMemberRunId: "run-qa",
    });
    expect(sibling.allowedRecipientNames).toEqual(["review_lead"]);
  });

  it("rejects duplicate visible communication recipient names", async () => {
    const builder = new MemberTeamContextBuilder({
      getDefinitionById: vi.fn().mockResolvedValue({ instructions: "" }),
    } as any);

    await expect(builder.build({
      teamRunId: "team-parent",
      teamDefinitionId: "team-def",
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "program_manager",
      currentMemberPath: ["program_manager"],
      currentMemberRouteKey: "program_manager",
      currentMemberRunId: "run-program-manager",
      members: [
        {
          memberName: "program_manager",
          memberPath: ["program_manager"],
          memberRouteKey: "program_manager",
          memberRunId: "run-program-manager",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        },
        {
          memberKind: "agent_team",
          memberName: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
          memberRunId: "run-build-squad",
          teamDefinitionId: "build-squad-team",
          representative: {
            memberKind: "agent",
            memberName: "review_lead",
            memberPath: ["BuildSquad", "review_lead"],
            memberRouteKey: "BuildSquad/review_lead",
            memberRunId: "run-review-lead",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            role: null,
            description: null,
          },
        },
        {
          memberKind: "agent_team",
          memberName: "AuditSquad",
          memberPath: ["AuditSquad"],
          memberRouteKey: "AuditSquad",
          memberRunId: "run-audit-squad",
          teamDefinitionId: "audit-squad-team",
          representative: {
            memberKind: "agent",
            memberName: "review_lead",
            memberPath: ["AuditSquad", "review_lead"],
            memberRouteKey: "AuditSquad/review_lead",
            memberRunId: "run-audit-review-lead",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            role: null,
            description: null,
          },
        },
      ],
      deliverInterAgentMessage: vi.fn(),
    })).rejects.toThrow("Ambiguous communication recipient 'review_lead'");
  });
});
