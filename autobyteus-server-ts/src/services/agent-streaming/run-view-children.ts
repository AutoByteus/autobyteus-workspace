import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { ChildRunAgentStatusDto, ChildRunIdentityDto, CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { LocalChildFollowers } from "../../agent-collaboration/execution/delegation/local-child-followers.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { describeRemoteTaskExecutions } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import { childRunIdentity } from "./child-run-identity.js";
import { delegatedChildDto } from "./delegated-children-dtos.js";
import { projectRemoteTaskExecution } from "./remote-task-execution-dto-projection.js";

/**
 * A run view's children (design DS-8), as every view kind and the history poll read them: the runs on this node it
 * delegated to that hold an open Task (`DelegationTree.openChildrenOf`, one hop, each read from its own file), its open
 * peer runs (their Task entries, with this owner's node names; the view never waits for a peer), and its local
 * children's agents with their live statuses. Opening a view starts nothing. Created by the composition root (SR-047
 * step 7) and passed to the view sessions and the GraphQL reads.
 */
export class RunViewChildren {
  constructor(private readonly input: Readonly<{
    memoryDir: string;
    tree: Pick<DelegationTree, "openChildrenOf" | "peerChildrenOf" | "agentsOf">;
    followers: Pick<LocalChildFollowers, "statuses">;
    /** This node's channel to its peers; `null` where the node has none. */
    channel: () => RemoteRunChannel | null;
  }>) {}

  /** Its local child rows; a run whose own file cannot be read is left out with a warning naming it (DESIGN.md rule 7). */
  async rows(run: RootExecutionIdentity): Promise<CollaborationTaskExecutionDto[]> {
    const rows: CollaborationTaskExecutionDto[] = [];
    for (const child of this.input.tree.openChildrenOf(run).filter((candidate) => candidate.nodeId === undefined)) {
      try {
        const row = await delegatedChildDto(child, this.input.memoryDir, this.input.tree);
        if (row) rows.push(row);
      } catch (error) {
        console.warn(`A run delegated from ${run.rootSubjectKind} run '${run.rootRunId}' was left out of its view: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return rows;
  }

  /**
   * Its local children for the listed-runs poll (autobyteus-461 SR-055, SR-056): each child's identity alone (no launch
   * details, so no file is read per poll) with its agents' live statuses. A child whose own file was never readable is
   * left out with a warning naming it, as from the view.
   */
  async listed(run: RootExecutionIdentity): Promise<Array<Readonly<{ row: ChildRunIdentityDto; statuses: ChildRunAgentStatusDto[] }>>> {
    const statuses = await this.statuses(run);
    const children: Array<Readonly<{ row: ChildRunIdentityDto; statuses: ChildRunAgentStatusDto[] }>> = [];
    for (const child of this.input.tree.openChildrenOf(run).filter((candidate) => candidate.nodeId === undefined)) {
      try {
        const row = await childRunIdentity(child, this.input.tree);
        if (!row) continue;
        const agents = new Set(row.kind === "agent" ? [row.agentRunId] : row.members.map((member) => member.agentRunId));
        children.push({ row, statuses: statuses.filter((status) => agents.has(status.agentRunId))
          .map((status) => ({ agentRunId: status.agentRunId, memberAddress: status.memberAddress, status: status.status })) });
      } catch (error) {
        console.warn(`A run delegated from ${run.rootSubjectKind} run '${run.rootRunId}' was left out of its listed children: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return children;
  }

  /** Its open peer runs. */
  async remote(run: RootExecutionIdentity): Promise<readonly RemoteTaskExecutionDto[]> {
    return (await describeRemoteTaskExecutions(peerRunLinksOf(run, this.input.tree).filter((link) => link.open), this.input.channel()))
      .map(projectRemoteTaskExecution);
  }

  /** Every agent of its open local children with its live status. */
  statuses(run: RootExecutionIdentity): Promise<LocalChildAgentStatus[]> {
    return this.input.followers.statuses(run);
  }
}
