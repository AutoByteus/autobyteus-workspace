import { describe, expect, it, vi } from "vitest";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

// `AgentRun.applyDefinitionSkills` (autobyteus-460): the run's public boundary for setting up a definition's added
// skills on its runtime. It rejects a run that is not active and otherwise hands the definition to its backend.

const createRun = (active: { value: boolean }) => {
  const context = new AgentRunContext({
    runId: "run-skills",
    config: new AgentRunConfig({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, agentDefinitionId: "def", llmModelIdentifier: "m", autoExecuteTools: false }),
    runtimeContext: null,
  });
  const backend = {
    runId: "run-skills",
    runtimeKind: context.config.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "platform-run-skills",
    isActive: () => active.value,
    getLifecycleSnapshot: () => ({ availability: active.value ? "active" : "offline", phase: "idle", currentTurn: { kind: "NONE" } }),
    hasRunningBackgroundTasks: () => false,
    subscribeToSourceEventBatches: () => () => undefined,
    dispatchUserInput: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    applyDefinitionSkills: vi.fn(async () => undefined),
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
    commandObservers: [],
  });
  return { run, backend };
};

describe("AgentRun.applyDefinitionSkills", () => {
  it("hands an active run's definition to its backend", async () => {
    const { run, backend } = createRun({ value: true });
    const definition = { id: "def", skillNames: ["reflection"] } as never;
    await run.applyDefinitionSkills(definition);
    expect(backend.applyDefinitionSkills).toHaveBeenCalledWith(definition);
  });

  it("rejects a run that is not active, before its backend is called", async () => {
    const { run, backend } = createRun({ value: false });
    await expect(run.applyDefinitionSkills({ id: "def", skillNames: [] } as never)).rejects.toThrow("Agent run 'run-skills' is not active.");
    expect(backend.applyDefinitionSkills).not.toHaveBeenCalled();
  });
});
