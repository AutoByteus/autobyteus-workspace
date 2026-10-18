import { buildInRunPlacements, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import { type MentionViewer } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type {
  CatalogTaskSource,
  CollaboratorAdmission,
  CollaboratorAdmissionResult,
  CollaboratorMention,
} from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { getCollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";

/**
 * Catalog facts of one Agent-root tree for one viewer (the focused or sending agent). The
 * host is always in the run, as the run's own agent at its host address; its definition is the
 * viewer's own only when the viewer is the host, so every other agent in the run can mention,
 * list and message the host while the host never offers itself.
 */
export const standaloneRootCollaboratorPortFor = (
  tree: StandaloneRootTreeSnapshot,
  rootLaunchConfiguration: AgentLaunchConfiguration,
  viewerAgentRunId: string,
): CollaboratorRootPort => {
  const hostDefinition = Object.freeze({ kind: "agent" as const, definitionId: tree.host.agentDefinitionId });
  const ownDefinition = viewerAgentRunId === tree.host.agentRunId ? hostDefinition : null;
  return Object.freeze({
    rootKind: "agent",
    isApplicationBound: false,
    rootLaunchConfiguration: () => rootLaunchConfiguration,
    ownDefinition: () => ownDefinition,
    inRunPlacementsByDefinition: () => buildInRunPlacements({
      runAgent: { ref: hostDefinition, address: tree.host.address },
      configured: [],
    }),
    addressesInUse: () => new Set([tree.host.address]),
  });
};

/**
 * Agent-root catalog questions. `@` only resolves the mentioned definitions' addresses and
 * presence (nothing is added); delegation reads a catalog definition's source snapshot; discovery
 * lists the eligible definitions. No collaborator is ever added and nothing here writes.
 */
export class StandaloneRootCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    /** The host run's own settings; catalog copies snapshot them (REQ-004). */
    rootLaunchConfiguration: AgentLaunchConfiguration;
    getTree(): StandaloneRootTreeSnapshot;
  }>) {}

  /** `@` for the focused agent: each mentioned definition's name, kind, address and presence; adds nothing. */
  resolveMentions(viewerAgentRunId: string, definitions: readonly CollaboratorMention[], viewer: MentionViewer): Promise<CollaboratorAdmissionResult> {
    return this.admission.resolveMentions(this.portFor(viewerAgentRunId), definitions, viewer);
  }

  /** `list_available_agents` for the calling agent. */
  listAvailable(viewerAgentRunId: string): Promise<readonly AvailableCollaborator[]> {
    return this.admission.policy.listEligible(this.portFor(viewerAgentRunId));
  }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.portFor(input.senderRunId), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  /** The root's catalog facts as seen by one agent of the run. */
  portFor(viewerAgentRunId: string): CollaboratorRootPort {
    return standaloneRootCollaboratorPortFor(this.options.getTree(), this.options.rootLaunchConfiguration, viewerAgentRunId);
  }
}
