import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentRunInputLifecycleObserver } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { MODEL_ROUTER_REQUEST_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { ModelRouter } from "../../../src/model-routing/services/model-router.js";
import type { ModelRouterAgent } from "../../../src/model-routing/services/model-router-agent.js";
import { ModelRoutingSessions } from "../../../src/model-routing/services/model-routing-sessions.js";
import { nodeFacts, routingRequest, validChoices } from "./model-routing-fixtures.js";

type Behaviour = "answer" | "silent" | "fail_turn";

/**
 * A fake Model Router agent: its run takes each posted request in its own turn and answers through the sessions (as
 * `submit_launch_choices` would), stays silent, or fails the turn. Idle while no turn runs.
 */
const fakeAgent = (sessions: ModelRoutingSessions, behaviour: Behaviour = "answer") => {
  let idle = true;
  const listeners = new Set<() => void>();
  const setIdle = (value: boolean) => { idle = value; listeners.forEach((listener) => listener()); };
  const posted: { requestId: string; text: string; senderId: unknown }[] = [];
  const run = {
    runId: "router_run_1",
    publishEvent: vi.fn(async () => undefined),
    postUserMessage: vi.fn(async (message: { content: string; metadata: Record<string, unknown> }, options: { lifecycleObserver?: AgentRunInputLifecycleObserver }) => {
      const requestId = /^Routing request (\S+)\./.exec(message.content)![1]!;
      posted.push({ requestId, text: message.content, senderId: message.metadata.sender_id });
      setIdle(false);
      queueMicrotask(() => {
        options.lifecycleObserver?.({ kind: "forwarded", dispatchKind: "start_turn", turnId: `turn_${posted.length}` });
        if (behaviour === "answer") {
          sessions.submit(requestId, validChoices());
          options.lifecycleObserver?.({ kind: "completed", turnId: `turn_${posted.length}` });
          setIdle(true);
        } else if (behaviour === "fail_turn") {
          options.lifecycleObserver?.({ kind: "failed", code: "PROVIDER_ERROR", message: "rate limited", turnId: null });
          setIdle(true);
        }
      });
      return { accepted: true, turnId: null };
    }),
  };
  const agent = {
    ensureRun: vi.fn(async () => run),
    readKnowledge: vi.fn(async () => ({ text: "- Use Antigravity for writing.", truncated: false })),
    storedRunId: vi.fn(async () => "router_run_1"),
    isIdle: () => idle,
    onIdleChange: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { agent: agent as unknown as ModelRouterAgent, run, posted };
};

const setup = (behaviour: Behaviour = "answer", facts = nodeFacts()) => {
  const sessions = new ModelRoutingSessions((() => { let n = 0; return () => `req_${++n}`; })());
  const fake = fakeAgent(sessions, behaviour);
  const router = new ModelRouter({
    agent: fake.agent, sessions,
    statistics: { taskKindsInUse: async () => [{ taskKind: "implementation", count: 41 }, { taskKind: "code review", count: 17 }] },
    readNodeRuntimes: async () => facts,
  });
  return { router, ...fake };
};

const turnOn = (runtime = "codex_app_server", model = "gpt-sol") => {
  vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
  vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_RUNTIME", runtime);
  vi.stubEnv("AUTOBYTEUS_MODEL_ROUTER_MODEL", model);
};

describe("ModelRouter (DS-003)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("REQ-002: Model Routing off: no delegation routing and nothing read; the status says OFF", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "false");
    const read = vi.fn();
    const router = new ModelRouter({ agent: fakeAgent(new ModelRoutingSessions()).agent, sessions: new ModelRoutingSessions(),
      statistics: { taskKindsInUse: async () => [] }, readNodeRuntimes: read });
    await expect(router.openDelegation()).resolves.toBeNull();
    expect(read).not.toHaveBeenCalled();
    await expect(router.status()).resolves.toMatchObject({ enabled: false, active: false, reasonCode: "OFF" });
  });

  it("supplement § 4: on but not set, signed out, not offered or blocked: not active, with the reason code and text", async () => {
    vi.stubEnv("AUTOBYTEUS_MODEL_ROUTING_ENABLED", "true");
    const notSet = await setup().router.openDelegation();
    expect(notSet).toMatchObject({ notActiveReason: "the router has no runtime/model" });
    await expect(notSet!.route(routingRequest())).resolves.toEqual({ kind: "not_active", reason: "the router has no runtime/model" });
    await expect(setup().router.status()).resolves.toMatchObject({ enabled: true, active: false, reasonCode: "ROUTER_NOT_SET" });
    turnOn("antigravity_cli", "gemini");
    await expect(setup().router.status()).resolves.toMatchObject({ reasonCode: "SIGNED_OUT", reasonText: "Antigravity is signed out" });
    turnOn("claude_agent_sdk", "opus");
    await expect(setup().router.status()).resolves.toMatchObject({ reasonCode: "MODEL_NOT_OFFERED" });
    turnOn("codex_app_server", "gpt-sol");
    await expect(setup("answer", nodeFacts({ codexBlocked: true })).router.status()).resolves.toMatchObject({
      active: false, reasonCode: "MODEL_BLOCKED", reasonParams: { until: "2026-10-30T20:57:00.000Z", limit: "weekly" },
      reasonText: "Codex · gpt-sol is blocked until 2026-10-30 20:57 UTC (weekly)",
    });
    await expect(setup().router.status()).resolves.toMatchObject({ active: true, reasonCode: null, agentRunId: "router_run_1" });
  });

  it("routes one request through the agent's run: a system notice with the Task, agents, task kinds and knowledge, answered by the tool", async () => {
    turnOn();
    const { router, posted, run } = setup();
    const routing = await router.openDelegation();
    expect(routing).toMatchObject({ notActiveReason: null, facts: expect.anything() });
    await expect(routing!.route(routingRequest())).resolves.toMatchObject({ kind: "chosen", choices: [
      { address: "/set/implementation_engineer", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", taskKind: "implementation" },
      { address: "/set/code_reviewer", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" },
    ] });
    expect(posted).toHaveLength(1);
    expect(posted[0]!.senderId).toBe(MODEL_ROUTER_REQUEST_SENDER_ID);
    const text = posted[0]!.text;
    expect(text).toContain('Task autobyteus-303: "Agent runtimes tool"');
    expect(text).toContain("- /set/implementation_engineer — implementation engineer: Engineer: Implements the design. (must stay on codex_app_server)");
    expect(text).toContain("Already set: /set/solution_designer → claude_agent_sdk / sonnet (agent default)");
    expect(text).toContain("Task kinds used here so far (reuse one when it fits): implementation (41), code review (17).");
    expect(text).toContain("Your knowledge.md:\n- Use Antigravity for writing.");
    // The request shows in the agent's conversation as a system notice once it is forwarded.
    expect(run.publishEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "SYSTEM_TASK_NOTIFICATION",
      payload: expect.objectContaining({ sender_id: MODEL_ROUTER_REQUEST_SENDER_ID, turn_id: "turn_1" }) }));
  });

  it("QR-001: no valid answer within 40 s is a router failure", async () => {
    vi.useFakeTimers();
    turnOn();
    const { router } = setup("silent");
    const routing = await router.openDelegation();
    const outcome = routing!.route(routingRequest());
    await vi.advanceTimersByTimeAsync(40_000);
    await expect(outcome).resolves.toEqual({ kind: "failed", reason: "no valid answer within 40 seconds" });
  });

  it("SR-012: the turn carrying the request fails, so the routing fails at once with that reason", async () => {
    turnOn();
    const { router } = setup("fail_turn");
    const routing = await router.openDelegation();
    await expect(routing!.route(routingRequest())).resolves.toEqual({ kind: "failed", reason: "the Model Router's turn failed (rate limited)" });
  });

  it("AC-006: three delegations at once each get their choices, one routing request per turn, in arrival order", async () => {
    turnOn();
    const { router, posted, run } = setup();
    const outcomes = await Promise.all([1, 2, 3].map(async () => (await router.openDelegation())!.route(routingRequest())));
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["chosen", "chosen", "chosen"]);
    expect(posted.map((entry) => entry.requestId)).toEqual(["req_1", "req_2", "req_3"]);
    expect(run.postUserMessage).toHaveBeenCalledTimes(3);
  });

  it("SR-016: a request that waits past its budget behind a busy run is never sent: 'the Model Router was busy'", async () => {
    vi.useFakeTimers();
    turnOn();
    const { router, posted } = setup("silent");
    const first = (await router.openDelegation())!.route(routingRequest());
    await vi.advanceTimersByTimeAsync(10_000);
    const second = (await router.openDelegation())!.route(routingRequest());
    await vi.advanceTimersByTimeAsync(40_000);
    await expect(first).resolves.toEqual({ kind: "failed", reason: "no valid answer within 40 seconds" });
    await expect(second).resolves.toEqual({ kind: "failed", reason: "the Model Router was busy" });
    expect(posted).toHaveLength(1);
  });
});

