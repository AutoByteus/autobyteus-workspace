import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../src/config/server-runtime-endpoints.js";
import { startStudioE2eRuntimeServer } from "../../e2e/helpers/studio-runtime-test-server.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

const mcpRequest = async (url: string, method: string, id: string) =>
  fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: {} }),
  });

describe("Studio main and Agent Tools listener integration", () => {
  it("preserves a wildcard main bind while serving Agent Tools only on one loopback listener and closing both", async () => {
    const originalInternalBase =
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    const appDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "studio-agent-tools-listener-"),
    );
    tempDirs.push(appDataDir);
    await fs.writeFile(
      path.join(appDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(appDataDir);

    const started = await startStudioE2eRuntimeServer("0.0.0.0");
    let closed = false;
    try {
      const mainAddress = started.fastify.server.address();
      if (!mainAddress || typeof mainAddress === "string") {
        throw new Error("Expected an IP main listener address.");
      }
      expect(mainAddress.address).toBe("0.0.0.0");
      expect(mainAddress.port).toBeGreaterThan(0);

      const absentMainRoute = await mcpRequest(
        new URL(
          "/mcp/agent-tools/agtrun_main_listener_must_not_dispatch",
          started.mainUrl,
        ).toString(),
        "ping",
        "main-404",
      );
      expect(absentMainRoute.status).toBe(404);

      const wildcardGateway = await mcpRequest(
        new URL("/mcp/gateway", started.mainUrl).toString(),
        "ping",
        "gateway-wildcard-ping",
      );
      expect(wildcardGateway.status).toBe(401);

      const loopbackMainUrl = new URL(started.mainUrl);
      loopbackMainUrl.hostname = "127.0.0.1";
      const gatewayBeforeAnyRun = await mcpRequest(
        new URL("/mcp/gateway", loopbackMainUrl).toString(),
        "ping",
        "gateway-ping",
      );
      expect(gatewayBeforeAnyRun.status).toBe(200);
      expect(await gatewayBeforeAnyRun.json()).toMatchObject({
        jsonrpc: "2.0",
        id: "gateway-ping",
        result: {},
      });

      const authority = started.agentToolsMcpHost.sessionAuthorities.begin({
        scopeIdentity: "studio-listener-integration",
      }).complete({
        executionCapabilities: {
          publishedArtifactPublisher: {
            publishManyForRun: vi.fn(async () => []),
          },
          applicationAgentTools: null,
        },
        assertExecutionCapabilitiesReady: () => undefined,
      });
      const runId = "studio-listener-agent-tools-run";
      const activation = authority.runSessions.activateForRun({
        owner: { runId },
        sender: buildAgentRunMessageSenderContext({
          senderRunId: runId,
          senderName: "Studio listener integration",
        }),
        runtimeExposure: buildRuntimeAgentToolExposure(["publish_artifacts"]),
      });
      if (activation.kind !== "active") {
        throw new Error("Expected an active Agent Tools descriptor.");
      }
      expect(activation.descriptor).not.toHaveProperty("headers");
      const agentToolsUrl = new URL(activation.descriptor.serverUrl);
      expect(agentToolsUrl.hostname).toBe("127.0.0.1");
      expect(Number(agentToolsUrl.port)).toBeGreaterThan(0);
      expect(Number(agentToolsUrl.port)).not.toBe(mainAddress.port);
      expect((await mcpRequest(agentToolsUrl.toString(), "ping", "active")).status)
        .toBe(200);

      expect(authority.runSessions.deactivateForRun(runId)).toBe(1);
      expect((await mcpRequest(agentToolsUrl.toString(), "ping", "inactive")).status)
        .toBe(404);

      await started.fastify.close();
      closed = true;
      await expect(mcpRequest(agentToolsUrl.toString(), "ping", "closed"))
        .rejects.toThrow();
      expect(() => started.agentToolsMcpHost.sessionAuthorities.begin({
        scopeIdentity: "studio-listener-after-close",
      })).toThrow("Agent Tools MCP host is closed");
    } finally {
      if (!closed) await started.fastify.close();
      if (originalInternalBase) {
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
          originalInternalBase;
      } else {
        delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      }
    }
  }, 30_000);
});
