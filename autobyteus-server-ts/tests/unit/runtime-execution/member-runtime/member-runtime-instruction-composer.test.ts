import { describe, expect, it } from "vitest";
import {
  composeMemberRuntimeInstructions,
  renderMarkdownInstructionSection,
  renderMarkdownInstructionSections,
  resolveMemberRuntimeInstructionSourcesFromMetadata,
  resolveMemberRuntimeTeammatesFromMetadata,
} from "../../../../src/runtime-execution/member-runtime/member-runtime-instruction-composer.js";

describe("member-runtime-instruction-composer", () => {
  it("resolves instruction sources from shared runtime metadata", () => {
    expect(
      resolveMemberRuntimeInstructionSourcesFromMetadata({
        memberInstructionSources: {
          teamInstructions: "Coordinate as a team.",
          agentInstructions: "Own implementation details.",
        },
      }),
    ).toEqual({
      teamInstructions: "Coordinate as a team.",
      agentInstructions: "Own implementation details.",
    });
  });

  it("normalizes teammate rows from runtime metadata", () => {
    expect(
      resolveMemberRuntimeTeammatesFromMetadata({
        teamMemberManifest: [
          { memberName: "Professor", role: "coordinator", description: "Leads" },
          { member_name: "Student", role: "implementer" },
          { name: "Student" },
        ],
      }),
    ).toEqual([
      { memberName: "Professor", role: "coordinator", description: "Leads" },
      { memberName: "Student", role: "implementer", description: null },
    ]);
  });

  it("composes definition instructions separately from runtime constraints", () => {
    const composition = composeMemberRuntimeInstructions({
      teamInstructions: "Coordinate with the team and hand off clearly.",
      agentInstructions: "You focus on implementation details.",
      currentMemberName: "Professor",
      sendMessageToEnabled: true,
      teammates: [
        { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
        { memberName: "Student", role: "implementer", description: "Executes tasks" },
      ],
    });

    expect(composition.teamInstruction).toBe("Coordinate with the team and hand off clearly.");
    expect(composition.agentInstruction).toBe("You focus on implementation details.");
    expect(composition.runtimeInstruction).toContain("Current team member: Professor");
    expect(composition.runtimeInstruction).toContain(
      "If you use `send_message_to`, set `recipient_name` to exactly match one teammate name from the list below.",
    );
    expect(composition.runtimeInstruction).toContain(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    expect(composition.runtimeInstruction).toContain("- Student: implementer | Executes tasks");
    expect(composition.runtimeInstruction).not.toContain("Professor: coordinator");
  });

  it("degrades cleanly when only one instruction source exists", () => {
    const composition = composeMemberRuntimeInstructions({
      teamInstructions: null,
      agentInstructions: "Only the agent instruction is available.",
      currentMemberName: "Professor",
      sendMessageToEnabled: false,
      teammates: [],
    });

    expect(composition.teamInstruction).toBeNull();
    expect(composition.agentInstruction).toBe("Only the agent instruction is available.");
    expect(composition.runtimeInstruction).toContain("Do not attempt `send_message_to`");
  });

  it("renders markdown sections for codex using explicit team, agent, and runtime labels", () => {
    const baseInstructions = renderMarkdownInstructionSections([
      {
        title: "Team Instruction",
        content: "Operate as one team.",
      },
      {
        title: "Agent Instruction",
        content: "You handle implementation details.",
      },
    ]);
    const developerInstructions = renderMarkdownInstructionSection(
      "Runtime Instruction",
      "Use send_message_to for teammate delegation.",
    );

    expect(baseInstructions).toContain("## Team Instruction");
    expect(baseInstructions).toContain("## Agent Instruction");
    expect(baseInstructions).not.toContain("Definition");
    expect(developerInstructions).toBe(
      "## Runtime Instruction\nUse send_message_to for teammate delegation.",
    );
  });
});
