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

  it("wraps teammate context using generic team_context tag", () => {
    const input = buildClaudeTurnInput({
      state: createState({
        memberName: "professor",
        teamManifestMembers: [
          { memberName: "professor", role: "coordinator", description: null },
          { memberName: "student", role: "researcher", description: "finds references" },
        ],
      }),
      content: "please delegate this",
      sendMessageToToolingEnabled: true,
    });

    expect(input).toContain("<team_context>");
    expect(input).toContain("</team_context>");
    expect(input).not.toContain("<autobyteus_team_context>");
    expect(input).toContain("<user_message>");
    expect(input).toContain("please delegate this");
    expect(input).toContain("</user_message>");
  });
});
