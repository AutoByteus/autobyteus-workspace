import type { CollaboratorRootPort } from "../../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { RootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { agentOrgCollaboratorPortFor } from "../../../agent-org-execution/services/agent-org-run-collaborators.js";
import { AgentOrgRunManager } from "../../../agent-org-execution/services/agent-org-run-manager.js";
import { isCollaborationEligibleStandaloneRun } from "../../../agent-execution/services/standalone-agent-run-collaboration-binding.js";
import { AgentRunCollaborationExecutionIndex } from "../../../agent-run-collaboration/services/agent-run-collaboration-execution-index.js";
import { agentRunCollaboratorPortFor } from "../../../agent-run-collaboration/services/agent-run-collaboration-collaborators.js";
import { AgentRunCollaborationRootManager } from "../../../agent-run-collaboration/services/agent-run-collaboration-root-manager.js";
import { collaboratorSegmentForName } from "../../../agent-collaboration/collaborators/collaborator-address-allocator.js";
import { createAgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { emptyAgentRunCollaborationTree } from "../../../agent-run-collaboration/domain/agent-run-collaboration-tree.js";
import { TeamExecutionIndex } from "../../../agent-team-execution/services/team-execution-index.js";
import { teamCollaboratorPortFor } from "../../../agent-team-execution/services/team-run-collaborators.js";
import { getTeamRunService } from "../../../agent-team-execution/services/team-run-service.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentRunMetadataService } from "../../../run-history/services/agent-run-metadata-service.js";
import { AgentOrgRunExecutionTreeStore } from "../../../run-history/store/agent-org-run-execution-tree-store.js";
import { getAgentRunCollaborationDirPath } from "../../../run-history/store/agent-run-collaboration-tree-path.js";
import { AgentRunCollaborationPackageStore } from "../../../run-history/store/agent-run-collaboration-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";

/**
 * Collaborator facts of an active or stored root of any kind, for the candidates query.
 * `null` when the root does not exist or cannot host collaborators.
 */
export const resolveCollaboratorRootPort = async (
  rootSubjectKind: RootSubjectKind,
  rootRunIdInput: string,
): Promise<CollaboratorRootPort | null> => {
  const rootRunId = rootRunIdInput.trim();
  const memoryDir = appConfigProvider.config.getMemoryDir();
  const layout = new AgentMemoryLayout(memoryDir);
  switch (rootSubjectKind) {
    case "agent_team": {
      const active = getTeamRunService().getActiveTeamRun(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new TeamRunExecutionTreeStore().read(layout.getTeamDirPath({ rootTeamRunId: rootRunId, ancestorTeamRunIds: [] }), rootRunId);
      return tree ? teamCollaboratorPortFor(tree, new TeamExecutionIndex(tree)) : null;
    }
    case "agent_org": {
      const active = AgentOrgRunManager.getInstance().getActive(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new AgentOrgRunExecutionTreeStore().read(layout.getOrgDirPath(rootRunId), rootRunId);
      return tree ? agentOrgCollaboratorPortFor(tree, new AgentOrgExecutionIndex(tree)) : null;
    }
    case "agent": {
      const active = AgentRunCollaborationRootManager.getInstance().getActive(rootRunId);
      if (active) return active.collaboratorPort();
      const metadata = await new AgentRunMetadataService(memoryDir).readMetadata(rootRunId);
      if (!metadata) return null;
      if (!isCollaborationEligibleStandaloneRun(metadata)) {
        return Object.freeze({ ...emptyPort(metadata.agentDefinitionId), isApplicationBound: true });
      }
      const launch = {
        runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier, llmConfig: metadata.llmConfig,
        autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath,
      };
      const stored = await new AgentRunCollaborationPackageStore().readTree(getAgentRunCollaborationDirPath(memoryDir, rootRunId), rootRunId);
      const tree = stored ?? emptyAgentRunCollaborationTree({
        host: { address: createAgentTeamAddress([collaboratorSegmentForName(metadata.agentDefinitionId)]), agentRunId: rootRunId, agentDefinitionId: metadata.agentDefinitionId },
        createdAt: new Date().toISOString(),
      });
      return agentRunCollaboratorPortFor(tree, new AgentRunCollaborationExecutionIndex(tree), launch);
    }
  }
};

const emptyPort = (agentDefinitionId: string): CollaboratorRootPort => Object.freeze({
  rootKind: "agent",
  isApplicationBound: false,
  rootLaunchConfiguration: () => { throw new Error("This run cannot host collaborators."); },
  configuredDefinitionIds: () => Object.freeze({ agentDefinitionIds: new Set([agentDefinitionId]), teamDefinitionIds: new Set<string>() }),
  collaborators: () => [],
  hasTaskExecutionAt: () => false,
  addressesInUse: () => new Set<string>(),
});
