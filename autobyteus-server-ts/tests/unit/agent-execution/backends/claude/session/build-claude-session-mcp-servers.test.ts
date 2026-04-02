import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildClaudeTeamMcpServersMock,
  buildClaudePreviewMcpServersMock,
} = vi.hoisted(() => ({
  buildClaudeTeamMcpServersMock: vi.fn(),
  buildClaudePreviewMcpServersMock: vi.fn(),
}));

vi.mock(
  "../../../../../../src/agent-team-execution/backends/claude/claude-team-mcp-server-builder.js",
  () => ({
    buildClaudeTeamMcpServers: buildClaudeTeamMcpServersMock,
  }),
);

vi.mock(
  "../../../../../../src/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.js",
  () => ({
    buildClaudePreviewMcpServers: buildClaudePreviewMcpServersMock,
  }),
);

import { buildClaudeSessionMcpServers } from "../../../../../../src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.js";

describe("buildClaudeSessionMcpServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns preview MCP servers when send-message tooling is disabled", async () => {
    buildClaudePreviewMcpServersMock.mockResolvedValue({
      autobyteus_preview: { name: "preview" },
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
      autobyteus_preview: { name: "preview" },
    });
  });

  it("merges team and preview MCP servers when send-message tooling is enabled", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue({
      autobyteus_team: { name: "team" },
    });
    buildClaudePreviewMcpServersMock.mockResolvedValue({
      autobyteus_preview: { name: "preview" },
    });

    const result = await buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: true,
      runContext: { runId: "run-1" } as any,
      sdkClient: { sdk: true } as any,
      requestToolApproval: vi.fn(),
      emitEvent: vi.fn(),
    });

    expect(buildClaudeTeamMcpServersMock).toHaveBeenCalledTimes(1);
    expect(buildClaudePreviewMcpServersMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      autobyteus_team: { name: "team" },
      autobyteus_preview: { name: "preview" },
    });
  });

  it("throws when team MCP configuration is required but unavailable", async () => {
    buildClaudeTeamMcpServersMock.mockResolvedValue(null);
    buildClaudePreviewMcpServersMock.mockResolvedValue({
      autobyteus_preview: { name: "preview" },
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
