import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentToolMcpDescriptor } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session.js";

const {
  buildClaudeTeamMcpServersMock,
  buildClaudeBrowserMcpServersMock,
  buildClaudeMediaMcpServerMock,
} = vi.hoisted(() => ({
  buildClaudeTeamMcpServersMock: vi.fn(),
  buildClaudeBrowserMcpServersMock: vi.fn(),
  buildClaudeMediaMcpServerMock: vi.fn(),
}));

vi.mock(
  "../../../../../../src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.js",
  () => ({
    buildClaudeTeamMcpServers: buildClaudeTeamMcpServersMock,
  }),
);

vi.mock(
  "../../../../../../src/agent-execution/backends/claude/browser/build-claude-browser-mcp-servers.js",
  () => ({
    buildClaudeBrowserMcpServers: buildClaudeBrowserMcpServersMock,
  }),
);

vi.mock(
  "../../../../../../src/agent-execution/backends/claude/media/build-claude-media-mcp-server.js",
  () => ({
    buildClaudeMediaMcpServer: buildClaudeMediaMcpServerMock,
  }),
);

import { buildClaudeSessionMcpServers } from "../../../../../../src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.js";

const fakeAgentToolsDescriptor: AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools",
  transport: "streamable_http",
  serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-1",
  headers: {
    Authorization: "Bearer fake-token",
  },
  enabledTools: ["send_message_to"],
};

describe("buildClaudeSessionMcpServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildClaudeMediaMcpServerMock.mockResolvedValue(null);
  });

  it("returns browser MCP servers when send-message tooling is disabled", async () => {
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: false,
      publishArtifactsToolingEnabled: false,
      runContext: {} as any,
      sdkClient: {} as any,
    });

    expect(buildClaudeTeamMcpServersMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      autobyteus_browser: { name: "browser" },
    });
  });

  it("merges Agent Tools and browser MCP servers when send-message tooling is enabled", async () => {
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: true,
      agentToolsMcpDescriptor: fakeAgentToolsDescriptor,
      publishArtifactsToolingEnabled: false,
      runContext: { runId: "run-1" } as any,
      sdkClient: { sdk: true } as any,
    });

    expect(buildClaudeTeamMcpServersMock).not.toHaveBeenCalled();
    expect(buildClaudeBrowserMcpServersMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      autobyteus_agent_tools: {
        type: "http",
        url: "http://127.0.0.1:3000/mcp/agent-tools/session-1",
        headers: {
          Authorization: "Bearer fake-token",
        },
      },
      autobyteus_browser: { name: "browser" },
    });
  });

  it("builds the team MCP server when task delegation tooling is enabled without send_message_to", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue({
      autobyteus_team: { name: "team" },
    });
    buildClaudeBrowserMcpServersMock.mockResolvedValue(null);

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: false,
      taskDelegationToolingEnabled: true,
      enabledTaskDelegationToolNames: [
        "delegate_tasks",
        "submit_task_result",
        "review_task_result",
      ],
      publishArtifactsToolingEnabled: false,
      runContext: { runId: "run-1" } as any,
      sdkClient: { sdk: true } as any,
    });

    expect(buildClaudeTeamMcpServersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledTaskDelegationToolNames: [
          "delegate_tasks",
          "submit_task_result",
          "review_task_result",
        ],
      }),
    );
    expect(result).toEqual({
      autobyteus_team: { name: "team" },
    });
  });

  it("throws when send_message_to tooling is enabled without an Agent Tools descriptor", async () => {
    buildClaudeBrowserMcpServersMock.mockResolvedValue(null);

    await expect(
      buildClaudeSessionMcpServers({
        sendMessageToToolingEnabled: true,
        publishArtifactsToolingEnabled: false,
        runContext: {} as any,
        sdkClient: {} as any,
      }),
    ).rejects.toThrow(/CLAUDE_AGENT_TOOLS_MCP_DESCRIPTOR_MISSING/);
    expect(buildClaudeTeamMcpServersMock).not.toHaveBeenCalled();
  });

  it("throws when task delegation MCP configuration is required but unavailable", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue(null);
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    await expect(
      buildClaudeSessionMcpServers({
        sendMessageToToolingEnabled: false,
        taskDelegationToolingEnabled: true,
        publishArtifactsToolingEnabled: false,
        runContext: {} as any,
        sdkClient: {} as any,
      }),
    ).rejects.toThrow(/CLAUDE_QUERY_MCP_UNAVAILABLE/);
  });

  it("throws an explicit conflict when media MCP server name autobyteus_image_audio is already configured", async () => {
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_image_audio: { name: "external-media-server" },
    });
    buildClaudeMediaMcpServerMock.mockResolvedValue({
      autobyteus_image_audio: { name: "server-owned-media" },
    });

    await expect(
      buildClaudeSessionMcpServers({
        sendMessageToToolingEnabled: false,
        enabledMediaToolNames: ["generate_image"],
        publishArtifactsToolingEnabled: false,
        runContext: {
          runtimeContext: {
            sessionConfig: {
              workingDirectory: "/tmp/workspace",
            },
          },
        } as any,
        sdkClient: {} as any,
      }),
    ).rejects.toThrow(
      /CLAUDE_MCP_SERVER_NAME_CONFLICT: MCP server 'autobyteus_image_audio' is already configured/,
    );
    expect(buildClaudeMediaMcpServerMock).toHaveBeenCalledWith({
      sdkClient: {},
      enabledToolNames: ["generate_image"],
      workingDirectory: "/tmp/workspace",
    });
  });
});
