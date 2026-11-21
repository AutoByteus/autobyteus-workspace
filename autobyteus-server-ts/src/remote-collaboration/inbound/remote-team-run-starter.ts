import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { DelegatedRunStartError, type DelegatedRunStarter } from "../../agent-collaboration/execution/delegation/delegated-run-starter.js";
import type { TaskTeamExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerHandlerRefusal, StartedRunAnswer } from "../channel/peer-gateway.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";

/** The Team run created (its launches are added by the receiver, which resolved them). */
export type StartedTeamRun = Omit<Extract<StartedRunAnswer, { kind: "agent_team" }>, "launches">;

/** What changed between resolving the Team and creating it (N-302): the delegating node reads it as the reason. */
export const TEAM_CHANGED_WHILE_STARTING = "the Agent Team changed while it was being started.";

/**
 * B's Team creation for a peer's delegation (autobyteus-247 G-9, DS-001): the run is created by `DelegatedRunStarter`
 * (the same as a local delegation, autobyteus-461); this keeps only the peer's concerns: the refusal the delegating node
 * reads. The members are named by their own team-local addresses (`/lead`, SR-030): the delegating node reaches them by
 * run ID only, and keeps them in the Task entry's `members` as they are.
 */
export class RemoteTeamRunStarter {
  constructor(private readonly dependencies: Readonly<{ starter: Pick<DelegatedRunStarter, "startTeam"> }>) {}

  async start(input: Readonly<{
    source: TaskTeamExecutionSource;
    /** The catalog address the source is mounted at (the delegating node's `recipient_address`). */
    address: AgentTeamAddress;
    /** The Team definition's name, for the refusal texts. */
    name: string;
    delegatedFrom: DelegatedFrom;
  }>): Promise<StartedTeamRun | PeerHandlerRefusal> {
    const refuse = (message: string): PeerHandlerRefusal =>
      Object.freeze({ accepted: false, code: REMOTE_REFUSAL.AGENT_CANNOT_RUN, message, target: Object.freeze({ kind: "agent_team" as const, name: input.name }) });
    try {
      // N-6: a peer delegates to a catalog address, so its copy is a copy of the Team definition (it follows it).
      const started = await this.dependencies.starter.startTeam({ source: input.source, address: input.address, delegatedFrom: input.delegatedFrom,
        copiedFrom: "team_definition" });
      return Object.freeze({
        accepted: true as const,
        kind: "agent_team" as const,
        teamRunId: started.teamRunId,
        coordinatorAddress: started.coordinatorAddress,
        members: Object.freeze(started.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId }))),
      });
    } catch (error) {
      if (error instanceof DelegatedRunStartError) return refuse(error.changedWhileStarting ? TEAM_CHANGED_WHILE_STARTING : error.message);
      return refuse(error instanceof Error ? error.message : String(error));
    }
  }
}
