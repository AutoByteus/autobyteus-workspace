import { describe, expect, it, vi } from "vitest";
import {
  configureClaudeV2DynamicMcpServers,
  createOrResumeClaudeV2Session,
  resolveClaudeV2SessionControl,
} from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.js";

describe("claude-runtime-v2-control-interop", () => {
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
      resumeSessionId: null,
      enableSendMessageToTooling: true,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]?.[0]).toMatchObject({
      model: "claude-sonnet-4-5",
      pathToClaudeCodeExecutable: "claude",
      permissionMode: "default",
      allowedTools: ["send_message_to", "mcp__autobyteus_team__send_message_to"],
    });
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
      resumeSessionId: "session-123",
      enableSendMessageToTooling: false,
    });

    expect(createSession).toHaveBeenCalledTimes(0);
    expect(resumeSession).toHaveBeenCalledTimes(1);
    expect(resumeSession.mock.calls[0]?.[0]).toBe("session-123");
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
