import { describe, expect, it, vi } from "vitest";
import { MemberCollaborationContext } from "../../../src/agent-team-execution/domain/member-collaboration-context.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { composeMemberRunInstructions } from "../../../src/agent-team-execution/services/member-run-instruction-composer.js";

const buildContext = (input: {
  deliver?: boolean;
  outgoingHandoffs?: Array<{ from: string; to: string; rules: string[] }>;
} = {}): MemberTeamContext => {
  const addressing = createMemberLogicalAddressContext({
    rootTeamRunId: "root-team-run",
    memberAddress: "/research_team/research_lead",
  });
  return new MemberTeamContext({
    teamRunId: "research-team-run",
    teamDefinitionId: "research-team-def",
    teamName: "Research Team",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "research_lead",
    memberPath: ["research_lead"],
    memberRouteKey: "research_lead",
    memberRunId: "run-research-lead",
    coordinatorMemberRouteKey: "research_lead",
    teamInstruction: "Coordinate carefully.",
    collaboration: new MemberCollaborationContext({
      addressing,
      outgoingHandoffs: input.outgoingHandoffs ?? [{
        from: "/research_team/research_lead",
        to: "/research_team/field_team",
        rules: ["When field research is required."],
      }],
      deliverInterAgentMessage: input.deliver === false
        ? null
        : vi.fn().mockResolvedValue({ accepted: true }),
    }),
  });
};

describe("member-run-instruction-composer", () => {
  it("keeps Team and Agent instructions separate from stable runtime protocol", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: "Coordinate with the team.",
      agentInstruction: "Focus on research planning.",
      memberTeamContext: buildContext(),
      sendMessageToEnabled: true,
      getHandoffRulesEnabled: true,
    });

    expect(composition.teamInstruction).toBe("Coordinate with the team.");
    expect(composition.agentInstruction).toBe("Focus on research planning.");
    expect(composition.runtimeInstruction).toContain("Current team member: research_lead");
    expect(composition.runtimeInstruction).toContain(
      "Your absolute collaboration address is `/research_team/research_lead`.",
    );
    expect(composition.runtimeInstruction).toContain(
      "Your immediate Team address is `/research_team`.",
    );
    expect(composition.runtimeInstruction).toContain("rooted absolute address (`/...`)");
    expect(composition.runtimeInstruction).toContain("immediate-Team-relative address (`./...`)");
    expect(composition.runtimeInstruction).toContain("Team through its configured coordinator ingress Agent");
    expect(composition.runtimeInstruction).toContain("Call `get_handoff_rules`");
  });

  it("does not inline handoff rule text or render a flat recipient roster", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildContext(),
      sendMessageToEnabled: true,
      getHandoffRulesEnabled: true,
    });

    expect(composition.runtimeInstruction).not.toContain("When field research is required.");
    expect(composition.runtimeInstruction).not.toContain("Team membership roster");
    expect(composition.runtimeInstruction).not.toContain("allowedRecipientNames");
    expect(composition.runtimeInstruction).not.toContain("subteam_representative");
    expect(composition.runtimeInstruction).not.toContain("parent_boundary_agent");
    expect(composition.runtimeInstruction).not.toContain("Use recipient_name for one logical roster recipient");
  });

  it("renders the exact-run selector separately from logical Team addressing", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildContext({ outgoingHandoffs: [] }),
      sendMessageToEnabled: true,
    });

    expect(composition.runtimeInstruction).toContain(
      "choose exactly one selector: `recipient_name` for a logical Team address or `target_agent_run_id` for an exact live AgentRun",
    );
    expect(composition.runtimeInstruction).toContain(
      "`send_message_to.target_agent_run_id` is separate",
    );
    expect(composition.runtimeInstruction).not.toContain("get_handoff_rules");
  });

  it("renders shared task addressing and direct-target eligibility only when enabled", () => {
    const enabled = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildContext({ deliver: false }),
      sendMessageToEnabled: false,
      taskDelegationEnabled: true,
    });
    const disabled = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildContext({ deliver: false }),
      sendMessageToEnabled: false,
      taskDelegationEnabled: false,
    });

    expect(enabled.runtimeInstruction).toContain("Task delegation protocol");
    expect(enabled.runtimeInstruction).toContain("{recipient_name, description, reference_files?}");
    expect(enabled.runtimeInstruction).toContain(
      "same `/...` and `./...` logical address grammar as `send_message_to`",
    );
    expect(enabled.runtimeInstruction).toContain("direct Agent or Team child of your immediate Team");
    expect(enabled.runtimeInstruction).toContain("Deeper and cross-branch addresses");
    expect(enabled.runtimeInstruction).toContain("relative paths and URLs are rejected");
    expect(enabled.runtimeInstruction).toContain("`send_message_to` remains ordinary message delivery");
    expect(disabled.runtimeInstruction).not.toContain("Task delegation protocol");
  });

  it("keeps member identity guidance even when no recipient operation is configured", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: "Only the Agent instruction exists.",
      memberTeamContext: buildContext({ deliver: false }),
      sendMessageToEnabled: false,
    });

    expect(composition.agentInstruction).toBe("Only the Agent instruction exists.");
    expect(composition.runtimeInstruction).toContain("Current team member: research_lead");
    expect(composition.runtimeInstruction).toContain("/research_team/research_lead");
    expect(composition.runtimeInstruction).not.toContain("recipient_name` must be");
  });
});
