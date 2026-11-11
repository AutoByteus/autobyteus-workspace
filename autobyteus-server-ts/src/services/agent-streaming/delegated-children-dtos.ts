import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { DelegatedChild } from "../../agent-collaboration/delegation/delegation-tree.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "./collaboration-execution-tree-dto-projection.js";

/** One child row from the child's own file; `null` when its file is missing. */
export const delegatedChildDto = async (child: DelegatedChild, memoryDir: string): Promise<CollaborationTaskExecutionDto | null> => {
  if ("agentRunId" in child.run) {
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(child.run.agentRunId);
    return metadata ? projectDelegatedAgentRun(child, metadata) : null;
  }
  const teamRunId = child.run.teamRunId;
  const tree = await new TeamRunExecutionTreeStore().read(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId);
  return tree ? projectDelegatedTeamRun(child, tree) : null;
};
