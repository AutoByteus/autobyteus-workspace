import { describe, expect, it, vi } from "vitest";
import { DelegationIndex } from "../../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { CLOSED_TASK_INPUT_MESSAGE, ClosedTaskEntryFence, ClosedTaskFence } from "../../../../../src/agent-collaboration/execution/task/closed-task-fence.js";
import { InMemoryTaskExecutionResources } from "../../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgentRunIds } from "../../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 DS-15 (SR-070, G-4): a delegated run whose Task is closed takes no user, application or resume input,
 * with base's input-fence text (IMP-58); its assigner's continuation reopens it first (DS-2); a run no Task names, one the
 * user started or one whose Task was deleted, is not fenced. Over the real tree and the Task records.
 */
const run = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const M = run("agent", "manager"), R = run("agent", "reviewer"), E = run("agent_team", "eng");

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => r.rootRunId === "eng" ? ["lead", "coder"] : null));
  tree.build();
  tasks.setEntriesListener(tree);
  tasks.addTask("T1"); tasks.addTask("T2");
  const from = { delegatingRun: M, delegatorAgentRunId: "manager" };
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/reviewer", delegatedFrom: from, execution: { agentRunId: "reviewer" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/eng", delegatedFrom: from, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "lead" });
  await tasks.markStarted({ agentRunId: "reviewer" }); await tasks.markStarted({ teamRunId: "eng" });
  return { tasks, fence: new ClosedTaskFence({ tree, tasks }) };
};

describe("ClosedTaskFence (DS-15)", () => {
  it("an open Task's run takes input; a closed one's is refused with base's text, an agent run and a team run alike", async () => {
    const { tasks, fence } = await harness();
    expect(fence.refusal(R)).toBeNull();
    expect(fence.refusal(E)).toBeNull();
    tasks.close("T1"); tasks.close("T2");
    for (const closed of [R, E]) {
      expect(fence.refusal(closed)).toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: CLOSED_TASK_INPUT_MESSAGE });
      expect(() => fence.assertOpen(closed)).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCE_CLOSED", message: "Your Task is DONE or CANCELLED, so you can't start new work." }));
    }
  });

  it("after the assigner reopens and continues it, the run takes input again", async () => {
    const { tasks, fence } = await harness();
    tasks.close("T1");
    tasks.setTaskOpen("T1");
    await tasks.reopenAssignment({ execution: { agentRunId: "reviewer" }, requestedBy: "manager" });
    expect(fence.refusal(R)).toBeNull();
  });

  it("a run no Task names is not fenced: one the user started, and one whose Task was deleted", async () => {
    const { tasks, fence } = await harness();
    expect(fence.refusal(M)).toBeNull();
    expect(fence.refusal(run("agent_org", "org"))).toBeNull();
    tasks.close("T1");
    tasks.deleteTask("T1");
    expect(fence.refusal(R)).toBeNull();
  });

  it("CR-461-051 (autobyteus-469 DEC-010): while a Task record cannot be read, a delegated run no readable Task names fails closed; a user's run does not", async () => {
    const { tasks, fence } = await harness();
    const native = run("agent", "native_helper"), team = run("agent_team", "squad");
    tasks.damaged.add("T9");
    for (const delegated of [native, team]) {
      expect(fence.refusal(delegated, true)).toEqual({ accepted: false, code: "TASK_AGENT_RESOURCES_UNAVAILABLE",
        message: "Task run data could not be read (T9). Fix or restore the file and restart the app; other features keep working." });
      expect(() => fence.assertOpen(delegated, true)).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" }));
      // A run its own file does not name as delegated (one the user started) takes input.
      expect(fence.refusal(delegated)).toBeNull();
    }
    // A run a readable Task names is answered by that Task.
    expect(fence.refusal(R, true)).toBeNull();
    tasks.damaged.clear();
    expect(fence.refusal(native, true)).toBeNull();
  });

  it("SR-074 (CR-461-051): where input enters, the entry fence reads the run's own file only while a Task record cannot be read", async () => {
    const { tasks, fence } = await harness();
    const native = run("agent", "native_helper"), own = run("agent", "user_run");
    const delegationOf = vi.fn(async (r: RootExecutionIdentity) => r.rootRunId === "native_helper" ? { delegatedFrom: {}, address: "/helper", definition: {}, entryAgentRunId: "native_helper" } as never : null);
    const entry = new ClosedTaskEntryFence({ fence, tasks, files: { delegationOf } });
    await expect(entry.refusal(native)).resolves.toBeNull();
    expect(delegationOf).not.toHaveBeenCalled();
    tasks.damaged.add("T9");
    await expect(entry.refusal(native)).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCES_UNAVAILABLE" });
    await expect(entry.refusal(own)).resolves.toBeNull();
    // A closed Task's run is refused as closed, as before.
    tasks.damaged.clear(); tasks.close("T1");
    await expect(entry.refusal(R)).resolves.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
  });
});

