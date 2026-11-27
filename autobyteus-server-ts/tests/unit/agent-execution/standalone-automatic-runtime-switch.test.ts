import { describe, expect, it, vi } from "vitest";
import { StandaloneAutomaticRuntimeSwitch, type AutomaticRuntimeSwitchInput } from "../../../src/agent-execution/services/standalone-automatic-runtime-switch.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/** autobyteus-646 R-11, R-12: the automatic switch's own checks and texts, then the commit primitive; never the person's Save. */
const CAUSE = { kind: "usage_limit" as const, resetAt: null, chosenBy: "agent_history" as const, reason: null };
const INPUT: AutomaticRuntimeSwitchInput = {
  agentRunId: "run-1",
  from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-sol" },
  launch: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
  cause: CAUSE,
};
const metadata = (extra: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: "run-1", agentDefinitionId: "operator", workspaceRootPath: "/work", memoryDir: "/memory/agents/run-1",
  llmModelIdentifier: "gpt-sol", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1", startedAt: "2026-11-27T00:00:00.000Z", ...extra,
} as AgentRunMetadata);

const switchOf = (input: Partial<{ metadata: AgentRunMetadata | null; archived: boolean; active: boolean; valid: boolean }> = {}) => {
  const commitRunRuntimeSwitch = vi.fn(async () => ({ kind: "committed" as const, metadata: metadata({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" }) }));
  const validate = vi.fn(async () => input.valid === false ? { kind: "model_unavailable" as const }
    : { kind: "valid" as const, selection: { llmModelIdentifier: "opus", llmConfig: { effort: "default" } }, continuation: "hand_over" as const });
  const automatic = new StandaloneAutomaticRuntimeSwitch({
    agentRunManager: { getActiveRun: () => (input.active ? {} : null) as never },
    metadataService: { readMetadataState: async () => (input.metadata === null ? { kind: "absent" } : { kind: "present", metadata: input.metadata ?? metadata() }) as never },
    historyCatalogService: { getCatalogRow: async () => ({ runId: "run-1", archivedAt: input.archived ? "2026-11-27T00:00:00.000Z" : null }) as never,
      commitRunRuntimeSwitch: commitRunRuntimeSwitch as never },
    modelSelectionValidator: { validate: validate as never },
  });
  return { automatic, commitRunRuntimeSwitch, validate };
};

describe("StandaloneAutomaticRuntimeSwitch", () => {
  it("commits the validated fresh selection with its continuation and cause through the commit primitive", async () => {
    const s = switchOf();
    await expect(s.automatic.check(INPUT)).resolves.toBeNull();
    await expect(s.automatic.commit(INPUT)).resolves.toMatchObject({ kind: "switched", metadata: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK } });
    expect(s.validate).toHaveBeenLastCalledWith(expect.objectContaining({ selection: { llmModelIdentifier: "opus", llmConfig: null },
      context: expect.objectContaining({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, handOver: "available" }) }));
    expect(s.commitRunRuntimeSwitch).toHaveBeenCalledWith({ runId: "run-1", switchId: expect.any(String),
      selection: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { effort: "default" }, continuation: "hand_over", cause: CAUSE } });
  });

  it("R-12: a run no longer on the failed launch, or with a switch pending, is already switched", async () => {
    await expect(switchOf({ metadata: metadata({ llmModelIdentifier: "gpt-other" }) }).automatic.check(INPUT)).resolves.toEqual({ kind: "already_switched" });
    const pending = metadata({ pendingRuntimeSwitch: { switchId: "sw", from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-sol", platformAgentRunId: null } } as never });
    const s = switchOf({ metadata: pending });
    await expect(s.automatic.commit(INPUT)).resolves.toEqual({ kind: "already_switched" });
    expect(s.commitRunRuntimeSwitch).not.toHaveBeenCalled();
  });

  it("a run another node delegated here switches too (CM-10): the person's Settings rule is not applied", async () => {
    const peer = metadata({ delegatedFrom: { nodeId: "node-a", delegatingRun: { kind: "agent", runId: "run-a" } } as never });
    await expect(switchOf({ metadata: peer }).automatic.commit(INPUT)).resolves.toMatchObject({ kind: "switched" });
  });

  it("its own refusals and texts: archived, not found, still running, a model that can't run", async () => {
    await expect(switchOf({ archived: true }).automatic.check(INPUT)).resolves.toEqual({ kind: "refused", reason: "the run was archived" });
    await expect(switchOf({ metadata: null }).automatic.check(INPUT)).resolves.toEqual({ kind: "refused", reason: "the run's record was not found" });
    await expect(switchOf({ active: true }).automatic.commit(INPUT)).resolves.toEqual({ kind: "refused", reason: "its agent is still running" });
    await expect(switchOf({ valid: false }).automatic.check(INPUT)).resolves.toEqual({ kind: "refused", reason: "opus can't run now: its runtime does not offer it" });
  });
});
