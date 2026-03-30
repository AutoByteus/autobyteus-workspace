import { describe, expect, it } from "vitest";
import { composeMemberRunInstructions } from "../../../src/agent-team-execution/services/member-run-instruction-composer.js";

describe("member-run-instruction-composer", () => {
  it("composes definition instructions separately from runtime constraints", () => {
    const composition = composeMemberRunInstructions({
      teamInstruction: "Coordinate with the team and hand off clearly.",
      agentInstruction: "You focus on implementation details.",
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
    const composition = composeMemberRunInstructions({
      teamInstruction: null,
      agentInstruction: "Only the agent instruction is available.",
      currentMemberName: "Professor",
      sendMessageToEnabled: false,
      teammates: [],
    });

    expect(composition.teamInstruction).toBeNull();
    expect(composition.agentInstruction).toBe("Only the agent instruction is available.");
    expect(composition.runtimeInstruction).toContain("Do not attempt `send_message_to`");
  });
});
