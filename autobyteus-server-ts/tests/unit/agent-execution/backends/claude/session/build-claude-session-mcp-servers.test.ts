import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildClaudeTeamMcpServersMock,
  buildClaudeBrowserMcpServersMock,
} = vi.hoisted(() => ({
  buildClaudeTeamMcpServersMock: vi.fn(),
  buildClaudeBrowserMcpServersMock: vi.fn(),
}));

vi.mock(
  "../../../../../../src/agent-team-execution/backends/claude/claude-team-mcp-server-builder.js",
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

import { buildClaudeSessionMcpServers } from "../../../../../../src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.js";

describe("buildClaudeSessionMcpServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns browser MCP servers when send-message tooling is disabled", async () => {
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: false,
      runContext: {} as any,
      sdkClient: {} as any,
      requestToolApproval: null,
      emitEvent: vi.fn(),
    });

    expect(buildClaudeTeamMcpServersMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      autobyteus_browser: { name: "browser" },
    });
  });

  it("merges team and browser MCP servers when send-message tooling is enabled", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue({
      autobyteus_team: { name: "team" },
    });
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: true,
      runContext: { runId: "run-1" } as any,
      sdkClient: { sdk: true } as any,
      requestToolApproval: vi.fn(),
      emitEvent: vi.fn(),
    });

    expect(buildClaudeTeamMcpServersMock).toHaveBeenCalledTimes(1);
    expect(buildClaudeBrowserMcpServersMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      autobyteus_team: { name: "team" },
      autobyteus_browser: { name: "browser" },
    });
  });

  it("throws when team MCP configuration is required but unavailable", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue(null);
    buildClaudeBrowserMcpServersMock.mockResolvedValue({
      autobyteus_browser: { name: "browser" },
    });

    await expect(
      buildClaudeSessionMcpServers({
        sendMessageToToolingEnabled: true,
        runContext: {} as any,
        sdkClient: {} as any,
        requestToolApproval: vi.fn(),
        emitEvent: vi.fn(),
      }),
    ).rejects.toThrow(/CLAUDE_QUERY_MCP_UNAVAILABLE/);
  });
});
