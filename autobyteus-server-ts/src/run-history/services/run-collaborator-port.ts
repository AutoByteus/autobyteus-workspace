import { NOTHING_REACHED, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { RootSubjectKind } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { agentOrgCollaboratorPortFor } from "../../agent-org-execution/services/agent-org-run-collaborators.js";
import { isCollaborationEligibleStandaloneRun } from "../../agent-execution/services/standalone-agent-run-eligibility.js";
import { standaloneRootCollaboratorPortFor } from "../../standalone-agent-run-root/services/standalone-root-collaborators.js";
import { collaboratorSegmentForName } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { teamCollaboratorPortFor } from "../../agent-team-execution/services/team-run-collaborators.js";
import { AgentRunMetadataService } from "./agent-run-metadata-service.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";

/** The live roots a run's collaborator port is read from first; a stopped run's comes from its own stored files. */
export type RunCollaboratorPortSources = Readonly<{
  memoryDir: string;
  activeAgentRoot(runId: string): Readonly<{ collaboratorPortFor(viewerAgentRunId: string): CollaboratorRootPort }> | null;
  activeTeamRun(teamRunId: string): Readonly<{ collaboratorPort(): CollaboratorRootPort }> | null;
  activeOrgRun(orgRunId: string): Readonly<{ collaboratorPort(): CollaboratorRootPort }> | null;
}>;

/**
 * Collaborator facts of an active or stored root of any kind: for the candidates query (which reads the run's own
 * definition only, so a stored root's port has no step-2 reach), and a delegated run's delegator's catalog. An
 * Agent root's facts depend on the focused agent (the host never offers itself), so
 * `focusedAgentRunId` is required for `agent` and ignored for Team and Org roots.
 * `null` when the root does not exist or is not collaboration-eligible.
 */
export const collaboratorPortOf = async (
  sources: RunCollaboratorPortSources,
  rootSubjectKind: RootSubjectKind,
  rootRunIdInput: string,
  focusedAgentRunIdInput?: string | null,
): Promise<CollaboratorRootPort | null> => {
  const rootRunId = rootRunIdInput.trim();
  const memoryDir = sources.memoryDir;
  const layout = new AgentMemoryLayout(memoryDir);
  switch (rootSubjectKind) {
    case "agent_team": {
      const active = sources.activeTeamRun(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new TeamRunExecutionTreeStore().read(layout.getTeamDirPath({ rootTeamRunId: rootRunId, ancestorTeamRunIds: [] }), rootRunId);
      return tree ? teamCollaboratorPortFor(tree, NOTHING_REACHED) : null;
    }
    case "agent_org": {
      const active = sources.activeOrgRun(rootRunId);
      if (active) return active.collaboratorPort();
      const tree = await new AgentOrgRunExecutionTreeStore().read(layout.getOrgDirPath(rootRunId), rootRunId);
      return tree ? agentOrgCollaboratorPortFor(tree) : null;
    }
    case "agent": {
      const focusedAgentRunId = focusedAgentRunIdInput?.trim();
      if (!focusedAgentRunId) throw new Error("focusedAgentRunId is required for an Agent run root.");
      const active = sources.activeAgentRoot(rootRunId);
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
      // The run's own address (contract §3.3), else derived from its definition.
      const host = { address: metadata.address ?? createAgentTeamAddress([collaboratorSegmentForName(metadata.agentDefinitionId)]),
        agentRunId: rootRunId, agentDefinitionId: metadata.agentDefinitionId };
      return standaloneRootCollaboratorPortFor(host, launch, focusedAgentRunId, NOTHING_REACHED);
    }
  }
};

const emptyPort = (agentDefinitionId: string): CollaboratorRootPort => Object.freeze({
  isApplicationBound: false,
  launchBase: () => { throw new Error("This run cannot delegate: it is application- or system-owned."); },
  ownDefinition: () => Object.freeze({ kind: "agent", definitionId: agentDefinitionId }),
  inRunPlacementsByDefinition: async () => new Map(),
  addressesInUse: async () => new Set<string>(),
});
