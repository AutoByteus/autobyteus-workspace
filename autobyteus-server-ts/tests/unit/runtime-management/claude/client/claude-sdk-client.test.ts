import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts";
import { ClaudeSdkClient, type ClaudeSdkCanUseTool } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { ClaudeSdkInputChannel } from "../../../../../src/runtime-management/claude/client/claude-sdk-streaming-session.js";
import {
  buildClaudeSdkSpawnEnvironment,
  resolveClaudeSdkAuthMode,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-auth-environment.js";

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

const EXPECTED_ENABLED_BUILT_IN_TOOLS = [
  "Bash",
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
  "Skill",
];
const EXPECTED_DISALLOWED_BUILT_IN_TOOLS = [
  "AskUserQuestion",
  "Agent",
  "Task",
  "Workflow",
  "SendMessage",
  "ListAgents",
];

const RESERVED_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const createSessionBinding = () => ({
  kind: "create" as const,
  sessionId: RESERVED_SESSION_ID,
});
const baseOptions = () => ({
  systemPrompt: "",
  sessionBinding: createSessionBinding(),
  model: "haiku",
  workingDirectory: "/tmp",
});

describe("ClaudeSdkClient", () => {
  it("resolves the selected value only from the open session's supported-model metadata and fails closed", async () => {
    const supportedModels = vi.fn(async () => [
      { value: "opus[1m]", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "default", resolvedModel: "claude-sonnet-5" },
    ]);
    const client = new ClaudeSdkClient();
    client.setCachedModuleForTesting({ query: vi.fn(async () => ({ ...createMockQuery(), supportedModels })) });
    const session = await client.openStreamingSession({ ...baseOptions() });
    expect(await session.resolveSelectedModel("opus[1m]")).toEqual({
      resolvedRawModelId: "claude-opus-5-5[1m]", resolution: "resolved",
    });
    expect(await session.resolveSelectedModel("absent")).toEqual({ resolvedRawModelId: null, resolution: "missing" });
    expect(supportedModels).toHaveBeenCalledTimes(2);
    client.setCachedModuleForTesting({ query: vi.fn(async () => ({ ...createMockQuery(), supportedModels: async () => [
      { value: "opus[1m]", resolvedModel: "a" }, { value: "opus[1m]", resolvedModel: "b" },
    ] })) });
    const ambiguous = await client.openStreamingSession({ ...baseOptions() });
    expect(await ambiguous.resolveSelectedModel("opus[1m]")).toEqual({ resolvedRawModelId: null, resolution: "ambiguous" });
  });

  beforeEach(() => {
    vi.stubEnv("CLAUDE_AGENT_SDK_AUTH_MODE", "cli");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the auto, cli, and api-key selector with cli as the default", () => {
    expect(resolveClaudeSdkAuthMode({})).toBe("cli");
    expect(resolveClaudeSdkAuthMode({ CLAUDE_AGENT_SDK_AUTH_MODE: "auto" })).toBe("auto");
    expect(resolveClaudeSdkAuthMode({ CLAUDE_AGENT_SDK_AUTH_MODE: "cli" })).toBe("cli");
    expect(resolveClaudeSdkAuthMode({ CLAUDE_AGENT_SDK_AUTH_MODE: "api-key" })).toBe("api-key");
    expect(resolveClaudeSdkAuthMode({ CLAUDE_AGENT_SDK_AUTH_MODE: "unsupported-mode" })).toBe("cli");
  });

  it.each(["auto", "cli"] as const)(
    "does not resolve a vault key for %s and preserves caller-supplied launch environment",
    async (mode) => {
      const resolveApiKey = vi.fn();
      const queryFn = vi.fn(async () => createMockQuery());
      const client = new ClaudeSdkClient(resolveApiKey);
      client.setCachedModuleForTesting({ query: queryFn });
      const env = {
        CLAUDE_AGENT_SDK_AUTH_MODE: mode,
        HOME: "/synthetic/home",
        PATH: "/synthetic/bin",
        ANTHROPIC_API_KEY: "synthetic-inherited-value",
        CALLER_ADDITION: "preserved",
      };

      await client.openStreamingSession({
      systemPrompt: "",
        sessionBinding: createSessionBinding(),
        model: "haiku",
        workingDirectory: "/tmp/claude-original-mode",
        env,
      });

      expect(resolveApiKey).not.toHaveBeenCalled();
      const call = queryFn.mock.calls[0]?.[0] as { options: { env: Record<string, string> } };
      expect(call.options.env).toEqual(env);
    },
  );

  it("sets neither v1.4.78 policy variable, so Claude CLI background-task and Bash timeout defaults apply (AC-010)", async () => {
    vi.stubEnv("CLAUDE_CODE_DISABLE_BACKGROUND_TASKS", undefined);
    vi.stubEnv("BASH_MAX_TIMEOUT_MS", undefined);
    const queryFn = vi.fn(async () => createMockQuery());
    const client = new ClaudeSdkClient(vi.fn());
    client.setCachedModuleForTesting({ query: queryFn });
    const env = { CLAUDE_AGENT_SDK_AUTH_MODE: "cli", HOME: "/synthetic/home" };

    await client.openStreamingSession({ ...baseOptions(), env });
    await client.openStreamingSession({ ...baseOptions() });

    for (const call of queryFn.mock.calls) {
      const spawnEnv = (call[0] as { options: { env: Record<string, string | undefined> } }).options.env;
      expect(spawnEnv).not.toHaveProperty("CLAUDE_CODE_DISABLE_BACKGROUND_TASKS");
      expect(spawnEnv).not.toHaveProperty("BASH_MAX_TIMEOUT_MS");
      expect(spawnEnv).not.toHaveProperty("BASH_DEFAULT_TIMEOUT_MS");
    }
    expect((queryFn.mock.calls[0]?.[0] as { options: { env: unknown } }).options.env).toEqual(env);
  });

  it("warns once per open when the operator's environment disables CLI background tasks, without overriding it (OBS-2)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const queryFn = vi.fn(async () => createMockQuery());
      const client = new ClaudeSdkClient(vi.fn());
      client.setCachedModuleForTesting({ query: queryFn });
      const env = { CLAUDE_AGENT_SDK_AUTH_MODE: "cli", CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" };

      await client.openStreamingSession({ ...baseOptions(), env });
      await client.openStreamingSession({ ...baseOptions(), env: { CLAUDE_AGENT_SDK_AUTH_MODE: "cli" } });

      const warnings = warn.mock.calls.filter((call) => String(call[0]).includes("CLAUDE_CODE_DISABLE_BACKGROUND_TASKS"));
      expect(warnings).toHaveLength(1);
      expect((queryFn.mock.calls[0]?.[0] as { options: { env: Record<string, string> } }).options.env)
        .toEqual(env);
    } finally {
      warn.mockRestore();
    }
  });

  it("resolves explicit api-key once immediately before launch and changes only ANTHROPIC_API_KEY", async () => {
    const resolveApiKey = vi.fn(async () => SecretValue.fromString("synthetic-vault-key"));
    const queryFn = vi.fn(async () => createMockQuery());
    const client = new ClaudeSdkClient(resolveApiKey);
    client.setCachedModuleForTesting({ query: queryFn });
    const env = {
      CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
      HOME: "/synthetic/home",
      PATH: "/synthetic/bin",
      ANTHROPIC_API_KEY: "synthetic-ambient-key",
      CLAUDE_CODE_API_KEY: "synthetic-caller-owned-value",
      CALLER_ADDITION: "preserved",
    };

    await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "haiku",
      workingDirectory: "/tmp/claude-api-key-mode",
      env,
      mcpServers: { demo: { transport: "mock" } },
      allowedTools: ["Bash"],
    });

    expect(resolveApiKey).toHaveBeenCalledOnce();
    const call = queryFn.mock.calls[0]?.[0] as { options: Record<string, unknown> };
    expect(call.options.env).toEqual({
      ...env,
      ANTHROPIC_API_KEY: "synthetic-vault-key",
    });
    expect(call.options).toEqual(expect.objectContaining({
      mcpServers: { demo: { transport: "mock" } },
      allowedTools: ["Bash"],
      settingSources: ["user", "project", "local"],
    }));
    expect(call.options.tools).toEqual(EXPECTED_ENABLED_BUILT_IN_TOOLS);
    expect(call.options.disallowedTools).toEqual(EXPECTED_DISALLOWED_BUILT_IN_TOOLS);
  });

  it("fails value-free before SDK launch when explicit api-key resolution fails", async () => {
    const resolveApiKey = vi.fn(async () => {
      throw new Error("synthetic-secret-bearing-cause");
    });
    const queryFn = vi.fn(async () => createMockQuery());
    const client = new ClaudeSdkClient(resolveApiKey);
    client.setCachedModuleForTesting({ query: queryFn });

    await expect(client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "haiku",
      workingDirectory: "/tmp/claude-api-key-failure",
      env: { CLAUDE_AGENT_SDK_AUTH_MODE: "api-key" },
    })).rejects.toThrow("CLAUDE_RUNTIME_API_KEY_UNAVAILABLE");
    expect(resolveApiKey).toHaveBeenCalledOnce();
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("keeps original cli process-environment filtering separate from vault resolution", () => {
    const env = {
      CLAUDE_AGENT_SDK_AUTH_MODE: "cli",
      CLAUDE_CODE_OAUTH_TOKEN: "synthetic-oauth",
      ANTHROPIC_API_KEY: "synthetic-api-key",
      CLAUDE_CODE_API_KEY: "synthetic-code-key",
      KEEP_ME: "preserved",
    };

    expect(buildClaudeSdkSpawnEnvironment(env)).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "cli",
      CLAUDE_CODE_OAUTH_TOKEN: "synthetic-oauth",
      KEEP_ME: "preserved",
    });
  });

  it("passes stable query options for project skills, exact resume, MCP, and send_message_to tooling", async () => {
    const client = new ClaudeSdkClient();
    const queryMock = createMockQuery();
    const queryFn = vi.fn(async (input: unknown) => queryMock);

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    const mcpServer = { transport: "mock" };
    const session = await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: { kind: "resume", sessionId: RESERVED_SESSION_ID },
      model: "haiku",
      workingDirectory: "/tmp/claude-client-query-options",
      mcpServers: { demo: mcpServer },
      allowedTools: [
        "Skill",
        "send_message_to",
        "mcp__autobyteus_agent_tools__send_message_to",
        "open_tab",
        "read_page",
        "mcp__autobyteus_agent_tools__open_tab",
        "mcp__autobyteus_agent_tools__read_page",
      ],
      permissionMode: "default",
    });

    expect(typeof session.send).toBe("function");
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith({
      prompt: expect.any(ClaudeSdkInputChannel),
      options: expect.objectContaining({
        model: "haiku",
        cwd: "/tmp/claude-client-query-options",
        resume: RESERVED_SESSION_ID,
        mcpServers: { demo: mcpServer },
        permissionMode: "default",
        settingSources: ["user", "project", "local"],
        tools: EXPECTED_ENABLED_BUILT_IN_TOOLS,
        disallowedTools: EXPECTED_DISALLOWED_BUILT_IN_TOOLS,
        allowedTools: expect.arrayContaining([
          "Skill",
          "send_message_to",
          "mcp__autobyteus_agent_tools__send_message_to",
          "open_tab",
          "read_page",
          "mcp__autobyteus_agent_tools__open_tab",
          "mcp__autobyteus_agent_tools__read_page",
        ]),
      }),
    });
    const firstCall = queryFn.mock.calls[0]?.[0] as {
      options?: Record<string, unknown>;
    };
    expect(firstCall.options?.tools).toEqual(EXPECTED_ENABLED_BUILT_IN_TOOLS);
    expect(firstCall.options?.disallowedTools).toEqual(EXPECTED_DISALLOWED_BUILT_IN_TOOLS);
    expect(firstCall.options).not.toHaveProperty("sessionId");
  });

  it("passes only SDK sessionId for a caller-reserved first conversation", async () => {
    const client = new ClaudeSdkClient();
    const queryFn = vi.fn(async () => createMockQuery());
    client.setCachedModuleForTesting({ query: queryFn });

    await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "haiku",
      workingDirectory: "/tmp/claude-client-create-binding",
    });

    const call = queryFn.mock.calls[0]?.[0] as { options: Record<string, unknown> };
    expect(call.options.sessionId).toBe(RESERVED_SESSION_ID);
    expect(call.options).not.toHaveProperty("resume");
  });

  it("loads user, project, and local Claude Code settings for normal turns", async () => {
    const client = new ClaudeSdkClient();
    const queryMock = createMockQuery();
    const queryFn = vi.fn(async (_input: unknown) => queryMock);

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "default",
      workingDirectory: "/tmp/claude-client-default-setting-sources",
    });

    expect(queryFn).toHaveBeenCalledWith({
      prompt: expect.any(ClaudeSdkInputChannel),
      options: expect.objectContaining({
        settingSources: ["user", "project", "local"],
      }),
    });
  });

  it("forwards typed thinking and effort options to the pinned Claude SDK", async () => {
    const client = new ClaudeSdkClient();
    const queryFn = vi.fn(async () => createMockQuery());
    client.setCachedModuleForTesting({ query: queryFn });

    await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "opus",
      workingDirectory: "/tmp/claude-client-reasoning",
      thinking: { type: "adaptive" },
      effort: "high",
    });

    expect(queryFn).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        thinking: { type: "adaptive" },
        effort: "high",
      }),
    }));
  });


  it("forwards stderr diagnostics callback to Claude SDK query options when provided", async () => {
    const client = new ClaudeSdkClient();
    const queryMock = createMockQuery();
    const queryFn = vi.fn(async (_input: unknown) => queryMock);
    const stderr = vi.fn();

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    await client.openStreamingSession({
      systemPrompt: "",
      sessionBinding: createSessionBinding(),
      model: "haiku",
      workingDirectory: "/tmp/claude-client-stderr",
      stderr,
    });

    expect(queryFn).toHaveBeenCalledWith({
      prompt: expect.any(ClaudeSdkInputChannel),
      options: expect.objectContaining({
        stderr,
      }),
    });
  });

  it("uses user settings-source policy for model discovery", async () => {
    const client = new ClaudeSdkClient();
    const control = {
      supportedModels: vi.fn(async () => ["deepseek-v4-flash"]),
      interrupt: vi.fn(async () => undefined),
      close: vi.fn(() => undefined),
    };
    const queryFn = vi.fn(async (_input: unknown) => control);

    client.setCachedModuleForTesting({
      query: queryFn,
    });

    const models = await client.listModels();

    expect(models[0]?.model_identifier).toBe("deepseek-v4-flash");
    expect(queryFn).toHaveBeenCalledWith({
      prompt: expect.any(String),
      options: expect.objectContaining({
        maxTurns: 0,
        permissionMode: "plan",
        settingSources: ["user"],
      }),
    });
    const discoveryCall = queryFn.mock.calls[0]?.[0] as { options: Record<string, unknown> };
    expect(discoveryCall.options).not.toHaveProperty("tools");
    expect(discoveryCall.options).not.toHaveProperty("disallowedTools");
  });

  it("keeps the context-capacity discovery query tool-free instead of applying the turn tool policy", async () => {
    const client = new ClaudeSdkClient();
    const queryFn = vi.fn(async (_input: unknown) => ({ close: vi.fn(() => undefined) }));
    client.setCachedModuleForTesting({ query: queryFn });

    await client.resolveContextCapacities("/tmp/claude-client-capacity", ["haiku"]);

    const capacityCall = queryFn.mock.calls[0]?.[0] as { options: Record<string, unknown> };
    expect(capacityCall.options).toEqual(expect.objectContaining({
      maxTurns: 0,
      permissionMode: "plan",
      tools: [],
      mcpServers: {},
    }));
    expect(capacityCall.options).not.toHaveProperty("disallowedTools");
  });

  it("lists every SDK row with its canonical model ID and picker presentation hint", async () => {
    const client = new ClaudeSdkClient();
    const control = {
      supportedModels: vi.fn(async () => [
        { value: "default", displayName: "Default (recommended)", resolvedModel: "claude-opus-5-5[1m]" },
        { value: "claude-fable-5[1m]", displayName: "Fable", resolvedModel: "claude-fable-5" },
        { value: "haiku", displayName: "Haiku", resolvedModel: "claude-haiku-4-5-20251001" },
        { value: "opus[1m]", displayName: "Opus (1M context)", resolvedModel: "claude-opus-5-5[1m]" },
        { value: "sonnet", displayName: "Sonnet" },
      ]),
      interrupt: vi.fn(async () => undefined),
      close: vi.fn(() => undefined),
    };
    client.setCachedModuleForTesting({ query: vi.fn(async () => control) });

    const models = await client.listModels();

    expect(models.map((model) => ({
      id: model.model_identifier,
      value: model.value,
      canonical: model.canonical_name,
      presentation: model.selection_presentation,
    }))).toEqual([
      {
        id: "default", value: "default", canonical: "claude-opus-5-5[1m]",
        presentation: { recommended: false, aliasOfModelIdentifier: "opus[1m]" },
      },
      {
        id: "claude-fable-5[1m]", value: "claude-fable-5[1m]", canonical: "claude-fable-5",
        presentation: { recommended: false, aliasOfModelIdentifier: null },
      },
      {
        id: "haiku", value: "haiku", canonical: "claude-haiku-4-5-20251001",
        presentation: { recommended: false, aliasOfModelIdentifier: null },
      },
      {
        id: "opus[1m]", value: "opus[1m]", canonical: "claude-opus-5-5[1m]",
        presentation: { recommended: true, aliasOfModelIdentifier: null },
      },
      {
        id: "sonnet", value: "sonnet", canonical: "sonnet",
        presentation: { recommended: false, aliasOfModelIdentifier: null },
      },
    ]);
  });

  it("passes the session's canUseTool callback through and injects no approval of its own", async () => {
    const client = new ClaudeSdkClient();
    const explicitCanUseTool: ClaudeSdkCanUseTool = vi.fn(async () => ({ behavior: "allow", updatedInput: {} }));
    const queryFn = vi.fn(async () => createMockQuery());
    client.setCachedModuleForTesting({ query: queryFn });

    await client.openStreamingSession({ ...baseOptions(), canUseTool: explicitCanUseTool });
    await client.openStreamingSession({ ...baseOptions() });

    expect((queryFn.mock.calls[0]?.[0] as { options: Record<string, unknown> }).options.canUseTool).toBe(explicitCanUseTool);
    expect((queryFn.mock.calls[1]?.[0] as { options: Record<string, unknown> }).options).not.toHaveProperty("canUseTool");
  });


  it("returns null when getSessionMessages is unavailable or session id is empty", async () => {
    const client = new ClaudeSdkClient();
    client.setCachedModuleForTesting({});

    await expect(client.getSessionMessages("")).resolves.toBeNull();
    await expect(client.getSessionMessages("session-123")).resolves.toBeNull();
  });
});
