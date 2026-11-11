import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "./collaboration-execution-tree-dto-projection.js";

/**
 * A run view's child rows (design DS-8): the runs on this node it delegated to that hold an open Task, one hop
 * (`DelegationTree.openChildrenOf`), each read from its own file. A run on a peer node is a remote row; a run whose own
 * file cannot be read is left out with a warning naming it (DESIGN.md rule 7). Opening a view starts nothing.
 */
export const delegatedChildrenDtos = async (run: RootExecutionIdentity, memoryDir = appConfigProvider.config.getMemoryDir()): Promise<CollaborationTaskExecutionDto[]> => {
  const layout = new AgentMemoryLayout(memoryDir);
  const agents = new AgentRunMetadataStore(memoryDir);
  const teams = new TeamRunExecutionTreeStore();
  const rows: CollaborationTaskExecutionDto[] = [];
  for (const child of findDelegationTree()?.openChildrenOf(run) ?? []) {
    if (child.nodeId !== undefined) continue;
    try {
      if ("agentRunId" in child.run) {
        const metadata = await agents.readMetadata(child.run.agentRunId);
        if (metadata) rows.push(projectDelegatedAgentRun(child, metadata));
      } else {
        const teamRunId = child.run.teamRunId;
        const tree = await teams.readOwnParts(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);
        if (tree) rows.push(projectDelegatedTeamRun(child, tree));
      }
    } catch (error) {
      console.warn(`A run delegated from ${run.rootSubjectKind} run '${run.rootRunId}' was left out of its view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return rows;
};
