import { describe, expect, it, vi } from "vitest";
import {
  ClaudeSessionTeamContextBuilder,
  resolveAllowedRecipientNamesFromManifest,
  resolveMemberNameFromMetadata,
  resolveMemberRouteKeyFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamDefinitionIdFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "../../../../../src/agent-team-execution/backends/claude/claude-session-team-context.js";

describe("claude-session-team-context", () => {
  it("resolves team metadata aliases", () => {
    expect(resolveTeamRunIdFromMetadata({ teamRunId: "team-a" })).toBe("team-a");
    expect(resolveTeamRunIdFromMetadata({ team_run_id: "team-b" })).toBe("team-b");
    expect(resolveTeamDefinitionIdFromMetadata({ teamDefinitionId: "team-def-a" })).toBe(
      "team-def-a",
    );
    expect(resolveTeamDefinitionIdFromMetadata({ team_definition_id: "team-def-b" })).toBe(
      "team-def-b",
    );
    expect(resolveMemberNameFromMetadata({ memberName: "Professor" })).toBe("Professor");
    expect(resolveMemberNameFromMetadata({ member_name: "Student" })).toBe("Student");
    expect(resolveMemberRouteKeyFromMetadata({ memberRouteKey: "professor" })).toBe("professor");
    expect(resolveMemberRouteKeyFromMetadata({ member_route_key: "student" })).toBe("student");
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

  it("builds a team context and derives team instruction from team definition service", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({
        instructions: "Coordinate with the team.",
      }),
    } as any;
    const builder = new ClaudeSessionTeamContextBuilder(teamDefinitionService);

    const result = await builder.build({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      memberName: "Professor",
      memberRouteKey: "professor",
      sendMessageToEnabled: true,
      teamMemberManifest: [
        { memberName: "Professor", role: "coordinator", description: "Leads" },
        { memberName: "Student", role: "implementer", description: "Executes tasks" },
      ],
    });

    expect(result).toEqual({
      teamRunId: "team-1",
      teamDefinitionId: "team-def-1",
      memberName: "Professor",
      memberRouteKey: "professor",
      teamInstruction: "Coordinate with the team.",
      sendMessageToEnabled: true,
      teamManifestMembers: [
        { memberName: "Professor", role: "coordinator", description: "Leads" },
        { memberName: "Student", role: "implementer", description: "Executes tasks" },
      ],
      allowedRecipientNames: ["Student"],
    });
  });
});
