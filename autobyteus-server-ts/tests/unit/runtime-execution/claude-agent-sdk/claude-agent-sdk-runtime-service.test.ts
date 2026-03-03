import { AgentInputUserMessage } from "autobyteus-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

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

const createFakeV2Session = (
  turns: unknown[][],
  queryControl: Record<string, unknown> = {},
): {
  send: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  query: Record<string, unknown>;
} => {
  let turnIndex = 0;
  return {
    send: vi.fn().mockResolvedValue(undefined),
    stream: vi.fn().mockImplementation(() =>
      (async function* () {
        const chunks = turns[turnIndex] ?? [];
        turnIndex += 1;
        for (const chunk of chunks) {
          yield chunk;
        }
      })(),
    ),
    close: vi.fn(),
    query: queryControl,
  };
};

describe("ClaudeAgentSdkRuntimeService", () => {
  afterEach(() => {
    delete process.env.CLAUDE_AGENT_SDK_MODELS;
    delete process.env.CLAUDE_CODE_EXECUTABLE_PATH;
  });

  it("streams turn deltas, emits lifecycle events, and records session transcript", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          {
            type: "assistant",
            session_id: "claude-session-1",
            message: { content: [{ type: "text", text: "Hello " }] },
          },
          { delta: "world" },
          { type: "result", session_id: "claude-session-1", result: "Hello world" },
        ],
      ]),
    );
    const resumeSession = vi.fn();

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: resumeSession,
    };

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
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(resumeSession).toHaveBeenCalledTimes(0);
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
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          { type: "system", subtype: "init", session_id: "claude-session-real" },
          {
            type: "assistant",
            session_id: "claude-session-real",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "OK" }],
            },
          },
          { type: "result", subtype: "success", session_id: "claude-session-real", result: "OK" },
        ],
      ]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

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

  it("creates one V2 session and reuses it across multiple turns", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [{ session_id: "claude-session-2", delta: "First reply" }],
        [{ delta: "Second reply" }],
      ]),
    );
    const resumeSession = vi.fn();

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: resumeSession,
    };

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

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(resumeSession).toHaveBeenCalledTimes(0);
  });

  it("uses unstable_v2_resumeSession for restored runs with prior session id", async () => {
    const createSession = vi.fn();
    const resumeSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ session_id: "restored-session-1", delta: "restored" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: resumeSession,
    };

    await service.restoreRunSession(
      "run-restored",
      {
        modelIdentifier: "default",
        workingDirectory: "/tmp/workspace",
        llmConfig: null,
      },
      { sessionId: "restored-session-1", metadata: null },
    );

    const methods: string[] = [];
    service.subscribeToRunEvents("run-restored", (event) => methods.push(event.method));

    await service.sendTurn(
      "run-restored",
      AgentInputUserMessage.fromDict({ content: "continue please" }),
    );
    await waitFor(() => methods.includes("turn/completed"));

    expect(createSession).toHaveBeenCalledTimes(0);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    expect(resumeSession.mock.calls[0]?.[0]).toBe("restored-session-1");
  });

  it("keeps websocket-style run listeners active across close and restore for the same run id", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ session_id: "session-first", delta: "first" }]]),
    );
    const resumeSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ session_id: "restored-session-1", delta: "second" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: resumeSession,
    };

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
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(resumeSession).toHaveBeenCalledTimes(1);
  });

  it("injects inter-agent envelopes as agent messages and emits inter_agent_message", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ delta: "agent-delivered" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

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
    const createSdkMcpServer = vi.fn().mockImplementation((input: Record<string, unknown>) => {
      const tools = Array.isArray(input.tools) ? (input.tools as Array<Record<string, unknown>>) : [];
      capturedToolHandler = (tools[0]?.handler as ((args: unknown) => Promise<unknown>) | undefined) ?? null;
      return { type: "sdk", name: input.name ?? "autobyteus_team", instance: {} };
    });

    const setMcpServers = vi.fn().mockImplementation(async () => {
      if (capturedToolHandler) {
        await capturedToolHandler({
          recipient_name: "pong",
          content: "PING",
          message_type: "roundtrip_ping",
        });
      }
      return { added: ["autobyteus_team"], removed: [], errors: {} };
    });

    const relayHandler = vi.fn().mockResolvedValue({ accepted: true });
    const resumeSession = vi.fn().mockReturnValue(
      createFakeV2Session(
        [[{ delta: "done" }]],
        {
          setMcpServers,
        },
      ),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: vi.fn(),
      unstable_v2_resumeSession: resumeSession,
      createSdkMcpServer,
    };
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
    expect(setMcpServers).toHaveBeenCalledTimes(1);
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

    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ delta: "hello" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

    await service.createRunSession("run-exec-fallback", {
      modelIdentifier: "default",
      workingDirectory: "/tmp/workspace",
      llmConfig: null,
    });

    await service.sendTurn(
      "run-exec-fallback",
      AgentInputUserMessage.fromDict({ content: "hello" }),
    );
    await waitFor(() => createSession.mock.calls.length > 0);

    const resolvedExecutable = createSession.mock.calls[0]?.[0]?.pathToClaudeCodeExecutable;
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

  it("merges SDK and local transcript session messages", async () => {
    const getSessionMessages = vi
      .fn()
      .mockResolvedValue({ messages: [{ role: "assistant", content: "from-sdk" }] });
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
      transcriptStore: {
        appendMessage: (sessionId: string, message: Record<string, unknown>) => void;
      };
    };
    service.cachedSdkModule = { getSessionMessages };
    service.transcriptStore.appendMessage("session-merge", {
      role: "user",
      content: "from-local",
    });

    const messages = await service.getSessionMessages("session-merge");
    expect(messages).toEqual([
      { role: "assistant", content: "from-sdk" },
      { role: "user", content: "from-local" },
    ]);
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
