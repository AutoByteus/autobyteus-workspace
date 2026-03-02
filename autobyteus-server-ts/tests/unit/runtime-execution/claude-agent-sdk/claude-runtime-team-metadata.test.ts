import { describe, expect, it } from "vitest";
import {
  renderTeamManifestSystemPromptAppend,
  resolveAllowedRecipientNamesFromManifest,
  resolveMemberNameFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.js";

describe("claude-runtime-team-metadata", () => {
  it("resolves team metadata aliases", () => {
    expect(resolveTeamRunIdFromMetadata({ teamRunId: "team-a" })).toBe("team-a");
    expect(resolveTeamRunIdFromMetadata({ team_run_id: "team-b" })).toBe("team-b");
    expect(resolveMemberNameFromMetadata({ memberName: "Professor" })).toBe("Professor");
    expect(resolveMemberNameFromMetadata({ member_name: "Student" })).toBe("Student");
    expect(resolveSendMessageToEnabledFromMetadata({ sendMessageToEnabled: true })).toBe(true);
    expect(resolveSendMessageToEnabledFromMetadata({ send_message_to_enabled: "1" })).toBe(true);
    expect(resolveSendMessageToEnabledFromMetadata({ send_message_to_enabled: "false" })).toBe(
      false,
    );
  });

  it("normalizes manifest members and excludes self from recipients", () => {
    const members = resolveTeamManifestMembersFromMetadata({
      teamMemberManifest: [
        { memberName: "Professor", role: "coordinator", description: "Leads" },
        { member_name: "Student", role: "implementer" },
        { name: "Student" },
      ],
    });
    expect(members).toEqual([
      { memberName: "Professor", role: "coordinator", description: "Leads" },
      { memberName: "Student", role: "implementer", description: null },
    ]);

    const recipients = resolveAllowedRecipientNamesFromManifest({
      currentMemberName: "Professor",
      members,
    });
    expect(recipients).toEqual(["Student"]);
  });

  it("renders explicit delegation guidance for enabled team messaging", () => {
    const promptAppend = renderTeamManifestSystemPromptAppend({
      currentMemberName: "Professor",
      sendMessageToEnabled: true,
      members: [
        { memberName: "Professor", role: "coordinator", description: "Leads delegation" },
        { memberName: "Student", role: "implementer", description: "Executes tasks" },
      ],
    });

    expect(promptAppend).toContain("You are a member of an agent team.");
    expect(promptAppend).toContain("Use `send_message_to`");
    expect(promptAppend).toContain("explicitly mention `send_message_to`");
    expect(promptAppend).toContain("Never claim you have no teammates");
    expect(promptAppend).toContain("- Student: implementer | Executes tasks");
    expect(promptAppend).not.toContain("- Professor: coordinator");
  });

  it("renders disabled guidance when team tool is unavailable", () => {
    const promptAppend = renderTeamManifestSystemPromptAppend({
      currentMemberName: "Professor",
      sendMessageToEnabled: false,
      members: [
        { memberName: "Professor", role: null, description: null },
        { memberName: "Student", role: null, description: null },
      ],
    });
    expect(promptAppend).toContain("Do not attempt `send_message_to`");
    expect(promptAppend).toContain("Teammates:");
    expect(promptAppend).toContain("- Student");
  });
});
