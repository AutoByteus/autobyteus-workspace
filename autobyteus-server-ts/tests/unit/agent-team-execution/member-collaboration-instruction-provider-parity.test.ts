import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { composeAutoByteusMemberSystemPrompt } from "../../../src/agent-execution/backends/autobyteus/autobyteus-member-system-prompt-composer.js";
import { TeamMemberCodexThreadBootstrapStrategy } from "../../../src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.js";
import { buildClaudeTurnInput } from "../../../src/agent-execution/backends/claude/session/claude-turn-input-builder.js";
import { buildConfiguredAgentToolExposure } from "../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { renderMemberCollaborationInstruction } from "../../../src/agent-team-execution/services/member-collaboration-instruction-renderer.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";

const occurrences = (value: string, fragment: string): number =>
  value.split(fragment).length - 1;

const buildCodexRunContext = (memberTeamContext: ReturnType<typeof testMemberTeamContext> | null) =>
  new AgentRunContext({
    runId: "run-student-one",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-student-one",
      llmModelIdentifier: "gpt-5.6-luna",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberTeamContext,
    }),
    runtimeContext: null,
  });

describe("member collaboration instruction provider parity", () => {
  it("injects one exact rendered block with the caller address through all three provider seams", () => {
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
    });
    const expected = renderMemberCollaborationInstruction({
      addressing: memberTeamContext.collaboration.addressing,
    });

    const autobyteus = composeAutoByteusMemberSystemPrompt({
      baseAgentInstruction: "Complete the classroom exercise.",
      memberTeamContext,
      resolvedToolNames: [],
    })!;
    const codex = new TeamMemberCodexThreadBootstrapStrategy().prepare({
      runContext: buildCodexRunContext(memberTeamContext),
      agentInstruction: "Complete the classroom exercise.",
      configuredToolExposure: buildConfiguredAgentToolExposure([]),
    }).developerInstructions!;
    const claude = buildClaudeTurnInput({
      runContext: {
        runtimeContext: {
          memberTeamContext,
          agentInstruction: "Complete the classroom exercise.",
        },
      } as never,
      content: "Begin now.",
      sendMessageToEnabled: true,
    });

    expect(autobyteus).toContain(`## Runtime Instruction\n${expected}`);
    expect(codex).toBe(expected);
    expect(claude).toContain(`<runtime_instruction>\n${expected}\n</runtime_instruction>`);
    for (const rendered of [autobyteus, codex, claude]) {
      expect(occurrences(rendered, expected)).toBe(1);
      expect(rendered).not.toContain("recipient_name");
      expect(rendered).not.toContain("memberPath");
      expect(rendered).not.toContain("Team membership roster");
    }
  });

  it("does not inject the Team collaboration block into standalone provider inputs", () => {
    const distinctiveOpening = "You are working as a member of an AgentTeam.";
    const autobyteus = composeAutoByteusMemberSystemPrompt({
      baseAgentInstruction: "Standalone AutoByteus instruction.",
      memberTeamContext: null,
      resolvedToolNames: [],
    })!;
    const codexStrategy = new TeamMemberCodexThreadBootstrapStrategy();
    const claude = buildClaudeTurnInput({
      runContext: {
        runtimeContext: {
          memberTeamContext: null,
          agentInstruction: "Standalone Claude instruction.",
        },
      } as never,
      content: "Begin now.",
      sendMessageToEnabled: false,
    });

    expect(autobyteus).not.toContain(distinctiveOpening);
    expect(codexStrategy.appliesTo(buildCodexRunContext(null))).toBe(false);
    expect(claude).not.toContain(distinctiveOpening);
  });
});
