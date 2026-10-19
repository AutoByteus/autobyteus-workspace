import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { renderCollaborationSections } from "../../../src/agent-execution/prompt/collaboration-prompt-sections.js";
import { resolveRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { testMemberExecutionContext } from "../../fixtures/current-team-run-fixtures.js";

const occurrences = (value: string, fragment: string): number => value.split(fragment).length - 1;

const agentDefinition = new AgentDefinition({
  id: "agent-student-one",
  name: "Student One",
  description: "Complete the classroom exercise.",
  instructions: "Work carefully with the other Team members.",
  toolNames: [],
});

describe("member collaboration instruction provider parity", () => {
  it("composes one exact provider-shared block and the intrinsic Team tools", () => {
    const memberExecutionContext = testMemberExecutionContext({
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
    const expected = renderCollaborationSections(memberExecutionContext);
    const providerSharedPrompt = composeSharedCarpenterPrompt({ agentDefinition, memberExecutionContext });
    const nativeAutoByteusPrompt = composeNativeAutoByteusPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/classroom-workspace",
      memberExecutionContext,
    });
    const runtimeExposure = resolveRuntimeAgentToolExposure(agentDefinition, memberExecutionContext);

    for (const prompt of [providerSharedPrompt, nativeAutoByteusPrompt]) {
      expect(prompt).toContain(expected);
      expect(occurrences(prompt, expected)).toBe(1);
      expect(occurrences(prompt, "## AgentTeam Addressing")).toBe(1);
      expect(occurrences(prompt, "## Working With Other Agents")).toBe(1);
      expect(prompt.indexOf("## Team Instruction")).toBeLessThan(prompt.indexOf("## AgentTeam Addressing"));
      expect(prompt.indexOf("## AgentTeam Addressing")).toBeLessThan(prompt.indexOf("## Working With Other Agents"));
      expect(prompt).not.toContain("## Team Runtime");
      expect(prompt).not.toContain("recipient_name");
      expect(prompt).not.toContain("memberPath");
      expect(prompt).not.toContain("Team membership roster");
      expect(prompt).not.toContain("requirements_engineering");
      expect(prompt).not.toContain("/StudentStudyGroup/student_one");
      expect(prompt).not.toMatch(/submit_task_result|review_task_result|Task Lifecycle/);
    }
    expect(providerSharedPrompt).not.toContain("## Working Environment");
    expect(providerSharedPrompt).not.toContain("## Bash Operating Practice");
    expect(providerSharedPrompt).not.toContain("## File And Directory Practice");
    expect(nativeAutoByteusPrompt.indexOf("## Working With Other Agents")).toBeLessThan(
      nativeAutoByteusPrompt.indexOf("## Working Environment"),
    );
    expect(nativeAutoByteusPrompt).toContain("## Bash Operating Practice");
    expect(nativeAutoByteusPrompt).toContain("## File And Directory Practice");
    expect(runtimeExposure.requestedToolNames).toEqual(["get_handoff_rules", "send_message_to", "delegate_task"]);
  });

  it("does not inject the collaboration sections or intrinsic tools for standalone Agents without a member context", () => {
    const providerSharedPrompt = composeSharedCarpenterPrompt({ agentDefinition, memberExecutionContext: null });
    const nativeAutoByteusPrompt = composeNativeAutoByteusPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/standalone-workspace",
      memberExecutionContext: null,
    });

    for (const prompt of [providerSharedPrompt, nativeAutoByteusPrompt]) {
      expect(prompt).not.toContain("## AgentTeam Addressing");
      expect(prompt).not.toContain("## Working With Other Agents");
    }
    expect(providerSharedPrompt).not.toContain("## Working Environment");
    expect(nativeAutoByteusPrompt).toContain("## Working Environment");
    expect(resolveRuntimeAgentToolExposure(agentDefinition, null).requestedToolNames).toEqual([]);
  });
});
