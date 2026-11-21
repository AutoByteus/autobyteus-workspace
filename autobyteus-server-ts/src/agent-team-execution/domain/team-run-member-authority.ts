import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import type { TeamRunResolver } from "../services/team-run-resolver.js";

/**
 * Who may act in one team run (§ Member States And Call-Site Rules), moved out of `RootTeamRun` with this change: a
 * current member may receive and send; a member removed from the team that is still finishing its turn (leaving) may
 * send and answer its own approvals, never receive; a stopped former member may do neither. Live means its TeamRun is
 * active (members start lazily).
 */
export class TeamRunMemberAuthority {
  constructor(private readonly options: Readonly<{
    teamRunId: string;
    getIndex(): TeamExecutionIndex;
    resolver: Pick<TeamRunResolver, "getActive">;
  }>) {}

  /** A receiver: a current member at its own address, live. */
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    if (!this.ownRoot(identity)) return false;
    const execution = this.options.getIndex().getAgent(identity.agentRunId);
    return !!execution && execution.address === identity.memberAddress && this.isLiveAgent(identity.agentRunId);
  }

  /** A sender: a current member, or a leaving one, at its own address, live. */
  maySend(identity: CollaborationMemberExecutionIdentity): boolean {
    if (!this.ownRoot(identity)) return false;
    const execution = this.options.getIndex().getAgentForOwnCommand(identity.agentRunId);
    return !!execution && execution.address === identity.memberAddress && this.isLiveAgent(identity.agentRunId);
  }

  authorizeSender(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.maySend(identity)) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        `AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in root '${this.options.teamRunId}'.`,
      );
    }
  }

  /** Runtime liveness of a current or leaving member: its TeamRun is active. */
  isLiveAgent(agentRunId: string): boolean {
    const agent = this.options.getIndex().getAgentForOwnCommand(agentRunId);
    return !!agent && this.options.resolver.getActive(agent.containingTeamRunId) !== null;
  }

  private ownRoot(identity: CollaborationMemberExecutionIdentity): boolean {
    return identity.root.rootSubjectKind === "agent_team" && identity.root.rootRunId === this.options.teamRunId;
  }
}
