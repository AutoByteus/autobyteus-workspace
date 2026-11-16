import { NO_RUN_PARTS } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { peerRunLinksOf, peerTeamCoordinatorRunId } from "../../../../src/agent-collaboration/execution/remote/peer-run-link.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 contract §3.1 / E3, S17 … S19, AR-020: the peer runs a run delegated to are its Task entries with
 * `nodeId` (the tree's `peerChildrenOf`), open or closed; a closed one stays an endpoint, fenced by its closed entry.
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const OTHER: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "other" };

describe("peerRunLinksOf", () => {
  it("one hop, in delegation order: a peer agent run and a peer team (team-local members, its coordinator); local runs and other delegators' runs are left out", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
    tree.build();
    tasks.setEntriesListener(tree);
    tasks.addTask("T7"); tasks.addTask("T8");
    const from = (delegatingRun: RootExecutionIdentity) => ({ delegatingRun, delegatorAgentRunId: delegatingRun.rootRunId });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T7", recipientAddress: "/research_team", nodeId: "node-b", delegatedFrom: from(M),
      execution: { teamRunId: "research_team_77aa" }, teamCoordinatorAgentRunId: "lead_0c11",
      members: [{ address: "/lead", agentRunId: "lead_0c11" }, { address: "/analyst", agentRunId: "analyst_5d20" }] });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T8", recipientAddress: "/writer", nodeId: "node-b", delegatedFrom: from(M), execution: { agentRunId: "writer_1" } });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T8", recipientAddress: "/image_maker", delegatedFrom: from(M), execution: { agentRunId: "image_local" } });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T8", recipientAddress: "/x", nodeId: "node-b", delegatedFrom: from(OTHER), execution: { agentRunId: "x_1" } });
    const links = peerRunLinksOf(M, tree);
    expect(links.map((link) => link.kind === "agent" ? link.agentRunId : link.teamRunId)).toEqual(["research_team_77aa", "writer_1"]);
    expect(links[0]).toMatchObject({ kind: "agent_team", address: "/research_team", nodeId: "node-b", delegatorAgentRunId: "manager", coordinatorAddress: "/lead", open: true,
      members: [{ address: "/lead", agentRunId: "lead_0c11" }, { address: "/analyst", agentRunId: "analyst_5d20" }] });
    expect(peerTeamCoordinatorRunId(links[0] as never)).toBe("lead_0c11");
    // S19: closing T7 keeps the peer team as a link, closed (its messages are refused by the closed entry; AR-020).
    tasks.close("T7");
    expect(peerRunLinksOf(M, tree)[0]).toMatchObject({ teamRunId: "research_team_77aa", open: false });
  });
});
