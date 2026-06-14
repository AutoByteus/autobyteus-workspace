import { describe, expect, it, vi } from "vitest";
import { buildConfiguredAgentToolExposure } from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import type { AgentToolMcpToolAdapter } from "../../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";

const buildSender = () => buildAgentRunMessageSenderContext({
  senderRunId: "run-1",
  senderName: "agent-one",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const buildService = (registry = new AgentToolMcpSessionRegistry()) => new AgentToolMcpSessionService({
  registry,
  catalog: new AgentToolMcpCatalog({
    adapters: [buildSendMessageAdapter(vi.fn())],
  }),
  getInternalBaseUrl: () => "http://127.0.0.1:8080",
});

const buildSendMessageAdapter = (dispatch: ReturnType<typeof vi.fn>): AgentToolMcpToolAdapter => ({
  definition: {
    name: SEND_MESSAGE_TO_TOOL_NAME,
    description: "Send a message",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  isAvailable: () => true,
  execute: ({ session, rawArguments }) => dispatch({
    toolName: SEND_MESSAGE_TO_TOOL_NAME,
    rawArguments,
    sender: session.sender,
  }),
});

describe("AgentToolMcpSessionService", () => {
  it("creates a secret descriptor from configured-and-supported tools without storing raw tokens", () => {
    const registry = new AgentToolMcpSessionRegistry();
    const service = buildService(registry);

    const result = service.createAgentToolMcpSession({
      owner: { runId: "run-1" },
      sender: buildSender(),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      configuredExposure: buildConfiguredAgentToolExposure([
        SEND_MESSAGE_TO_TOOL_NAME,
        "open_tab",
      ]),
    });

    expect(result.descriptor).toMatchObject({
      name: "autobyteus_agent_tools",
      transport: "streamable_http",
      enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      headers: { Authorization: expect.stringMatching(/^Bearer\s+\S+$/) },
    });
    expect(result.descriptor.serverUrl).toBe(
      `http://127.0.0.1:8080/mcp/agent-tools/${result.session.sessionId}`,
    );
    const rawToken = result.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    expect(result.session.tokenHash.toString("utf8")).not.toContain(rawToken);
    expect(registry.resolveSession({ sessionId: result.session.sessionId, bearerToken: rawToken }).ok).toBe(true);

    expect(result.redactedDescriptor.headers.Authorization).toBe("Bearer <redacted>");
    expect(result.redactedDescriptor.serverUrl).toBe("http://127.0.0.1:8080/mcp/agent-tools/%3Credacted%3E");
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(rawToken);
    expect(JSON.stringify(result.redactedDescriptor)).not.toContain(result.session.sessionId);
  });

  it("does not expose send_message_to when it was not configured", () => {
    const service = buildService();

    const result = service.createAgentToolMcpSession({
      owner: { runId: "run-2" },
      sender: buildSender(),
      configuredExposure: buildConfiguredAgentToolExposure(["open_tab"]),
    });

    expect(result.descriptor.enabledTools).toEqual([]);
    expect(result.session.enabledTools).toEqual([]);
  });

  it("resolves, expires, revokes, and revokes sessions by explicit owner identity", () => {
    let now = new Date("2026-06-13T10:00:00.000Z");
    const registry = new AgentToolMcpSessionRegistry({ now: () => now });
    const service = buildService(registry);
    const created = service.createAgentToolMcpSession({
      owner: { runId: "run-3", memberRunId: "member-run-3" },
      sender: buildSender(),
      configuredExposure: buildConfiguredAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
      ttlMillis: 1000,
    });
    const token = created.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");

    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: token }).ok).toBe(true);
    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: "wrong" })).toMatchObject({
      ok: false,
      reason: "token_mismatch",
    });

    now = new Date("2026-06-13T10:00:01.001Z");
    expect(registry.resolveSession({ sessionId: created.session.sessionId, bearerToken: token })).toMatchObject({
      ok: false,
      reason: "expired",
    });

    const second = service.createAgentToolMcpSession({
      owner: { runId: "run-3", memberRunId: "member-run-3" },
      sender: buildSender(),
      configuredExposure: buildConfiguredAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
    });
    const secondToken = second.descriptor.headers.Authorization.replace(/^Bearer\s+/, "");
    expect(service.revokeAgentToolMcpSessionsForMemberRun("member-run-3")).toBeGreaterThanOrEqual(1);
    expect(registry.resolveSession({ sessionId: second.session.sessionId, bearerToken: secondToken })).toMatchObject({
      ok: false,
      reason: "revoked",
    });
  });
});

describe("AgentToolMcpToolExecutor", () => {
  it("delegates send_message_to to the shared dispatcher and emits observer events", async () => {
    const dispatch = vi.fn(async () => ({ accepted: true, code: "DELIVERED", message: "Delivered message." }));
    const starts = vi.fn();
    const completes = vi.fn();
    const registry = new AgentToolMcpSessionRegistry();
    const { session } = registry.createSession({
      owner: { runId: "run-4" },
      sender: buildSender(),
      configuredExposure: buildConfiguredAgentToolExposure([SEND_MESSAGE_TO_TOOL_NAME]),
      enabledTools: [SEND_MESSAGE_TO_TOOL_NAME],
      toolExecutionObserver: {
        onToolStart: starts,
        onToolComplete: completes,
      },
    });
    const executor = new AgentToolMcpToolExecutor({
      catalog: new AgentToolMcpCatalog({ adapters: [buildSendMessageAdapter(dispatch)] }),
    });

    const result = await executor.executeAgentToolMcpCall({
      session,
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: { target_agent_run_id: "run-5", content: "hello" },
    });

    expect(result).toMatchObject({ accepted: true, message: "Delivered message." });
    expect(dispatch).toHaveBeenCalledWith({
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      rawArguments: { target_agent_run_id: "run-5", content: "hello" },
      sender: session.sender,
    });
    expect(starts).toHaveBeenCalledWith({
      sessionId: session.sessionId,
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
      senderRunId: "run-1",
    });
    expect(completes).toHaveBeenCalledWith(expect.objectContaining({
      accepted: true,
      code: "DELIVERED",
    }));
  });
});
