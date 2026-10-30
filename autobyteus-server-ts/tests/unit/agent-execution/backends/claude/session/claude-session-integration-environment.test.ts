/**
 * Claude runs get their integration variables in the run session's query options (`extraEnvironment`), which the
 * SDK client merges into that session's CLI spawn only. A run without access gets no `extraEnvironment`. Dummy values.
 */
import { describe, expect, it, vi } from "vitest";
import { resolveClaudeSessionQueryOptions } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-query-options.js";
import { buildRuntimeAgentToolExposure } from "../../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import type { IntegrationRunAccess } from "../../../../../../src/credential-proxy/integration-run-access.js";

const API_URL = "http://127.0.0.1:5555/r/rp_test-dummy/github/api";

const resolveFor = (agentDefinitionId: string, integrationRunAccess: IntegrationRunAccess | null) =>
  resolveClaudeSessionQueryOptions({
    runContext: {
      runId: "run-claude",
      config: { agentDefinitionId, memberExecutionContext: null },
      runtimeContext: {
        sessionConfig: { model: "haiku", workingDirectory: "/tmp", permissionMode: "default", autoExecuteTools: false },
        carpenterSystemPrompt: "",
        runtimeToolExposure: buildRuntimeAgentToolExposure([]),
        materializedConfiguredSkills: [],
      },
    } as never,
    binding: { kind: "create", sessionId: "11111111-1111-4111-8111-111111111111" },
    diagnostics: { append: vi.fn() } as never,
    agentToolsMcpSessionState: {
      ensureDescriptor: () => ({ serverUrl: "http://127.0.0.1:1/mcp/run", enabledTools: [] }),
    } as never,
    toolingCoordinator: {} as never,
    integrationRunAccess,
  });

describe("Claude run session integration environment", () => {
  const access: IntegrationRunAccess = {
    environmentForRun: vi.fn((run: { agentDefinitionId: string }): Record<string, string> => (run.agentDefinitionId === "agent-allowed" ? { AUTOBYTEUS_GITHUB_API_URL: API_URL } : {})),
    revokeForRun: vi.fn(),
  };

  it("puts an allowed run's variables in its session options", async () => {
    const options = await resolveFor("agent-allowed", access);
    expect(options.extraEnvironment).toEqual({ AUTOBYTEUS_GITHUB_API_URL: API_URL });
    expect(access.environmentForRun).toHaveBeenCalledWith({ runId: "run-claude", agentDefinitionId: "agent-allowed" }, process.env);
  });

  it("gives a run without access, or a host without integration access, nothing", async () => {
    expect(await resolveFor("agent-other", access)).not.toHaveProperty("extraEnvironment");
    expect(await resolveFor("agent-allowed", null)).not.toHaveProperty("extraEnvironment");
  });
});
