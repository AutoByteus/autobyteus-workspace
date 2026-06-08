import { describe, expect, it, vi } from "vitest";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildClaudeTeamMcpServers } from "../../../../../../src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.js";

const createExactRunOnlyMemberTeamContext = () =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "Professor",
    memberRouteKey: "professor",
    memberRunId: "run-professor",
    communicationRecipients: [],
    allowedRecipientNames: [],
    sendMessageToEnabled: true,
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  });

describe("claude-team-mcp-server-builder", () => {
  it("builds send_message_to MCP tooling for exact-run-only contexts without static recipients", async () => {
    const createToolDefinition = vi.fn((definition: Record<string, unknown>) => definition);
    const createMcpServer = vi.fn(async (definition: Record<string, unknown>) => ({
      ...definition,
      normalized: true,
    }));

    const result = await buildClaudeTeamMcpServers({
      runContext: {
        runId: "run-professor",
        runtimeContext: {
          memberTeamContext: createExactRunOnlyMemberTeamContext(),
          activeTurnId: "turn-1",
          autoExecuteTools: true,
        },
      } as any,
      sdkClient: {
        createToolDefinition,
        createMcpServer,
      } as any,
      requestToolApproval: null,
      emitEvent: vi.fn(),
      sendMessageToToolingEnabled: true,
    });

    expect(createToolDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ name: "send_message_to" }),
    );
    expect(createMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "autobyteus_team",
        tools: [expect.objectContaining({ name: "send_message_to" })],
      }),
    );
    expect(result).toEqual({
      autobyteus_team: expect.objectContaining({
        name: "autobyteus_team",
        normalized: true,
      }),
    });
  });
});
