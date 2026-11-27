/**
 * autobyteus-646 R-1 (Team root): one member of a live Team switches runtime in the root's gate. The member stops
 * quietly (its handle stays registered), its new launch and pending switch (with its cause, R-7) are committed into the
 * Team tree and stored, its handle's selection is swapped, then the continue message is posted to it. The other members
 * keep running. Real root, flat backend, manager and tree persistence; only the provider execution is a double.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRuntimeSwitchRequest } from "../../../src/agent-collaboration/execution/domain/agent-runtime-switch-request.js";
import { ROOT, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const CAUSE = { kind: "usage_limit" as const, resetAt: "2026-11-27T09:00:00.000Z", chosenBy: "agent_history" as const, reason: null };
const request = (): AgentRuntimeSwitchRequest => ({
  launch: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null },
  cause: CAUSE,
  notice: new AgentInputUserMessage("Continue the task where you left off.", SenderType.SYSTEM, null, { sender_id: "system.runtime_handover" }),
});
const userMessage = () => AgentInputUserMessage.fromDict({ content: "Start.", context_files: null,
  metadata: { input_origin: "user_message", message_id: "m-1", dedupe_key: "d-1" } });

/** A Team whose coordinator worked and failed (its turn ended in error), and whose worker runs. */
const failedCoordinator = async () => {
  const f = await harness({ withTeammate: true });
  await f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() });
  await f.root.executeAgentCommand("run-worker", { kind: "post_message", message: userMessage() });
  f.handles.get("run-coordinator")!.emit("error");
  return f;
};

describe("RootTeamRun.switchAgentRuntime", () => {
  it("stops the member quietly, commits its launch and pending switch with the cause, swaps its selection and posts the continue message", async () => {
    const f = await failedCoordinator();
    const coordinator = f.handles.get("run-coordinator")!;
    const worker = f.handles.get("run-worker")!;
    await expect(f.root.switchAgentRuntime("run-coordinator", request())).resolves.toEqual({ kind: "switched" });
    expect(coordinator.finish).toHaveBeenCalledOnce();
    const member = f.root.getExecutionTreeSnapshot().rootTeam.members.find((node) => node.agentRunId === "run-coordinator")!;
    expect(member.launchConfiguration).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" });
    expect(member.pendingRuntimeSwitch).toMatchObject({ from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER }, cause: CAUSE });
    const stored = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    expect(stored!.rootTeam.members.find((node) => node.agentRunId === "run-coordinator")!.pendingRuntimeSwitch).toEqual(member.pendingRuntimeSwitch);
    expect(coordinator.handle.replaceSelection).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", pendingRuntimeSwitch: member.pendingRuntimeSwitch }));
    expect((coordinator.handle.postMessage.mock.calls.at(-1) as unknown[])[0]).toMatchObject({ content: "Continue the task where you left off." });
    // The rest of the Team keeps running.
    expect(worker.finish).not.toHaveBeenCalled();
    expect(f.root.getExecutionTreeSnapshot().rootTeam.members.find((node) => node.agentRunId === "run-worker")!.pendingRuntimeSwitch).toBeUndefined();
  });

  it("a member still in its turn is not quiet: nothing is stopped, committed or posted", async () => {
    const f = await harness({ withTeammate: true });
    await f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() });
    const before = f.root.getExecutionTreeSnapshot();
    await expect(f.root.switchAgentRuntime("run-coordinator", request())).resolves.toEqual({ kind: "not_quiet" });
    expect(f.root.getExecutionTreeSnapshot()).toBe(before);
    expect(f.handles.get("run-coordinator")!.handle.replaceSelection).not.toHaveBeenCalled();
  });

  it("an agent that is not a member is refused", async () => {
    const f = await harness();
    await expect(f.root.switchAgentRuntime("run-stranger", request())).resolves.toEqual({ kind: "failed", reason: "it is not a configured member of this Team" });
  });

  it("restart consistency: after the commit the stored tree holds the new launch and pending switch, so the run restores with them", async () => {
    const f = await failedCoordinator();
    await f.root.switchAgentRuntime("run-coordinator", request());
    await f.root.terminate();
    const reopened = await f.reopen();
    const member = reopened.getExecutionTreeSnapshot().rootTeam.members.find((node) => node.agentRunId === "run-coordinator")!;
    expect(member.launchConfiguration.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
    expect(member.pendingRuntimeSwitch?.cause).toEqual(CAUSE);
  });
});
