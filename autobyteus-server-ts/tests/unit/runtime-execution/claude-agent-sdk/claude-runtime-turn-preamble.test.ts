import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildClaudeTurnInput } from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.js";
import type { ClaudeRunSessionState } from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-shared.js";

const createState = (
  overrides: Partial<ClaudeRunSessionState> = {},
): ClaudeRunSessionState => ({
  runId: "run-1",
  sessionId: "session-1",
  model: "default",
  workingDirectory: "/tmp",
  autoExecuteTools: false,
  permissionMode: "default",
  hasCompletedTurn: false,
  runtimeMetadata: {},
  teamRunId: null,
  memberName: null,
  sendMessageToEnabled: false,
  teamManifestMembers: [],
  allowedRecipientNames: [],
  configuredSkills: [],
  skillAccessMode: null,
  listeners: new Set(),
  activeAbortController: null,
  activeTurnId: null,
  ...overrides,
});

describe("claude-runtime-turn-preamble", () => {
  it("returns plain user content when no teammate context exists", () => {
    const input = buildClaudeTurnInput({
      state: createState(),
      content: "hello",
      sendMessageToToolingEnabled: false,
    });

    expect(input).toBe("hello");
  });

  it("wraps team, agent, and runtime instructions with explicit section tags", () => {
    const input = buildClaudeTurnInput({
      state: createState({
        runtimeMetadata: {
          memberInstructionSources: {
            teamInstructions: "Work as a coordinated research team.",
            agentInstructions: "You verify sources before answering.",
          },
        },
        memberName: "professor",
        teamManifestMembers: [
          { memberName: "professor", role: "coordinator", description: null },
          { memberName: "student", role: "researcher", description: "finds references" },
        ],
      }),
      content: "please delegate this",
      sendMessageToToolingEnabled: true,
    });

    expect(input).toContain("<team_instruction>");
    expect(input).toContain("Work as a coordinated research team.");
    expect(input).toContain("</team_instruction>");
    expect(input).toContain("<agent_instruction>");
    expect(input).toContain("You verify sources before answering.");
    expect(input).toContain("</agent_instruction>");
    expect(input).toContain("<runtime_instruction>");
    expect(input).toContain(
      "If you use `send_message_to`, set `recipient_name` to exactly match one teammate name from the list below.",
    );
    expect(input).toContain("- student: researcher | finds references");
    expect(input).toContain("</runtime_instruction>");
    expect(input).not.toContain("definition_instructions");
    expect(input).toContain("<user_message>");
    expect(input).toContain("please delegate this");
    expect(input).toContain("</user_message>");
  });

  it("renders configured skills in a dedicated section when selected skills are available", () => {
    const input = buildClaudeTurnInput({
      state: createState({
        configuredSkills: [
          {
            name: "code-review",
            description: "Review code carefully.",
            content: "Always verify edge cases before approving changes.",
            rootPath: "/skills/code-review",
            skillFilePath: "/skills/code-review/SKILL.md",
          },
        ],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
      content: "review this diff",
      sendMessageToToolingEnabled: false,
    });

    expect(input).toContain("<configured_skills>");
    expect(input).toContain("## Agent Configured Skills");
    expect(input).toContain("Root Path: `/skills/code-review`");
    expect(input).toContain("Always verify edge cases before approving changes.");
    expect(input).toContain("</configured_skills>");
  });
});
