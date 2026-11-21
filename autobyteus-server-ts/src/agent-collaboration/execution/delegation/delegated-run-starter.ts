import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../domain/collaboration-handoff.js";
import { peerStartedTeamMembers } from "../../../agent-team-execution/domain/team-run-remote-links.js";
import type { TeamRunCopiedFrom, TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamLayoutMismatchError } from "../../../agent-team-execution/services/flat-team-topology-planner.js";
import type { CreateTeamRunInput, TeamRunMemberConfigInput, TeamRunService } from "../../../agent-team-execution/services/team-run-service.js";
import type { AgentLaunchConfiguration } from "../../../agent-team-execution/domain/team-run-config.js";
import type { PrepareAgentRunInput, PrepareAgentRunResult } from "../../../agent-execution/services/agent-run-service.js";
import type { TaskAgentExecutionSource, TaskTeamExecutionSource } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";

/** A delegated team run created, rooted at `/` like every team run (contract §2.2, TC-12): its members in its own space. */
export type StartedDelegatedTeam = Readonly<{
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  coordinatorAgentRunId: string;
  members: readonly Readonly<{ address: AgentTeamAddress; agentRunId: string }>[];
}>;

/** Why a delegated run could not be created; `changedWhileStarting` when the team's definition changed in between (N-302). */
export class DelegatedRunStartError extends Error {
  constructor(message: string, readonly changedWhileStarting = false, options?: ErrorOptions) {
    super(message, options);
    this.name = "DelegatedRunStartError";
  }
}

const launchInput = (launch: AgentLaunchConfiguration) => ({
  runtimeKind: launch.runtimeKind,
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig) as Record<string, unknown>,
  autoExecuteTools: launch.autoExecuteTools,
  workspaceRootPath: launch.workspaceRootPath,
});

/** A member address of the resolved source (mounted at the delegation address) in the team run's own space. */
const unmounted = (address: AgentTeamAddress, mount: AgentTeamAddress): AgentTeamAddress => {
  if (!isAgentTeamAddressAncestor(mount, address)) throw new Error(`Team member '${address}' is not under '${mount}'.`);
  return createAgentTeamAddress(getAgentTeamAddressSegments(address).slice(getAgentTeamAddressSegments(mount).length));
};

/**
 * The source's handoff rules (its members' rules in the delegating run) in the team run's own space: `from` and a `to`
 * in the team lose the delegation address; a `to` outside the team is kept as written (contract §2.1; CR-461-009).
 */
const handoffsInTeamSpace = (handoffs: readonly CollaborationHandoff[], mount: AgentTeamAddress): CollaborationHandoff[] =>
  handoffs.map((handoff) => ({
    from: unmounted(handoff.from as AgentTeamAddress, mount),
    to: isAgentTeamAddressAncestor(mount, handoff.to as AgentTeamAddress) ? unmounted(handoff.to as AgentTeamAddress, mount) : handoff.to,
    rules: [...handoff.rules],
  }));

/**
 * Creates an ordinary run for a delegation, local or from a peer (design DS-1, `DelegatedRunStarter`): the one owner of
 * mapping a resolved source to the ordinary run services. The run carries its own `delegatedFrom` (contract §2.2), and
 * gets its ordinary run file and history row from the run services. It is created, not started: the work packet that
 * follows starts the agent, or the team's coordinator. Extracted from the peer path's two starters, which keep only
 * the peer's concerns (refusal codes, decision records, the delegating node's addresses).
 */
export class DelegatedRunStarter {
  constructor(private readonly dependencies: Readonly<{
    agentRuns: Readonly<{ prepareAgentRun(input: PrepareAgentRunInput): Promise<PrepareAgentRunResult> }>;
    teamRuns: Pick<TeamRunService, "createTeamRun" | "terminateTeamRun">;
  }>) {}

