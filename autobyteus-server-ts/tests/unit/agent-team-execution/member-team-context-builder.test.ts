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
          memberRouteKey: "professor",
          memberRunId: "run-professor",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          role: "lead",
          description: "Leads the work.",
        },
        {
          memberName: "Writer",
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
});
