/**
 * autobyteus-646 R-1 (Agent root): `switchAgentRuntime` in the root's gate stops the agent quietly (idle shutdown's
 * stop, no person's Stop), saves the stopped selection with its cause (the pending switch), then posts the continue
 * message, whose activation makes the switch real. Not quiet: nothing changes. A refused save: nothing is posted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRuntimeSwitchRequest } from "../../../src/agent-collaboration/execution/domain/agent-runtime-switch-request.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const CONTINUE = "Your last turn stopped because Codex reached its usage limit. You now run on Claude (opus) and have your work journal. Continue the task where you left off.";
const request = (): AgentRuntimeSwitchRequest => ({
  launch: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null },
  cause: { kind: "usage_limit", resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "model_router", reason: "Claude handled this agent's browser tasks well." },
  notice: new AgentInputUserMessage(CONTINUE, SenderType.SYSTEM, null, { sender_id: "system.runtime_handover" }),
});

const switching = (quiet: boolean, saved: { success: boolean; message: string } = { success: true, message: "saved" }) => {
  const order: string[] = [];
  const finish = vi.fn(async () => { order.push("stopped"); return { accepted: true as const }; });
  const agentRunManager = { tryPrepareAgentRunTerminationIfQuiescent: vi.fn(async () => { order.push("quiet?"); return quiet ? { commit: () => ({ finish }) } : null; }) };
  const updateStoppedSelection = vi.fn(async () => { order.push("saved"); return saved; });
  return { order, agentRunManager, updateStoppedSelection };
};

describe("StandaloneAgentRunRoot.switchAgentRuntime", () => {
  it("stops the agent quietly, saves the launch with its cause, then posts the continue message as a system input", async () => {
    const s = switching(true);
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    h.host.run.postUserMessage.mockImplementation(async () => { s.order.push("posted"); return { accepted: true as const }; });
    h.restores.mockClear();
    // The quiet stop ends the live agent.
    s.agentRunManager.tryPrepareAgentRunTerminationIfQuiescent.mockImplementation(async () => {
      s.order.push("quiet?");
      return { commit: () => ({ finish: async () => { s.order.push("stopped"); h.host.crash(); return { accepted: true as const }; } }) } as never;
    });
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "switched" });
    expect(s.order).toEqual(["quiet?", "stopped", "saved", "posted"]);
    expect(s.updateStoppedSelection).toHaveBeenCalledWith({ agentRunId: HOST, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus",
      llmConfig: null, cause: request().cause });
    // The continue message is the activation's input (the restored agent), never the failed input again.
    expect(h.restores).toHaveBeenCalledOnce();
    expect(h.host.run.postUserMessage.mock.calls.at(-1)![0]).toMatchObject({ content: CONTINUE });
  });

  it("an agent that is not quiet is left as it is: nothing saved, nothing posted", async () => {
    const s = switching(false);
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "not_quiet" });
    expect(s.updateStoppedSelection).not.toHaveBeenCalled();
    expect(h.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("a refused save fails with its reason and posts nothing; another agent's ID is refused", async () => {
    const s = switching(true, { success: false, message: "Archived runs cannot be edited." });
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "failed", reason: "Archived runs cannot be edited." });
    expect(h.host.run.postUserMessage).not.toHaveBeenCalled();
    await expect(root.switchAgentRuntime("someone-else", request())).resolves.toEqual({ kind: "failed", reason: "it is not this run's agent" });
  });

  it("without a run manager the live agent can't be stopped quietly: the switch fails before anything changes", async () => {
    const h = await buildManager();
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "failed", reason: "this run's agent cannot be stopped quietly" });
  });
});
