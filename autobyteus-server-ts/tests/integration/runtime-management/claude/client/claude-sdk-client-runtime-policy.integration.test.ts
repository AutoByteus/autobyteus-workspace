import fs from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeSdkClient } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import {
  buildStandaloneClaudeProcessEnv,
  resolveClaudeCliExecutableCandidates,
} from "../../../../helpers/claude-cli-executable-candidates.js";

// Guards the Claude CLI env contract AutoByteus relies on for per-turn queries
// (CLAUDE_CODE_DISABLE_BACKGROUND_TASKS, BASH_MAX_TIMEOUT_MS). Re-run after Claude CLI or
// Agent SDK bumps: RUN_CLAUDE_E2E=1. No model call is made.
const cliCandidates = resolveClaudeCliExecutableCandidates();
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeCliRuntimePolicy =
  liveClaudeTestsEnabled && cliCandidates.length > 0 ? describe : describe.skip;

const CAPTURE_TIMEOUT_MS = 90_000;

type CapturedTool = {
  name?: string;
  description?: string;
  input_schema?: { properties?: Record<string, { description?: string }> };
};

/**
 * Local stand-in for the Anthropic Messages API. It records the tool definitions the Claude
 * CLI advertises to the model and rejects the request, so no model call is made.
 */
const startMessagesCaptureEndpoint = async (): Promise<{
  baseUrl: string;
  waitForAdvertisedTools: () => Promise<CapturedTool[]>;
  close: () => Promise<void>;
}> => {
  let resolveTools!: (tools: CapturedTool[]) => void;
  const advertisedTools = new Promise<CapturedTool[]>((resolve) => {
    resolveTools = resolve;
  });
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      if (request.method === "POST" && request.url?.startsWith("/v1/messages")) {
        try {
          const tools = (JSON.parse(body) as { tools?: CapturedTool[] }).tools ?? [];
          if (tools.some((tool) => tool.name === "Bash")) {
            resolveTools(tools);
          }
        } catch {
          // Non-JSON bodies are irrelevant to the tool contract.
        }
      }
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({
        type: "error",
        error: { type: "invalid_request_error", message: "AutoByteus tool-contract capture endpoint" },
      }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${String(port)}`,
    waitForAdvertisedTools: () =>
      Promise.race([
        advertisedTools,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Claude CLI sent no Messages request advertising the Bash tool.")),
            CAPTURE_TIMEOUT_MS,
          ),
        ),
      ]),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

describeClaudeCliRuntimePolicy("ClaudeSdkClient Claude CLI runtime policy (real CLI tool contract)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
  });

  it.each(cliCandidates.map((candidate) => [candidate.label, candidate] as const))(
    "turn queries launch %s with foreground-only Bash and a 30 minute ceiling",
    async (_label, candidate) => {
      vi.stubEnv("CLAUDE_CODE_EXECUTABLE_PATH", candidate.executablePath);
      const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-cli-runtime-policy-"));
      cleanups.push(() => fs.rm(workspaceRoot, { recursive: true, force: true }));
      const endpoint = await startMessagesCaptureEndpoint();
      cleanups.push(endpoint.close);

      const query = await new ClaudeSdkClient().startQueryTurn({
        prompt: "Reply with OK.",
        sessionBinding: { kind: "create", sessionId: randomUUID() },
        model: "haiku",
        workingDirectory: workspaceRoot,
        permissionMode: "default",
        env: {
          ...buildStandaloneClaudeProcessEnv(),
          CLAUDE_AGENT_SDK_AUTH_MODE: "cli",
          ANTHROPIC_BASE_URL: endpoint.baseUrl,
          // Dummy credential: requests only ever reach the local capture endpoint.
          ANTHROPIC_API_KEY: "sk-ant-autobyteus-capture-endpoint-only",
          // Conflicting caller values the runtime policy must override.
          CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "0",
          BASH_MAX_TIMEOUT_MS: "600000",
        },
      });
      cleanups.push(async () => query.close?.());
      const drain = (async () => {
        try {
          for await (const _chunk of query) {
            // Drain until the CLI gives up on the rejected request.
          }
        } catch {
          // The capture endpoint rejects every request; the resulting error is expected.
        }
      })();

      const tools = await endpoint.waitForAdvertisedTools();
      query.close?.();
      await drain;

      const bash = tools.find((tool) => tool.name === "Bash");
      const bashProperties = bash?.input_schema?.properties ?? {};
      expect(Object.keys(bashProperties)).toEqual(expect.arrayContaining(["command", "timeout"]));
      expect(bashProperties).not.toHaveProperty("run_in_background");
      expect(bashProperties.timeout?.description).toMatch(/\b1800000\b/u);
      expect(bash?.description).toMatch(/\b1800000ms\b/u);
      // The per-call default stays at the CLI default (BASH_DEFAULT_TIMEOUT_MS is not set).
      expect(bash?.description).toMatch(/\b120000ms\b/u);
      // The switch also removes background execution from subagent tools.
      const toolsOfferingBackground = tools
        .filter((tool) => Object.hasOwn(tool.input_schema?.properties ?? {}, "run_in_background"))
        .map((tool) => tool.name);
      expect(toolsOfferingBackground).toEqual([]);
    },
    CAPTURE_TIMEOUT_MS + 30_000,
  );
});
