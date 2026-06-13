import { describe, expect, it, vi } from "vitest";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildClaudeTeamMcpServers } from "../../../../../../src/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.js";

const createMemberTeamContext = () =>
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
  it("returns null when only send_message_to would have required team MCP tooling", async () => {
    const createToolDefinition = vi.fn((definition: Record<string, unknown>) => definition);
    const createMcpServer = vi.fn(async (definition: Record<string, unknown>) => ({
      ...definition,
      normalized: true,
    }));

    const result = await buildClaudeTeamMcpServers({
      runContext: {
        runId: "run-professor",
        runtimeContext: {
          memberTeamContext: createMemberTeamContext(),
        },
      } as any,
      sdkClient: {
        createToolDefinition,
        createMcpServer,
      } as any,
      enabledTaskDelegationToolNames: [],
    });

    expect(result).toBeNull();
    expect(createToolDefinition).not.toHaveBeenCalled();
    expect(createMcpServer).not.toHaveBeenCalled();
  });

  it("builds task-delegation MCP tooling only under autobyteus_team", async () => {
    const createToolDefinition = vi.fn((definition: Record<string, unknown>) => definition);
    const createMcpServer = vi.fn(async (definition: Record<string, unknown>) => ({
      ...definition,
      normalized: true,
    }));

    const result = await buildClaudeTeamMcpServers({
      runContext: {
        runId: "run-professor",
        runtimeContext: {
          memberTeamContext: createMemberTeamContext(),
        },
      } as any,
      sdkClient: {
        createToolDefinition,
        createMcpServer,
      } as any,
      enabledTaskDelegationToolNames: ["delegate_tasks"],
    });

    expect(createToolDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ name: "delegate_tasks" }),
    );
    expect(createMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "autobyteus_team",
        tools: [expect.objectContaining({ name: "delegate_tasks" })],
      }),
    );
    expect(createMcpServer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([expect.objectContaining({ name: "send_message_to" })]),
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
