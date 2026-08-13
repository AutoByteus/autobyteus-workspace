import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { buildRuntimeAgentToolExposure } from "../../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { AgentDefinition } from "../../../../../../src/agent-definition/domain/models.js";
import { composeCarpenterPrompt } from "../../../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { testMemberTeamContext } from "../../../../../fixtures/current-team-run-fixtures.js";

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
  testMemberTeamContext({
    teamRunId: "team-1",
    rootTeamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    memberAddress: "/Professor",
    coordinatorAddress: "/Professor",
    agentRunId: "run-1",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  });

const createSession = (requestedToolNames: string[] = [], input: {
  memberTeamContext?: MemberTeamContext | null;
} = {}) => {
  const startQueryTurn = vi.fn(async () => createResultQuery());
  const closeQuery = vi.fn();
  const memberTeamContext = input.memberTeamContext ?? null;
  const supportedAgentToolsMcpNames = new Set([
    "get_handoff_rules",
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
  const runtimeToolExposure = buildRuntimeAgentToolExposure(requestedToolNames, memberTeamContext);
  const enabledTools = runtimeToolExposure.requestedToolNames.filter((toolName) =>
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
      carpenterSystemPrompt: composeCarpenterPrompt({
        agentDefinition: new AgentDefinition({
          name: "Test agent",
          description: "Tests Claude tooling.",
          instructions: "Run the requested test.",
          toolNames: requestedToolNames,
        }),
        workspaceRootPath: "/tmp",
        memberTeamContext,
      }),
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: "/tmp",
        permissionMode: "default",
      }),
      runtimeToolExposure,
      sessionId: "run-1",
      activeTurnId: null,
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

  it("preserves configured-only standalone exposure without team defaults", async () => {
    const { session, startQueryTurn, createAgentToolMcpSession } = createSession(["read_page"], {
      memberTeamContext: null,
    });

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
        prompt: "hello",
        systemPrompt: expect.not.stringContaining("## AgentTeam Addressing"),
        allowedTools: ["read_page", "mcp__autobyteus_agent_tools__read_page"],
      }),
    );
    expect(createAgentToolMcpSession).toHaveBeenCalledTimes(1);
  });

  it("enables team collaboration defaults and only configured browser tools", async () => {
    const { session, startQueryTurn } = createSession(
      ["send_message_to", "open_tab", "read_page"],
      { memberTeamContext: createMemberTeamContext() },
    );

    await (session as any).executeTurn({
      turnId: "turn-1",
      content: new AgentInputUserMessage("hello").content,
      abortController: new AbortController(),
    });

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: [
            "send_message_to",
            "open_tab",
            "read_page",
            "get_handoff_rules",
            "delegate_task",
          ],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "hello",
        systemPrompt: expect.stringContaining(
          "## AgentTeam Addressing",
        ),
        allowedTools: expect.arrayContaining([
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
          "get_handoff_rules",
          "mcp__autobyteus_agent_tools__get_handoff_rules",
          "open_tab",
          "read_page",
          "mcp__autobyteus_agent_tools__open_tab",
          "mcp__autobyteus_agent_tools__read_page",
          "delegate_task",
          "mcp__autobyteus_agent_tools__delegate_task",
        ]),
      }),
    );
  });

  it("automatically enables team collaboration tools for exact-run-only contexts", async () => {
    const memberTeamContext = createMemberTeamContext();
    const { session, startQueryTurn } = createSession([], {
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
          enabledTools: ["get_handoff_rules", "send_message_to", "delegate_task"],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "hello",
        systemPrompt: expect.stringContaining(
          "Bare names, `../`, and backslashes are invalid.",
        ),
        allowedTools: [
          "get_handoff_rules",
          "mcp__autobyteus_agent_tools__get_handoff_rules",
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
          "delegate_task",
          "mcp__autobyteus_agent_tools__delegate_task",
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
        owner: {
          runId: "run-1",
          executionAddress: memberTeamContext.executionAddress,
          agentRunId: "run-1",
          displayName: "Professor",
        },
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "Professor",
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

  it("combines intrinsic Team tools with configured task-result tools", async () => {
    const { session, startQueryTurn } = createSession(
      [
        "delegate_task",
        ["mark", "task", "completed"].join("_"),
        ["mark", "task", "failed"].join("_"),
        ["accept", "task"].join("_"),
        "submit_task_result",
        "review_task_result",
        "create_task",
      ],
      { memberTeamContext: createMemberTeamContext() },
    );

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
            "get_handoff_rules",
            "send_message_to",
          ],
        }),
      }),
    );
    expect(startQueryTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "hello",
        systemPrompt: expect.stringContaining(
          "`delegate_task` uses the same address format",
        ),
        allowedTools: [
          "delegate_task",
          "mcp__autobyteus_agent_tools__delegate_task",
          "submit_task_result",
          "mcp__autobyteus_agent_tools__submit_task_result",
          "review_task_result",
          "mcp__autobyteus_agent_tools__review_task_result",
          "get_handoff_rules",
          "mcp__autobyteus_agent_tools__get_handoff_rules",
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
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
