import { describe, expect, it, vi } from "vitest";
import { openTargetOf } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { projectRemoteTaskExecution } from "../../../../src/services/agent-streaming/remote-task-execution-dto-projection.js";
import { createChildRowProjection } from "../../../../src/services/agent-streaming/delegated-children-dtos.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 SR-083 (FU-024, FU-031, F-66): every row the server builds says where it opens, from one helper: an agent
 * run its own agent, a team run its coordinator (never another member; without one, a row error with no target), a
 * peer run on its node; and a peer row carries its launches from its node's answer.
 */
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const agentRow = projectDelegatedAgentRun({ kind: "agent", address: "/reviewer", agentRunId: "reviewer-run", agentDefinitionId: "reviewer",
  delegatorAgentRunId: "host", startedAt: "2026-11-01T00:00:00.000Z" }, { runId: "reviewer-run", agentDefinitionId: "reviewer", platformAgentRunId: null, ...launch } as never);
const teamFile = (coordinatorAddress = "/lead") => {
  const tree = testExecutionTree({ rootTeamRunId: "team-run", coordinatorAddress: "/lead", children: [
    testAgentNode("/designer", { agentRunId: "designer-run" }), testAgentNode("/lead", { agentRunId: "lead-run" })] });
  // A file whose coordinator is not one of its members (damaged or hand-edited): the builder never writes one.
  return { ...tree, rootTeam: { ...tree.rootTeam, coordinatorAddress } };
};
const teamIdentity = { kind: "agent_team" as const, address: "/product_team", teamRunId: "team-run", coordinatorAgentRunId: "lead-run",
  delegatorAgentRunId: "host", startedAt: "2026-11-01T00:00:00.000Z",
  members: [{ address: "/designer", agentRunId: "designer-run", agentDefinitionId: "designer" }, { address: "/lead", agentRunId: "lead-run", agentDefinitionId: "lead" }] };
const teamRow = projectDelegatedTeamRun(teamIdentity, teamFile() as never);

describe("rows that say where they open (SR-083)", () => {
  it("one helper: an agent run opens its own agent; a team run its coordinator, the member at its coordinator's address", () => {
    expect(openTargetOf({ agentRunId: "a" })).toEqual({ runKind: "agent", runId: "a", agentRunId: "a" });
    // The coordinator is not the first member (FU-024: no members[0]).
    expect(openTargetOf({ teamRunId: "t" }, { coordinatorAddress: "/lead", members: [{ address: "/designer", agentRunId: "d" }, { address: "/lead", agentRunId: "l" }] }))
      .toEqual({ runKind: "agent_team", runId: "t", agentRunId: "l" });
  });

  it("a team run whose coordinator is not one of its members is a row error: logged, no target", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(openTargetOf({ teamRunId: "t" }, { coordinatorAddress: "/gone", members: [{ address: "/designer", agentRunId: "d" }] })).toBeNull();
    expect(projectDelegatedTeamRun(teamIdentity, teamFile("/gone") as never).openTarget).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Row error: team run 't' has no coordinator"));
    warn.mockRestore();
  });

  it("the local rows every view builds from: an agent run and a team run (its coordinator)", () => {
    expect(agentRow.openTarget).toEqual({ runKind: "agent", runId: "reviewer-run", agentRunId: "reviewer-run" });
    expect(teamRow.openTarget).toEqual({ runKind: "agent_team", runId: "team-run", agentRunId: "lead-run" });
  });

  it("a peer row opens on its node (a team at its coordinator) and carries its launches from its node's answer", () => {
    const peerTeam = { kind: "agent_team" as const, teamRunId: "peer-team", address: "/squad", nodeId: "node-b", nodeName: "B", delegatorAgentRunId: "host",
      startedAt: "t", open: true, coordinatorAddress: "/lead", members: [{ address: "/mate", agentRunId: "mate-run" }, { address: "/lead", agentRunId: "lead-run" }] };
    const launches = [{ address: "/lead", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt", source: { origin: "agent_default" as const, fallbacks: [] } }];
    const row = projectRemoteTaskExecution(peerTeam as never, launches as never);
    expect(row.open_target).toEqual({ run_kind: "agent_team", run_id: "peer-team", agent_run_id: "lead-run", node_id: "node-b" });
    expect(row.launches).toEqual([{ address: "/lead", runtime_kind: "codex_app_server", llm_model_identifier: "gpt", source: { origin: "agent_default", fallbacks: [] } }]);
    expect(projectRemoteTaskExecution({ ...peerTeam, kind: "agent", agentRunId: "peer-agent" } as never).open_target)
      .toEqual({ run_kind: "agent", run_id: "peer-agent", agent_run_id: "peer-agent", node_id: "node-b" });
  });

  it("F-66, SR-086 G-B2: the views' row projection reads a peer row's launches from its node's latest answer, kept with its status, never asking the node", async () => {
    const link = { recipientAddress: "/helper", nodeId: "node-b", delegatorAgentRunId: "host", linkedAt: "t", open: true, run: { agentRunId: "peer-agent" } };
    const summary = { nodeId: "node-b", runId: "peer-agent", reachable: true, title: "Help", statuses: [],
      launches: [{ address: "/helper", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt", source: { origin: "agent_default", fallbacks: [] } }] };
    const channel = { peerName: async () => "B", runSummaries: vi.fn() };
    let kept: typeof summary | null = summary;
    const projection = createChildRowProjection({ memoryDir: "/unused", channel: () => channel as never, peerSummaryOf: () => kept as never,
      tree: { agentsOf: async () => [], peerChildrenOf: () => [link] } as never });
    const child = { run: { agentRunId: "peer-agent" }, nodeId: "node-b", parent: { rootSubjectKind: "agent", rootRunId: "host" } } as never;
    const record = await projection.rowOf(child);
    expect(record).toMatchObject({ kind: "peer", summary: { title: "Help", reachable: true },
      row: { launches: [{ address: "/helper", llm_model_identifier: "gpt" }], open_target: { run_id: "peer-agent", node_id: "node-b" } } });
    kept = null;
    expect((await projection.rowOf(child))?.row).not.toHaveProperty("launches");
    expect(channel.runSummaries).not.toHaveBeenCalled();
  });
});
