import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { createAgentToolsMcpHost } from "../../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "../../../../src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.js";
import { AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR } from "../../../../src/config/server-runtime-endpoints.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createPublisher = () => ({ publishManyForRun: vi.fn().mockResolvedValue([]) });
const createSessionInput = (runId: string) => ({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: runId,
    senderName: runId,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  }),
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  runtimeExposure: buildRuntimeAgentToolExposure(["publish_artifacts"]),
});
const bearerToken = (authorization: string): string => authorization.replace(/^Bearer\s+/, "");

describe("AgentToolsMcpHost", () => {
  let originalInternalBaseUrl: string | undefined;

  beforeEach(() => {
    originalInternalBaseUrl = process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = "http://127.0.0.1:43124";
  });

  afterEach(() => {
    if (originalInternalBaseUrl === undefined) {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    } else {
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = originalInternalBaseUrl;
    }
  });

  it("shares one route registry across scoped authorities and clears it at process close", () => {
    const host = createAgentToolsMcpHost();
    const authority = host.sessionAuthorities.begin({ scopeIdentity: "application:test" })
      .complete({
        executionCapabilities: {
          publishedArtifactPublisher: createPublisher(),
          applicationAgentTools: null,
        },
        assertExecutionCapabilitiesReady: () => undefined,
      });
    const issued = authority.issuer.issueForRun(createSessionInput("run-1"));

    expect(host.routeDependencies.registry.resolveSession({
      sessionId: issued.sessionId,
      bearerToken: bearerToken(issued.descriptor.headers.Authorization),
    })).toMatchObject({ ok: true, session: { owner: { runId: "run-1" } } });

    host.close();
    host.close();
    expect(host.routeDependencies.registry.resolveSession({
      sessionId: issued.sessionId,
      bearerToken: bearerToken(issued.descriptor.headers.Authorization),
    })).toMatchObject({ ok: false, reason: "missing_session" });
    expect(() => host.sessionAuthorities.begin({ scopeIdentity: "application:late" }))
      .toThrow("Agent Tools MCP host is closed.");
  });

  it("exposes one immutable snapshot containing every default provider adapter name", () => {
    const expectedNames = buildDefaultAgentToolMcpAdapterProviders()
      .flatMap((provider) => provider.getAdapters())
      .map((adapter) => adapter.definition.name)
      .sort((left, right) => left.localeCompare(right));
    const host = createAgentToolsMcpHost();

    expect([...host.staticAdapterToolNames]).toEqual(expectedNames);
    expect(Object.isFrozen(host.staticAdapterToolNames)).toBe(true);
    expect("add" in host.staticAdapterToolNames).toBe(false);

    host.close();
  });
});
