import {
  assertAgentTeamAddress,
  getAgentTeamAddressSegments,
  getAgentTeamAddressBasename,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { ConfiguredTeamExecutionNode } from "../domain/team-run-execution-tree.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import {
  createResolvedAgentRecipient,
  createResolvedAgentTeamRecipient,
  type ResolvedTeamRecipient,
} from "./resolved-team-recipient.js";

export class TeamRecipientResolver {
  resolve(
    index: TeamExecutionIndex,
    recipientAddress: string,
  ): ResolvedTeamRecipient {
    let address;
    try {
      address = assertAgentTeamAddress(recipientAddress);
    } catch (error) {
      if (error instanceof CollaborationContractError) throw error;
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        `Recipient address '${String(recipientAddress)}' is not canonical.`,
      );
    }
    if (!getAgentTeamAddressBasename(address)) {
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        "The root AgentTeam is not a collaboration recipient; select one mounted Agent or non-root AgentTeam address.",
      );
    }
    this.assertTraversable(index, address);
    const node = index.getConfiguredPlacement(address);
    if (!node) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration target '${address}' was not found.`,
      );
    }
    return "agentRunId" in node
      ? createResolvedAgentRecipient(node.address)
      : createResolvedAgentTeamRecipient({
          address: node.address,
          coordinatorAddress: (node as ConfiguredTeamExecutionNode).coordinatorAddress,
        });
  }

  private assertTraversable(
    index: TeamExecutionIndex,
    address: string,
  ): void {
    const segments = getAgentTeamAddressSegments(address);
    for (let length = 1; length < segments.length; length += 1) {
      const prefix = `/${segments.slice(0, length).join("/")}`;
      const node = index.getConfiguredPlacement(prefix);
      if (!node) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `Collaboration target '${address}' was not found.`,
        );
      }
      if ("agentRunId" in node) {
        throw new CollaborationContractError(
          "COLLABORATION_TRAVERSAL_INVALID",
          `Collaboration address '${address}' uses Agent '${segments[length - 1]}' as an intermediate segment.`,
        );
      }
    }
  }
}
