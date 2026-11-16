import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { ROOT, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

/**
 * autobyteus-461 DS-15 (SR-070, G-4) at a loaded team root's gate head: a delegated team run whose Task is closed takes no
 * message or approval for its members, and starts none of them for it; an interrupt still reaches it. Its members' own
 * input check (base's `assertExecutionInputAllowed`) refuses a teammate's message too. Real tree over the Task records.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const CLOSED = { accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "Your Task is DONE or CANCELLED, so you can't start new work." };

const delegatedTeam = async () => {
  const f = await harness({ withTeammate: true });
  const tasks = f.dependencies.taskRecords as InMemoryTaskExecutionResources;
  tasks.addTask("T");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T", recipientAddress: "/se_team",
    delegatedFrom: { delegatingRun: createAgentRootExecutionIdentity("manager"), delegatorAgentRunId: "manager" },
    execution: { teamRunId: ROOT }, teamCoordinatorAgentRunId: "run-coordinator" });
  await tasks.markStarted({ teamRunId: ROOT });
  return { ...f, tasks };
};
const userMessage = () => AgentInputUserMessage.fromDict({ content: "Are you there?", context_files: null,
  metadata: { input_origin: "user_message", message_id: "m-1", dedupe_key: "d-1" } });

describe("DS-15: a loaded delegated team run whose Task is closed", () => {
  it("refuses a member's message and approval at its gate head, starting no member", async () => {
    const f = await delegatedTeam();
    f.tasks.close("T");
    await expect(f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() })).resolves.toEqual(CLOSED);
    await expect(f.root.executeAgentCommand("run-coordinator", { kind: "approve_tool", invocationId: "i-1", approved: true, reason: null })).resolves.toEqual(CLOSED);
    expect(f.handles.size).toBe(0);
  });

  it("its members' own input check (base's `assertExecutionInputAllowed`) refuses any other input, a teammate's included", async () => {
    const f = await delegatedTeam();
    await f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() });
    const coordinator = f.handles.get("run-coordinator")!;
    const check = () => (coordinator.input as { assertInputAllowed(): void }).assertInputAllowed();
    expect(check).not.toThrow();
    f.tasks.close("T");
    expect(check).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCE_CLOSED", message: CLOSED.message }));
  });

  it("an open Task's run, and a run whose Task was deleted, take the message", async () => {
    const f = await delegatedTeam();
    await expect(f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() })).resolves.toMatchObject({ accepted: true });
    const g = await delegatedTeam();
    g.tasks.close("T"); g.tasks.deleteTask("T");
    await expect(g.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() })).resolves.toMatchObject({ accepted: true });
  });

  it("CR-461-051 (autobyteus-469 DEC-010): while its Task record cannot be read, a delegated team fails closed at its gate head and in its members' check", async () => {
    const f = await harness({ withTeammate: true, delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" } });
    const tasks = f.dependencies.taskRecords as InMemoryTaskExecutionResources;
    // No readable Task names it (its Task's record is damaged).
    tasks.damaged.add("T");
    const unavailable = { accepted: false, code: "TASK_AGENT_RESOURCES_UNAVAILABLE",
      message: "Task run data could not be read (T). Fix or restore the file and restart the app; other features keep working." };
    await expect(f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() })).resolves.toEqual(unavailable);
    expect(f.handles.size).toBe(0);
    tasks.damaged.clear();
    await f.root.executeAgentCommand("run-coordinator", { kind: "post_message", message: userMessage() });
    const check = () => (f.handles.get("run-coordinator")!.input as { assertInputAllowed(): void }).assertInputAllowed();
    expect(check).not.toThrow();
    tasks.damaged.add("T");
    expect(check).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCES_UNAVAILABLE" }));
  });
});
