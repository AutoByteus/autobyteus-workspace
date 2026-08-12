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
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildTeamMemberAddress } from "../../../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";

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

const createMemberTeamContext = () =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamName: "Claude team",
    teamBackendKind: TeamBackendKind.MIXED,
    teamAddress: "/",
    memberAddress: "/professor",
    agentRunId: "run-1",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    coordinatorAddress: "/professor",
    collaboration: {
      addressing: {
        rootTeamRunId: "team-1",
        memberAddress: "/professor",
      },
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    },
    executionAddress: {
      rootTeamRunId: "team-1",
      taskTeamRunIds: [],
      memberAddress: "/professor",
      taskAgentRunId: null,
    },
  });

const createSession = (configuredToolNames: string[] = [], input: {
  memberTeamContext?: MemberTeamContext | null;
} = {}) => {
  const startQueryTurn = vi.fn(async () => createResultQuery());
  const closeQuery = vi.fn();
  const memberTeamContext = input.memberTeamContext === undefined
    ? createMemberTeamContext()
    : input.memberTeamContext;
  const supportedAgentToolsMcpNames = new Set([
    "send_message_to",
    "open_tab",
    "read_page",
    "generate_image",
    "generate_speech",
    "delegate_task",
    "submit_task_result",
    "review_task_result",
    "publish_artifacts",
    "db_query",
  ]);
  const enabledTools = configuredToolNames.filter((toolName) =>
    supportedAgentToolsMcpNames.has(toolName),
  );
  const createAgentToolMcpSession = vi.fn(() => ({
    session: {},
    descriptor: {
      name: "autobyteus_agent_tools",
      transport: "streamable_http",
      serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-gating",
      headers: { Authorization: "Bearer fake-token" },
      enabledTools,
    },
  }));

  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "haiku",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      memberTeamContext,
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
      memberTeamContext,
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
      agentToolMcpSessionService: {
        createAgentToolMcpSession,
      } as any,
      isRunSessionActive: () => true,
      terminateRunSession: vi.fn(async () => undefined),
    },
  });

  return {
    session,
    startQueryTurn,
    createAgentToolMcpSession,
  };
};

