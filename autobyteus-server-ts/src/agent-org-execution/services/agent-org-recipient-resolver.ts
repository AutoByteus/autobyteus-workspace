import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { AgentOrgExecutionIndex, AgentOrgMessagePlacement } from "./agent-org-execution-index.js";
import type { ResolvedAgentOrgRecipient } from "./agent-org-task-execution-adapter.js";

/** Resolves Org addresses by subject: message ingress versus delegation placement. */
export class AgentOrgRecipientResolver {
  /**
   * The one execution a message reaches: a configured Agent or direct Team (its coordinator),
   * then a collaborator Agent, a collaborator Team (its coordinator) or a collaborator Team
   * member. The first message starts a collaborator.
   */
  resolveMessageRecipient(index: AgentOrgExecutionIndex, addressInput: string): AgentOrgMessagePlacement {
    const address = this.requireAddress(addressInput);
    const placement = index.getMessagePlacement(address);
    if (placement) return placement;
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      `Recipient '${address}' is not an exact Agent, direct Team or collaborator in this AgentOrg.`,
    );
  }

  /**
   * A configured placement first, then a collaborator of this run (or a member of a
   * collaborator Team). Delegating there starts an extra copy (REQ-013).
   */
  resolveDelegationPlacement(index: AgentOrgExecutionIndex, addressInput: string): ResolvedAgentOrgRecipient {
    const address = this.requireAddress(addressInput);
    const configured = index.getConfiguredPlacement(address);
    if (configured) {
      return "agentRunId" in configured
        ? Object.freeze({ kind: "agent", address })
        : Object.freeze({ kind: "agent_team", address, coordinatorAddress: configured.coordinatorAddress });
    }
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    if (index.getMessagePlacement(address)?.kind === "agent") return Object.freeze({ kind: "agent", address });
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", delegationTargetUnavailableMessage(address, true));
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") throw new Error("AgentOrg root '/' is structural and is not a recipient.");
    return address;
  }
}
