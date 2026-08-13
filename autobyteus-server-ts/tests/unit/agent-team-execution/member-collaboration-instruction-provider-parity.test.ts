import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { composeCarpenterPrompt } from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { resolveRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { renderMemberCollaborationInstruction } from "../../../src/agent-team-execution/services/member-collaboration-instruction-renderer.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";

const occurrences = (value: string, fragment: string): number =>
  value.split(fragment).length - 1;

const expectedInstruction = (memberAddress: string): string => [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "An address beginning with `/` starts from the root AgentTeam. An address beginning with `./` starts from your immediate AgentTeam—the Team that directly contains you. Bare names, `../`, and backslashes are invalid.",
  "",
  "Within this structure, your address is:",
  "",
  memberAddress,
  "",
  "For example:",
  "",
  "- `./architecture_reviewer` identifies an Agent in your immediate AgentTeam.",
  "- `./implementation_team` identifies a nested AgentTeam in your immediate AgentTeam.",
  "- `/requirements_engineering/requirements_lead` identifies an Agent using an absolute address from the root AgentTeam.",
  "",
  "An AgentTeam address identifies the Team itself. Sending a message to that address delivers it to the Team's configured coordinator.",
  "",
  "## AgentTeam Collaboration",
  "",
  "Use `send_message_to` with `recipient_address` to send a message to an Agent or AgentTeam.",
  "",
  "`delegate_task` uses the same address format, but its recipient must be a direct Agent or AgentTeam child of your immediate AgentTeam. Message delivery may address deeper or cross-branch recipients.",
  "",
  "When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.",
  "",
  "Do not claim that a handoff was completed unless `send_message_to` confirms delivery.",
].join("\n");

const agentDefinition = new AgentDefinition({
  id: "agent-student-one",
  name: "Student One",
  description: "Complete the classroom exercise.",
  instructions: "Work carefully with the other Team members.",
  toolNames: [],
});

describe("member collaboration instruction provider parity", () => {
  it("composes one exact provider-shared block and the three intrinsic Team tools", () => {
    const memberTeamContext = testMemberTeamContext({
      rootTeamRunId: "root-classroom-run",
      teamRunId: "study-group-task-run",
      teamDefinitionId: "study-group-definition",
      teamAddress: "/StudentStudyGroup",
      memberAddress: "/StudentStudyGroup/student_one",
      coordinatorAddress: "/StudentStudyGroup/student_one",
      agentRunId: "task-agent-student-one",
      taskTeamRunIds: ["study-group-task-run"],
      teamInstruction: "Teach and learn collaboratively.",
      deliverInterAgentMessage: vi.fn(async () => undefined) as never,
    });
    const expected = renderMemberCollaborationInstruction({
      addressing: memberTeamContext.collaboration.addressing,
    });

    const providerSharedPrompt = composeCarpenterPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/classroom-workspace",
      memberTeamContext,
    });
    const runtimeExposure = resolveRuntimeAgentToolExposure(
      agentDefinition,
      memberTeamContext,
    );

    expect(expected).toBe(expectedInstruction("/StudentStudyGroup/student_one"));
    expect(providerSharedPrompt).toContain(expected);
    expect(occurrences(providerSharedPrompt, expected)).toBe(1);
    expect(occurrences(providerSharedPrompt, "## AgentTeam Addressing")).toBe(1);
    expect(occurrences(providerSharedPrompt, "## AgentTeam Collaboration")).toBe(1);
    expect(providerSharedPrompt.indexOf("## Team Instruction")).toBeLessThan(
      providerSharedPrompt.indexOf("## AgentTeam Addressing"),
    );
    expect(providerSharedPrompt.indexOf("## AgentTeam Addressing")).toBeLessThan(
      providerSharedPrompt.indexOf("## AgentTeam Collaboration"),
    );
    expect(providerSharedPrompt.indexOf("## AgentTeam Collaboration")).toBeLessThan(
      providerSharedPrompt.indexOf("## Working Environment"),
    );
    expect(providerSharedPrompt).not.toContain("## Team Runtime");
    expect(providerSharedPrompt).not.toContain("recipient_name");
    expect(providerSharedPrompt).not.toContain("memberPath");
    expect(providerSharedPrompt).not.toContain("Team membership roster");
    expect(runtimeExposure.requestedToolNames).toEqual([
      "get_handoff_rules",
      "send_message_to",
      "delegate_task",
    ]);
  });

  it("does not inject the Team collaboration block or intrinsic tools for standalone Agents", () => {
    const providerSharedPrompt = composeCarpenterPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/standalone-workspace",
      memberTeamContext: null,
    });

    expect(providerSharedPrompt).not.toContain("## AgentTeam Addressing");
    expect(providerSharedPrompt).not.toContain("## AgentTeam Collaboration");
    expect(resolveRuntimeAgentToolExposure(agentDefinition, null).requestedToolNames).toEqual([]);
  });
});
