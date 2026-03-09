import { describe, expect, it } from "vitest";
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
});
