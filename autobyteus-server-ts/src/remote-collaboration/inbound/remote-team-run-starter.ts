import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  isAgentTeamAddressAncestor,
  rebaseDefinitionAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { peerStartedTeamMembers } from "../../agent-team-execution/domain/team-run-remote-links.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import { TeamLayoutMismatchError } from "../../agent-team-execution/services/flat-team-topology-planner.js";
import type { CreateTeamRunInput, TeamRunMemberConfigInput, TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { TaskTeamExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerHandlerRefusal, StartedRunAnswer } from "../channel/peer-gateway.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";

/** What changed between resolving the Team and creating it (N-302): the delegating node reads it as the reason. */
export const TEAM_CHANGED_WHILE_STARTING = "the Agent Team changed while it was being started.";

const launchInput = (launch: AgentLaunchConfiguration) => ({
  runtimeKind: launch.runtimeKind,
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig) as Record<string, unknown>,
  autoExecuteTools: launch.autoExecuteTools,
  workspaceRootPath: launch.workspaceRootPath,
});

/** A member address of the resolved source (mounted at the catalog address) as the Team run's own address. */
const unmounted = (address: AgentTeamAddress, mount: AgentTeamAddress): AgentTeamAddress => {
  if (!isAgentTeamAddressAncestor(mount, address)) throw new Error(`Team member '${address}' is not under '${mount}'.`);
  return createAgentTeamAddress(getAgentTeamAddressSegments(address).slice(getAgentTeamAddressSegments(mount).length));
};

/**
 * B's Team creation for a peer's delegation (autobyteus-247 G-9, DS-001): the one owner of mapping a resolved
 * `TaskTeamExecutionSource` to `TeamRunService.createTeamRun`. The Team's own launch is the source's default,
 * each member gets its resolved launch (the temp workspace and auto-approve, as `defaults_only` resolved them),
 * and `delegatedFrom` goes onto the tree. The Team run is created, not started: its members start on input.
 *
 * The planned layout must be the resolved one (N-302): `createTeamRun` re-plans from the definition, so a member
 * config is passed for every resolved member, and the created tree is compared with the source. A definition
 * edited in between is `AGENT_CANNOT_RUN`; a root already created is terminated first.
 */
export class RemoteTeamRunStarter {
  constructor(private readonly dependencies: Readonly<{
    teamRuns: Pick<TeamRunService, "createTeamRun" | "terminateTeamRun">;
  }>) {}

  async start(input: Readonly<{
    source: TaskTeamExecutionSource;
    /** The catalog address the source is mounted at (the delegating node's `recipient_address`). */
    address: AgentTeamAddress;
    /** The Team definition's name, for the refusal texts. */
    name: string;
    delegatedFrom: DelegatedFrom;
  }>): Promise<StartedRunAnswer | PeerHandlerRefusal> {
    const refuse = (message: string): PeerHandlerRefusal =>
      Object.freeze({ accepted: false, code: REMOTE_REFUSAL.AGENT_CANNOT_RUN, message, targetName: input.name });
    const memberConfigs: TeamRunMemberConfigInput[] = input.source.members.map((member) => ({
      memberAddress: unmounted(member.address, input.address),
      agentDefinitionId: member.agentDefinitionId,
      ...launchInput(member.launchConfiguration),
    }));
    const request: CreateTeamRunInput = {
      teamDefinitionId: input.source.teamDefinitionId,
      teamConfigs: [{ teamAddress: "/", ...launchInput(input.source.defaultLaunchConfiguration) }],
      memberConfigs,
      delegatedFrom: input.delegatedFrom,
    };
    let root: RootTeamRun;
    try {
      root = await this.dependencies.teamRuns.createTeamRun(request);
    } catch (error) {
      if (error instanceof TeamLayoutMismatchError) return refuse(TEAM_CHANGED_WHILE_STARTING);
      return refuse(error instanceof Error ? error.message : String(error));
    }
    const tree = root.getExecutionTreeSnapshot();
    const members = peerStartedTeamMembers(tree);
    const planned = new Set(members.map((member) => member.address as string));
    const coordinator = unmounted(input.source.coordinatorAddress, input.address);
    if (tree.rootTeam.coordinatorAddress !== coordinator || planned.size !== memberConfigs.length
      || memberConfigs.some((member) => !planned.has(member.memberAddress))) {
      await this.dependencies.teamRuns.terminateTeamRun(root.teamRunId).catch(() => false);
      return refuse(TEAM_CHANGED_WHILE_STARTING);
    }
    // The answer names the members as the delegating node addresses them: mounted at the catalog address.
    const mounted = (address: string) => rebaseDefinitionAgentTeamAddress(address, input.address);
    return Object.freeze({
      accepted: true as const,
      kind: "agent_team" as const,
      teamRunId: root.teamRunId,
      coordinatorAddress: mounted(tree.rootTeam.coordinatorAddress),
      members: Object.freeze(members.map((member) => Object.freeze({ address: mounted(member.address), agentRunId: member.agentRunId }))),
    });
  }
}
