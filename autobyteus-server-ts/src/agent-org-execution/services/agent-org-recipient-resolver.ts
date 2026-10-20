import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { resolveDelegationPlacement, sourcedPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import { configuredPlacementSource } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  resolveMessageRecipient,
  type CollaborationMessagePlacement,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { AgentOrgRunCollaborators } from "./agent-org-run-collaborators.js";
import type { ResolvedAgentOrgRecipient } from "./agent-org-task-execution-adapter.js";

/** Resolves Org addresses by subject (DS-001, DS-002). Called inside the Org operation gate. */
export class AgentOrgRecipientResolver {
  constructor(private readonly options: Readonly<{
    getIndex(): AgentOrgExecutionIndex;
    collaborators: AgentOrgRunCollaborators;
  }>) {}

  /**
   * The one standing instance a message reaches: within the sender's own Team instance first (a
   * copy of a mounted Team reaches its own members, REQ-007), then a configured Agent or mounted
   * Team (its coordinator); anything else is not found (messaging never creates a run).
   */
  resolveMessageRecipient(sender: CollaborationMemberExecutionIdentity, addressInput: string): CollaborationMessagePlacement {
    return resolveMessageRecipient({
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.requireAddress(addressInput),
    });
  }

  /** CM-1 refusal first, then a configured placement outside the sender's own Team, then a catalog copy. */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, addressInput: string): Promise<ResolvedAgentOrgRecipient> {
    const address = this.requireAddress(addressInput);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      resolveInRun: () => this.resolveInRunDelegationPlacement(address),
      catalogSource: () => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId }),
    });
  }

  /**
   * A configured placement of the Org (CM-1 has already refused the sender's own Team), with the snapshot
   * its copy starts from: the placement as it is now, a Team's with its members' handoff rules in the Org.
   */
  private resolveInRunDelegationPlacement(address: AgentTeamAddress): ResolvedAgentOrgRecipient {
    const index = this.options.getIndex();
    const configured = index.getConfiguredPlacement(address);
    if (configured) return sourcedPlacement(address, configuredPlacementSource(configured, index.tree.handoffs));
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", delegationTargetUnavailableMessage(address));
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") throw new Error("AgentOrg root '/' is structural and is not a recipient.");
    return address;
  }
}
