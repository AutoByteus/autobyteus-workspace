import { AgentInputUserMessage } from "autobyteus-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const toAsyncIterable = (items: unknown[]): AsyncIterable<unknown> =>
  (async function* () {
    for (const item of items) {
      yield item;
    }
  })();

const waitFor = async (
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 1_000;
  const intervalMs = options.intervalMs ?? 10;
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for async condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

describe("ClaudeAgentSdkRuntimeService", () => {
  afterEach(() => {
    delete process.env.CLAUDE_AGENT_SDK_MODELS;
    delete process.env.CLAUDE_CODE_EXECUTABLE_PATH;
  });

  it("streams turn deltas, emits lifecycle events, and records session transcript", async () => {
    const query = vi.fn().mockResolvedValue(
      toAsyncIterable([
        { sessionId: "claude-session-1", delta: "Hello " },
        { delta: "world" },
      ]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    await service.createRunSession("run-1", {
      modelIdentifier: "claude-sonnet-4-5",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    const methods: string[] = [];
    service.subscribeToRunEvents("run-1", (event) => methods.push(event.method));

    const result = await service.sendTurn(
      "run-1",
      AgentInputUserMessage.fromDict({ content: "Say hello" }),
    );
    await waitFor(() => methods.includes("turn/completed"));

    expect(result.turnId).toContain("run-1:turn:");
    expect(query).toHaveBeenCalledTimes(1);
    expect(methods).toEqual([
      "turn/started",
      "item/outputText/delta",
      "item/outputText/delta",
      "item/outputText/completed",
      "turn/completed",
    ]);

    const initialSessionTranscript = await service.getSessionMessages("run-1");
    expect(initialSessionTranscript).toHaveLength(1);
    expect(initialSessionTranscript[0]?.role).toBe("user");
    expect(initialSessionTranscript[0]?.content).toBe("Say hello");

    const switchedSessionTranscript = await service.getSessionMessages("claude-session-1");
    expect(switchedSessionTranscript.length).toBeGreaterThanOrEqual(1);
    expect(
      switchedSessionTranscript.some(
        (entry) => entry.role === "assistant" && entry.content === "Hello world",
      ),
    ).toBe(true);
  });

  it("extracts assistant message content chunks from Claude SDK stream shape", async () => {
    const query = vi.fn().mockResolvedValue(
      toAsyncIterable([
        {
          type: "system",
          subtype: "init",
          session_id: "claude-session-real",
        },
        {
          type: "assistant",
          session_id: "claude-session-real",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "OK" }],
          },
        },
        {
          type: "result",
          subtype: "success",
          session_id: "claude-session-real",
          result: "OK",
        },
      ]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    await service.createRunSession("run-real-shape", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    const methods: string[] = [];
    service.subscribeToRunEvents("run-real-shape", (event) => methods.push(event.method));

    await service.sendTurn(
      "run-real-shape",
      AgentInputUserMessage.fromDict({ content: "Reply with exactly OK" }),
    );
    await waitFor(() => methods.includes("turn/completed"));

    expect(methods).toEqual([
      "turn/started",
      "item/outputText/delta",
      "item/outputText/completed",
      "turn/completed",
    ]);

    const transcript = await service.getSessionMessages("claude-session-real");
    expect(
      transcript.some((entry) => entry.role === "assistant" && entry.content === "OK"),
    ).toBe(true);
  });

  it("omits resume on first turn and resumes by session id on subsequent turns", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(
        toAsyncIterable([
          { sessionId: "claude-session-2", delta: "First reply" },
        ]),
      )
      .mockResolvedValueOnce(
        toAsyncIterable([
          { delta: "Second reply" },
        ]),
      );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    await service.createRunSession("run-resume", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    const methods: string[] = [];
    service.subscribeToRunEvents("run-resume", (event) => methods.push(event.method));

    await service.sendTurn(
      "run-resume",
      AgentInputUserMessage.fromDict({ content: "First turn" }),
    );
    await waitFor(() => methods.filter((method) => method === "turn/completed").length >= 1);
    await service.sendTurn(
      "run-resume",
      AgentInputUserMessage.fromDict({ content: "Second turn" }),
    );
    await waitFor(() => methods.filter((method) => method === "turn/completed").length >= 2);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      options: {
        model: "default",
        cwd: "/tmp/workspace",
      },
    });
    expect(query.mock.calls[0]?.[0]?.options?.resume).toBeUndefined();
    expect(query.mock.calls[0]?.[0]?.options?.pathToClaudeCodeExecutable).toEqual(
      expect.any(String),
    );
    expect(query.mock.calls[1]?.[0]?.options?.resume).toBe("claude-session-2");
    expect(typeof query.mock.calls[1]?.[0]?.options?.resume).toBe("string");
    expect(query.mock.calls[1]?.[0]?.options?.pathToClaudeCodeExecutable).toEqual(
      expect.any(String),
    );
  });

  it("keeps websocket-style run listeners active across close and restore for the same run id", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(toAsyncIterable([{ delta: "first" }]))
      .mockResolvedValueOnce(toAsyncIterable([{ delta: "second" }]));

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    const methods: string[] = [];
    const unsubscribe = service.subscribeToRunEvents("run-rebind", (event) => methods.push(event.method));

    await service.createRunSession("run-rebind", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });
    await service.sendTurn(
      "run-rebind",
      AgentInputUserMessage.fromDict({ content: "First turn" }),
    );
    await waitFor(() => methods.filter((method) => method === "turn/completed").length >= 1);

    await service.closeRunSession("run-rebind");
    await service.restoreRunSession(
      "run-rebind",
      {
        modelIdentifier: "default",
        workingDirectory: "/tmp/workspace",
        llmConfig: null,
      },
      { sessionId: "restored-session-1", metadata: null },
    );

    await service.sendTurn(
      "run-rebind",
      AgentInputUserMessage.fromDict({ content: "Second turn" }),
    );
    await waitFor(() => methods.filter((method) => method === "turn/completed").length >= 2);

    unsubscribe();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("injects inter-agent envelopes as agent messages and emits inter_agent_message", async () => {
    const query = vi.fn().mockResolvedValue(
      toAsyncIterable([{ delta: "agent-delivered" }]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    await service.createRunSession("run-relay-target", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    const methods: string[] = [];
    service.subscribeToRunEvents("run-relay-target", (event) => methods.push(event.method));

    await service.injectInterAgentEnvelope("run-relay-target", {
      senderAgentId: "member-a",
      senderAgentName: "ping",
      recipientName: "pong",
      messageType: "agent_message",
      content: "PING",
      teamRunId: "team-1",
      metadata: null,
    });
    await waitFor(() => methods.includes("turn/completed"));

    expect(methods[0]).toBe("inter_agent_message");
    expect(methods).toContain("turn/started");
    expect(methods).toContain("item/outputText/completed");
  });

  it("enables Claude MCP send_message_to tooling for team sessions and routes through relay handler", async () => {
    let capturedToolHandler: ((args: unknown) => Promise<unknown>) | null = null;
    const createSdkMcpServer = vi.fn().mockImplementation((input: any) => {
      capturedToolHandler = input?.tools?.[0]?.handler ?? null;
      return { type: "sdk", name: input?.name ?? "autobyteus_team", instance: {} };
    });

    const relayHandler = vi.fn().mockResolvedValue({ accepted: true });
    const query = vi.fn().mockImplementation(async () => {
      if (capturedToolHandler) {
        await capturedToolHandler({
          recipient_name: "pong",
          content: "PING",
          message_type: "roundtrip_ping",
        });
      }
      return toAsyncIterable([{ delta: "done" }]);
    });

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query, createSdkMcpServer };
    service.setInterAgentRelayHandler(relayHandler);

    await service.restoreRunSession(
      "run-team-member",
      {
        modelIdentifier: "default",
        workingDirectory: "/tmp/workspace",
        llmConfig: null,
        runtimeMetadata: {
          teamRunId: "team-1",
          memberName: "ping",
          sendMessageToEnabled: true,
          teamMemberManifest: [
            { memberName: "ping", role: "assistant", description: "sender" },
            { memberName: "pong", role: "assistant", description: "recipient" },
          ],
        },
      },
      {
        sessionId: "session-1",
        metadata: {
          teamRunId: "team-1",
          memberName: "ping",
          sendMessageToEnabled: true,
          teamMemberManifest: [
            { memberName: "ping", role: "assistant", description: "sender" },
            { memberName: "pong", role: "assistant", description: "recipient" },
          ],
        },
      },
    );

    const methods: string[] = [];
    service.subscribeToRunEvents("run-team-member", (event) => methods.push(event.method));

    await service.sendTurn(
      "run-team-member",
      AgentInputUserMessage.fromDict({ content: "relay now" }),
    );
    await waitFor(() => methods.includes("turn/completed"));

    expect(createSdkMcpServer).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]?.options?.mcpServers?.autobyteus_team).toBeTruthy();
    expect(query.mock.calls[0]?.[0]?.options?.systemPrompt?.append).toContain("Teammates:");
    expect(relayHandler).toHaveBeenCalledWith({
      senderRunId: "run-team-member",
      senderMemberName: "ping",
      senderTeamRunId: "team-1",
      toolArguments: {
        recipient_name: "pong",
        content: "PING",
        message_type: "roundtrip_ping",
      },
    });
    expect(methods).toContain("item/added");
    expect(methods).toContain("item/completed");
  });

  it("rejects empty turn payloads deterministically", async () => {
    const service = new ClaudeAgentSdkRuntimeService();
    await service.createRunSession("run-empty", {
      modelIdentifier: "claude-sonnet-4-5",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    await expect(
      service.sendTurn("run-empty", AgentInputUserMessage.fromDict({ content: "  " })),
    ).rejects.toThrow("Claude runtime message content is required.");
  });

  it("returns configured default models when SDK listModels is unavailable", async () => {
    process.env.CLAUDE_AGENT_SDK_MODELS = "claude-a, claude-b, claude-a";
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {};

    const models = await service.listModels();
    expect(models.map((model) => model.model_identifier)).toEqual(["claude-a", "claude-b"]);
  });

  it("discovers supported models from Claude query control metadata", async () => {
    process.env.CLAUDE_CODE_EXECUTABLE_PATH = process.execPath;
    const supportedModels = vi.fn().mockResolvedValue([
      { value: "default", displayName: "Default (recommended)" },
      { value: "sonnet[1m]", displayName: "Sonnet (1M context)" },
      { value: "opus", displayName: "Opus" },
    ]);
    const close = vi.fn();
    const interrupt = vi.fn().mockResolvedValue(undefined);
    const query = vi.fn().mockReturnValue({
      supportedModels,
      interrupt,
      close,
    });

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    const models = await service.listModels();
    expect(models.map((model) => model.model_identifier)).toEqual([
      "default",
      "sonnet[1m]",
      "opus",
    ]);
    expect(models.map((model) => model.display_name)).toEqual([
      "Default (recommended)",
      "Sonnet (1M context)",
      "Opus",
    ]);
    expect(query.mock.calls[0]?.[0]?.options?.pathToClaudeCodeExecutable).toBe(
      process.execPath,
    );
    expect(interrupt).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("falls back from unusable configured Claude executable path", async () => {
    const invalidExecutablePath = "/definitely-missing/claude";
    process.env.CLAUDE_CODE_EXECUTABLE_PATH = invalidExecutablePath;

    const query = vi.fn().mockResolvedValue(
      toAsyncIterable([{ delta: "hello" }]),
    );
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { query };

    await service.createRunSession("run-exec-fallback", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    await service.sendTurn(
      "run-exec-fallback",
      AgentInputUserMessage.fromDict({ content: "hello" }),
    );
    await waitFor(() => query.mock.calls.length > 0);

    const resolvedExecutable = query.mock.calls[0]?.[0]?.options?.pathToClaudeCodeExecutable;
    expect(typeof resolvedExecutable).toBe("string");
    expect(resolvedExecutable).not.toBe(invalidExecutablePath);
  });

  it("prefers SDK session messages when available", async () => {
    const getSessionMessages = vi
      .fn()
      .mockResolvedValue({ messages: [{ role: "assistant", content: "from-sdk" }] });
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { getSessionMessages };

    const messages = await service.getSessionMessages("session-1");
    expect(messages).toEqual([{ role: "assistant", content: "from-sdk" }]);
  });

  it("resolves workspace path from workspace manager when available", async () => {
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      workspaceManager: {
        getWorkspaceById: (workspaceId: string) => { getBasePath: () => string } | null;
        getOrCreateWorkspace: (workspaceId: string) => Promise<{ getBasePath: () => string }>;
      };
    };

    service.workspaceManager = {
      getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => "/workspace/existing" }),
      getOrCreateWorkspace: vi.fn(),
    };

    const cwd = await service.resolveWorkingDirectory("workspace-1");
    expect(cwd).toBe("/workspace/existing");
  });

  it("rejects tool approval routing as unsupported", async () => {
    const service = new ClaudeAgentSdkRuntimeService();
    await service.createRunSession("run-approve", {
      modelIdentifier: "claude-sonnet-4-5",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    await expect(service.approveTool("run-approve", "tool-1", true)).rejects.toThrow(
      "Claude Agent SDK runtime does not support tool approval routing.",
    );
  });
});
