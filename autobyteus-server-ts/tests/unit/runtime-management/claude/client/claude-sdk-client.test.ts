import { describe, expect, it, vi } from "vitest";
import { ClaudeSdkClient, type ClaudeSdkCanUseTool } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";

const createMockQuery = () => {
  const query = {
    async *[Symbol.asyncIterator]() {
      yield { type: "result", result: "done", session_id: "session-1" };
    },
    interrupt: vi.fn(async () => undefined),
    close: vi.fn(() => undefined),
  };
  return query;
};

describe("ClaudeSdkClient", () => {
  it("passes stable query options for project skills, resume, MCP, and send_message_to tooling", async () => {
    const client = new ClaudeSdkClient();
    const queryMock = createMockQuery();
    const queryFn = vi.fn(async (input: unknown) => queryMock);

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    const mcpServer = { transport: "mock" };
    const query = await client.startQueryTurn({
      prompt: "Use the skill and continue the session.",
      sessionId: "session-123",
      model: "haiku",
      workingDirectory: "/tmp/claude-client-query-options",
      mcpServers: { demo: mcpServer },
      enableSendMessageToTooling: true,
      enableProjectSkillSettings: true,
      permissionMode: "default",
      autoExecuteTools: false,
    });

    expect(query).toBe(queryMock);
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith({
      prompt: "Use the skill and continue the session.",
      options: expect.objectContaining({
        model: "haiku",
        cwd: "/tmp/claude-client-query-options",
        resume: "session-123",
        mcpServers: { demo: mcpServer },
        permissionMode: "default",
        settingSources: ["project"],
        allowedTools: expect.arrayContaining(["Skill", "send_message_to", "mcp__autobyteus_team__send_message_to"]),
      }),
    });
  });

  it("prefers an explicit canUseTool callback and otherwise injects auto-exec tool approval", async () => {
    const client = new ClaudeSdkClient();
    const explicitCanUseTool: ClaudeSdkCanUseTool = vi.fn(async () => ({
      behavior: "allow",
      updatedInput: {},
    }));
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce(createMockQuery())
      .mockResolvedValueOnce(createMockQuery());

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    await client.startQueryTurn({
      prompt: "explicit approval callback",
      model: "haiku",
      workingDirectory: "/tmp/claude-client-explicit-can-use-tool",
      enableSendMessageToTooling: false,
      autoExecuteTools: true,
      canUseTool: explicitCanUseTool,
    });

    await client.startQueryTurn({
      prompt: "auto exec callback",
      model: "haiku",
      workingDirectory: "/tmp/claude-client-auto-exec",
      enableSendMessageToTooling: false,
      autoExecuteTools: true,
    });

    expect(queryFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        options: expect.objectContaining({
          canUseTool: explicitCanUseTool,
        }),
      }),
    );

    const secondCall = queryFn.mock.calls[1]?.[0] as {
      options?: { canUseTool?: ClaudeSdkCanUseTool };
    };
    expect(typeof secondCall.options?.canUseTool).toBe("function");
    expect(secondCall.options?.canUseTool).not.toBe(explicitCanUseTool);
  });

  it("wraps interrupt and close on the returned query object", async () => {
    const client = new ClaudeSdkClient();
    const queryMock = createMockQuery();

    await client.interruptQuery(queryMock);
    client.closeQuery(queryMock);

    expect(queryMock.interrupt).toHaveBeenCalledTimes(1);
    expect(queryMock.close).toHaveBeenCalledTimes(1);
  });

  it("returns null when getSessionMessages is unavailable or session id is empty", async () => {
    const client = new ClaudeSdkClient();
    client.setCachedModuleForTesting({});

    await expect(client.getSessionMessages("")).resolves.toBeNull();
    await expect(client.getSessionMessages("session-123")).resolves.toBeNull();
  });
});
