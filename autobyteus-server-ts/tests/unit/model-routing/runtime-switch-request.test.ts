import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentRunInputLifecycleObserver } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { MODEL_ROUTER_REQUEST_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { submitRuntimeSwitch, SUBMIT_RUNTIME_SWITCH_NOT_ROUTER } from "../../../src/agent-tools/model-routing/submit-runtime-switch-contract.js";
import type { RuntimeSwitchRequest } from "../../../src/model-routing/domain/runtime-switch-types.js";
import { ModelRouter } from "../../../src/model-routing/services/model-router.js";
import type { ModelRouterAgent } from "../../../src/model-routing/services/model-router-agent.js";
import type { ModelRouting } from "../../../src/model-routing/services/model-routing-binding.js";
import { ModelRoutingSessions } from "../../../src/model-routing/services/model-routing-sessions.js";
import { nodeFacts } from "./model-routing-fixtures.js";

/** A switch request for an agent whose Codex limit was reached; Claude and AutoByteus are usable. */
const switchRequest = (): RuntimeSwitchRequest => ({
  agentName: "computer use operator",
  agentDescription: "Operates a browser.",
  why: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", blockedModels: ["gpt-sol", "gpt-mini"], resetAt: "2026-11-27T09:00:00.000Z" },
  usable: [{ runtimeKind: "claude_agent_sdk", models: ["sonnet", "opus"] }, { runtimeKind: "autobyteus", models: ["deepseek-chat"] }],
  history: [{ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", runs: 4, lastUsedAt: "2026-11-20T10:00:00.000Z" }],
  earlierSwitches: [{ at: "2026-11-25T06:43:05.000Z", agentRunId: "run-a", agentDefinitionId: "computer-use-operator",
    from: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" }, to: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" },
    chosenBy: "model_router", reason: "Claude handled its browser tasks well.", routerFailure: null, outcome: "switched" }],
});

describe("switch sessions and submit_runtime_switch (autobyteus-646 C-7)", () => {
  it("accepts a usable runtime and model with a reason; corrects anything else; a closed request changes nothing", async () => {
    const sessions = new ModelRoutingSessions(undefined, () => "sw_1");
    const open = sessions.openSwitchSession(switchRequest());
    expect(open.requestId).toBe("sw_1");
    expect(sessions.submitSwitch("sw_1", { runtime: "codex_app_server", model: "gpt-sol", reason: "x" })).toMatchObject({ accepted: false,
      message: expect.stringContaining("codex_app_server is not usable now; choose one of: claude_agent_sdk, autobyteus.") });
    expect(sessions.submitSwitch("sw_1", { runtime: "claude_agent_sdk", model: "haiku" })).toMatchObject({ accepted: false,
      message: expect.stringMatching(/haiku is not usable on claude_agent_sdk now; choose one of: sonnet, opus\.\n- a one-sentence reason is required\./) });
    expect(sessions.submitSwitch("sw_1", { runtime: "claude_agent_sdk", model: "opus", reason: " It worked before. " }))
      .toEqual({ accepted: true, message: "Accepted: switch request sw_1 continues on claude_agent_sdk · opus." });
    await expect(open.outcome).resolves.toEqual({ kind: "chosen", launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" }, reason: "It worked before." });
    expect(sessions.submitSwitch("sw_1", { runtime: "claude_agent_sdk", model: "sonnet", reason: "Again." })).toMatchObject({ accepted: false,
      message: "Switch request sw_1 is no longer open (answered or timed out); nothing was changed." });
  });

  it("the tool answers only for the node's Model Router agent's run", async () => {
    const sessions = new ModelRoutingSessions(undefined, () => "sw_1");
    const open = sessions.openSwitchSession(switchRequest());
    const routing = { sessions, agent: { storedRunId: async () => "router_run_1" } } as unknown as ModelRouting;
    await expect(submitRuntimeSwitch("other_run", { requestId: "sw_1", runtime: "claude_agent_sdk", model: "opus", reason: "r" }, routing))
      .resolves.toEqual({ text: SUBMIT_RUNTIME_SWITCH_NOT_ROUTER, isError: true });
    await expect(submitRuntimeSwitch("router_run_1", { runtime: "claude_agent_sdk" }, routing))
      .resolves.toEqual({ text: "requestId is required; nothing was changed.", isError: true });
    await expect(submitRuntimeSwitch("router_run_1", { requestId: "sw_1", runtime: "claude_agent_sdk", model: "opus", reason: "r" }, routing))
      .resolves.toMatchObject({ isError: false });
    await expect(open.outcome).resolves.toMatchObject({ kind: "chosen" });
  });
});

type Behaviour = "answer" | "silent_turn";

const fakeAgent = (sessions: ModelRoutingSessions, behaviour: Behaviour) => {
  let idle = true;
  const listeners = new Set<() => void>();
  const setIdle = (value: boolean) => { idle = value; listeners.forEach((listener) => listener()); };
  const posted: { text: string; senderId: unknown }[] = [];
  const run = {
    runId: "router_run_1",
    publishEvent: vi.fn(async () => undefined),
    postUserMessage: vi.fn(async (message: { content: string; metadata: Record<string, unknown> }, options: { lifecycleObserver?: AgentRunInputLifecycleObserver }) => {
      const requestId = /^Switch request (\S+)\./.exec(message.content)![1]!;
      posted.push({ text: message.content, senderId: message.metadata.sender_id });
      setIdle(false);
      queueMicrotask(() => {
        options.lifecycleObserver?.({ kind: "forwarded", acceptedAt: "2026-11-27T08:00:00.000Z", dispatchKind: "start_turn", turnId: "turn_1" });
        if (behaviour === "answer") sessions.submitSwitch(requestId, { runtime: "claude_agent_sdk", model: "opus", reason: "Claude worked well for it." });
        options.lifecycleObserver?.({ kind: "completed", turnId: "turn_1" });
        setIdle(true);
      });
      return { accepted: true, turnId: null };
    }),
  };
  const agent = {
    ensureRun: vi.fn(async () => run),
    readKnowledge: vi.fn(async () => ({ text: "- Claude is good at browsers.", truncated: false })),
    storedRunId: vi.fn(async () => "router_run_1"),
    isIdle: () => idle,
    onIdleChange: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { agent: agent as unknown as ModelRouterAgent, posted };
};

const routerOf = (behaviour: Behaviour = "answer") => {
  const sessions = new ModelRoutingSessions(undefined, () => "sw_1");
  const fake = fakeAgent(sessions, behaviour);
  return { router: new ModelRouter({ agent: fake.agent, sessions, statistics: { taskKindsInUse: async () => [] }, readNodeRuntimes: async () => nodeFacts() }), ...fake };
};

describe("ModelRouter.requestSwitch (C-7)", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("Model Routing off, or the router not active: failed with the reason, nothing posted", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "false");
    const off = routerOf();
    await expect(off.router.requestSwitch(switchRequest())).resolves.toEqual({ kind: "failed", reason: "Model Routing is off" });
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    await expect(off.router.requestSwitch(switchRequest())).resolves.toEqual({ kind: "failed", reason: "the Model Router is not active (the router has no runtime/model)" });
    expect(off.posted).toHaveLength(0);
  });

  it("posts one switch request as a system notice and returns the router's checked answer", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_RUNTIME", "claude_agent_sdk");
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_MODEL", "sonnet");
    const { router, posted } = routerOf();
    await expect(router.requestSwitch(switchRequest())).resolves.toEqual({ kind: "chosen",
      launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" }, reason: "Claude worked well for it." });
    expect(posted).toHaveLength(1);
    expect(posted[0]!.senderId).toBe(MODEL_ROUTER_REQUEST_SENDER_ID);
    const text = posted[0]!.text;
    expect(text).toMatch(/^Switch request sw_1\. .*submit_runtime_switch \(requestId "sw_1"\)/);
    expect(text).toContain("Agent: computer use operator: Operates a browser.");
    expect(text).toContain("Why: its usage limit was reached on codex_app_server / gpt-sol; it resets 2026-11-27 09:00 UTC (also blocked: gpt-mini).");
    expect(text).toContain("- claude_agent_sdk: sonnet, opus");
    expect(text).toContain("This agent's launches in the last 30 days: claude_agent_sdk / opus (4 runs, last 2026-11-20).");
    expect(text).toContain("- 2026-11-25 06:43 UTC: codex_app_server / gpt-sol → claude_agent_sdk / opus, chosen by you: Claude handled its browser tasks well. (switched)");
    expect(text).toContain("Your knowledge.md:\n- Claude is good at browsers.");
  });

  it("a turn that ends without an answer fails the request", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_RUNTIME", "claude_agent_sdk");
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_MODEL", "sonnet");
    await expect(routerOf("silent_turn").router.requestSwitch(switchRequest()))
      .resolves.toEqual({ kind: "failed", reason: "the Model Router's turn ended without a decision" });
  });
});
