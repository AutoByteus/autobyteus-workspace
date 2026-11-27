/**
 * autobyteus-646 R-11, R-12, R-15 (Agent root): `switchAgentRuntime` in the root's gate runs the automatic switch's own
 * checks first (still on the failed launch, no pending switch), stops the agent quietly (idle shutdown's stop, no person's
 * Stop), commits the switch, sets the root's own inherited launch from the committed metadata, then posts the continue
 * message, whose activation makes the switch real. Already switched or not quiet: nothing changes. A refusal: nothing is
 * posted.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRuntimeSwitchRequest } from "../../../src/agent-collaboration/execution/domain/agent-runtime-switch-request.js";
import type { AutomaticRuntimeSwitchResult } from "../../../src/agent-execution/services/standalone-automatic-runtime-switch.js";
import { HOST, buildManager, cleanupDirectories, metadata } from "./helpers/standalone-root-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const CONTINUE = "Continue the task where you left off.";
const CAUSE = { kind: "usage_limit" as const, resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "model_router" as const, reason: "Claude handled this agent's browser tasks well." };
const request = (): AgentRuntimeSwitchRequest => ({
  from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-host" },
  launch: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null },
  cause: CAUSE,
  notice: new AgentInputUserMessage(CONTINUE, SenderType.SYSTEM, null, { sender_id: "system.usage_limit" }),
});
const committed = metadata("/memory", { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, platformAgentRunId: null });

type Check = Exclude<AutomaticRuntimeSwitchResult, { kind: "switched" }> | null;
const switching = (input: Readonly<{ quiet?: boolean; check?: Check; result?: AutomaticRuntimeSwitchResult }> = {}) => {
  const order: string[] = [];
  const finish = vi.fn(async () => { order.push("stopped"); return { accepted: true as const }; });
  const agentRunManager = { tryPrepareAgentRunTerminationIfQuiescent: vi.fn(async () => { order.push("quiet?"); return input.quiet === false ? null : { commit: () => ({ finish }) }; }) };
  const automaticSwitch = {
    checkAutomaticRuntimeSwitch: vi.fn(async (_input: unknown): Promise<Check> => { order.push("checked"); return input.check ?? null; }),
    switchRuntimeAutomatically: vi.fn(async (_input: unknown): Promise<AutomaticRuntimeSwitchResult> => {
      order.push("committed");
      return input.result ?? { kind: "switched", metadata: committed };
    }),
  };
  return { order, agentRunManager, automaticSwitch };
};

describe("StandaloneAgentRunRoot.switchAgentRuntime", () => {
  it("checks, stops the agent quietly, commits, follows its own switch, then posts the continue message", async () => {
    const s = switching();
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    const follow = vi.spyOn(root, "setInheritedLaunch");
    h.host.run.postUserMessage.mockImplementation(async () => { s.order.push("posted"); return { accepted: true as const }; });
    h.restores.mockClear();
    s.agentRunManager.tryPrepareAgentRunTerminationIfQuiescent.mockImplementation(async () => {
      s.order.push("quiet?");
      return { commit: () => ({ finish: async () => { s.order.push("stopped"); h.host.crash(); return { accepted: true as const }; } }) } as never;
    });
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "switched" });
    expect(s.order).toEqual(["checked", "quiet?", "stopped", "committed", "posted"]);
    const input = { agentRunId: HOST, from: request().from, launch: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" }, cause: CAUSE };
    expect(s.automaticSwitch.checkAutomaticRuntimeSwitch).toHaveBeenCalledWith(input);
    expect(s.automaticSwitch.switchRuntimeAutomatically).toHaveBeenCalledWith(input);
    // R-15: the root's delegations now inherit the new launch.
    expect(follow).toHaveBeenCalledWith({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null,
      autoExecuteTools: true, workspaceRootPath: "/work" });
    // The continue message is the activation's input (the restored agent), never the failed input again.
    expect(h.restores).toHaveBeenCalledOnce();
    expect(h.host.run.postUserMessage.mock.calls.at(-1)![0]).toMatchObject({ content: CONTINUE });
  });

  it("R-12: an agent no longer on the failed launch is already switched: not stopped, nothing committed or posted", async () => {
    const s = switching({ check: { kind: "already_switched" } });
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "already_switched" });
    expect(s.order).toEqual(["checked"]);
    expect(h.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("an agent that is not quiet is left as it is: nothing committed, nothing posted", async () => {
    const s = switching({ quiet: false });
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "not_quiet" });
    expect(s.automaticSwitch.switchRuntimeAutomatically).not.toHaveBeenCalled();
    expect(h.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("a refusal fails with the switch's own reason and posts nothing; another agent's ID is refused", async () => {
    const s = switching({ check: { kind: "refused", reason: "the run was archived" } });
    const h = await buildManager(undefined, undefined, s);
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "failed", reason: "the run was archived" });
    expect(h.host.run.postUserMessage).not.toHaveBeenCalled();
    await expect(root.switchAgentRuntime("someone-else", request())).resolves.toEqual({ kind: "failed", reason: "it is not this run's agent" });
  });

  it("without a run manager the live agent can't be stopped quietly: the switch fails before anything changes", async () => {
    const h = await buildManager(undefined, undefined, { automaticSwitch: switching().automaticSwitch });
    const root = (await h.manager.resolveRoot(HOST))!;
    await root.ensureAgentReady();
    await expect(root.switchAgentRuntime(HOST, request())).resolves.toEqual({ kind: "failed", reason: "this run's agent cannot be stopped quietly" });
  });
});
