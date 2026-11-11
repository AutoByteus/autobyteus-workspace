import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import type { DelegatedChild } from "../../agent-collaboration/delegation/delegation-tree.js";
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
export const delegatedChildrenDtos = async (run: RootExecutionIdentity, memoryDirInput?: string): Promise<CollaborationTaskExecutionDto[]> => {
  const children = (findDelegationTree()?.openChildrenOf(run) ?? []).filter((child) => child.nodeId === undefined);
  if (!children.length) return [];
  const rows: CollaborationTaskExecutionDto[] = [];
  for (const child of children) {
    try {
      const row = await delegatedChildDto(child, memoryDirInput);
      if (row) rows.push(row);
    } catch (error) {
      console.warn(`A run delegated from ${run.rootSubjectKind} run '${run.rootRunId}' was left out of its view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return rows;
};

/** One child row from the child's own file; `null` when its file is missing. */
export const delegatedChildDto = async (child: DelegatedChild, memoryDirInput?: string): Promise<CollaborationTaskExecutionDto | null> => {
  const memoryDir = memoryDirInput ?? appConfigProvider.config.getMemoryDir();
  if ("agentRunId" in child.run) {
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(child.run.agentRunId);
    return metadata ? projectDelegatedAgentRun(child, metadata) : null;
  }
  const teamRunId = child.run.teamRunId;
  const tree = await new TeamRunExecutionTreeStore().read(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);
  return tree ? projectDelegatedTeamRun(child, tree) : null;
};
