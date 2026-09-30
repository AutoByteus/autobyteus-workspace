import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  collaboratorAddressMessageHint,
  delegationTargetUnavailableMessage,
} from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { ResolvedAgentOrgRecipient } from "./agent-org-task-execution-adapter.js";

/** Resolves Org addresses by subject: message ingress versus delegation placement. */
export class AgentOrgRecipientResolver {
  /** A configured Agent or direct Team only; a collaborator address gets a `delegate_task` hint. */
  resolveMessageRecipient(index: AgentOrgExecutionIndex, addressInput: string): ResolvedAgentOrgRecipient {
    const address = this.requireAddress(addressInput);
    const configured = this.configured(index, address);
    if (configured) return configured;
    throw new CollaborationContractError(
      "COLLABORATION_TARGET_NOT_FOUND",
      index.getCollaborator(address)
        ? collaboratorAddressMessageHint(address)
        : `Recipient '${address}' is not an exact configured Agent or direct Team in this AgentOrg.`,
    );
  }

  /** A configured placement first, then a collaborator of this run. */
  resolveDelegationPlacement(index: AgentOrgExecutionIndex, addressInput: string): ResolvedAgentOrgRecipient {
    const address = this.requireAddress(addressInput);
    const configured = this.configured(index, address);
    if (configured) return configured;
    const collaborator = index.getCollaborator(address);
    if (collaborator?.kind === "agent") return Object.freeze({ kind: "agent", address: collaborator.address });
    if (collaborator?.kind === "agent_team") {
      return Object.freeze({ kind: "agent_team", address: collaborator.address, coordinatorAddress: collaborator.coordinatorAddress });
    }
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", delegationTargetUnavailableMessage(address, true));
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") throw new Error("AgentOrg root '/' is structural and is not a recipient.");
    return address;
  }

  private configured(index: AgentOrgExecutionIndex, address: AgentTeamAddress): ResolvedAgentOrgRecipient | null {
    const placement = index.getConfiguredPlacement(address);
    if (!placement) return null;
    return "agentRunId" in placement
      ? Object.freeze({ kind: "agent", address })
      : Object.freeze({ kind: "agent_team", address, coordinatorAddress: placement.coordinatorAddress });
  }
}
