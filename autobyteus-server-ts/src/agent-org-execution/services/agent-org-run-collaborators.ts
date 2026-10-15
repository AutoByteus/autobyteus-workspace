import { buildInRunPlacements, type CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type {
  CatalogTaskSource,
  CollaboratorAdmission,
  CollaboratorAdmissionResult,
  CollaboratorMention,
} from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CatalogDefinitionRef } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import { getCollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";

/** Catalog facts of one Org tree: the Org, its direct Agents, mounted Teams and their Agents are in the run. */
export const agentOrgCollaboratorPortFor = (tree: AgentOrgRunExecutionTreeSnapshot): CollaboratorRootPort => {
  const configured: { ref: CatalogDefinitionRef; address: AgentTeamAddress }[] = [];
  const addresses = new Set<string>();
  for (const member of tree.rootOrg.members) {
    addresses.add(member.address);
    if ("agentRunId" in member) {
      configured.push({ ref: { kind: "agent", definitionId: member.agentDefinitionId }, address: member.address });
      continue;
    }
    configured.push({ ref: { kind: "agent_team", definitionId: member.teamDefinitionId }, address: member.address });
    member.members.forEach((agent) =>
      configured.push({ ref: { kind: "agent", definitionId: agent.agentDefinitionId }, address: agent.address }));
  }
  return Object.freeze({
    rootKind: "agent_org",
    isApplicationBound: tree.applicationBinding !== null,
    rootLaunchConfiguration: () => tree.rootOrg.defaultLaunchConfiguration,
    // An Org is never a catalog candidate, so it has no own definition to exclude.
    ownDefinition: () => null,
    inRunPlacementsByDefinition: () => buildInRunPlacements({ configured }),
    addressesInUse: () => addresses,
  });
};

/**
 * Org-root catalog questions. `@` only resolves the mentioned definitions' addresses and presence
 * (nothing is added); delegation reads a catalog definition's source snapshot; discovery lists the
 * eligible definitions. No collaborator is ever added.
 */
export class AgentOrgRunCollaborators {
  constructor(private readonly options: Readonly<{
    admission?: CollaboratorAdmission;
    getTree(): AgentOrgRunExecutionTreeSnapshot;
  }>) {}

  /** `@`: each mentioned definition's name, kind and address; adds nothing. */
  resolveMentions(definitions: readonly CollaboratorMention[]): Promise<CollaboratorAdmissionResult> {
    return this.admission.resolveMentions(this.port(), definitions);
  }

  listAvailable(): Promise<readonly AvailableCollaborator[]> { return this.admission.policy.listEligible(this.port()); }

  catalogTaskSource(input: Readonly<{ address: string; senderRunId: string }>): Promise<CatalogTaskSource | null> {
    return this.admission.catalogTaskSource(this.port(), input);
  }

  private get admission(): CollaboratorAdmission { return this.options.admission ?? getCollaboratorAdmission(); }

  port(): CollaboratorRootPort {
    return agentOrgCollaboratorPortFor(this.options.getTree());
  }
}
