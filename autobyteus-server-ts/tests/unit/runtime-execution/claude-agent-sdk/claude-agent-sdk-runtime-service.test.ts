import { AgentInputUserMessage } from "autobyteus-ts";
import { mkdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const TEST_WORKSPACE_DIR = `${process.cwd()}/tests/.tmp/claude-runtime-unit-workspace`;

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
  beforeEach(() => {
    mkdirSync(TEST_WORKSPACE_DIR, { recursive: true });
  });

  afterEach(() => {
    delete process.env.CLAUDE_AGENT_SDK_MODELS;
    delete process.env.CLAUDE_CODE_EXECUTABLE_PATH;
    delete process.env.CLAUDE_AGENT_SDK_AUTH_MODE;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("streams turn deltas, emits lifecycle events, and records session transcript", async () => {
    process.env.CLAUDE_AGENT_SDK_AUTH_MODE = "cli";
    process.env.ANTHROPIC_API_KEY = "invalid-test-key";

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
      workingDirectory: TEST_WORKSPACE_DIR,
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
    expect(createSession.mock.calls[0]?.[0]?.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(resumeSession).toHaveBeenCalledTimes(0);
    expect(methods).toEqual([
      "turn/started",
      "item/outputText/delta",
      "item/outputText/delta",
      "item/outputText/completed",
      "turn/completed",
    ]);

    const initialSessionTranscript = await service.getSessionMessages("run-1");
    expect(initialSessionTranscript).toHaveLength(0);

    const switchedSessionTranscript = await service.getSessionMessages("claude-session-1");
    expect(switchedSessionTranscript.length).toBeGreaterThanOrEqual(2);
    expect(
      switchedSessionTranscript.some(
        (entry) => entry.role === "user" && entry.content === "Say hello",
      ),
    ).toBe(true);
    expect(
      switchedSessionTranscript.some(
        (entry) => entry.role === "assistant" && entry.content === "Hello world",
      ),
    ).toBe(true);
  });

  it("adopts session id from the v2 session object and migrates cached transcript", async () => {
    const v2Session = createFakeV2Session([[{ delta: "tool output without session id" }]]) as ReturnType<
      typeof createFakeV2Session
    > & { sessionId?: string };
    v2Session.sessionId = "claude-session-from-object";
    const createSession = vi.fn().mockReturnValue(v2Session);

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

    await service.createRunSession("run-adopt-session-id", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    await service.sendTurn(
      "run-adopt-session-id",
      AgentInputUserMessage.fromDict({ content: "persist this turn" }),
    );

    await waitFor(() => {
      const runtimeReference = service.getRunRuntimeReference("run-adopt-session-id");
      return runtimeReference?.sessionId === "claude-session-from-object";
    });

    const runScopedTranscript = await service.getSessionMessages("run-adopt-session-id");
    expect(runScopedTranscript).toEqual([]);

    const resolvedTranscript = await service.getSessionMessages("claude-session-from-object");
    expect(
      resolvedTranscript.some(
        (entry) => entry.role === "user" && entry.content === "persist this turn",
      ),
    ).toBe(true);
    expect(
      resolvedTranscript.some(
        (entry) => entry.role === "assistant" && entry.content === "tool output without session id",
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
      workingDirectory: TEST_WORKSPACE_DIR,
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

  it("prefers stream_event text deltas over duplicate assistant/result fallback snapshots", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          {
            type: "stream_event",
            session_id: "claude-session-stream-event",
            event: {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "Hello " },
            },
          },
          {
            type: "stream_event",
            session_id: "claude-session-stream-event",
            event: {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "world" },
            },
          },
          {
            type: "assistant",
            session_id: "claude-session-stream-event",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "Hello world" }],
            },
          },
          {
            type: "result",
            subtype: "success",
            session_id: "claude-session-stream-event",
            result: "Hello world",
          },
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

    await service.createRunSession("run-stream-event-priority", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    const outputDeltas: string[] = [];
    const methods: string[] = [];
    service.subscribeToRunEvents("run-stream-event-priority", (event) => {
      methods.push(event.method);
      if (event.method === "item/outputText/delta") {
        const delta =
          event.params && typeof event.params.delta === "string"
            ? event.params.delta
            : null;
        if (delta) {
          outputDeltas.push(delta);
        }
      }
    });

    await service.sendTurn(
      "run-stream-event-priority",
      AgentInputUserMessage.fromDict({ content: "Say hello with stream event chunks" }),
    );
    await waitFor(() => methods.includes("turn/completed"));

    expect(outputDeltas).toEqual(["Hello ", "world"]);
    expect(methods).toEqual([
      "turn/started",
      "item/outputText/delta",
      "item/outputText/delta",
      "item/outputText/completed",
      "turn/completed",
    ]);

    const transcript = await service.getSessionMessages("claude-session-stream-event");
    expect(
      transcript.some((entry) => entry.role === "assistant" && entry.content === "Hello world"),
    ).toBe(true);
  });

  it("derives incremental suffix from assistant snapshot after partial stream_event output", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          {
            type: "stream_event",
            session_id: "claude-session-snapshot-suffix",
            event: {
              type: "content_block_delta",
              delta: { type: "text_delta", text: "Hel" },
            },
          },
          {
            type: "assistant",
            session_id: "claude-session-snapshot-suffix",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "Hello" }],
            },
          },
          {
            type: "result",
            subtype: "success",
            session_id: "claude-session-snapshot-suffix",
            result: "Hello",
          },
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

    await service.createRunSession("run-stream-snapshot-suffix", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    const outputDeltas: string[] = [];
    service.subscribeToRunEvents("run-stream-snapshot-suffix", (event) => {
      if (event.method === "item/outputText/delta") {
        const delta =
          event.params && typeof event.params.delta === "string"
            ? event.params.delta
            : null;
        if (delta) {
          outputDeltas.push(delta);
        }
      }
    });

    await service.sendTurn(
      "run-stream-snapshot-suffix",
      AgentInputUserMessage.fromDict({ content: "complete hello" }),
    );
    await waitFor(() => outputDeltas.length >= 2);

    expect(outputDeltas).toEqual(["Hel", "lo"]);

    const transcript = await service.getSessionMessages("claude-session-snapshot-suffix");
    expect(
      transcript.some((entry) => entry.role === "assistant" && entry.content === "Hello"),
    ).toBe(true);
  });

  it("maps autoExecuteTools to Claude V2 auto-allow permission callback", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ session_id: "claude-session-auto-approve", delta: "ok" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

    await service.createRunSession("run-auto-approve", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      autoExecuteTools: true,
      llmConfig: null,
    });

    await service.sendTurn(
      "run-auto-approve",
      AgentInputUserMessage.fromDict({ content: "create file" }),
    );
    await waitFor(() => createSession.mock.calls.length > 0);

    const createOptions = createSession.mock.calls[0]?.[0];
    expect(typeof createOptions?.canUseTool).toBe("function");
    await expect(createOptions.canUseTool("Write", {}, { toolUseID: "tool-1" })).resolves.toEqual({
      behavior: "allow",
      updatedInput: {},
      toolUseID: "tool-1",
    });
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
      workingDirectory: TEST_WORKSPACE_DIR,
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
        workingDirectory: TEST_WORKSPACE_DIR,
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
      workingDirectory: TEST_WORKSPACE_DIR,
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
        workingDirectory: TEST_WORKSPACE_DIR,
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
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    const methods: string[] = [];
    service.subscribeToRunEvents("run-relay-target", (event) => methods.push(event.method));

    await service.injectInterAgentEnvelope("run-relay-target", {
      senderAgentRunId: "member-a",
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
        workingDirectory: TEST_WORKSPACE_DIR,
        autoExecuteTools: true,
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

  it("requires explicit approval for Claude send_message_to tool when autoExecuteTools is disabled", async () => {
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
      "run-team-member-manual",
      {
        modelIdentifier: "default",
        workingDirectory: TEST_WORKSPACE_DIR,
        autoExecuteTools: false,
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
        sessionId: "session-manual",
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

    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    service.subscribeToRunEvents("run-team-member-manual", (event) => {
      events.push({
        method: event.method,
        params:
          event.params && typeof event.params === "object" && !Array.isArray(event.params)
            ? (event.params as Record<string, unknown>)
            : {},
      });
    });

    await service.sendTurn(
      "run-team-member-manual",
      AgentInputUserMessage.fromDict({ content: "relay now with approval" }),
    );

    await waitFor(() =>
      events.some((event) => event.method === "item/commandExecution/requestApproval"),
    );
    const approvalRequest = events.find(
      (event) => event.method === "item/commandExecution/requestApproval",
    );
    const invocationId = approvalRequest?.params?.invocation_id;
    expect(typeof invocationId).toBe("string");
    await service.approveTool(
      "run-team-member-manual",
      invocationId as string,
      true,
      "unit-test-manual-approve",
    );

    await waitFor(() => events.some((event) => event.method === "turn/completed"));

    expect(relayHandler).toHaveBeenCalledWith({
      senderRunId: "run-team-member-manual",
      senderMemberName: "ping",
      senderTeamRunId: "team-1",
      toolArguments: {
        recipient_name: "pong",
        content: "PING",
        message_type: "roundtrip_ping",
      },
    });
    expect(events.some((event) => event.method === "item/commandExecution/approved")).toBe(true);
  });

  it("does not emit unknown_tool completion events for orphan tool_result chunks", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          {
            type: "user",
            message: {
              content: [
                {
                  type: "tool_result",
                  tool_use_id: "toolu_orphan_1",
                  content: [{ type: "text", text: "delivered" }],
                },
              ],
            },
          },
          { delta: "done" },
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

    await service.createRunSession("run-orphan-result", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    service.subscribeToRunEvents("run-orphan-result", (event) => {
      events.push({
        method: event.method,
        params:
          event.params && typeof event.params === "object" && !Array.isArray(event.params)
            ? (event.params as Record<string, unknown>)
            : {},
      });
    });

    await service.sendTurn(
      "run-orphan-result",
      AgentInputUserMessage.fromDict({ content: "trigger orphan result handling" }),
    );
    await waitFor(() => events.some((event) => event.method === "turn/completed"));

    const completionEvents = events.filter(
      (event) => event.method === "item/commandExecution/completed",
    );
    expect(completionEvents).toHaveLength(0);
  });

  it("does not emit duplicate command completion for Claude MCP send_message_to tool_result chunks", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([
        [
          {
            type: "assistant",
            message: {
              content: [
                {
                  type: "tool_use",
                  id: "toolu_send_1",
                  name: "mcp__autobyteus_team__send_message_to",
                  input: {
                    recipient_name: "student",
                    content: "hello",
                    message_type: "agent_message",
                  },
                },
              ],
            },
          },
          {
            type: "user",
            message: {
              content: [
                {
                  type: "tool_result",
                  tool_use_id: "toolu_send_1",
                  content: [{ type: "text", text: "Delivered message to 'student'." }],
                },
              ],
            },
          },
          { delta: "done" },
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

    await service.createRunSession("run-mcp-send-message-result", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    const events: Array<{ method: string; params: Record<string, unknown> }> = [];
    service.subscribeToRunEvents("run-mcp-send-message-result", (event) => {
      events.push({
        method: event.method,
        params:
          event.params && typeof event.params === "object" && !Array.isArray(event.params)
            ? (event.params as Record<string, unknown>)
            : {},
      });
    });

    await service.sendTurn(
      "run-mcp-send-message-result",
      AgentInputUserMessage.fromDict({ content: "trigger mcp send_message_to result handling" }),
    );
    await waitFor(() => events.some((event) => event.method === "turn/completed"));

    const completionEvents = events.filter(
      (event) => event.method === "item/commandExecution/completed",
    );
    expect(completionEvents).toHaveLength(0);
  });

  it("rejects empty turn payloads deterministically", async () => {
    const service = new ClaudeAgentSdkRuntimeService();
    await service.createRunSession("run-empty", {
      modelIdentifier: "claude-sonnet-4-5",
      workingDirectory: TEST_WORKSPACE_DIR,
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
      workingDirectory: TEST_WORKSPACE_DIR,
      llmConfig: null,
    });

    await service.sendTurn(
      "run-exec-fallback",
      AgentInputUserMessage.fromDict({ content: "hello" }),
    );
    await waitFor(() => createSession.mock.calls.length > 0);

    const resolvedExecutable = createSession.mock.calls[0]?.[0]?.pathToClaudeCodeExecutable;
    const resolvedWorkingDirectory = createSession.mock.calls[0]?.[0]?.cwd;
    expect(typeof resolvedExecutable).toBe("string");
    expect(resolvedExecutable).not.toBe(invalidExecutablePath);
    expect(resolvedWorkingDirectory).toBe(TEST_WORKSPACE_DIR);
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

  it("uses alternate SDK session-message signature when object form returns empty", async () => {
    const getSessionMessages = vi.fn(async (input: unknown) => {
      if (typeof input === "string") {
        return [{ role: "assistant", content: "from-string-signature" }];
      }
      return [];
    });
    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = { getSessionMessages };

    const messages = await service.getSessionMessages("session-signature-variant");
    expect(messages).toEqual([{ role: "assistant", content: "from-string-signature" }]);
    expect(getSessionMessages).toHaveBeenCalledWith("session-signature-variant");
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

  it("routes manual Claude tool approvals through canUseTool callback", async () => {
    const createSession = vi.fn().mockReturnValue(
      createFakeV2Session([[{ session_id: "claude-session-approve", delta: "ok" }]]),
    );

    const service = new ClaudeAgentSdkRuntimeService() as ClaudeAgentSdkRuntimeService & {
      cachedSdkModule: unknown;
    };
    service.cachedSdkModule = {
      unstable_v2_createSession: createSession,
      unstable_v2_resumeSession: vi.fn(),
    };

    await service.createRunSession("run-approve", {
      modelIdentifier: "default",
      workingDirectory: TEST_WORKSPACE_DIR,
      autoExecuteTools: false,
      llmConfig: null,
    });
    await service.sendTurn(
      "run-approve",
      AgentInputUserMessage.fromDict({ content: "tool approval roundtrip" }),
    );
    await waitFor(() => createSession.mock.calls.length > 0);

    const createOptions = createSession.mock.calls[0]?.[0];
    expect(typeof createOptions?.canUseTool).toBe("function");

    const pendingApproval = createOptions.canUseTool(
      "Write",
      { file_path: "/tmp/demo.txt", content: "hello" },
      { toolUseID: "tool-1", signal: new AbortController().signal },
    );

    await expect(service.approveTool("run-approve", "tool-1", true, "unit-test-approve")).resolves.toBeUndefined();
    await expect(pendingApproval).resolves.toEqual({
      behavior: "allow",
      updatedInput: { file_path: "/tmp/demo.txt", content: "hello" },
      toolUseID: "tool-1",
    });
  });
});
