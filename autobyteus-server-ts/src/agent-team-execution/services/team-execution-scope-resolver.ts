import {
  getAgentTeamAddressSegments,
  getParentAgentTeamAddress,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamExecutionIndex, IndexedTeamExecution } from "./team-execution-index.js";

const containsAddress = (
  ancestor: AgentTeamAddress,
  descendant: AgentTeamAddress,
): boolean => ancestor === descendant || isAgentTeamAddressAncestor(ancestor, descendant);

/** Selects the exact concrete TeamRun that owns a logical target placement. */
export class TeamExecutionScopeResolver {
  constructor(private readonly index: TeamExecutionIndex) {}

  resolveTargetOwner(input: {
    callerAgentRunId: string;
    recipientAddress: AgentTeamAddress;
  }): IndexedTeamExecution {
    const targetParent = getParentAgentTeamAddress(input.recipientAddress);
    if (!targetParent) {
      throw new Error(`Recipient '${input.recipientAddress}' has no containing Team placement.`);
    }
    const containing = this.index.listContainingTeamAncestorsForAgent(input.callerAgentRunId);
    const scope = containing.find((team) => containsAddress(team.address, targetParent));
    if (!scope) {
      throw new Error(`No containing TeamRun can host '${input.recipientAddress}'.`);
    }
    return this.followConfiguredDescendants(scope, targetParent);
  }

  private followConfiguredDescendants(
    scope: IndexedTeamExecution,
    targetParent: AgentTeamAddress,
  ): IndexedTeamExecution {
    if (scope.address === targetParent) return scope;
    const scopeSegments = getAgentTeamAddressSegments(scope.address);
    const targetSegments = getAgentTeamAddressSegments(targetParent);
    if (!scopeSegments.every((segment, index) => targetSegments[index] === segment)) {
      throw new Error(`Selected TeamRun '${scope.teamRunId}' does not contain '${targetParent}'.`);
    }

    let current = scope;
    for (let depth = scopeSegments.length + 1; depth <= targetSegments.length; depth += 1) {
      const nextAddress = `/${targetSegments.slice(0, depth).join("/")}` as AgentTeamAddress;
      const candidates = this.index.listDirectTeamExecutions(current.teamRunId)
        .filter((team) => team.address === nextAddress && team.executionKind !== "task");
      if (candidates.length !== 1) {
        throw new Error(
          `TeamRun '${current.teamRunId}' does not have one exact configured child '${nextAddress}'.`,
        );
      }
      current = candidates[0]!;
    }
    return current;
  }
}
