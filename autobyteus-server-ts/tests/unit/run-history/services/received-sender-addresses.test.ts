import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunAgent } from "../../../../src/agent-collaboration/delegation/run-parts.js";
import { createCollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { receivedSenderAddresses } from "../../../../src/run-history/services/received-sender-addresses.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 SR-060 (the designer's answer on the member trace pages): a member's page shows each sender's address
 * as the receiver got it in the message's header (contract §2.5): an agent of the run at its own address; an
 * assigner's agent at its address, which the receiver's step 2 reaches; a child's agent by its run ID only.
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "squad" };
const ORG: RootExecutionIdentity = { rootSubjectKind: "agent_org", rootRunId: "org" };
const agents: Record<string, readonly RunAgent[]> = {
  manager: [{ agentRunId: "manager", address: "/manager", agentDefinitionId: null }],
  squad: [{ agentRunId: "lead", address: "/lead", agentDefinitionId: null }, { agentRunId: "mate", address: "/mate", agentDefinitionId: null }],
  org: [{ agentRunId: "director", address: "/director", agentDefinitionId: null }],
  helper: [{ agentRunId: "helper", address: "/helper", agentDefinitionId: null }],
  scout: [{ agentRunId: "scout", address: "/scout", agentDefinitionId: null }],
};

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgents(async (run) => agents[run.rootRunId] ?? null));
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1"); tasks.addTask("T2"); tasks.addTask("T3");
  // The manager assigned the squad; the squad's lead and the org's director each delegated a child.
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/squad", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { teamRunId: "squad" }, teamCoordinatorAgentRunId: "lead" });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/helper", delegatedFrom: { delegatingRun: TEAM, delegatorAgentRunId: "lead" }, execution: { agentRunId: "helper" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T3", recipientAddress: "/scout", delegatedFrom: { delegatingRun: ORG, delegatorAgentRunId: "director" }, execution: { agentRunId: "scout" } });
  return tree;
};

/** The address the receiver's header shows for a sender (§2.5): the same owner the message delivery asks. */
const headerAddress = async (tree: DelegationIndex, receiver: RootExecutionIdentity, run: RootExecutionIdentity, agentRunId: string, address: string) =>
  tree.collaborationTreeOf(receiver).reachingAddressOf(createCollaborationMemberExecutionIdentity({ root: run, memberAddress: address, agentRunId }));

describe("a member page's sender addresses, as the receiver got them", () => {
  it("a team member's page: an in-run sender at its address, the assigner's agent at its address, a child's agent by run ID", async () => {
    const tree = await harness();
    const own = new Map([["lead", "/lead"], ["mate", "/mate"]]);
    const addressOf = await receivedSenderAddresses({ receiverRun: TEAM, tree, ownAddressOf: (id) => own.get(id) ?? null,
      senderAgentRunIds: ["mate", "manager", "helper"] });
    expect(addressOf("mate")).toBe("/mate");
    expect(addressOf("manager")).toBe("/manager");
    expect(addressOf("manager")).toBe(await headerAddress(tree, TEAM, M, "manager", "/manager"));
    expect(addressOf("helper")).toBeNull();
    expect(addressOf("helper")).toBe(await headerAddress(tree, TEAM, { rootSubjectKind: "agent", rootRunId: "helper" }, "helper", "/helper"));
  });

  it("an org member's page: an in-run sender at its address, a child's agent by run ID (a run the user started has no assigner)", async () => {
    const tree = await harness();
    const addressOf = await receivedSenderAddresses({ receiverRun: ORG, tree, ownAddressOf: (id) => id === "director" ? "/director" : null,
      senderAgentRunIds: ["director", "scout"] });
    expect(addressOf("director")).toBe("/director");
    expect(addressOf("scout")).toBeNull();
    expect(addressOf("scout")).toBe(await headerAddress(tree, ORG, { rootSubjectKind: "agent", rootRunId: "scout" }, "scout", "/scout"));
  });
});
