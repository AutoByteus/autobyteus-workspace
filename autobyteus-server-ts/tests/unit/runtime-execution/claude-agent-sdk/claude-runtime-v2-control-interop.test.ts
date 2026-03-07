import fs, { mkdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureClaudeV2DynamicMcpServers,
  createOrResumeClaudeV2Session,
  resolveClaudeV2SessionId,
  resolveClaudeV2SessionControl,
} from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.js";

const TEST_WORKSPACE_DIR = `${process.cwd()}/tests/.tmp/claude-runtime-v2-interop-workspace`;

describe("claude-runtime-v2-control-interop", () => {
  beforeEach(() => {
    mkdirSync(TEST_WORKSPACE_DIR, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a V2 session with send_message_to allowlist when tooling is enabled", async () => {
    const createSession = vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: {},
    });
    const resumeSession = vi.fn();

    await createOrResumeClaudeV2Session({
      sdk: {
        unstable_v2_createSession: createSession,
        unstable_v2_resumeSession: resumeSession,
      },
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      workingDirectory: TEST_WORKSPACE_DIR,
      env: { CLAUDE_AGENT_SDK_CLIENT_APP: "autobyteus-test/1.0.0" },
      resumeSessionId: null,
      enableSendMessageToTooling: true,
      autoExecuteTools: true,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]?.[0]).toMatchObject({
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      permissionMode: "default",
      cwd: TEST_WORKSPACE_DIR,
      env: { CLAUDE_AGENT_SDK_CLIENT_APP: "autobyteus-test/1.0.0" },
      allowedTools: ["send_message_to", "mcp__autobyteus_team__send_message_to"],
    });
    expect(typeof createSession.mock.calls[0]?.[0]?.canUseTool).toBe("function");
    await expect(
      createSession.mock.calls[0]?.[0]?.canUseTool("Write", {}, { toolUseID: "tool-1" }),
    ).resolves.toEqual({
      behavior: "allow",
      updatedInput: {},
      toolUseID: "tool-1",
    });
  });

  it("uses provided permission mode for V2 create-session options", async () => {
    const createSession = vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: {},
    });

    await createOrResumeClaudeV2Session({
      sdk: {
        unstable_v2_createSession: createSession,
        unstable_v2_resumeSession: vi.fn(),
      },
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      workingDirectory: TEST_WORKSPACE_DIR,
      resumeSessionId: null,
      permissionMode: "bypassPermissions",
      enableSendMessageToTooling: false,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]?.[0]?.permissionMode).toBe("bypassPermissions");
  });

  it("resumes V2 session when resumeSessionId is provided", async () => {
    const createSession = vi.fn();
    const resumeSession = vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: {},
    });

    await createOrResumeClaudeV2Session({
      sdk: {
        unstable_v2_createSession: createSession,
        unstable_v2_resumeSession: resumeSession,
      },
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      workingDirectory: TEST_WORKSPACE_DIR,
      resumeSessionId: "session-123",
      enableSendMessageToTooling: false,
      autoExecuteTools: false,
    });

    expect(createSession).toHaveBeenCalledTimes(0);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    expect(resumeSession.mock.calls[0]?.[0]).toBe("session-123");
    expect(resumeSession.mock.calls[0]?.[1]).toMatchObject({
      cwd: TEST_WORKSPACE_DIR,
    });
    expect(resumeSession.mock.calls[0]?.[1]?.canUseTool).toBeUndefined();
  });

  it("passes configured cwd through session options and scopes process cwd when the directory exists", async () => {
    const createSession = vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: {},
    });
    const resumeSession = vi.fn();
    let currentWorkingDirectory = "/server/worktree";
    const cwdSpy = vi.spyOn(process, "cwd").mockImplementation(() => currentWorkingDirectory);
    const chdirSpy = vi.spyOn(process, "chdir").mockImplementation((directory: string | URL) => {
      currentWorkingDirectory = String(directory);
    });
    const statSpy = vi.spyOn(fs, "statSync").mockReturnValue({
      isDirectory: () => true,
    } as fs.Stats);

    await createOrResumeClaudeV2Session({
      sdk: {
        unstable_v2_createSession: createSession,
        unstable_v2_resumeSession: resumeSession,
      },
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      workingDirectory: TEST_WORKSPACE_DIR,
      resumeSessionId: null,
      enableSendMessageToTooling: false,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]?.[0]).toMatchObject({
      cwd: TEST_WORKSPACE_DIR,
    });
    expect(statSpy).toHaveBeenCalledWith(TEST_WORKSPACE_DIR);
    expect(chdirSpy).toHaveBeenNthCalledWith(1, TEST_WORKSPACE_DIR);
    expect(chdirSpy).toHaveBeenNthCalledWith(2, "/server/worktree");
    expect(cwdSpy).toHaveBeenCalled();
  });

  it("forwards missing workspace cwd to the SDK without process-global chdir", async () => {
    const createSession = vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: {},
    });
    const resumeSession = vi.fn();
    const chdirSpy = vi.spyOn(process, "chdir");
    const statSpy = vi.spyOn(fs, "statSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });

    await createOrResumeClaudeV2Session({
      sdk: {
        unstable_v2_createSession: createSession,
        unstable_v2_resumeSession: resumeSession,
      },
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      workingDirectory: "/missing/workspace",
      resumeSessionId: null,
      enableSendMessageToTooling: false,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]?.[0]).toMatchObject({
      cwd: "/missing/workspace",
    });
    expect(statSpy).toHaveBeenCalledWith("/missing/workspace");
    expect(chdirSpy).not.toHaveBeenCalled();
  });

  it("throws deterministic error when dynamic MCP control is unavailable", async () => {
    await expect(
      configureClaudeV2DynamicMcpServers({
        control: null,
        servers: { autobyteus_team: { type: "sdk", name: "autobyteus_team", instance: {} } },
      }),
    ).rejects.toThrow("CLAUDE_V2_CONTROL_UNAVAILABLE");
  });

  it("resolves query control from a V2 session object", () => {
    const control = {
      setMcpServers: vi.fn(),
      interrupt: vi.fn(),
    };
    const resolved = resolveClaudeV2SessionControl({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: control,
    });

    expect(resolved).toEqual(control);
  });

  it("resolves session id from session payload and query fallback", () => {
    const directSessionId = resolveClaudeV2SessionId({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      sessionId: "session-direct",
      query: {},
    });
    expect(directSessionId).toBe("session-direct");

    const querySessionId = resolveClaudeV2SessionId({
      send: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockReturnValue((async function* () {})()),
      close: vi.fn(),
      query: { session_id: "session-from-query" },
    });
    expect(querySessionId).toBe("session-from-query");
  });

  it("preserves control method binding when configuring dynamic MCP servers", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const control = {
      sdkMcpServerInstances: new Map<string, unknown>(),
      async setMcpServers(servers: Record<string, unknown>) {
        // Mirrors Claude SDK behavior where setMcpServers reads this.sdkMcpServerInstances.
        this.sdkMcpServerInstances.set("configured", true);
        calls.push(servers);
      },
    };

    await configureClaudeV2DynamicMcpServers({
      control,
      servers: { autobyteus_team: { type: "sdk", name: "autobyteus_team", instance: {} } },
    });

    expect(calls).toHaveLength(1);
    expect(control.sdkMcpServerInstances.get("configured")).toBe(true);
  });
});
