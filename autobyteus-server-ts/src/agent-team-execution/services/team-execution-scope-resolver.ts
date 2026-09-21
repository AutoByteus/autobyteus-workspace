import {
  getParentAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamExecutionIndex, IndexedTeamExecution } from "./team-execution-index.js";

/** Selects the exact concrete TeamRun that owns a logical target placement. */
export class TeamExecutionScopeResolver {
  constructor(private readonly index: TeamExecutionIndex) {}

  resolveTargetOwner(input: {
    callerAgentRunId: string;
    recipientAddress: AgentTeamAddress;
  }): IndexedTeamExecution {
    const targetParent = getParentAgentTeamAddress(input.recipientAddress);
    if (!targetParent) throw new Error(`Recipient '${input.recipientAddress}' has no containing Team placement.`);
    const containing = this.index.listContainingTeamAncestorsForAgent(input.callerAgentRunId);
    const owner = containing.find((team) => team.address === targetParent)
      ?? containing.find((team) => team.address === "/");
    if (!owner) throw new Error(`No containing TeamRun can host '${input.recipientAddress}'.`);
    return owner;
  }
}
