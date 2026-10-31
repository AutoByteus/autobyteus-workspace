import { describe, expect, it, vi } from "vitest";
import { StandaloneStoppedRunSelectionUpdater } from "../../../src/agent-execution/services/standalone-stopped-run-selection-updater.js";
import { canSwitchRuntime } from "../../../src/agent-execution/services/standalone-agent-run-eligibility.js";
import { selectionContextFor } from "../../../src/agent-execution/services/stopped-run-selection-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const stopped = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: "run-1", agentDefinitionId: "agent-1", workspaceRootPath: "/work", memoryDir: "/mem/run-1", llmModelIdentifier: "sonnet", llmConfig: null,
  autoExecuteTools: false, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: "session-1", startedAt: "2026-10-29T09:00:00.000Z", ...overrides,
});
const input = (runtimeKind: RuntimeKind, llmModelIdentifier = "gpt-5") => ({ agentRunId: "run-1", runtimeKind, llmModelIdentifier, llmConfig: null });

const updater = (metadata: AgentRunMetadata, options: { active?: boolean; archived?: boolean; validation?: unknown; committed?: unknown } = {}) => {
  const validate = vi.fn(async ({ selection }: { selection: unknown }) => options.validation ?? { kind: "valid", selection });
  const commitRunRuntimeSwitch = vi.fn(async () => options.committed ?? { kind: "committed", metadata: { ...metadata, runtimeKind: RuntimeKind.CODEX_APP_SERVER, pendingRuntimeSwitch: { requestedAt: "x", from: {} } } });
  const instance = new StandaloneStoppedRunSelectionUpdater({
    agentRunManager: { getActiveRun: vi.fn(() => options.active ? ({} as never) : null) },
    metadataService: { readMetadataState: vi.fn(async () => ({ kind: "present" as const, metadata })) },
    historyCatalogService: { getCatalogRow: vi.fn(async () => ({ archivedAt: options.archived ? "2026-10-01T00:00:00.000Z" : null })), commitRunRuntimeSwitch } as never,
    modelSelectionValidator: { validate, validateMany: vi.fn() } as never,
  });
  return { instance, validate, commitRunRuntimeSwitch };
};

describe("which stopped runs may switch their agent runtime (REQ-013)", () => {
  it("a started standalone Agent run may; a prepared run, a delegated copy, an application-owned and a system-owned run may not", () => {
    expect(canSwitchRuntime(stopped())).toBe(true);
    expect(canSwitchRuntime(stopped({ startedAt: null, preparedAt: "2026-10-29T08:00:00.000Z" }))).toBe(false);
    expect(canSwitchRuntime(stopped({ delegatedFrom: { nodeId: "n", coordinatingRun: { kind: "agent", runId: "r" }, delegatorAgentRunId: "d" } }))).toBe(false);
    expect(canSwitchRuntime(stopped({ applicationExecutionContext: { applicationId: "app" } as never }))).toBe(false);
    expect(canSwitchRuntime(stopped({ systemRunOwner: "model_router" }))).toBe(false);
  });
});

describe("the selection context (a fresh selection of another agent runtime)", () => {
  it("keeps the stored model as the current one only on the run's own agent runtime", () => {
    expect(selectionContextFor(stopped(), { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK })).toEqual({
      runtimeKind: "claude_agent_sdk", currentModelIdentifier: "sonnet", workspaceRootPath: "/work" });
    expect(selectionContextFor(stopped(), { runtimeKind: RuntimeKind.CODEX_APP_SERVER })).toEqual({
      runtimeKind: "codex_app_server", currentModelIdentifier: null, workspaceRootPath: "/work" });
  });
});

describe("StandaloneStoppedRunSelectionUpdater (AC-001)", () => {
  it("a switch validates the pair as a fresh selection of the new agent runtime and records the pending switch", async () => {
    const { instance, validate, commitRunRuntimeSwitch } = updater(stopped());
    const result = await instance.update("run-1", input(RuntimeKind.CODEX_APP_SERVER));
    expect(validate).toHaveBeenCalledWith({
      context: { runtimeKind: "codex_app_server", currentModelIdentifier: null, workspaceRootPath: "/work" },
      selection: { llmModelIdentifier: "gpt-5", llmConfig: null },
    });
    expect(commitRunRuntimeSwitch).toHaveBeenCalledWith({ runId: "run-1", selection: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null } });
    expect(result).toMatchObject({ success: true, outcome: "UPDATED", message: expect.stringContaining("next message") });
  });

  it("a model-only edit on the run's own agent runtime validates against the stored model as before", async () => {
    const { instance, validate } = updater(stopped(), { committed: { kind: "committed", metadata: stopped({ llmModelIdentifier: "opus" }) } });
    const result = await instance.update("run-1", input(RuntimeKind.CLAUDE_AGENT_SDK, "opus"));
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({ context: { runtimeKind: "claude_agent_sdk", currentModelIdentifier: "sonnet", workspaceRootPath: "/work" } }));
    expect(result).toMatchObject({ success: true, outcome: "UPDATED", message: expect.stringContaining("Model settings updated") });
  });

  it("choosing the original agent runtime again says the change was cancelled", async () => {
    const pending = stopped({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, pendingRuntimeSwitch: {
      requestedAt: "2026-10-30T10:00:00.000Z",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: "session-1" } } });
    const { instance } = updater(pending, { committed: { kind: "committed", metadata: stopped() } });
    expect(await instance.update("run-1", input(RuntimeKind.CLAUDE_AGENT_SDK, "sonnet"))).toMatchObject({ success: true, message: "The agent runtime change was cancelled." });
  });

  it.each([
    ["a prepared run", stopped({ startedAt: null, preparedAt: "2026-10-29T08:00:00.000Z" })],
    ["a delegated copy", stopped({ delegatedFrom: { nodeId: "n", coordinatingRun: { kind: "agent", runId: "r" }, delegatorAgentRunId: "d" } })],
    ["an application-owned run", stopped({ applicationExecutionContext: { applicationId: "app" } as never })],
    ["a system-owned run", stopped({ systemRunOwner: "model_router" })],
  ])("rejects a switch for %s, changes nothing and says why", async (_name, metadata) => {
    const { instance, validate, commitRunRuntimeSwitch } = updater(metadata);
    const result = await instance.update("run-1", input(RuntimeKind.CODEX_APP_SERVER));
    expect(result).toMatchObject({ success: false, outcome: "VALIDATION_FAILED", message: expect.stringContaining("cannot change its agent runtime") });
    expect(result.fieldErrors).toEqual([expect.objectContaining({ path: "runtimeKind" })]);
    expect(validate).not.toHaveBeenCalled();
    expect(commitRunRuntimeSwitch).not.toHaveBeenCalled();
  });

  it("an unavailable model of the new agent runtime changes nothing", async () => {
    const { instance, commitRunRuntimeSwitch } = updater(stopped(), { validation: { kind: "model_unavailable" } });
    expect(await instance.update("run-1", input(RuntimeKind.CODEX_APP_SERVER))).toMatchObject({ success: false, outcome: "MODEL_UNAVAILABLE" });
    expect(commitRunRuntimeSwitch).not.toHaveBeenCalled();
  });

  it("a running or an archived run is not edited at all", async () => {
    expect(await updater(stopped(), { active: true }).instance.update("run-1", input(RuntimeKind.CODEX_APP_SERVER))).toMatchObject({ outcome: "RUN_ACTIVE" });
    expect(await updater(stopped(), { archived: true }).instance.update("run-1", input(RuntimeKind.CODEX_APP_SERVER))).toMatchObject({ outcome: "RUN_ARCHIVED" });
  });
});
