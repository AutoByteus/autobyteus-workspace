import type { CollaborationTaskExecutionDto, TaskAgentExecutionSourceDto, TaskTeamExecutionSourceDto } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { DelegatedChild, DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { ChildRowProjection } from "../../agent-collaboration/delegation/child-rows-feed.js";
import { peerRunIdOf, peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { describeRemoteTaskExecutions } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import { peerStatuses } from "../../agent-collaboration/execution/remote/peer-run-calls.js";
import { projectRemoteTaskExecution } from "./remote-task-execution-dto-projection.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { childRunIdentity } from "./child-run-identity.js";
import { projectAgentRunSource, projectDelegatedAgentRun, projectDelegatedTeamRun, projectTeamRunSource } from "./collaboration-execution-tree-dto-projection.js";

const readTeamFile = (memoryDir: string, teamRunId: string) =>
  new TeamRunExecutionTreeStore().read(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);

/**
 * A run's launch as its own file has it now (autobyteus-461 CR-461-086, SR-064/065): the same `source` its row shows, read
 * from the run itself, so a delegator's Settings shows what each delegated run runs with after a save or a reopen;
 * `null` when the run has no file on this node.
 */
export const readRunLaunch = async (run: Readonly<{ kind: "agent" | "agent_team"; runId: string }>, memoryDir: string): Promise<TaskAgentExecutionSourceDto | TaskTeamExecutionSourceDto | null> => {
  if (run.kind === "agent") {
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(run.runId);
    return metadata ? projectAgentRunSource(metadata) : null;
  }
  const file = await readTeamFile(memoryDir, run.runId);
  return file ? projectTeamRunSource(file) : null;
};

/**
 * One child row as the view shows it: its identity (the tree's per-run data, read once) and its launch details, read
 * fresh from its own file (autobyteus-461 SR-056); `null` when its file is missing.
 */
export const delegatedChildDto = async (child: DelegatedChild, memoryDir: string, tree: Pick<DelegationIndex, "agentsOf">): Promise<CollaborationTaskExecutionDto | null> => {
  const identity = await childRunIdentity(child, tree);
  if (!identity) return null;
  if (identity.kind === "agent") {
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(identity.agentRunId);
    return metadata ? projectDelegatedAgentRun(identity, metadata) : null;
  }
  const file = await readTeamFile(memoryDir, identity.teamRunId);
  return file ? projectDelegatedTeamRun(identity, file) : null;
};

/**
 * The views' projection of one row (SR-061): a run on this node from its own files (`delegatedChildDto`), a peer's run
 * from its Task entry and its node's answer (autobyteus-278); `null` when its record cannot be read.
 */
export const createChildRowProjection = (input: Readonly<{
  memoryDir: string;
  tree: Pick<DelegationIndex, "agentsOf" | "peerChildrenOf">;
  channel: () => RemoteRunChannel | null;
}>): ChildRowProjection => ({ rowOf: async (child) => {
  if (child.nodeId === undefined) {
    const row = await delegatedChildDto(child, input.memoryDir, input.tree);
    return row ? { kind: "local", row } : null;
  }
  const runId = "agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId;
  const links = peerRunLinksOf(child.parent, input.tree).filter((link) => peerRunIdOf(link) === runId);
  const [[peer], [summary]] = await Promise.all([describeRemoteTaskExecutions(links, input.channel()), peerStatuses(links, input.channel)]);
  // Its launches, read from its node while the view reads it (SR-038, F-66); absent when the node does not answer.
  return peer ? { kind: "peer", row: projectRemoteTaskExecution(peer, summary?.reachable ? summary.launches : undefined),
    summary: summary ? Object.freeze({ title: summary.title, reachable: summary.reachable }) : null } : null;
} });
