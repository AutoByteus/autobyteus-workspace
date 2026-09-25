import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeProviderSessionLifecycle } from "../../../../../../src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.js";
import { buildRuntimeAgentToolExposure } from "../../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberExecutionContext } from "../../../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { AgentDefinition } from "../../../../../../src/agent-definition/domain/models.js";
import { composeSharedCarpenterPrompt } from "../../../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { testMemberExecutionContext } from "../../../../../fixtures/current-team-run-fixtures.js";
import type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";
import { createFakeClaudeSdkClient, flushClaudeSession } from "../../../../../helpers/fake-claude-streaming-sdk.js";

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

const PROVIDER_SESSION_ID = "12345678-1234-4234-8234-123456789abc";

const createMemberExecutionContext = () =>
  testMemberExecutionContext({
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
  memberExecutionContext?: MemberExecutionContext | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
} = {}) => {
  const sdkClient = createFakeClaudeSdkClient({ providerSessionId: PROVIDER_SESSION_ID });
  const openStreamingSession = sdkClient.openStreamingSession;
  const memberExecutionContext = input.memberExecutionContext ?? null;
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
    "read_application_state",
  ]);
  const runtimeToolExposure = buildRuntimeAgentToolExposure(requestedToolNames, memberExecutionContext);
  const enabledTools = runtimeToolExposure.requestedToolNames.filter((toolName) =>
    supportedAgentToolsMcpNames.has(toolName),
  );
  const activateForRun = vi.fn((issueInput) => enabledTools.length === 0
    ? ({ kind: "not_exposed" as const })
    : ({
        kind: "active" as const,
        sessionId: "session-gating",
        owner: issueInput.owner,
        descriptor: {
          name: "autobyteus_agent_tools" as const,
          transport: "streamable_http" as const,
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-gating",
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
      memberExecutionContext,
      applicationExecutionContext: input.applicationExecutionContext ?? null,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      carpenterSystemPrompt: composeSharedCarpenterPrompt({
        agentDefinition: new AgentDefinition({
          name: "Test agent",
          description: "Tests Claude tooling.",
          instructions: "Run the requested test.",
          toolNames: requestedToolNames,
        }),
        memberExecutionContext,
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
    providerSessionLifecycle: ClaudeProviderSessionLifecycle.reserveNew(
      () => PROVIDER_SESSION_ID,
    ),
    dependencies: {
      sessionMessageCache: {
        appendMessage: vi.fn(),
        migrateSessionMessages: vi.fn(),
      } as any,
      sdkClient: sdkClient as any,
      toolingCoordinator: {
        processToolLifecycleChunk: vi.fn(),
        processToolLifecycleContentBlock: vi.fn(),
        requestToolApprovalDecision: vi.fn(),
        clearPendingToolApprovals: vi.fn(),
      } as any,
      agentToolMcpRunSessions: { activateForRun } as any,
      isRunSessionActive: () => true,
      terminateRunSession: vi.fn(async () => undefined),
    },
  });

  const submit = async (text: string) => {
    await session.submitInput(new AgentInputUserMessage(text), { kind: "start_turn" });
    await flushClaudeSession();
    sdkClient.current.completeTurn("done");
    await flushClaudeSession();
  };

  return {
    session,
    sdkClient,
    submit,
    openStreamingSession,
    activateForRun,
  };
};

describe("ClaudeSession browser/send_message_to/publish_artifacts gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildClaudeSessionMcpServersMock.mockResolvedValue(null);
  });

  it("preserves configured-only standalone exposure without team defaults", async () => {
    const { submit, openStreamingSession, activateForRun } = createSession(["read_page"], {
      memberExecutionContext: null,
    });

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["read_page"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.not.stringContaining("## AgentTeam Addressing"),
        allowedTools: ["read_page", "mcp__autobyteus_agent_tools__read_page"],
      }),
    );
    expect(activateForRun).toHaveBeenCalledTimes(1);
  });

  it("enables team collaboration defaults and only configured browser tools", async () => {
    const { submit, openStreamingSession } = createSession(
      ["send_message_to", "open_tab", "read_page"],
      { memberExecutionContext: createMemberExecutionContext() },
    );

    await submit("hello");

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
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
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
    const memberExecutionContext = createMemberExecutionContext();
    const { submit, openStreamingSession } = createSession([], {
      memberExecutionContext,
    });

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["get_handoff_rules", "send_message_to", "delegate_task"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          "Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
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
    const memberExecutionContext = createMemberExecutionContext();
    const { submit, activateForRun } = createSession(["send_message_to"], {
      memberExecutionContext,
    });

    await submit("hello");

    expect(activateForRun).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: expect.objectContaining({
          runId: "run-1",
          collaborationIdentity: memberExecutionContext.identity,
          displayName: "Professor",
        }),
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "Professor",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          memberExecutionContext,
        }),
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
    );
    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          name: "autobyteus_agent_tools",
        }),
      }),
    );
  });

  it("creates an Agent Tools MCP session with standalone sender context when no team context exists", async () => {
    const { submit, activateForRun } = createSession(["send_message_to"], {
      memberExecutionContext: null,
    });

    await submit("hello");

    expect(activateForRun).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { runId: "run-1" },
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "agent-1",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          memberExecutionContext: null,
        }),
      }),
    );
  });

  it("forwards the immutable application execution context into the Claude MCP session", async () => {
    const applicationExecutionContext = Object.freeze({
      applicationId: "app-a",
      bindingId: "binding-a",
      producer: Object.freeze({ agentRunId: "run-1", displayName: "Claude app agent" }),
    });
    const { submit, activateForRun } = createSession(["read_application_state"], {
      applicationExecutionContext,
    });

    await submit("hello");

    expect(activateForRun).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      executionContext: expect.objectContaining({ applicationExecutionContext }),
    }));
    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(expect.objectContaining({
      agentToolsMcpDescriptor: expect.objectContaining({
        enabledTools: ["read_application_state"],
      }),
    }));
  });

  it("opens one process whose Agent Tools MCP descriptor serves every later turn", async () => {
    const { submit, activateForRun, openStreamingSession } = createSession(["send_message_to"]);
    activateForRun
      .mockImplementationOnce((issueInput) => ({
        kind: "active" as const,
        sessionId: "live",
        owner: issueInput.owner,
        descriptor: {
          name: "autobyteus_agent_tools",
          transport: "streamable_http",
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/live",
          enabledTools: ["send_message_to"],
        },
      }))
      .mockImplementationOnce((issueInput) => ({
        kind: "active" as const,
        sessionId: "fresh",
        owner: issueInput.owner,
        descriptor: {
          name: "autobyteus_agent_tools",
          transport: "streamable_http",
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/fresh",
          enabledTools: ["send_message_to"],
        },
      }));

    await submit("hello");
    await submit("again");

    expect(activateForRun).toHaveBeenCalledTimes(1);
    expect(openStreamingSession).toHaveBeenCalledTimes(1);
    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledTimes(1);
    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/live",
        }),
      }),
    );
  });

  it("enables publish_artifacts only when toolNames explicitly allow it", async () => {
    const { submit, openStreamingSession } = createSession(["publish_artifacts"]);

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["publish_artifacts"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "publish_artifacts",
          "mcp__autobyteus_agent_tools__publish_artifacts",
        ],
      }),
    );
  });

  it("enables media tools and their autobyteus_agent_tools MCP names only when configured", async () => {
    const { submit, openStreamingSession } = createSession(["generate_image", "generate_speech"]);

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["generate_image", "generate_speech"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
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
    const { submit, openStreamingSession } = createSession(
      [
        "delegate_task",
        ["mark", "task", "completed"].join("_"),
        ["mark", "task", "failed"].join("_"),
        ["accept", "task"].join("_"),
        "submit_task_result",
        "review_task_result",
        "create_task",
      ],
      { memberExecutionContext: createMemberExecutionContext() },
    );

    await submit("hello");

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
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          "Use `delegate_task` to assign a new bounded unit of work",
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
    const { submit, openStreamingSession } = createSession(["db_query"]);

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["db_query"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "db_query",
          "mcp__autobyteus_agent_tools__db_query",
        ],
      }),
    );
  });

  it("does not enable artifact publication for old singular-only Claude configs", async () => {
    const { submit, openStreamingSession } = createSession(["publish_artifact"]);

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: null,
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [],
      }),
    );
  });

  it("enables only plural artifact tooling for mixed old/new Claude configs", async () => {
    const { submit, openStreamingSession } = createSession(["publish_artifacts", "publish_artifact"]);

    await submit("hello");

    expect(buildClaudeSessionMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentToolsMcpDescriptor: expect.objectContaining({
          enabledTools: ["publish_artifacts"],
        }),
      }),
    );
    expect(openStreamingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTools: [
          "publish_artifacts",
          "mcp__autobyteus_agent_tools__publish_artifacts",
        ],
      }),
    );
  });

});
