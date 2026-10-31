import { describe, expect, it, vi } from "vitest";
import { buildRuntimeSwitchMetadata, commitAgentRunRuntimeSwitch } from "../../../../src/run-history/services/agent-run-runtime-switch-commit.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const AT = "switch-1";
const stopped = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: "run-1", agentDefinitionId: "agent-1", workspaceRootPath: "/work", memoryDir: "/mem/run-1",
  llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, autoExecuteTools: true,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: "session-1", startedAt: "2026-10-29T09:00:00.000Z", ...overrides,
});
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null };

describe("the metadata a settings save of a stopped run writes (AC-001)", () => {
  it("a switch replaces the binding, drops the session and records the previous binding and the switch ID", () => {
    const next = buildRuntimeSwitchMetadata({ metadata: stopped(), selection: codex, switchId: AT });
    expect(next).toMatchObject({
      runId: "run-1", agentDefinitionId: "agent-1", workspaceRootPath: "/work", memoryDir: "/mem/run-1", startedAt: "2026-10-29T09:00:00.000Z",
      runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: null,
      pendingRuntimeSwitch: { switchId: AT, from: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "session-1" } },
    });
  });

  it("a second save before the first message keeps the first previous binding and the first switch ID", () => {
    const first = buildRuntimeSwitchMetadata({ metadata: stopped(), selection: codex, switchId: AT });
    const second = buildRuntimeSwitchMetadata({
      metadata: first, switchId: "switch-2",
      selection: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini", llmConfig: null },
    });
    expect(second).toMatchObject({ runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini", platformAgentRunId: null });
    expect(second.pendingRuntimeSwitch).toEqual(first.pendingRuntimeSwitch);
  });

  it("choosing the original agent runtime again is the undo: the original session comes back, the field is cleared, the chosen model is kept", () => {
    const pending = buildRuntimeSwitchMetadata({ metadata: stopped(), selection: codex, switchId: AT });
    const same = buildRuntimeSwitchMetadata({
      metadata: pending, switchId: AT,
      selection: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" } },
    });
    expect(same).toEqual(stopped());
    const otherModel = buildRuntimeSwitchMetadata({
      metadata: pending, switchId: AT,
      selection: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null },
    });
    expect(otherModel).toMatchObject({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, platformAgentRunId: "session-1" });
    expect(Object.hasOwn(otherModel, "pendingRuntimeSwitch")).toBe(false);
  });

  it("the run's own agent runtime is a model-only edit; a pending switch stays", () => {
    const edited = buildRuntimeSwitchMetadata({ metadata: stopped(), switchId: AT,
      selection: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null } });
    expect(edited).toEqual(stopped({ llmModelIdentifier: "opus", llmConfig: null }));
    const pending = buildRuntimeSwitchMetadata({ metadata: stopped(), selection: codex, switchId: AT });
    const model = buildRuntimeSwitchMetadata({ metadata: pending, switchId: AT,
      selection: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-6", llmConfig: null } });
    expect(model).toMatchObject({ llmModelIdentifier: "gpt-6", pendingRuntimeSwitch: pending.pendingRuntimeSwitch });
  });
});

describe("commitAgentRunRuntimeSwitch", () => {
  const store = (initial: AgentRunMetadata) => {
    let saved = initial;
    return { current: () => saved, readMetadata: vi.fn(async () => saved), writeMetadata: vi.fn(async (_id: string, next: AgentRunMetadata) => { saved = next; }) };
  };

  it("writes once and reads back; the same selection again is unchanged", async () => {
    const s = store(stopped());
    const input = { metadataStore: s, runId: "run-1", cataloged: true, archived: false, selection: codex, switchId: AT };
    expect((await commitAgentRunRuntimeSwitch(input)).kind).toBe("committed");
    expect(s.current().pendingRuntimeSwitch?.switchId).toBe(AT);
    expect((await commitAgentRunRuntimeSwitch(input)).kind).toBe("unchanged");
    expect(s.writeMetadata).toHaveBeenCalledTimes(1);
  });

  it("reports an unknown, an archived and a failed run as the model edit does", async () => {
    const base = { metadataStore: store(stopped()), runId: "run-1", selection: codex, switchId: AT };
    expect((await commitAgentRunRuntimeSwitch({ ...base, cataloged: false, archived: false })).kind).toBe("not_found");
    expect((await commitAgentRunRuntimeSwitch({ ...base, cataloged: true, archived: true })).kind).toBe("archived");
    const unreadable = { readMetadata: vi.fn().mockResolvedValueOnce(stopped()).mockResolvedValue(null), writeMetadata: vi.fn(async () => undefined) };
    expect((await commitAgentRunRuntimeSwitch({ ...base, metadataStore: unreadable, cataloged: true, archived: false })).kind).toBe("indeterminate");
  });

  it("recovers the committed state after a reported write failure that did land", async () => {
    let saved = stopped();
    const flaky = { readMetadata: vi.fn(async () => saved), writeMetadata: vi.fn(async (_id: string, next: AgentRunMetadata) => { saved = next; throw new Error("uncertain response"); }) };
    const result = await commitAgentRunRuntimeSwitch({ metadataStore: flaky, runId: "run-1", cataloged: true, archived: false, selection: codex, switchId: AT });
    expect(result).toMatchObject({ kind: "committed", metadata: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5" } });
  });

  it("does not confirm a write that did not land", async () => {
    const original = stopped();
    const lost = { readMetadata: vi.fn(async () => original), writeMetadata: vi.fn(async () => undefined) };
    const result = await commitAgentRunRuntimeSwitch({ metadataStore: lost, runId: "run-1", cataloged: true, archived: false, selection: codex, switchId: AT });
    expect(result.kind).toBe("failed");
  });

  it.each(["missing", "throws"])("keeps a %s read-back after a write indeterminate rather than confirming", async (mode) => {
    const original = stopped();
    const store2 = {
      readMetadata: vi.fn().mockResolvedValueOnce(original).mockImplementation(async () => { if (mode === "throws") throw new Error("read unavailable"); return null; }),
      writeMetadata: vi.fn(async () => undefined),
    };
    const result = await commitAgentRunRuntimeSwitch({ metadataStore: store2, runId: "run-1", cataloged: true, archived: false, selection: codex, switchId: AT });
    expect(result).toEqual({ kind: "indeterminate", metadata: original });
    expect(store2.writeMetadata).toHaveBeenCalledTimes(1);
  });
});
