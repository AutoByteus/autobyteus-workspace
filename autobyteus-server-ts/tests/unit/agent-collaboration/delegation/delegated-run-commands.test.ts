import { readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it, vi } from "vitest";
import { DelegatedRunCommands } from "../../../../src/agent-collaboration/execution/delegation/delegated-run-commands.js";
import { DelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/** autobyteus-461 DS-8, AR-011: a child row's commands go to the child's own root, by its identity. */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const OTHER: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "other" };
const message = { content: "Status?" } as never;

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationTree(() => tasks, readerOfAgentRunIds(async (run) => run.rootRunId === "eng" ? ["designer", "coder"] : null));
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/image_maker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "image" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "designer" });
  const live = { interrupt: vi.fn(async () => ({ accepted: true })), approveToolInvocation: vi.fn(async () => ({ accepted: true })) };
  const post = vi.fn(async () => ({ kind: "posted" as const, run: {} as never, post: { accepted: true, code: "POSTED" } }));
  const team = { executeAgentCommand: vi.fn(async () => ({ accepted: true, code: "TEAM" })) };
  const teamRun = vi.fn(async (_id: string, restore: boolean) => restore ? team : null);
  const commands = new DelegatedRunCommands({ tree, standaloneRuns: { postUserMessage: post },
    activeAgentRun: (id) => id === "image" ? live as never : null, teamRun });
  return { commands, post, live, team, teamRun };
};

describe("DelegatedRunCommands", () => {
  it("a message to an agent child goes to its own run (restoring it); interrupt and tool approval to its live agent", async () => {
    const h = await harness();
    await expect(h.commands.execute(M, "image", { kind: "post_message", message })).resolves.toMatchObject({ accepted: true, code: "POSTED" });
    expect(h.post).toHaveBeenCalledWith({ runId: "image", message, postOptions: {} });
    await h.commands.execute(M, "image", { kind: "interrupt" });
    await h.commands.execute(M, "image", { kind: "approve_tool", invocationId: "i1", approved: true, reason: null });
    expect(h.live.interrupt).toHaveBeenCalledOnce();
    expect(h.live.approveToolInvocation).toHaveBeenCalledWith("i1", true, null);
  });

  it("a team child's member: through the team run's own root (a message restores it; an interrupt needs it live)", async () => {
    const h = await harness();
    await expect(h.commands.execute(M, "coder", { kind: "post_message", message })).resolves.toMatchObject({ code: "TEAM" });
    expect(h.teamRun).toHaveBeenLastCalledWith("eng", true);
    await expect(h.commands.execute(M, "coder", { kind: "interrupt" })).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_ACTIVE" });
  });

  it("an agent that is not of a run this run delegated to is not this route's", async () => {
    const h = await harness();
    await expect(h.commands.execute(OTHER, "image", { kind: "interrupt" })).resolves.toBeNull();
    await expect(h.commands.execute(M, "nobody", { kind: "interrupt" })).resolves.toBeNull();
  });
});
