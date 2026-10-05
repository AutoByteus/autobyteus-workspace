import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { delegationTargetUnavailableMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import { resolveDelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import {
  resolveMessageRecipient,
  type MessageRecipientResult,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { AgentOrgRunCollaborators } from "./agent-org-run-collaborators.js";
import type { ResolvedAgentOrgRecipient } from "./agent-org-task-execution-adapter.js";

/**
 * Resolves Org addresses by subject (DS-002, DS-003). Called inside the Org operation gate,
 * so a catalog bring-in never re-enters it.
 */
export class AgentOrgRecipientResolver {
  constructor(private readonly options: Readonly<{
    taskScope(sender: CollaborationMemberExecutionIdentity): NonNullable<Parameters<typeof resolveMessageRecipient>[0]["taskScope"]>;
    getIndex(): AgentOrgExecutionIndex;
    collaborators: AgentOrgRunCollaborators;
  }>) {}

  /**
   * The one instance a message reaches: within the sender's own Team instance first (a copy
   * of a mounted Team reaches its own members, REQ-007), then a configured Agent or mounted
   * Team (its coordinator), a collaborator or its member, then a catalog bring-in.
   */
  resolveMessageRecipient(sender: CollaborationMemberExecutionIdentity, addressInput: string): Promise<MessageRecipientResult> {
    return resolveMessageRecipient({
      taskScope: this.options.taskScope(sender),
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.requireAddress(addressInput),
      catalog: { bringIn: (address) => this.options.collaborators.bringInAt({ address, senderRunId: sender.agentRunId }) },
      notFoundMessage: (address) => `Recipient '${address}' is not an exact Agent, direct Team, collaborator or available agent in this AgentOrg.`,
    });
  }

  /** A catalog teammate, a configured placement, a collaborator, then a catalog copy. */
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
   * A configured placement first, then a collaborator of this run (or a member of a
   * collaborator Team). Delegating there starts an extra copy (REQ-013).
   */
  private resolveInRunDelegationPlacement(address: AgentTeamAddress): ResolvedAgentOrgRecipient {
    const index = this.options.getIndex();
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
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", delegationTargetUnavailableMessage(address));
  }

  private requireAddress(addressInput: string): AgentTeamAddress {
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") throw new Error("AgentOrg root '/' is structural and is not a recipient.");
    return address;
  }
}
