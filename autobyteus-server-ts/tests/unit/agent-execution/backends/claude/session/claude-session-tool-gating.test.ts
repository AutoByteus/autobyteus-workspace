import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { buildConfiguredAgentToolExposure } from "../../../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunContext } from "../../../../../../src/agent-team-execution/domain/team-run-context.js";

const {
  buildClaudeSessionMcpServersMock,
} = vi.hoisted(() => ({
  buildClaudeSessionMcpServersMock: vi.fn(async () => null),
}));

vi.mock(
  "../../../../../../src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.js",
  () => ({
    buildClaudeSessionMcpServers: buildClaudeSessionMcpServersMock,
  }),
);

const createResultQuery = async function* () {
  yield {
    type: "result",
    session_id: "claude-session-1",
    result: "done",
  };
};

const createTeamContext = () =>
  new TeamRunContext({
    runId: "team-1",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    config: null,
    runtimeContext: {
      memberContexts: [
        {
          memberName: "Professor",
          memberRouteKey: "professor",
          memberRunId: "run-1",
          getPlatformAgentRunId: () => null,
        },
        {
          memberName: "Student",
          memberRouteKey: "student",
          memberRunId: "run-2",
          getPlatformAgentRunId: () => null,
        },
      ],
    } as any,
  });

const createSession = (configuredToolNames: string[] = []) => {
  const startQueryTurn = vi.fn(async () => createResultQuery());
  const closeQuery = vi.fn();

  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "haiku",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      teamContext: createTeamContext(),
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: "/tmp",
        permissionMode: "default",
      }),
      configuredToolExposure: buildConfiguredAgentToolExposure(configuredToolNames),
      sessionId: "run-1",
      activeTurnId: null,
      teamContext: createTeamContext(),
    }),
  });

  const session = new ClaudeSession({
    runContext,
    dependencies: {
      sessionMessageCache: {
        appendMessage: vi.fn(),
        migrateSessionMessages: vi.fn(),
      } as any,
      sdkClient: {
        startQueryTurn,
        closeQuery,
        interruptQuery: vi.fn(async () => undefined),
      } as any,
      activeQueriesByRunId: new Map(),
      toolingCoordinator: {
        processToolLifecycleChunk: vi.fn(),
        requestToolApprovalDecision: vi.fn(),
        clearPendingToolApprovals: vi.fn(),
      } as any,
      isRunSessionActive: () => true,
      terminateRunSession: vi.fn(async () => undefined),
    },
  });

  return {
    session,
    startQueryTurn,
  };
};

describe("ClaudeSession browser/send_message_to gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildClaudeSessionMcpServersMock.mockResolvedValue(null);
  });

  it("does not enable send_message_to or browser tools that are missing from agent toolNames", async () => {
    const { session, startQueryTurn } = createSession(["read_page"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      signal: new AbortController().signal,
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMessageToToolingEnabled: false,
        enabledBrowserToolNames: ["read_page"],
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
        ),
        allowedTools: ["read_page", "mcp__autobyteus_browser__read_page"],
      }),
    );
  });

  it("enables send_message_to and only the configured browser tools when toolNames explicitly allow them", async () => {
    const { session, startQueryTurn } = createSession([
      "send_message_to",
      "open_tab",
      "read_page",
    ]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      signal: new AbortController().signal,
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMessageToToolingEnabled: true,
        enabledBrowserToolNames: ["open_tab", "read_page"],
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "If you use `send_message_to`, set `recipient_name` to exactly match one teammate name from the list below.",
        ),
        allowedTools: expect.arrayContaining([
          "send_message_to",
          "mcp__autobyteus_team__send_message_to",
          "open_tab",
          "read_page",
          "mcp__autobyteus_browser__open_tab",
          "mcp__autobyteus_browser__read_page",
        ]),
      }),
    );
  });
});
