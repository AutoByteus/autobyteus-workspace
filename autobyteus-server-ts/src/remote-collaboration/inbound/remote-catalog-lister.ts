import { availableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { CollaboratorCandidatePolicy } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { AvailableAgentsHandler } from "../channel/peer-gateway.js";

/**
 * B's answer to a peer's *available agents* request (autobyteus-261 DS-002): `listEligible` through this node's
 * catalog port, the same owner and port a delegation from a peer resolves its address with
 * (`catalogDefinitionAt(nodeCatalogPort, …)`), so every listed address is one a delegation accepts. Shared Agents
 * and shared Agent Teams only; each entry carries only its name, kind, address and description (REQ-403).
 */
export class RemoteCatalogLister implements AvailableAgentsHandler {
  constructor(private readonly dependencies: Readonly<{
    policy(): Pick<CollaboratorCandidatePolicy, "listEligible">;
    catalogPort: CollaboratorRootPort;
  }>) {}

  async list() {
    const eligible = await this.dependencies.policy().listEligible(this.dependencies.catalogPort);
    return Object.freeze({ accepted: true as const, agents: Object.freeze(eligible.map(availableCollaboratorEntry)) });
  }
}
