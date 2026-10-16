import { buildInRunPlacements, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import { type MentionViewer } from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type {
  CatalogTaskSource,
  CollaboratorAdmission,
  CollaboratorAdmissionResult,
  CollaboratorMention,
} from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { getCollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";

/** Catalog facts of one Team tree: the root Team and its configured Agents are in the run. */
export const teamCollaboratorPortFor = (tree: TeamRunExecutionTreeSnapshot): CollaboratorRootPort => Object.freeze({
  rootKind: "agent_team",
  isApplicationBound: tree.applicationBinding !== null,
  rootLaunchConfiguration: () => tree.rootTeam.defaultLaunchConfiguration,
  ownDefinition: () => Object.freeze({ kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId }),
  inRunPlacementsByDefinition: () => buildInRunPlacements({
    configured: tree.rootTeam.members.map((member) => ({
      ref: { kind: "agent", definitionId: member.agentDefinitionId }, address: member.address,
    })),
  }),
  addressesInUse: () => new Set(tree.rootTeam.members.map((member) => member.address)),
});

/**
 * Team-root catalog questions. `@` only resolves the mentioned definitions' addresses and
 * presence (nothing is added); delegation reads a catalog definition's source snapshot; discovery
 * lists the eligible definitions. No collaborator is ever added.
 */
export class TeamRunCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    getTree(): TeamRunExecutionTreeSnapshot;
  }>) {}

  /** `@`: each mentioned definition's name, kind and address; adds nothing. */
  resolveMentions(definitions: readonly CollaboratorMention[], viewer: MentionViewer): Promise<CollaboratorAdmissionResult> {
    return this.admission.resolveMentions(this.port(), definitions, viewer);
  }

  listAvailable(): Promise<readonly AvailableCollaborator[]> { return this.admission.policy.listEligible(this.port()); }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.port(), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  port(): CollaboratorRootPort {
    return teamCollaboratorPortFor(this.options.getTree());
  }
}
