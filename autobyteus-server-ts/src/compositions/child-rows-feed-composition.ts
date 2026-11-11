import { ChildRowsFeed, type ChildRowProjection } from "../agent-collaboration/delegation/child-rows-feed.js";
import { describeRemoteTaskExecutions } from "../agent-collaboration/execution/remote/remote-run-observation.js";
import { findProcessRemoteRunChannel } from "../agent-collaboration/execution/remote/remote-run-channel.js";
import { peerRunIdOf, peerRunLinksOf } from "../agent-collaboration/execution/remote/peer-run-link.js";
import { delegatedChildDto } from "../services/agent-streaming/delegated-children-dtos.js";
import { projectRemoteTaskExecution } from "../services/agent-streaming/remote-task-execution-dto-projection.js";

/**
 * The one `ChildRowsFeed` of the process (autobyteus-461 DS-8, SR-042 … SR-044), created by the composition root and
 * passed to the tree's composition (which makes it follow the tree) and to the view stream handlers. Its rows are the
 * views' own projection: a run on this node from its own file, a peer's run from its link.
 */
export const createChildRowsFeed = (input: Readonly<{ memoryDir: string }>): ChildRowsFeed => {
  const projection: ChildRowProjection = { rowOf: async (parent, child) => {
    if (child.nodeId === undefined) {
      const row = await delegatedChildDto(child, input.memoryDir);
      return row ? { kind: "local", row } : null;
    }
    const runId = "agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId;
    const [peer] = await describeRemoteTaskExecutions(peerRunLinksOf(parent).filter((link) => peerRunIdOf(link) === runId), findProcessRemoteRunChannel());
    return peer ? { kind: "peer", row: projectRemoteTaskExecution(peer) } : null;
  } };
  return new ChildRowsFeed(projection);
};
