import { describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { createAgentToolsMcpHost } from "../../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "../../../../src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.js";

const loggingConfig = {
  pinoLogLevel: "silent" as const,
  httpAccessLogMode: "off" as const,
  includeNoisyHttpAccessRoutes: false,
  scopedLogLevelOverrides: [],
};

const createActivationInput = (runId: string) => ({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: runId,
    senderName: runId,
  }),
  runtimeExposure: buildRuntimeAgentToolExposure(["publish_artifacts"]),
});

describe("AgentToolsMcpHost", () => {
  it("owns one one-shot loopback listener and publishes only ready descriptors", async () => {
    const host = createAgentToolsMcpHost({ loggingConfig });
    const authority = host.sessionAuthorities.begin({ scopeIdentity: "application:test" })
      .complete({
        executionCapabilities: {
          publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
          applicationAgentTools: null,
        },
        assertExecutionCapabilitiesReady: () => undefined,
      });

    expect(() => authority.runSessions.activateForRun(createActivationInput("run-early")))
      .toThrow("local server is not ready");
    await host.listen();
    expect(() => host.listen()).toThrow("cannot listen");

    const activation = authority.runSessions.activateForRun(
      createActivationInput("run-early"),
    );
    if (activation.kind !== "active") throw new Error("Expected active result.");
    const endpoint = new URL(activation.descriptor.serverUrl);
    expect(endpoint.hostname).toBe("127.0.0.1");
    expect(Number(endpoint.port)).toBeGreaterThan(0);
    expect(activation.descriptor).not.toHaveProperty("headers");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: {} }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: {} });

    const unsupported = await fetch(endpoint, { method: "PUT" });
    expect(unsupported.status).toBe(405);

    expect(authority.runSessions.deactivateForRun("run-early")).toBe(1);
    const deniedPreflight = await fetch(endpoint, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" },
    });
    expect(deniedPreflight.status).toBe(403);
    const inactive = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping", params: {} }),
    });
    expect(inactive.status).toBe(404);

    await host.close();
    await host.close();
    expect(() => host.sessionAuthorities.begin({ scopeIdentity: "application:late" }))
      .toThrow("Agent Tools MCP host is closed");
  });

  it("exposes one immutable snapshot of every registered static adapter name", async () => {
    const host = createAgentToolsMcpHost({ loggingConfig });
    const expected = buildDefaultAgentToolMcpAdapterProviders()
      .flatMap((provider) => provider.getAdapters())
      .map((adapter) => adapter.definition.name)
      .sort((left, right) => left.localeCompare(right));

    expect([...host.staticAdapterToolNames]).toEqual(expected);
    expect(Object.isFrozen(host.staticAdapterToolNames)).toBe(true);
    expect(() => (host.staticAdapterToolNames as Set<string>).add("late"))
      .toThrow();
    await host.close();
  });
});
