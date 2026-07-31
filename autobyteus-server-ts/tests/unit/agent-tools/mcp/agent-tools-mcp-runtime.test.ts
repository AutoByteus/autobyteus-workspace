import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildConfiguredAgentToolExposure } from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import {
  createAgentToolsMcpRuntime,
} from "../../../../src/agent-tools/mcp/agent-tools-mcp-runtime.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../../src/config/server-runtime-endpoints.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createPublisher = () => ({
  publishManyForRun: vi.fn().mockResolvedValue([]),
});

const createSessionInput = (runId: string) => ({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: runId,
    senderName: runId,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  }),
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  configuredExposure: buildConfiguredAgentToolExposure([]),
});

const bearerToken = (authorization: string): string =>
  authorization.replace(/^Bearer\s+/, "");

describe("AgentToolsMcpRuntime", () => {
  let originalInternalBaseUrl: string | undefined;

  beforeEach(() => {
    originalInternalBaseUrl =
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
      "http://127.0.0.1:43124";
  });

  afterEach(() => {
    if (originalInternalBaseUrl === undefined) {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    } else {
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
        originalInternalBaseUrl;
    }
  });

  it("revokes an application scope without revoking the general process scope, then clears both at process close", () => {
    const generalPublisher = createPublisher();
    const applicationPublisher = createPublisher();
    const mcpRuntime = createAgentToolsMcpRuntime({
      generalProcessPublisher: generalPublisher,
    });
    let applicationPublicationReady = true;
    const applicationScope =
      mcpRuntime.createApplicationSessionScope("application:test");
    const applicationSessionManager =
      mcpRuntime.createApplicationSessionManager({
        scope: applicationScope,
        executionCapabilities: {
          publishedArtifactPublisher: applicationPublisher,
        },
        assertExecutionCapabilitiesReady: () => {
          if (!applicationPublicationReady) {
            throw new Error("Application publication is unavailable.");
          }
        },
      });

    const general =
      mcpRuntime.generalProcessSessionManager.createAgentToolMcpSession(
        createSessionInput("general-run"),
      );
    const application = applicationSessionManager.createAgentToolMcpSession(
      createSessionInput("application-run"),
    );
    const registry = mcpRuntime.routeDependencies.registry;

    expect(
      registry.resolveSession({
        sessionId: general.session.sessionId,
        bearerToken: bearerToken(general.descriptor.headers.Authorization),
      }),
    ).toMatchObject({
      ok: true,
      session: {
        executionCapabilities: {
          publishedArtifactPublisher: generalPublisher,
        },
      },
    });
    expect(
      registry.resolveSession({
        sessionId: application.session.sessionId,
        bearerToken: bearerToken(application.descriptor.headers.Authorization),
      }),
    ).toMatchObject({
      ok: true,
      session: {
        executionCapabilities: {
          publishedArtifactPublisher: applicationPublisher,
        },
      },
    });

    applicationSessionManager.blockNewSessions();
    applicationPublicationReady = false;
    applicationSessionManager.close();
    applicationSessionManager.close();

    expect(() =>
      applicationSessionManager.createAgentToolMcpSession(
        createSessionInput("late-application-run"),
      ),
    ).toThrow("Scoped Agent Tools MCP session manager is closing.");
    expect(
      registry.resolveSession({
        sessionId: application.session.sessionId,
        bearerToken: bearerToken(application.descriptor.headers.Authorization),
      }),
    ).toMatchObject({ ok: false, reason: "revoked" });
    expect(
      registry.resolveSession({
        sessionId: general.session.sessionId,
        bearerToken: bearerToken(general.descriptor.headers.Authorization),
      }),
    ).toMatchObject({ ok: true });

    mcpRuntime.close();
    mcpRuntime.close();

    expect(
      registry.resolveSession({
        sessionId: general.session.sessionId,
        bearerToken: bearerToken(general.descriptor.headers.Authorization),
      }),
    ).toMatchObject({ ok: false, reason: "missing_session" });
    expect(() =>
      mcpRuntime.createApplicationSessionManager({
        scope: mcpRuntime.createApplicationSessionScope("application:late"),
        executionCapabilities: {
          publishedArtifactPublisher: applicationPublisher,
        },
        assertExecutionCapabilitiesReady: vi.fn(),
      }),
    ).toThrow("Agent Tools MCP runtime is closed.");
  });
});
