import { AgentInputUserMessage } from "autobyteus-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const toAsyncIterable = (items: unknown[]): AsyncIterable<unknown> =>
  (async function* () {
    for (const item of items) {
      yield item;
    }
  })();

describe("ClaudeAgentSdkRuntimeService", () => {
  afterEach(() => {
    delete process.env.CLAUDE_AGENT_SDK_MODELS;
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

    await service.sendTurn(
      "run-resume",
      AgentInputUserMessage.fromDict({ content: "First turn" }),
    );
    await service.sendTurn(
      "run-resume",
      AgentInputUserMessage.fromDict({ content: "Second turn" }),
    );

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      options: {
        model: "default",
        cwd: "/tmp/workspace",
      },
    });
    expect(query.mock.calls[0]?.[0]?.options?.resume).toBeUndefined();
    expect(query.mock.calls[1]?.[0]?.options?.resume).toBe("claude-session-2");
    expect(typeof query.mock.calls[1]?.[0]?.options?.resume).toBe("string");
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
    expect(interrupt).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
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
