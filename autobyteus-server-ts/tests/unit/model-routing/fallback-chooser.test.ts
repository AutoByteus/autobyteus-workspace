import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentLaunchHistoryEntry, RuntimeSwitchRequest } from "../../../src/model-routing/domain/runtime-switch-types.js";
import { FallbackChooser, HISTORY_CHOICE_REASON, historyPick, usableRuntimesNow } from "../../../src/model-routing/services/fallback-chooser.js";
import { nodeFacts } from "./model-routing-fixtures.js";

const NOW = new Date("2026-11-27T08:00:00.000Z");
const WHY = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", blockedModels: ["gpt-sol"], resetAt: null };

/** Exhausted: Codex gpt-sol (the event's model). */
const exhaustion = (exhausted: readonly string[] = ["codex_app_server/gpt-sol"]) => ({
  isExhausted: (runtimeKind: string, model: string) => exhausted.includes(`${runtimeKind}/${model}`) ? { until: "2026-11-27T09:00:00.000Z" } : null,
});

const entry = (runtimeKind: string, llmModelIdentifier: string, runs: number, lastUsedAt: string): AgentLaunchHistoryEntry =>
  ({ runtimeKind, llmModelIdentifier, runs, lastUsedAt });

const chooserOf = (input: Partial<{ history: AgentLaunchHistoryEntry[]; exhausted: string[]; answer: Awaited<ReturnType<FallbackChooser["choose"]>> | null }> = {}) => {
  const requestSwitch = vi.fn(async (_request: RuntimeSwitchRequest) => input.answer ?? { kind: "failed" as const, reason: "no valid answer within 40 seconds" });
  const chooser = new FallbackChooser({
    readNodeRuntimes: async () => nodeFacts({ signedOut: [] }),
    exhaustion: exhaustion(input.exhausted),
    history: { launchesOf: async () => input.history ?? [] },
    switchRecords: { recentOf: async () => [] },
    router: { requestSwitch: requestSwitch as never },
    now: () => NOW,
  });
  return { chooser, requestSwitch };
};

const request = { agentDefinitionId: "operator", agentName: "operator", agentDescription: null, why: WHY };

describe("usable runtimes now and the history pick (C-7, C-8)", () => {
  it("leaves out blocked and exhausted models and runtimes without a usable model", () => {
    expect(usableRuntimesNow(nodeFacts({ signedOut: [] }), exhaustion())).toEqual([
      { runtimeKind: "claude_agent_sdk", models: ["sonnet"] },
      { runtimeKind: "autobyteus", models: ["deepseek-chat"] },
    ]);
  });

  it("the runtime with the most usable runs (ties: most recent), with the model it last used there", () => {
    const usable = [{ runtimeKind: "claude_agent_sdk", models: ["sonnet", "opus"] }, { runtimeKind: "autobyteus", models: ["deepseek-chat"] }];
    expect(historyPick([
      entry("codex_app_server", "gpt-sol", 9, "2026-11-26T00:00:00.000Z"),
      entry("claude_agent_sdk", "opus", 2, "2026-11-20T00:00:00.000Z"),
      entry("claude_agent_sdk", "sonnet", 1, "2026-11-22T00:00:00.000Z"),
      entry("autobyteus", "deepseek-chat", 3, "2026-11-10T00:00:00.000Z"),
    ], usable)).toEqual({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" });
    expect(historyPick([
      entry("claude_agent_sdk", "opus", 2, "2026-11-20T00:00:00.000Z"),
      entry("autobyteus", "deepseek-chat", 2, "2026-11-21T00:00:00.000Z"),
    ], usable)).toEqual({ runtimeKind: "autobyteus", llmModelIdentifier: "deepseek-chat" });
    expect(historyPick([entry("codex_app_server", "gpt-sol", 9, "2026-11-26T00:00:00.000Z")], usable)).toBeNull();
  });
});

describe("FallbackChooser (DS-003, REQ-004)", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("Model Routing on: the router chooses, with the usable runtimes, history and earlier switches", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    const answer = { kind: "chosen" as const, launch: { runtimeKind: "autobyteus", llmModelIdentifier: "deepseek-chat" }, reason: "Cheap and fine." };
    const { chooser, requestSwitch } = chooserOf({ answer: answer as never, history: [entry("claude_agent_sdk", "sonnet", 1, "2026-11-22T00:00:00.000Z")] });
    await expect(chooser.choose(request)).resolves.toEqual({ kind: "chosen", launch: answer.launch, chosenBy: "model_router", reason: "Cheap and fine.", routerFailure: null });
    expect(requestSwitch.mock.calls[0]![0]).toMatchObject({ agentName: "operator", why: WHY, usable: [{ runtimeKind: "claude_agent_sdk" }, { runtimeKind: "autobyteus" }],
      history: [{ runtimeKind: "claude_agent_sdk" }], earlierSwitches: [] });
  });

  it("the router failing, off, or itself exhausted: history decides, with why the router did not", async () => {
    const history = [entry("claude_agent_sdk", "sonnet", 3, "2026-11-22T00:00:00.000Z")];
    const off = chooserOf({ history });
    await expect(off.chooser.choose(request)).resolves.toEqual({ kind: "chosen", launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" },
      chosenBy: "agent_history", reason: HISTORY_CHOICE_REASON, routerFailure: "Model Routing is off" });
    expect(off.requestSwitch).not.toHaveBeenCalled();
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    await expect(chooserOf({ history }).chooser.choose(request)).resolves.toMatchObject({ chosenBy: "agent_history", routerFailure: "no valid answer within 40 seconds" });
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_RUNTIME", "codex_app_server");
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_MODEL", "gpt-sol");
    const exhaustedRouter = chooserOf({ history });
    await expect(exhaustedRouter.chooser.choose(request)).resolves.toMatchObject({ chosenBy: "agent_history",
      routerFailure: "the Model Router's own runtime is exhausted until 2026-11-27T09:00:00.000Z" });
    expect(exhaustedRouter.requestSwitch).not.toHaveBeenCalled();
  });

  it("no fallback: nothing usable, or the router could not choose and history has nothing usable", async () => {
    const everything = ["claude_agent_sdk/sonnet", "autobyteus/deepseek-chat", "codex_app_server/gpt-sol"];
    await expect(chooserOf({ exhausted: everything }).chooser.choose(request)).resolves.toEqual({ kind: "no_fallback", routerFailure: null });
    await expect(chooserOf({ history: [entry("codex_app_server", "gpt-sol", 5, "2026-11-26T00:00:00.000Z")] }).chooser.choose(request))
      .resolves.toEqual({ kind: "no_fallback", routerFailure: "Model Routing is off" });
  });

  it("historyLaunch: the delegation's history layer", async () => {
    await expect(chooserOf({ history: [entry("claude_agent_sdk", "sonnet", 1, "2026-11-22T00:00:00.000Z")] }).chooser.historyLaunch("operator"))
      .resolves.toEqual({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" });
    await expect(chooserOf().chooser.historyLaunch("operator")).resolves.toBeNull();
  });
});
