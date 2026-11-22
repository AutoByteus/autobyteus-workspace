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
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { DelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import { ContainedTeamAddressSpace } from "../container/contained-team-address-space.js";

/**
 * Catalog facts of one Team tree: the root Team and its configured Agents are in the run, with what it reaches by step 2.
 * A Team unit's members are shown at their Org addresses (`P/x`, its address boundary, design R-1'').
 */
export const teamCollaboratorPortFor = (tree: TeamRunExecutionTreeSnapshot, reached: ReachedPlacements): CollaboratorRootPort => {
  const space = ContainedTeamAddressSpace.of(tree.containedIn);
  const shown = (address: AgentTeamAddress): AgentTeamAddress => space ? space.toOrg(address) : address;
  return Object.freeze({
    isApplicationBound: tree.applicationBinding !== null,
    launchBase: () => Object.freeze({ kind: "inherited", launch: tree.rootTeam.defaultLaunchConfiguration }),
    ownDefinition: () => Object.freeze({ kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId }),
    inRunPlacementsByDefinition: async () => buildInRunPlacements({
      configured: tree.rootTeam.members.map((member) => ({
        ref: { kind: "agent", definitionId: member.agentDefinitionId }, address: shown(member.address),
      })),
      configuredStep: 1, reached: await reached(),
    }),
    addressesInUse: async () => addressesInUseOf(tree.rootTeam.members.map((member) => shown(member.address)), await reached()),
  });
};

/**
 * Team-root catalog questions. `@` only resolves the mentioned definitions' addresses and
 * presence (nothing is added); delegation reads a catalog definition's source snapshot; discovery
 * lists the eligible definitions. No collaborator is ever added.
 */
export class TeamRunCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    getTree(): TeamRunExecutionTreeSnapshot;
    /** What the team run reaches by address step 2 (SR-059). */
    reached: ReachedPlacements;
    /** A configured placement step 2 reaches at an address, with its snapshot (SR-059). */
    reachedPlacementAt(address: AgentTeamAddress): Promise<DelegationPlacement | null>;
  }>) {}

  /** `delegate_task`'s in-run placement beyond the team's own: a configured placement step 2 reaches (SR-059). */
  reachedPlacementAt(address: AgentTeamAddress): Promise<DelegationPlacement | null> {
    return this.options.reachedPlacementAt(address);
  }

  /** `@`: each mentioned definition's name, kind and address; adds nothing. */
  resolveMentions(definitions: readonly CollaboratorMention[], viewer: MentionViewer): Promise<CollaboratorAdmissionResult> {
    return this.admission.resolveMentions(this.port(), definitions, viewer);
  }

  listAvailable(): Promise<readonly AvailableCollaborator[]> { return this.admission.policy.listEligible(this.port()); }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string; work: DelegationWork; workspaceRootPath: string | null }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.port(), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  port(): CollaboratorRootPort {
    return teamCollaboratorPortFor(this.options.getTree(), this.options.reached);
  }
}
