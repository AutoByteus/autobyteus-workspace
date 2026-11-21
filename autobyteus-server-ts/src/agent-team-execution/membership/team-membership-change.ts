import { isDeepStrictEqual } from "node:util";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import type { AgentLaunchConfiguration } from "../domain/team-run-config.js";
import type { ConfiguredAgentExecutionNode, TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";

/** A member the definition has that the run does not: its launch and run ID, resolved before the change is planned. */
export type NewTeamMemberLaunch = Readonly<{
  agentRunId: string;
  launchConfiguration: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
}>;

/**
 * A Team run's current definition as that run uses it (DS-003): the members in definition order, the coordinator, the
 * rules compiled as the run was created, and the launch of each member the run did not have when the view was read
 * (a member without one could not be launched: it is not added this time).
 */
export type TeamDefinitionView = Readonly<{
  teamDefinitionId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string }>[];
  handoffs: readonly CollaborationHandoff[];
  newMembers: ReadonlyMap<string, NewTeamMemberLaunch>;
}>;

/** One member that joined (new, or back from the former members) or left. */
export type TeamMemberRef = Readonly<{ agentRunId: string; address: AgentTeamAddress }>;

/** What following the definition changes in one run, with the run's next tree. */
export type TeamMembershipChange = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  /** New members and former members back, in definition order. */
  joined: readonly TeamMemberRef[];
  /** Members removed, in the run's member order: they are former members of the next tree. */
  left: readonly TeamMemberRef[];
  /** The rules before the change (the notices tell each member whether its own rules changed). */
  handoffsBefore: readonly CollaborationHandoff[];
}>;

/** A definition the run cannot take (its coordinator could not be added): the run stays as it is. */
export class TeamMembershipPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamMembershipPlanError";
  }
}

/** The key a new member's launch is kept under in a view. */
export const newMemberKey = (address: string, agentDefinitionId: string): string => `${address}\u0000${agentDefinitionId}`;

/**
 * DS-003, pure: the run's next tree when it follows `view`, or null when nothing changes. Compared by address and
 * agent definition: a member at an address the definition no longer has, or with another agent there (DEC-006), leaves
 * and becomes a former member; a former member at the same address with the same agent comes back with its run ID
 * (DEC-007); any other definition member is new (with the view's launch; without one it is not added). The coordinator
 * and rules are the definition's; a rule from or to an address that is not a member is left out (N-3).
 */
export const planTeamMembershipChange = (
  tree: TeamRunExecutionTreeSnapshot,
  view: TeamDefinitionView,
): TeamMembershipChange | null => {
  const current = tree.rootTeam.members;
  const former = [...tree.rootTeam.formerMembers ?? []];
  const next: ConfiguredAgentExecutionNode[] = [];
  const joined: TeamMemberRef[] = [];
  const kept = new Set<string>();
  for (const member of view.members) {
    const same = current.find((node) => node.address === member.address && node.agentDefinitionId === member.agentDefinitionId);
    if (same) { next.push(same); kept.add(same.agentRunId); continue; }
    const backIndex = lastIndexOf(former, (node) => node.address === member.address && node.agentDefinitionId === member.agentDefinitionId);
    if (backIndex >= 0) {
      const [back] = former.splice(backIndex, 1);
      next.push(back!);
      joined.push(ref(back!));
      continue;
    }
    const launch = view.newMembers.get(newMemberKey(member.address, member.agentDefinitionId));
    if (!launch) continue;
    const added: ConfiguredAgentExecutionNode = {
      address: member.address, agentDefinitionId: member.agentDefinitionId, role: null, description: null,
      agentRunId: launch.agentRunId, platformAgentRunId: null, launchConfiguration: launch.launchConfiguration,
      ...(launch.launchSource ? { launchSource: launch.launchSource } : {}),
    };
    next.push(added);
    joined.push(ref(added));
  }
  const left = current.filter((node) => !kept.has(node.agentRunId));
  if (!next.some((node) => node.address === view.coordinatorAddress)) {
    throw new TeamMembershipPlanError(`its coordinator '${view.coordinatorAddress}' could not be added`);
  }
  const addresses = new Set(next.map((node) => node.address as string));
  const handoffs = view.handoffs.filter((handoff) => addresses.has(handoff.from) && addresses.has(handoff.to));
  if (!joined.length && !left.length && view.coordinatorAddress === tree.rootTeam.coordinatorAddress
    && isDeepStrictEqual(handoffs.map(plain), tree.handoffs.map(plain))) return null;
  const formerMembers = [...former, ...left];
  const { formerMembers: _previous, ...rootTeam } = tree.rootTeam;
  return Object.freeze({
    tree: validateTeamRunExecutionTreePayload({
      ...tree,
      handoffs,
      rootTeam: { ...rootTeam, coordinatorAddress: view.coordinatorAddress, members: next, ...(formerMembers.length ? { formerMembers } : {}) },
    }, tree.rootTeam.teamRunId),
    joined: Object.freeze(joined),
    left: Object.freeze(left.map(ref)),
    handoffsBefore: tree.handoffs,
  });
};

const lastIndexOf = <T>(items: readonly T[], match: (item: T) => boolean): number => {
  for (let index = items.length - 1; index >= 0; index -= 1) if (match(items[index]!)) return index;
  return -1;
};
const ref = (node: ConfiguredAgentExecutionNode): TeamMemberRef => Object.freeze({ agentRunId: node.agentRunId, address: node.address });
const plain = (handoff: CollaborationHandoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] });
