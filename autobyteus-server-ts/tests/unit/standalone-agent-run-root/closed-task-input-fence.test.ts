import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgentRunIds } from "../../helpers/run-agents-reader.js";
import { HOST, buildManager, cleanupDirectories, metadata } from "./helpers/standalone-root-harness.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import fs from "node:fs/promises";
import path from "node:path";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

/**
 * autobyteus-461 DS-15 (SR-070, G-4): the user's message to a delegated agent run whose Task is closed. It is refused with
 * base's text before the run's root is resolved or restored: no root is registered in the `ActiveCollaborationRootDirectory`,
 * the agent is not activated (so no status reaches the delegator's view or the list), and no stream is bound. A loaded
 * root refuses at its gate head. After the assigner reopens and continues it, the user's message is delivered; a run whose
 * Task was deleted takes it.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const refused = { kind: "refused", refusal: { accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "Your Task is DONE or CANCELLED, so you can't start new work." } };

const delegatedHost = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (run) => run.rootRunId === HOST ? [HOST] : null));
  tree.build();
  tasks.setEntriesListener(tree);
  tasks.addTask("T1");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/research_assistant",
    delegatedFrom: { delegatingRun: createAgentRootExecutionIdentity("manager"), delegatorAgentRunId: "manager" }, execution: { agentRunId: HOST } });
  await tasks.markStarted({ agentRunId: HOST });
  const f = await buildManager(tasks, tree);
  // Its saved conversation, as its work packet left it (CR-461-070 restores only a run whose conversation can continue).
  const tracesPath = new RunMemoryFileStore(path.join(f.memoryDir, "agents", HOST)).getRawTracesPath();
  await fs.mkdir(path.dirname(tracesPath), { recursive: true });
  await fs.writeFile(tracesPath, `${JSON.stringify({ trace_type: "user", content: "Your Task: research it.", turn_id: "t1", seq: 1, ts: 1 })}\n`);
  const registrations: boolean[] = [];
  f.directory.onRegistrationChanged(createAgentRootExecutionIdentity(HOST), (registered) => registrations.push(registered));
  const onActiveRunReady = vi.fn();
  const post = () => f.manager.postUserMessage({ runId: HOST, message: new AgentInputUserMessage("Are you there?"), postOptions: {}, onActiveRunReady });
  return { ...f, tasks, registrations, onActiveRunReady, post, tracesPath };
};

describe("DS-15: the user's message to a closed delegated agent run", () => {
  it("is refused before its root is resolved or restored: nothing registers, activates or binds", async () => {
    const f = await delegatedHost();
    f.tasks.close("T1");
    await expect(f.manager.inputRefusal(HOST)).resolves.toEqual(refused.refusal);
    await expect(f.post()).resolves.toEqual(refused);
    expect(f.registrations).toEqual([]);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    expect(f.restores).not.toHaveBeenCalled();
    expect(f.onActiveRunReady).not.toHaveBeenCalled();
    expect(f.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("a loaded root refuses at its gate head, without making its agent ready", async () => {
    const f = await delegatedHost();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.tasks.close("T1");
    await expect(root.postAgentUserMessage({ message: new AgentInputUserMessage("Are you there?"), postOptions: {}, onActiveRunReady: f.onActiveRunReady })).resolves.toEqual(refused);
    expect(f.restores).not.toHaveBeenCalled();
    expect(f.onActiveRunReady).not.toHaveBeenCalled();
  });

  it("after the assigner reopens and continues it, the user's message is delivered", async () => {
    const f = await delegatedHost();
    f.tasks.close("T1");
    f.tasks.setTaskOpen("T1");
    await f.tasks.reopenAssignment({ execution: { agentRunId: HOST }, requestedBy: "manager" });
    await expect(f.post()).resolves.toMatchObject({ kind: "posted", post: { accepted: true } });
    expect(f.onActiveRunReady).toHaveBeenCalledOnce();
    expect(f.host.run.postUserMessage).toHaveBeenCalledOnce();
  });

  it("CR-461-070 (F-50): a stopped delegated run whose saved conversation cannot be read is refused with base's text before its root is resolved or restored", async () => {
    const f = await delegatedHost();
    await fs.writeFile(f.tracesPath, `${JSON.stringify({ trace_type: "user", content: "Your Task.", turn_id: "t1", seq: 1, ts: 1 })}\n{not json\n${JSON.stringify({ trace_type: "assistant", content: "On it.", turn_id: "t1", seq: 2, ts: 2 })}\n`);
    const refusal = await f.manager.inputRefusal(HOST);
    expect(refusal).toMatchObject({ accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(refusal!.message).toMatch(/^The delegated Agent at '\/research_assistant' cannot be restored: its saved conversation cannot be read \(.+\)\. Its files were left unchanged\. Start a new delegation for this work, or restore its saved conversation from a backup\.$/);
    await expect(f.post()).resolves.toEqual({ kind: "refused", refusal });
    expect(f.registrations).toEqual([]);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    expect(f.restores).not.toHaveBeenCalled();
    expect(f.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("CR-461-070: a run the user started keeps its own text (it is not asked)", async () => {
    const f = await buildManager();
    await expect(f.manager.inputRefusal(HOST)).resolves.toBeNull();
  });

  it("a run whose Task was deleted takes the message", async () => {
    const f = await delegatedHost();
    f.tasks.close("T1");
    f.tasks.deleteTask("T1");
    await expect(f.post()).resolves.toMatchObject({ kind: "posted", post: { accepted: true } });
  });

  it("CR-461-051, SR-074: while its Task record cannot be read, a delegated run is refused before its root is loaded: nothing registers or runs", async () => {
    const f = await delegatedHost();
    // Its Task's record is damaged: no readable Task names it (as after a restart), and the Task side reports the damage.
    f.tasks.deleteTask("T1");
    f.tasks.damaged.add("T1");
    // Its own file says it was delegated.
    await new AgentRunMetadataStore(f.memoryDir).writeMetadata(HOST, metadata(f.memoryDir, { delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" } }));
    const unavailable = { accepted: false, code: "TASK_AGENT_RESOURCES_UNAVAILABLE",
      message: "Task run data could not be read (T1). Fix or restore the file and restart the app; other features keep working." };
    await expect(f.manager.inputRefusal(HOST)).resolves.toEqual(unavailable);
    await expect(f.post()).resolves.toEqual({ kind: "refused", refusal: unavailable });
    expect(f.registrations).toEqual([]);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    expect(f.restores).not.toHaveBeenCalled();
    expect(f.onActiveRunReady).not.toHaveBeenCalled();
    expect(f.host.run.postUserMessage).not.toHaveBeenCalled();
    // A run the user started (its file names no delegator) takes its message meanwhile.
    const user = await delegatedHost();
    user.tasks.deleteTask("T1");
    user.tasks.damaged.add("T1");
    await expect(user.post()).resolves.toMatchObject({ kind: "posted", post: { accepted: true } });
  });

  it("CR-461-051: a loaded delegated root refuses at its gate head while a Task record cannot be read; its agent is not made ready", async () => {
    const f = await delegatedHost();
    f.setMetadata({ delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" } });
    const root = (await f.manager.resolveRoot(HOST))!;
    f.tasks.deleteTask("T1");
    f.tasks.damaged.add("T1");
    await expect(root.postAgentUserMessage({ message: new AgentInputUserMessage("Are you there?"), postOptions: {}, onActiveRunReady: f.onActiveRunReady }))
      .resolves.toMatchObject({ kind: "refused", refusal: { code: "TASK_AGENT_RESOURCES_UNAVAILABLE" } });
    expect(f.onActiveRunReady).not.toHaveBeenCalled();
  });
});
