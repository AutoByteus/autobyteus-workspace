import { addressesInUseOf, buildInRunPlacements, type CollaboratorRootPort, type ReachedPlacements } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { DelegationWork } from "../../model-routing/domain/model-routing-types.js";
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
import type { StandaloneRunAgent } from "../domain/standalone-run-agent.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { DelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";

/**
 * Catalog facts of a standalone run for its one agent: the run's own agent at its address, whose definition is its
 * own (a run never delegates to its own definition, SR-037), and what it reaches by address step 2 (SR-059).
 */
export const standaloneRootCollaboratorPortFor = (
  agent: StandaloneRunAgent,
  rootLaunchConfiguration: AgentLaunchConfiguration,
  viewerAgentRunId: string,
  reached: ReachedPlacements,
): CollaboratorRootPort => {
  const agentDefinition = Object.freeze({ kind: "agent" as const, definitionId: agent.agentDefinitionId });
  const ownDefinition = viewerAgentRunId === agent.agentRunId ? agentDefinition : null;
  return Object.freeze({
    isApplicationBound: false,
    launchBase: () => Object.freeze({ kind: "inherited" as const, launch: rootLaunchConfiguration }),
    ownDefinition: () => ownDefinition,
    inRunPlacementsByDefinition: async () => buildInRunPlacements({
      runAgent: { ref: agentDefinition, address: agent.address },
      configured: [], configuredStep: 3, reached: await reached(),
    }),
    addressesInUse: async () => addressesInUseOf([agent.address], await reached()),
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
    /** The run's own settings, as saved now; catalog copies snapshot them (REQ-004). */
    inheritedLaunch(): AgentLaunchConfiguration;
    agent: StandaloneRunAgent;
    /** What the run reaches by address step 2 (SR-059). */
    reached: ReachedPlacements;
    /** A configured placement step 2 reaches at an address, with its snapshot (SR-059). */
    reachedPlacementAt(address: AgentTeamAddress): Promise<DelegationPlacement | null>;
  }>) {}

  /** `delegate_task`'s in-run placement: a configured placement the run's address step 2 reaches (SR-059). */
  reachedPlacementAt(address: AgentTeamAddress): Promise<DelegationPlacement | null> {
    return this.options.reachedPlacementAt(address);
  }

  /** `@` for the focused agent: each mentioned definition's name, kind, address and presence; adds nothing. */
  resolveMentions(viewerAgentRunId: string, definitions: readonly CollaboratorMention[], viewer: MentionViewer): Promise<CollaboratorAdmissionResult> {
    return this.admission.resolveMentions(this.portFor(viewerAgentRunId), definitions, viewer);
  }

  /** `list_available_agents` for the calling agent. */
  listAvailable(viewerAgentRunId: string): Promise<readonly AvailableCollaborator[]> {
    return this.admission.policy.listEligible(this.portFor(viewerAgentRunId));
  }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string; work: DelegationWork; workspaceRootPath: string | null }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.portFor(input.senderRunId), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  /** The root's catalog facts as seen by one agent of the run. */
  portFor(viewerAgentRunId: string): CollaboratorRootPort {
    return standaloneRootCollaboratorPortFor(this.options.agent, this.options.inheritedLaunch(), viewerAgentRunId, this.options.reached);
  }
}