  /** An ordinary agent run with the resolved launch, its address and its origin; its history row is written. */
  async startAgent(input: Readonly<{ source: TaskAgentExecutionSource; address: AgentTeamAddress; delegatedFrom: DelegatedFrom }>): Promise<{ agentRunId: string }> {
    const launch = input.source.launchConfiguration;
    if (!launch.workspaceRootPath) throw new DelegatedRunStartError(`The resolved launch at ${input.address} has no workspace.`);
    try {
      const prepared = await this.dependencies.agentRuns.prepareAgentRun({
        agentDefinitionId: input.source.agentDefinitionId,
        ...launchInput(launch),
        workspaceRootPath: launch.workspaceRootPath,
        address: input.address,
        ...(input.source.launchSource ? { launchSource: input.source.launchSource } : {}),
        delegatedFrom: input.delegatedFrom,
      });
      return { agentRunId: prepared.runId };
    } catch (error) {
      throw new DelegatedRunStartError(error instanceof Error ? error.message : String(error), false, { cause: error });
    }
  }

  /**
   * An ordinary team run rooted at `/` (TC-12, SR-025): the team's own launch is the source's default, each member gets
   * its resolved launch, and `delegatedFrom` goes onto its tree. `createTeamRun` re-plans from the definition, so a
   * member config is passed for every resolved member and the created tree is compared with the source (N-302): a
   * definition edited in between ends the created run and throws `changedWhileStarting`.
   */
  async startTeam(input: Readonly<{ source: TaskTeamExecutionSource; address: AgentTeamAddress; delegatedFrom: DelegatedFrom;
    /** What the copy starts from, recorded once on its tree (D-SCOPE). */
    copiedFrom: TeamRunCopiedFrom; }>): Promise<StartedDelegatedTeam> {
    const memberConfigs: TeamRunMemberConfigInput[] = input.source.members.map((member) => ({
      memberAddress: unmounted(member.address, input.address),
      agentDefinitionId: member.agentDefinitionId,
      ...launchInput(member.launchConfiguration),
      // A member's own source is recorded on the member; the team's on the team (DS-10 step 4; shown to a peer's owner, SR-038).
      ...(member.launchSource ? { launchSource: member.launchSource } : {}),
    }));
    const request: CreateTeamRunInput = {
      teamDefinitionId: input.source.teamDefinitionId,
      teamConfigs: [{ teamAddress: "/", ...launchInput(input.source.defaultLaunchConfiguration),
        ...(input.source.defaultLaunchSource ? { launchSource: input.source.defaultLaunchSource } : {}) }],
      memberConfigs,
      delegatedFrom: input.delegatedFrom,
      copiedFrom: input.copiedFrom,
      handoffs: handoffsInTeamSpace(input.source.handoffs, input.address),
    };
    // The created team run (its own root): only its ID and tree are read here.
    let root: Readonly<{ teamRunId: string; getExecutionTreeSnapshot(): TeamRunExecutionTreeSnapshot }>;
    try {
      root = await this.dependencies.teamRuns.createTeamRun(request);
    } catch (error) {
      if (error instanceof TeamLayoutMismatchError) throw new DelegatedRunStartError("The team's definition changed while it was being started.", true, { cause: error });
      throw new DelegatedRunStartError(error instanceof Error ? error.message : String(error), false, { cause: error });
    }
    const tree = root.getExecutionTreeSnapshot();
    const members = peerStartedTeamMembers(tree);
    const planned = new Set(members.map((member) => member.address as string));
    const coordinatorAddress = unmounted(input.source.coordinatorAddress, input.address);
    const coordinator = members.find((member) => member.address === coordinatorAddress);
    if (tree.rootTeam.coordinatorAddress !== coordinatorAddress || !coordinator || planned.size !== memberConfigs.length
      || memberConfigs.some((member) => !planned.has(member.memberAddress))) {
      await this.dependencies.teamRuns.terminateTeamRun(root.teamRunId).catch(() => false);
      throw new DelegatedRunStartError("The team's definition changed while it was being started.", true);
    }
    return Object.freeze({
      teamRunId: root.teamRunId,
      coordinatorAddress,
      coordinatorAgentRunId: coordinator.agentRunId,
      members: Object.freeze(members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId }))),
    });
  }
}
