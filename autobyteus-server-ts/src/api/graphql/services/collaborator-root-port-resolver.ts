import type { CollaboratorRootPort } from "../../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { RootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { agentOrgCollaboratorPortFor } from "../../../agent-org-execution/services/agent-org-run-collaborators.js";
import { AgentOrgRunManager } from "../../../agent-org-execution/services/agent-org-run-manager.js";
import { isCollaborationEligibleStandaloneRun } from "../../../agent-execution/services/standalone-agent-run-eligibility.js";
import { standaloneRootCollaboratorPortFor } from "../../../standalone-agent-run-root/services/standalone-root-collaborators.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { collaboratorSegmentForName } from "../../../agent-collaboration/collaborators/catalog-address-map.js";
import { createAgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { emptyStandaloneRootTree } from "../../../standalone-agent-run-root/domain/standalone-root-tree.js";
import { teamCollaboratorPortFor } from "../../../agent-team-execution/services/team-run-collaborators.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentRunMetadataService } from "../../../run-history/services/agent-run-metadata-service.js";
import { AgentOrgRunExecutionTreeStore } from "../../../run-history/store/agent-org-run-execution-tree-store.js";
import { getStandaloneRootDirPath } from "../../../standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { StandaloneRootPackageStore } from "../../../standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";

/**
 * Collaborator facts of an active or stored root of any kind, for the candidates query. An
 * Agent root's facts depend on the focused agent (the host never offers itself), so
 * `focusedAgentRunId` is required for `agent` and ignored for Team and Org roots.
 * `null` when the root does not exist or cannot host collaborators.
 */
export const resolveCollaboratorRootPort = async (
  rootSubjectKind: RootSubjectKind,
  rootRunIdInput: string,
  focusedAgentRunIdInput?: string | null,
): Promise<CollaboratorRootPort | null> => {
  const rootRunId = rootRunIdInput.trim();
  const memoryDir = appConfigProvider.config.getMemoryDir();
  const layout = new AgentMemoryLayout(memoryDir);
  switch (rootSubjectKind) {
    case "agent_team": {
      const active = AgentTeamRunManager.getInstance().getActiveTeamRun(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new TeamRunExecutionTreeStore().read(layout.getTeamDirPath({ rootTeamRunId: rootRunId, ancestorTeamRunIds: [] }), rootRunId);
      return tree ? teamCollaboratorPortFor(tree) : null;
    }
    case "agent_org": {
      const active = AgentOrgRunManager.getInstance().getActive(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new AgentOrgRunExecutionTreeStore().read(layout.getOrgDirPath(rootRunId), rootRunId);
      return tree ? agentOrgCollaboratorPortFor(tree) : null;
    }
    case "agent": {
      const focusedAgentRunId = focusedAgentRunIdInput?.trim();
      if (!focusedAgentRunId) throw new Error("focusedAgentRunId is required for an Agent run root.");
      const active = getStandaloneAgentRunRootManager().getActive(rootRunId);
      if (active) return active.collaboratorPortFor(focusedAgentRunId);
      const metadata = await new AgentRunMetadataService(memoryDir).readMetadata(rootRunId);
      if (!metadata) return null;
      if (!isCollaborationEligibleStandaloneRun(metadata)) {
        return Object.freeze({ ...emptyPort(metadata.agentDefinitionId), isApplicationBound: true });
      }
      const launch = {
        runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier, llmConfig: metadata.llmConfig,
        autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath,
      };
      const stored = await new StandaloneRootPackageStore().readTree(getStandaloneRootDirPath(memoryDir, rootRunId), rootRunId);
      const tree = stored ?? emptyStandaloneRootTree({
        host: { address: createAgentTeamAddress([collaboratorSegmentForName(metadata.agentDefinitionId)]), agentRunId: rootRunId, agentDefinitionId: metadata.agentDefinitionId },
        createdAt: new Date().toISOString(),
      });
      return standaloneRootCollaboratorPortFor(tree, launch, focusedAgentRunId);
    }
  }
};

const emptyPort = (agentDefinitionId: string): CollaboratorRootPort => Object.freeze({
  rootKind: "agent",
  isApplicationBound: false,
  rootLaunchConfiguration: () => { throw new Error("This run cannot host collaborators."); },
  ownDefinition: () => Object.freeze({ kind: "agent", definitionId: agentDefinitionId }),
  inRunPlacementsByDefinition: () => new Map(),
  collaborators: () => [],
  addressesInUse: () => new Set<string>(),
});
