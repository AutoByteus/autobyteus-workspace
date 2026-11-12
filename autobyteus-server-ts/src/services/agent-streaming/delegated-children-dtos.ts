import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { DelegatedChild, DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { childRunIdentity } from "./child-run-identity.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "./collaboration-execution-tree-dto-projection.js";

/**
 * One child row as the view shows it: its identity (the tree's per-run data, read once) and its launch details, read
 * fresh from its own file (autobyteus-461 SR-056); `null` when its file is missing.
 */
export const delegatedChildDto = async (child: DelegatedChild, memoryDir: string, tree: Pick<DelegationTree, "agentsOf">): Promise<CollaborationTaskExecutionDto | null> => {
  const identity = await childRunIdentity(child, tree);
  if (!identity) return null;
  if (identity.kind === "agent") {
    const metadata = await new AgentRunMetadataStore(memoryDir).readMetadata(identity.agentRunId);
    return metadata ? projectDelegatedAgentRun(identity, metadata) : null;
  }
  const file = await new TeamRunExecutionTreeStore().read(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: identity.teamRunId, ancestorTeamRunIds: [] }), identity.teamRunId);
  return file ? projectDelegatedTeamRun(identity, file) : null;
};
