import { readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it, vi } from "vitest";
import { DelegatedRunCommands } from "../../../../src/agent-collaboration/execution/delegation/delegated-run-commands.js";
import { DelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";

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
  const team = { executeAgentCommand: vi.fn(async (_agentRunId: string, _command: unknown) => ({ accepted: true, code: "TEAM" })),
    resolveCollaboratorMentions: vi.fn(async (input: { mentions: readonly { definitionId: string }[] }) => input.mentions.some((mention) => mention.definitionId === "nobody")
      ? { admitted: false as const, code: "COLLABORATOR_ADD_FAILED", message: "No such collaborator.", collaboratorName: "Nobody" }
      : { admitted: true as const, collaborators: [{ name: "Reviewer", kind: "agent", address: "/eng/reviewer", presence: "not_in_run" }] } as never) };
  const teamRun = vi.fn(async (_id: string, restore: boolean) => restore ? team : null);
  const commands = new DelegatedRunCommands({ tree, standaloneRuns: { postUserMessage: post },
    activeAgentRun: (id) => id === "image" ? live as never : null, teamRun: teamRun as never });
  return { commands, post, live, team, teamRun, tasks };
};

describe("DelegatedRunCommands", () => {
  it("a message to an agent child goes to its own run (restoring it); interrupt and tool approval to its live agent", async () => {
    const h = await harness();
    await expect(h.commands.execute(M, "image", { kind: "post_message", message })).resolves.toMatchObject({ accepted: true, code: "POSTED" });
    expect(h.post).toHaveBeenCalledWith({ runId: "image", message, mentions: [], postOptions: {} });
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

  it("a child on a peer node is not this route's: its commands go through the delegating run to its node", async () => {
    const h = await harness();
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/far", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" },
      execution: { agentRunId: "far" }, nodeId: "node-b" } as never);
    await expect(h.commands.execute(M, "far", { kind: "post_message", message })).resolves.toBeNull();
    await expect(h.commands.postUserMessage(M, "far", { message, mentions: [] })).resolves.toBeNull();
    expect(h.post).not.toHaveBeenCalled();
  });

  describe("a user's message with mentions to a child row (CR-461-032)", () => {
    const reviewer = { kind: "agent", definitionId: "reviewer" } as never;
    const nobody = { kind: "agent", definitionId: "nobody" } as never;
    const userMessage = new AgentInputUserMessage("Ask @Reviewer", SenderType.USER, null, { message_id: "m1" });

    it("to a team child's member: the child's own root resolves them for that member, then posts the composed message", async () => {
      const h = await harness();
      await expect(h.commands.postUserMessage(M, "coder", { message: userMessage, mentions: [reviewer] })).resolves.toMatchObject({ accepted: true });
      expect(h.team.resolveCollaboratorMentions).toHaveBeenCalledWith({ focusedAgentRunId: "coder", mentions: [reviewer] });
      const posted = h.team.executeAgentCommand.mock.calls[0]![1] as { message: AgentInputUserMessage };
      expect(posted.message.content).toContain("Ask @Reviewer");
      expect(posted.message.content).not.toBe("Ask @Reviewer");
      expect(posted.message.metadata).toMatchObject({ message_id: "m1" });
    });

    it("a refused mention posts nothing, and names the collaborator", async () => {
      const h = await harness();
      await expect(h.commands.postUserMessage(M, "coder", { message: userMessage, mentions: [nobody] }))
        .resolves.toEqual({ accepted: false, code: "COLLABORATOR_ADD_FAILED", message: "No such collaborator.", collaboratorName: "Nobody" });
      expect(h.team.executeAgentCommand).not.toHaveBeenCalled();
    });

    it("to an agent child: its own root admits them in its gate; a refusal maps to the notice", async () => {
      const h = await harness();
      await h.commands.postUserMessage(M, "image", { message: userMessage, mentions: [reviewer] });
      expect(h.post).toHaveBeenCalledWith({ runId: "image", message: userMessage, mentions: [reviewer], postOptions: {} });
      h.post.mockResolvedValueOnce({ kind: "admission_rejected", admission: { admitted: false, code: "COLLABORATOR_ADD_FAILED", message: "No.", collaboratorName: "Nobody" } } as never);
      await expect(h.commands.postUserMessage(M, "image", { message: userMessage, mentions: [nobody] }))
        .resolves.toEqual({ accepted: false, code: "COLLABORATOR_ADD_FAILED", message: "No.", collaboratorName: "Nobody" });
      h.post.mockResolvedValueOnce({ kind: "admission_failed", message: "Store down." } as never);
      await expect(h.commands.postUserMessage(M, "image", { message: userMessage, mentions: [reviewer] }))
        .resolves.toEqual({ accepted: false, code: "COLLABORATOR_MENTION_REJECTED", message: "Store down." });
    });
  });
});
