import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { composeCarpenterPrompt } from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { resolveRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { renderMemberCollaborationInstruction } from "../../../src/agent-team-execution/services/member-collaboration-instruction-renderer.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";

const occurrences = (value: string, fragment: string): number =>
  value.split(fragment).length - 1;

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

    expect(providerSharedPrompt).toContain(`## Team Runtime\n\n${expected}`);
    expect(occurrences(providerSharedPrompt, expected)).toBe(1);
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
    const distinctiveOpening = "You are working as a member of an AgentTeam.";
    const providerSharedPrompt = composeCarpenterPrompt({
      agentDefinition,
      workspaceRootPath: "/tmp/standalone-workspace",
      memberTeamContext: null,
    });

    expect(providerSharedPrompt).not.toContain(distinctiveOpening);
    expect(resolveRuntimeAgentToolExposure(agentDefinition, null).requestedToolNames).toEqual([]);
  });
});
