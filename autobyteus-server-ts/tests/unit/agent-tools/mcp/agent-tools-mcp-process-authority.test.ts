import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildConfiguredAgentToolExposure } from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import {
  createAgentToolsMcpProcessAuthority,
} from "../../../../src/agent-tools/mcp/agent-tools-mcp-process-authority.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../../src/config/server-runtime-endpoints.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createPublicationPort = () => ({
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

describe("AgentToolsMcpProcessAuthority", () => {
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
    const generalPublication = createPublicationPort();
    const applicationPublication = createPublicationPort();
    const processAuthority = createAgentToolsMcpProcessAuthority({
      generalProcessPublication: generalPublication,
    });
    let applicationPublicationReady = true;
    const applicationAuthority =
      processAuthority.createApplicationSessionAuthority({
        executionAuthorities: {
          publishedArtifactPublication: applicationPublication,
        },
        assertExecutionAuthoritiesReady: () => {
          if (!applicationPublicationReady) {
            throw new Error("Application publication is unavailable.");
          }
        },
      });

    const general =
      processAuthority.generalProcessSessionAuthority.createAgentToolMcpSession(
        createSessionInput("general-run"),
      );
    const application = applicationAuthority.createAgentToolMcpSession(
      createSessionInput("application-run"),
    );
    const registry = processAuthority.routeDependencies.registry;

    expect(
      registry.resolveSession({
        sessionId: general.session.sessionId,
        bearerToken: bearerToken(general.descriptor.headers.Authorization),
      }),
    ).toMatchObject({
      ok: true,
      session: {
        executionAuthorities: {
          publishedArtifactPublication: generalPublication,
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
        executionAuthorities: {
          publishedArtifactPublication: applicationPublication,
        },
      },
    });

    applicationAuthority.blockNewSessions();
    applicationPublicationReady = false;
    applicationAuthority.close();
    applicationAuthority.close();

    expect(() =>
      applicationAuthority.createAgentToolMcpSession(
        createSessionInput("late-application-run"),
      ),
    ).toThrow("Agent Tools MCP session authority is closing.");
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

    processAuthority.close();
    processAuthority.close();

    expect(
      registry.resolveSession({
        sessionId: general.session.sessionId,
        bearerToken: bearerToken(general.descriptor.headers.Authorization),
      }),
    ).toMatchObject({ ok: false, reason: "missing_session" });
    expect(() =>
      processAuthority.createApplicationSessionAuthority({
        executionAuthorities: {
          publishedArtifactPublication: applicationPublication,
        },
        assertExecutionAuthoritiesReady: vi.fn(),
      }),
    ).toThrow("Agent Tools MCP process authority is closed.");
  });
});
