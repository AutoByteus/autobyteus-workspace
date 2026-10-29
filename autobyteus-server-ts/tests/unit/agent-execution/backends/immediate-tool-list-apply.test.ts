import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgyAgentRunBackend } from "../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AutoByteusAgentRunBackend } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";
import { ClaudeAgentRunBackend } from "../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { stubAgyAgentTools } from "../../../helpers/agent-tool-mcp-run-sessions-stub.js";

// The runtimes that take a new tool list from their next model call (REQ-002): AGY and Claude
// re-list over the Agent Tools GET stream once the session is replaced; native swaps its tools.

const definition = (toolNames: string[]) => ({ toolNames }) as never;

describe("AGY applyDefinitionTools", () => {
  const setup = () => {
    const agentTools = stubAgyAgentTools("run-agy", ["alpha"]);
    const process = { subscribe: () => () => undefined, onClose: () => () => undefined, stop: async () => undefined };
    const backend = new AgyAgentRunBackend({ runId: "run-agy", config: {
      runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini",
    }, runtimeContext: { conversationId: "conv-1" } } as never, process as never, { compactionDetection: false }, agentTools);
    return { backend, runSessions: agentTools.runSessions };
  };

  it("replaces the session's exposure and reports the new names; a same list changes nothing", async () => {
    const { backend, runSessions } = setup();
    expect(backend.getToolNames()).toEqual(["alpha"]);
    expect(await backend.applyDefinitionTools(definition(["alpha", "beta"]))).toEqual({ kind: "applied", toolNames: ["alpha", "beta"] });
    expect(runSessions.replaceForRun).toHaveBeenCalledWith(expect.objectContaining({ runId: "run-agy" }));
    expect(backend.getToolNames()).toEqual(["alpha", "beta"]);
    expect(await backend.applyDefinitionTools(definition(["beta", "alpha"]))).toEqual({ kind: "unchanged", toolNames: ["alpha", "beta"] });
    expect(runSessions.replaceForRun).toHaveBeenCalledOnce();
  });
});

describe("AutoByteus applyDefinitionTools", () => {
  const setup = () => {
    const toolInstances: Record<string, unknown> = { read_file: {} };
    const agent = {
      agentId: "run-native",
      context: { state: { toolInstances } },
      getCompactionRecovery: () => null,
      authorizeCompactionRetry: () => "accepted",
      revokeUnusedCompactionRetry: () => "revoked",
      replaceTools: vi.fn(async (tools: Array<{ name: string }>) => {
        agent.context.state.toolInstances = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
      }),
    };
    const build = vi.fn((def: { toolNames: string[] }) => def.toolNames.map((name) => ({ name })));
    const backend = new AutoByteusAgentRunBackend(new AgentRunContext({
      runId: "run-native", config: new AgentRunConfig({ agentDefinitionId: "def", llmModelIdentifier: "m", autoExecuteTools: false }),
      runtimeContext: null,
    }), agent as never, {
      isActive: () => true,
      removeAgent: async () => true,
      tools: {
        exposure: buildRuntimeAgentToolExposure(["read_file"]),
        exposureOf: (def: { toolNames: string[] }) => buildRuntimeAgentToolExposure(def.toolNames),
        build: build as never,
      } as never,
    });
    return { backend, agent, build };
  };

  it("compares names first: an unchanged list builds nothing; a changed one is given to the agent", async () => {
    const { backend, agent, build } = setup();
    expect(await backend.applyDefinitionTools(definition(["read_file"]))).toEqual({ kind: "unchanged", toolNames: ["read_file"] });
    expect(build).not.toHaveBeenCalled();
    expect(agent.replaceTools).not.toHaveBeenCalled();

    expect(await backend.applyDefinitionTools(definition(["read_file", "send_message_to"])))
      .toEqual({ kind: "applied", toolNames: ["read_file", "send_message_to"] });
    expect(build).toHaveBeenCalledOnce();
    expect(agent.replaceTools).toHaveBeenCalledOnce();
  });
});

describe("Claude applyDefinitionTools", () => {
  it("keeps the exposure for later process generations and replaces the Agent Tools session", async () => {
    const runtimeContext = { runtimeToolExposure: buildRuntimeAgentToolExposure(["alpha"]) };
    const session = {
      getAgentToolNames: vi.fn(() => ["alpha"]),
      applyToolExposure: vi.fn((exposure: { requestedToolNames: string[] }) => {
        runtimeContext.runtimeToolExposure = exposure as never;
        return exposure.requestedToolNames;
      }),
    };
    const backend = new ClaudeAgentRunBackend({
      runId: "run-claude",
      config: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memberExecutionContext: null },
      runtimeContext,
    } as never, session as never);

    expect(await backend.applyDefinitionTools(definition(["alpha"]))).toEqual({ kind: "unchanged", toolNames: ["alpha"] });
    expect(session.applyToolExposure).not.toHaveBeenCalled();
    expect(await backend.applyDefinitionTools(definition(["alpha", "beta"]))).toEqual({ kind: "applied", toolNames: ["alpha", "beta"] });
    expect(session.applyToolExposure).toHaveBeenCalledOnce();
    expect(runtimeContext.runtimeToolExposure.requestedToolNames).toEqual(["alpha", "beta"]);
  });
});
