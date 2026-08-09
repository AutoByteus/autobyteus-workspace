import { describe, expect, it, vi } from "vitest";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import { renderMemberCollaborationInstruction } from "../../../src/agent-team-execution/services/member-collaboration-instruction-renderer.js";
import { composeMemberRunInstructions } from "../../../src/agent-team-execution/services/member-run-instruction-composer.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";

const buildContext = (input: {
  deliver?: boolean;
  outgoingHandoffs?: Array<{ from: string; to: string; rules: string[] }>;
} = {}): MemberTeamContext => {
  return testMemberTeamContext({
    rootTeamRunId: "root-team-run",
    memberAddress: "/research_team/research_lead",
    teamRunId: "research-team-run",
    teamDefinitionId: "research-team-def",
    teamAddress: "/research_team",
    coordinatorAddress: "/research_team/research_lead",
    agentRunId: "run-research-lead",
    teamInstruction: "Coordinate carefully.",
    outgoingHandoffs: input.outgoingHandoffs ?? [{
        from: "/research_team/research_lead",
        to: "/research_team/field_team",
        rules: ["When field research is required."],
      }],
    deliverInterAgentMessage: input.deliver === false
      ? null
      : vi.fn().mockResolvedValue({ accepted: true }),
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
    expect(composition.runtimeInstruction).toBe(renderMemberCollaborationInstruction({
      addressing: buildContext().collaboration.addressing,
    }));
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
    expect(composition.runtimeInstruction).not.toContain("Use recipient_address for one logical roster recipient");
  });

  it("renders the exact collaboration block even when only logical messaging is configured", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: null,
      memberTeamContext: buildContext({ outgoingHandoffs: [] }),
      sendMessageToEnabled: true,
    });

    expect(composition.runtimeInstruction).toBe(renderMemberCollaborationInstruction({
      addressing: buildContext().collaboration.addressing,
    }));
    expect(composition.runtimeInstruction).not.toContain("target_agent_run_id");
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

    expect(enabled.runtimeInstruction).toContain("`delegate_task.recipient_address`");
    expect(enabled.runtimeInstruction).toContain("same logical-address grammar");
    expect(enabled.runtimeInstruction).toContain("direct Agent or AgentTeam child of your immediate AgentTeam");
    expect(enabled.runtimeInstruction).toContain("deeper and cross-branch addresses remain valid for message delivery");
    expect(disabled.runtimeInstruction).not.toContain("delegate_task.recipient_address");
  });

  it("keeps member identity guidance even when no recipient operation is configured", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: "Only the Agent instruction exists.",
      memberTeamContext: buildContext({ deliver: false }),
      sendMessageToEnabled: false,
    });

    expect(composition.agentInstruction).toBe("Only the Agent instruction exists.");
    expect(composition.runtimeInstruction).toBe(renderMemberCollaborationInstruction({
      addressing: buildContext().collaboration.addressing,
    }));
  });
});
