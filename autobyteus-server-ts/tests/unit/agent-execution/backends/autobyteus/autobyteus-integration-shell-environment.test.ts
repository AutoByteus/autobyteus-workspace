/**
 * Native (AutoByteus) runs get their integration variables through core's `terminalChildEnvironment` seam
 * (DS-002): the factory puts a function into the run's initial custom data, a real core agent built from that config
 * carries it in its context, and `run_bash` in that context sees the variables while `process.env` stays unchanged.
 * A run of an agent without access gets nothing. Dummy values only.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentFactory, NativeCommandProcessScope } from "autobyteus-ts";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { runBash } from "autobyteus-ts/tools/terminal/tools/run-bash.js";
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import type { IntegrationRunAccess } from "../../../../../src/credential-proxy/integration-run-access.js";

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const API_URL = "http://127.0.0.1:5555/r/rp_test-dummy-pass/github/api";

const createFactory = (integrationRunAccess: IntegrationRunAccess, workspace: string) =>
  new AutoByteusAgentRunBackendFactory({
    nativeCommandProcessScope: new NativeCommandProcessScope(),
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn(async (id: string) => new AgentDefinition({ id, name: "Gitter", description: "Uses git.", instructions: "", toolNames: ["run_bash"] })),
    } as never,
    createLLM: vi.fn(async () => new DummyLLM(
      new LLMModel({ name: "dummy-model", value: "dummy-model", canonicalName: "dummy-model", provider: LLMProvider.OPENAI }),
      new LLMConfig(),
    )),
    workspaceManager: {
      getWorkspaceById: () => null,
      getOrCreateTempWorkspace: async () => ({ workspaceId: "workspace-1", getName: () => "W", getBasePath: () => workspace }),
    } as never,
    skillService: { hasEffectiveSkills: () => false, resolveConfiguredSkillsForAgent: () => [] } as never,
    integrationRunAccess,
  });

const build = (factory: AutoByteusAgentRunBackendFactory, runId: string, agentDefinitionId: string) =>
  (factory as unknown as { buildAgentConfig: (...args: unknown[]) => Promise<{ agentConfig: { initialCustomData?: Record<string, unknown> } }> })
    .buildAgentConfig(new AgentRunConfig({
      agentDefinitionId, llmModelIdentifier: "dummy-model", autoExecuteTools: false, runtimeKind: RuntimeKind.AUTOBYTEUS,
    }), runId, () => undefined);

describe("AutoByteus run integration shell environment", () => {
  const workspaces: string[] = [];
  afterEach(async () => {
    await AgentFactory.getInstance().removeAgent("run-allowed", 1).catch(() => undefined);
    for (const dir of workspaces.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  const access: IntegrationRunAccess = {
    environmentForRun: vi.fn((run: { agentDefinitionId: string }): Record<string, string> => (run.agentDefinitionId === "agent-allowed"
      ? { AUTOBYTEUS_GITHUB_API_URL: API_URL, GIT_TERMINAL_PROMPT: "0" } : {})),
    revokeForRun: vi.fn(),
  };

  it("gives an allowed run's shell commands the variables, through a real core agent's context", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "native-integration-env-"));
    workspaces.push(workspace);
    const built = await build(createFactory(access, workspace), "run-allowed", "agent-allowed");
    expect(access.environmentForRun).toHaveBeenCalledWith({ runId: "run-allowed", agentDefinitionId: "agent-allowed" }, process.env);

    // A function in the initial custom data reaches the runtime's custom data (premise 1).
    const agent = AgentFactory.getInstance().createAgentWithId("run-allowed", built.agentConfig as never);
    const supplier = (agent.context.customData as Record<string, unknown>).terminalChildEnvironment;
    expect(supplier).toBe(built.agentConfig.initialCustomData?.terminalChildEnvironment);

    const result = await runBash(agent.context as never, 'printf "%s" "$AUTOBYTEUS_GITHUB_API_URL"', workspace);
    expect(result.stdout).toBe(API_URL);
    expect(process.env.AUTOBYTEUS_GITHUB_API_URL).toBeUndefined();
  });

  it("gives a run of an agent without access nothing", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "native-integration-env-"));
    workspaces.push(workspace);
    const built = await build(createFactory(access, workspace), "run-other", "agent-other");
    expect(built.agentConfig.initialCustomData).not.toHaveProperty("terminalChildEnvironment");
  });
});
