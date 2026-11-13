import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgentRunIds } from "../../helpers/run-agents-reader.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

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
  const registrations: boolean[] = [];
  f.directory.onRegistrationChanged(createAgentRootExecutionIdentity(HOST), (registered) => registrations.push(registered));
  const onActiveRunReady = vi.fn();
  const post = () => f.manager.postUserMessage({ runId: HOST, message: new AgentInputUserMessage("Are you there?"), postOptions: {}, onActiveRunReady });
  return { ...f, tasks, registrations, onActiveRunReady, post };
};

describe("DS-15: the user's message to a closed delegated agent run", () => {
  it("is refused before its root is resolved or restored: nothing registers, activates or binds", async () => {
    const f = await delegatedHost();
    f.tasks.close("T1");
    expect(f.manager.inputRefusal(HOST)).toEqual(refused.refusal);
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
    await expect(root.postHostUserMessage({ message: new AgentInputUserMessage("Are you there?"), postOptions: {}, onActiveRunReady: f.onActiveRunReady })).resolves.toEqual(refused);
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

  it("a run whose Task was deleted takes the message", async () => {
    const f = await delegatedHost();
    f.tasks.close("T1");
    f.tasks.deleteTask("T1");
    await expect(f.post()).resolves.toMatchObject({ kind: "posted", post: { accepted: true } });
  });
});