describe("ClaudeSession browser/send_message_to/publish_artifacts gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildClaudeSessionMcpServersMock.mockResolvedValue(null);
  });

  it("does not enable send_message_to or browser tools that are missing from agent toolNames", async () => {
    const { session, startQueryTurn, createAgentToolMcpSession } = createSession(["read_page"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["read_page"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Your address in the AgentTeam is:\n\n/professor"),
        allowedTools: ["read_page", "mcp__autobyteus_agent_tools__read_page"],
      }),
    );
    expect(createAgentToolMcpSession).toHaveBeenCalledTimes(1);
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
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["send_message_to", "open_tab", "read_page"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "use `send_message_to` to notify that Agent or AgentTeam",
        ),
        allowedTools: expect.arrayContaining([
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
          "open_tab",
          "read_page",
          "mcp__autobyteus_agent_tools__open_tab",
          "mcp__autobyteus_agent_tools__read_page",
        ]),
      }),
    );
  });

  it("enables hierarchical Team and exact-run send_message_to without a static roster", async () => {
    const memberTeamContext = createMemberTeamContext();
    const { session, startQueryTurn } = createSession(["send_message_to"], {
      memberTeamContext,
    });

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["send_message_to"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Bare member names, `../`, and backslashes are not valid addresses."),
        allowedTools: [
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
        ],
      }),
    );
  });

  it("creates an Agent Tools MCP session with member sender context when send_message_to is configured", async () => {
    const memberTeamContext = createMemberTeamContext();
    const { session, createAgentToolMcpSession } = createSession(["send_message_to"], {
      memberTeamContext,
    });

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(createAgentToolMcpSession).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: expect.objectContaining({
          runId: "run-1",
          agentRunId: "run-1",
          displayName: "professor",
          executionAddress: memberTeamContext.executionAddress,
        }),
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "professor",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          memberTeamContext,
        }),
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
    );
    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          name: "autobyteus_agent_tools",
          headers: { Authorization: "Bearer fake-token" },
        }),
      }),
    );
  });

  it("creates an Agent Tools MCP session with standalone sender context when no team context exists", async () => {
    const { session, createAgentToolMcpSession } = createSession(["send_message_to"], {
      memberTeamContext: null,
    });

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(createAgentToolMcpSession).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { runId: "run-1" },
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "agent-1",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          memberTeamContext: null,
        }),
      }),
    );
  });

  it("reuses the live Agent Tools MCP descriptor across configured turns without wall-clock refresh", async () => {
    const { session, createAgentToolMcpSession } = createSession(["send_message_to"]);
    createAgentToolMcpSession
      .mockImplementationOnce(() => ({
        session: {},
        descriptor: {
          name: "autobyteus_agent_tools",
          transport: "streamable_http",
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/live",
          headers: { Authorization: "Bearer live" },
          enabledTools: ["send_message_to"],
        },
      }))
      .mockImplementationOnce(() => ({
        session: {},
        descriptor: {
          name: "autobyteus_agent_tools",
          transport: "streamable_http",
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/fresh",
          headers: { Authorization: "Bearer fresh" },
          enabledTools: ["send_message_to"],
        },
      }));

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });
    await (session as any).executeTurn({
      turnId: "turn-2",
      content: new AgentInputUserMessage("again").content,
      abortController: new AbortController(),
    });

    expect(createAgentToolMcpSession).toHaveBeenCalledTimes(1);
    expect(buildClaudeSessionMcpServersMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/live",
          headers: { Authorization: "Bearer live" },
        }),
      }),
    );
  });

  it("enables publish_artifacts only when toolNames explicitly allow it", async () => {
    const { session, startQueryTurn } = createSession(["publish_artifacts"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["publish_artifacts"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "publish_artifacts",
          "mcp__autobyteus_agent_tools__publish_artifacts",
        ],
      }),
    );
  });

  it("enables media tools and their autobyteus_agent_tools MCP names only when configured", async () => {
    const { session, startQueryTurn } = createSession(["generate_image", "generate_speech"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["generate_image", "generate_speech"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "generate_image",
          "mcp__autobyteus_agent_tools__generate_image",
          "generate_speech",
          "mcp__autobyteus_agent_tools__generate_speech",
        ],
      }),
    );
  });

  it("enables task delegation tools and their autobyteus_agent_tools MCP names only when configured", async () => {
    const { session, startQueryTurn } = createSession([
      "delegate_task",
      ["mark", "task", "completed"].join("_"),
      ["mark", "task", "failed"].join("_"),
      ["accept", "task"].join("_"),
      "submit_task_result",
      "review_task_result",
      "create_task",
    ]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: [
            "delegate_task",
            "submit_task_result",
            "review_task_result",
          ],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("`delegate_task.recipient_address` uses the same logical-address grammar"),
        allowedTools: [
          "delegate_task",
          "mcp__autobyteus_agent_tools__delegate_task",
          "submit_task_result",
          "mcp__autobyteus_agent_tools__submit_task_result",
          "review_task_result",
          "mcp__autobyteus_agent_tools__review_task_result",
        ],
      }),
    );
  });

  it("creates Agent Tools MCP tooling for configured MCP-only Claude tools", async () => {
    const { session, startQueryTurn } = createSession(["db_query"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["db_query"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "db_query",
          "mcp__autobyteus_agent_tools__db_query",
        ],
      }),
    );
  });

  it("does not enable artifact publication for old singular-only Claude configs", async () => {
    const { session, startQueryTurn } = createSession(["publish_artifact"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: null,
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [],
      }),
    );
  });

  it("enables only plural artifact tooling for mixed old/new Claude configs", async () => {
    const { session, startQueryTurn } = createSession(["publish_artifacts", "publish_artifact"]);

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["publish_artifacts"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "publish_artifacts",
          "mcp__autobyteus_agent_tools__publish_artifacts",
        ],
      }),
    );
  });

});