describe("ModelRouter with the real ModelRouterAgent: a failed router turn (CRR-003 CR-005, MR-09)", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("the turn fails and the runtime stops; the next routing is posted to the restored run and answered (not 'busy')", async () => {
    turnOn();
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const { ModelRouterAgent: RealAgent } = await import("../../../src/model-routing/services/model-router-agent.js");
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "router-failed-turn-"));
    try {
      const sessions = new ModelRoutingSessions((() => { let n = 0; return () => `req_${++n}`; })());
      /** One run object per activation: the first fails its turn and stops (as Antigravity after a CLI error); a restored one answers. */
      let activations = 0;
      const posted: string[] = [];
      const makeRun = (runId: string) => {
        const attempt = ++activations;
        let active = true;
        const listeners = new Set<(event: unknown) => void>();
        const emit = (event: unknown) => listeners.forEach((listener) => listener(event));
        return {
          runId, isActive: () => active, getStatusSnapshot: () => ({ status: "idle" }),
          subscribeToEvents: (listener: (event: unknown) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
          publishEvent: vi.fn(async () => undefined),
          postUserMessage: vi.fn(async (message: { content: string }, options: { lifecycleObserver?: AgentRunInputLifecycleObserver }) => {
            const requestId = /^Routing request (\S+)\./.exec(message.content)![1]!;
            posted.push(`${attempt}:${requestId}`);
            queueMicrotask(() => {
              emit({ eventType: "AGENT_STATUS", payload: { status: "running" } });
              options.lifecycleObserver?.({ kind: "forwarded", dispatchKind: "start_turn", turnId: `turn_${attempt}` });
              if (attempt === 1) {
                emit({ eventType: "AGENT_STATUS", payload: { status: "error" } });
                active = false;
                options.lifecycleObserver?.({ kind: "failed", code: "AGY_PROCESS_ERROR", message: "Antigravity runtime stopped unexpectedly.", turnId: `turn_${attempt}` });
              } else {
                sessions.submit(requestId, validChoices());
                options.lifecycleObserver?.({ kind: "completed", turnId: `turn_${attempt}` });
                emit({ eventType: "AGENT_STATUS", payload: { status: "idle" } });
              }
            });
            return { accepted: true, turnId: null };
          }),
        };
      };
      let current: ReturnType<typeof makeRun> | null = null;
      const agentRuns = {
        createAgentRun: vi.fn(async () => { current = makeRun("router_run_1"); return { runId: "router_run_1" }; }),
        getAgentRun: vi.fn(() => (current && current.isActive() ? current : null) as never),
        resolveCommandReadyAgentRun: vi.fn(async () => { if (!current!.isActive()) current = makeRun("router_run_1"); return current as never; }),
      };
      const agent = new RealAgent({ agentRuns, stateDir: path.join(root, "model-routing"),
        internalWorkspaces: { pathFor: (id: string) => path.join(root, "internal-workspaces", id) } });
      const router = new ModelRouter({ agent, sessions, statistics: { taskKindsInUse: async () => [] }, readNodeRuntimes: async () => nodeFacts() });

      await expect((await router.openDelegation())!.route(routingRequest())).resolves.toEqual({ kind: "failed", reason: "the Model Router's turn failed (Antigravity runtime stopped unexpectedly.)" });
      const startedAt = Date.now();
      await expect((await router.openDelegation())!.route(routingRequest())).resolves.toMatchObject({ kind: "chosen" });
      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(posted).toEqual(["1:req_1", "2:req_2"]);
      expect(agentRuns.createAgentRun).toHaveBeenCalledTimes(1);
      expect(agentRuns.resolveCommandReadyAgentRun).toHaveBeenCalled();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
