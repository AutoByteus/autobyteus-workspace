import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelRouterAgent, KNOWLEDGE_TEXT_LIMIT_BYTES } from "../../../src/model-routing/services/model-router-agent.js";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

/** Fake agent runs: each created run is active and idle; its event listener is kept so the test can send status events. */
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "router-agent-")); dirs.push(root);
  const listeners = new Map<string, (event: unknown) => void>();
  const runs = new Map<string, unknown>();
  let created = 0;
  const active = new Map<string, boolean>();
  const makeRun = (runId: string) => ({
    runId, isActive: () => active.get(runId) ?? true, getStatusSnapshot: () => ({ status: "idle" }),
    subscribeToEvents: (listener: (event: unknown) => void) => { listeners.set(runId, listener); return () => listeners.delete(runId); },
  });
  const agentRuns = {
    createAgentRun: vi.fn(async () => { const runId = `router_${++created}`; runs.set(runId, makeRun(runId)); return { runId }; }),
    getAgentRun: vi.fn((runId: string) => (runs.get(runId) ?? null) as never),
    /** The platform's command-ready path: the live run, else its restore (a new run object); fails for an unknown run. */
    resolveCommandReadyAgentRun: vi.fn(async (runId: string) => {
      if (!runs.has(runId)) throw new Error(`Agent run '${runId}' not found.`);
      if (active.get(runId) === false) { active.delete(runId); runs.set(runId, makeRun(runId)); }
      return runs.get(runId) as never;
    }),
  };
  const agent = new ModelRouterAgent({
    agentRuns, stateDir: path.join(root, "model-routing"),
    internalWorkspaces: { pathFor: (id: string) => path.join(root, "internal-workspaces", id) },
  });
  return { root, agent, agentRuns, runs, listeners, active };
};

const CODEX = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol" };

describe("ModelRouterAgent (REQ-004, SR-012 point 3, AR-001)", () => {
  it("creates one run of the internal agent in its internal workspace: auto-approved, system-owned, no confinement (SR-018); reuses it while the launch is the same", async () => {
    const { root, agent, agentRuns, runs } = await setup();
    const first = await agent.ensureRun(CODEX);
    expect(agentRuns.createAgentRun).toHaveBeenCalledExactlyOnceWith({
      agentDefinitionId: "autobyteus-model-router",
      workspaceRootPath: path.join(root, "internal-workspaces", "autobyteus-model-router"),
      llmModelIdentifier: "gpt-sol", runtimeKind: "codex_app_server",
      autoExecuteTools: true, systemRunOwner: "model_router",
    });
    await expect(fs.stat(path.join(root, "internal-workspaces", "autobyteus-model-router"))).resolves.toBeTruthy();
    await expect(agent.storedRunId()).resolves.toBe("router_1");
    // Reused by its stored ID through the command-ready path.
    expect(await agent.ensureRun(CODEX)).toBe(first);
    expect(agentRuns.resolveCommandReadyAgentRun).toHaveBeenLastCalledWith("router_1");
    expect(agentRuns.createAgentRun).toHaveBeenCalledTimes(1);
  });

  it("a changed runtime or model starts a new run (the old one stays in history); a run that does not restore too", async () => {
    const { agent, agentRuns } = await setup();
    await agent.ensureRun(CODEX);
    await agent.ensureRun({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" });
    expect(agentRuns.createAgentRun).toHaveBeenCalledTimes(2);
    await expect(agent.storedRunId()).resolves.toBe("router_2");
    agentRuns.resolveCommandReadyAgentRun.mockRejectedValueOnce(new Error("history unreadable"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await agent.ensureRun({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" });
    await expect(agent.storedRunId()).resolves.toBe("router_3");
  });

  it("REQ-007, RSK-008: reads knowledge.md from its workspace, the first 16 KB, marking a longer file as cut", async () => {
    const { root, agent } = await setup();
    await expect(agent.readKnowledge()).resolves.toBeNull();
    const workspace = path.join(root, "internal-workspaces", "autobyteus-model-router");
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(path.join(workspace, "knowledge.md"), "- Use Antigravity for writing.\n");
    await expect(agent.readKnowledge()).resolves.toEqual({ text: "- Use Antigravity for writing.", truncated: false });
    await fs.writeFile(path.join(workspace, "knowledge.md"), "x".repeat(KNOWLEDGE_TEXT_LIMIT_BYTES + 10));
    await expect(agent.readKnowledge()).resolves.toMatchObject({ truncated: true, text: "x".repeat(KNOWLEDGE_TEXT_LIMIT_BYTES) });
  });

  it("SR-016: idle only while its run is idle with no input waiting; listeners hear every change", async () => {
    const { agent, listeners } = await setup();
    expect(agent.isIdle()).toBe(false);
    await agent.ensureRun(CODEX);
    expect(agent.isIdle()).toBe(true);
    const heard = vi.fn();
    agent.onIdleChange(heard);
    const emit = listeners.get("router_1")!;
    emit({ eventType: "AGENT_STATUS", payload: { status: "running" } });
    expect(agent.isIdle()).toBe(false);
    emit({ eventType: "AGENT_STATUS", payload: { status: "idle" } });
    emit({ eventType: "AGENT_INPUT_STATE", payload: { entries: [{ sequence: 1 }] } });
    expect(agent.isIdle()).toBe(false);
    emit({ eventType: "AGENT_INPUT_STATE", payload: { entries: [] } });
    expect(agent.isIdle()).toBe(true);
    expect(heard).toHaveBeenCalledTimes(4);
  });
});

describe("ModelRouterAgent after a failed turn (CRR-003 CR-005)", () => {
  it("a run whose runtime stopped is free for the next request, and the next ensureRun restores it (no new run)", async () => {
    const { agent, agentRuns, listeners, active } = await setup();
    const first = await agent.ensureRun(CODEX);
    const emit = listeners.get("router_1")!;
    emit({ eventType: "AGENT_STATUS", payload: { status: "running" } });
    expect(agent.isIdle()).toBe(false);
    // The turn fails and the runtime stops (Antigravity after a CLI error): status error, backend inactive.
    emit({ eventType: "AGENT_STATUS", payload: { status: "error" } });
    active.set("router_1", false);
    expect(agent.isIdle()).toBe(true);
    const restored = await agent.ensureRun(CODEX);
    expect(restored).not.toBe(first);
    expect(restored.isActive()).toBe(true);
    expect(agentRuns.createAgentRun).toHaveBeenCalledTimes(1);
    expect(agent.isIdle()).toBe(true);
  });

  it("an error status with the runtime still up is free too; input waiting is not", async () => {
    const { agent, listeners } = await setup();
    await agent.ensureRun(CODEX);
    const emit = listeners.get("router_1")!;
    emit({ eventType: "AGENT_STATUS", payload: { status: "error" } });
    expect(agent.isIdle()).toBe(true);
    emit({ eventType: "AGENT_INPUT_STATE", payload: { entries: [{ sequence: 2 }] } });
    expect(agent.isIdle()).toBe(false);
  });
});
