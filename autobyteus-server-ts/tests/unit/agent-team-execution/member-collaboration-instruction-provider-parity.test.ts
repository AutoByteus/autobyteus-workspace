import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { resolveRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { renderMemberCollaborationInstruction } from "../../../src/agent-team-execution/services/member-collaboration-instruction-renderer.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";
import { AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION } from "../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

const occurrences = (value: string, fragment: string): number =>
  value.split(fragment).length - 1;

const expectedInstruction = (memberAddress: string): string => [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "The root AgentTeam is represented by `/`. Its display or metadata name is not included in any address.",
  "",
  "The following example illustrates the address structure:",
  "",
  "/",
  "├── /A              (Agent)",
  "├── /B              (Agent)",
  "└── /C              (nested AgentTeam)",
  "    ├── /C/D         (Agent)",
  "    └── /C/E         (Agent)",
  "",
  "In this example:",
  "",
  "- `/A` and `/B` are Agents directly under the root AgentTeam.",
  "- `/C` is an AgentTeam directly under the root AgentTeam.",
  "- `/C/D` and `/C/E` are Agents directly inside AgentTeam `/C`.",
  "- Each `/` separates one parent-to-child level.",
  "",
  "The letters in this example are placeholders only. They do not identify available recipients. Use only an exact canonical address made available in your current AgentTeam context.",
  "",
  "Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
  "",
  "Your Agent address is:",
  "",
  memberAddress,
  "",
  "Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.",
  "",
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
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
    const expected = renderMemberCollaborationInstruction({ memberAddress: memberTeamContext.identity.memberAddress });

    const providerSharedPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberTeamContext,
    });
    const nativeAutoByteusPrompt = composeNativeAutoByteusPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/classroom-workspace",
      memberTeamContext,
    });
    const runtimeExposure = resolveRuntimeAgentToolExposure(
      agentDefinition,
      memberTeamContext,
    );

    expect(expected).toBe(expectedInstruction("/StudentStudyGroup/student_one"));
    for (const prompt of [providerSharedPrompt, nativeAutoByteusPrompt]) {
      const normalizedPrompt = prompt.replace(/\s+/g, " ");

      expect(prompt).toContain(expected);
      expect(occurrences(prompt, expected)).toBe(1);
      expect(occurrences(prompt, "## AgentTeam Addressing")).toBe(1);
      expect(occurrences(prompt, "## AgentTeam Collaboration")).toBe(1);
      expect(prompt.indexOf("## Team Instruction")).toBeLessThan(
        prompt.indexOf("## AgentTeam Addressing"),
      );
      expect(prompt.indexOf("## AgentTeam Addressing")).toBeLessThan(
        prompt.indexOf("## AgentTeam Collaboration"),
      );
      expect(prompt).not.toContain("## Team Runtime");
      expect(prompt).not.toContain("recipient_name");
      expect(prompt).not.toContain("memberPath");
      expect(prompt).not.toContain("Team membership roster");
      expect(prompt).not.toContain("requirements_engineering");
      expect(prompt).not.toContain("REQ-");
      expect(prompt).not.toContain("DEC-");
      expect(prompt).toContain("The root AgentTeam is represented by `/`");
      expect(prompt).toContain("├── /A              (Agent)");
      expect(prompt).toContain("└── /C              (nested AgentTeam)");
      expect(prompt).toContain("The letters in this example are placeholders only.");
      expect(prompt).toContain("These operations are not interchangeable.");
      expect(prompt).toContain("Never use both to deliver\nthe same work.");
      expect(prompt).toContain("genuinely new clarification");
      expect(prompt).toContain("It is not an alias for the newly spawned task execution.");
      expect(prompt).toContain(
        "Select the single rule whose `when` condition most specifically applies",
      );
      expect(prompt).toContain(
        "Do not notify additional recipients for the same outcome.",
      );
      expect(normalizedPrompt).not.toContain("Apply every matching rule");
      expect(normalizedPrompt).not.toContain("follow distinct recipients");
    }
    expect(providerSharedPrompt).not.toContain("## Working Environment");
    expect(providerSharedPrompt).not.toContain("## Bash Operating Practice");
    expect(providerSharedPrompt).not.toContain("## File And Directory Practice");
    expect(nativeAutoByteusPrompt.indexOf("## AgentTeam Collaboration")).toBeLessThan(
      nativeAutoByteusPrompt.indexOf("## Working Environment"),
    );
    expect(nativeAutoByteusPrompt).toContain("## Bash Operating Practice");
    expect(nativeAutoByteusPrompt).toContain("## File And Directory Practice");
    expect(runtimeExposure.requestedToolNames).toEqual([
      "get_handoff_rules",
      "send_message_to",
      "delegate_task",
    ]);
  });

  it("does not inject the Team collaboration block or intrinsic tools for standalone Agents", () => {
    const providerSharedPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberTeamContext: null,
    });
    const nativeAutoByteusPrompt = composeNativeAutoByteusPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/standalone-workspace",
      memberTeamContext: null,
    });

    for (const prompt of [providerSharedPrompt, nativeAutoByteusPrompt]) {
      expect(prompt).not.toContain("## AgentTeam Addressing");
      expect(prompt).not.toContain("## AgentTeam Collaboration");
    }
    expect(providerSharedPrompt).not.toContain("## Working Environment");
    expect(nativeAutoByteusPrompt).toContain("## Working Environment");
    expect(resolveRuntimeAgentToolExposure(agentDefinition, null).requestedToolNames).toEqual([]);
  });
});
