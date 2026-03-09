import { describe, expect, it } from "vitest";
import {
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
});
