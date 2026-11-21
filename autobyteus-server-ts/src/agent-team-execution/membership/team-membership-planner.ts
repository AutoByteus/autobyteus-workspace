import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { FlatTeamDefinitionResolver } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type { LaunchUsabilityCheck } from "../../launch-preferences/launch-usability-check.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import {
  newMemberKey,
  planTeamMembershipChange,
  type NewTeamMemberLaunch,
  type TeamDefinitionView,
  type TeamMembershipChange,
} from "./team-membership-change.js";

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** Whether a Team run follows its definition (D-SCOPE): standalone runs and Team definition copies do. */
export const followsTeamDefinition = (tree: TeamRunExecutionTreeSnapshot): boolean =>
  tree.applicationBinding === null && tree.copiedFrom !== "configured_placement";

/**
 * Which Team runs follow their definition and what that definition is for one run (D-SCOPE, DS-003): a standalone run
 * (`own_team` rules) and a copy of a Team definition, local or a peer's (`delegated_team` rules, resolved at the copy's
 * own root, N-7). An application-bound run and a copy of a configured placement do not follow. A definition that is
 * missing, unreadable or invalid leaves the run as it is, with a warning naming the run and the reason (REQ-007). A
 * member the run would add gets its launch here, outside any lock: its agent's default, else the run's own launch, both
 * checked (DEC-005); a member that cannot be launched is not added, with a warning, and the next change tries again.
 */
export class TeamMembershipPlanner {
  constructor(private readonly dependencies: Readonly<{
    teamDefinitions: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    usability: Pick<LaunchUsabilityCheck, "check">;
    agentRunIds: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  }>) {}

  /** The run's current definition view; null when the run does not follow its definition or it cannot be read. */
  async viewFor(tree: TeamRunExecutionTreeSnapshot): Promise<TeamDefinitionView | null> {
    if (!followsTeamDefinition(tree)) return null;
    const runLabel = `Team run '${tree.rootTeam.teamRunId}'`;
    const teamDefinitionId = tree.rootTeam.teamDefinitionId;
    let resolved: Omit<TeamDefinitionView, "newMembers">;
    try {
      const definition = await this.dependencies.teamDefinitions.getDefinitionById(teamDefinitionId);
      if (!definition) {
        console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: ${runLabel} keeps its members: Team definition '${teamDefinitionId}' was not found.`);
        return null;
      }
      const graph = await new FlatTeamDefinitionResolver().resolve({ rootDefinition: definition, rootDefinitionId: teamDefinitionId, lookup: {} });
      resolved = {
        teamDefinitionId,
        coordinatorAddress: createAgentTeamAddress(graph.coordinator.absolutePath),
        members: graph.members.map((member) => Object.freeze({ address: createAgentTeamAddress(member.absolutePath), agentDefinitionId: member.agentDefinitionId })),
        handoffs: new CollaborationHandoffCompiler().compileTeam(graph, tree.delegatedFrom ? { kind: "delegated_team" } : { kind: "own_team" }),
      };
    } catch (error) {
      console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: ${runLabel} keeps its members: Team definition '${teamDefinitionId}' cannot be used (${message(error)}).`);
      return null;
    }
    const newMembers = new Map<string, NewTeamMemberLaunch>();
    const known = [...tree.rootTeam.members, ...tree.rootTeam.formerMembers ?? []];
    for (const member of resolved.members) {
      if (known.some((node) => node.address === member.address && node.agentDefinitionId === member.agentDefinitionId)) continue;
      const launch = await this.launchOf(tree, member.agentDefinitionId).catch((error: unknown) => ({ refused: message(error) }));
      if ("refused" in launch) {
        console.warn(`TEAM_MEMBER_NOT_ADDED: ${runLabel} cannot add '${member.address}' yet: ${launch.refused}`);
        continue;
      }
      newMembers.set(newMemberKey(member.address, member.agentDefinitionId), Object.freeze({
        ...launch, agentRunId: await this.dependencies.agentRunIds.allocateForAgentDefinition(member.agentDefinitionId),
      }));
    }
    return Object.freeze({ ...resolved, newMembers });
  }

  /** DS-002: a stopped run's change before it is restored; null when it does not follow or nothing changed. */
  async followStored(tree: TeamRunExecutionTreeSnapshot): Promise<TeamMembershipChange | null> {
    const view = await this.viewFor(tree);
    return view ? planOrWarn(tree, view) : null;
  }

  /** DEC-005: the agent's own default, else the run's own launch; workspace and auto-approve are the run's. */
  private async launchOf(tree: TeamRunExecutionTreeSnapshot, agentDefinitionId: string)
    : Promise<Omit<NewTeamMemberLaunch, "agentRunId"> | { refused: string }> {
    const run = tree.rootTeam.defaultLaunchConfiguration;
    const own = (await this.dependencies.agentDefinitions.getAgentDefinitionById(agentDefinitionId))?.defaultLaunchConfig ?? null;
    const result = await this.dependencies.usability.check({
      candidates: own ? [own] : [],
      context: { workspaceRootPath: run.workspaceRootPath, autoExecuteTools: run.autoExecuteTools },
      inherited: run,
      facts: null,
    });
    const ownVerdict = result.verdicts[0];
    if (ownVerdict?.usable === true) return { launchConfiguration: ownVerdict.launch, launchSource: source("agent_default", []) };
    if (result.inherited?.usable !== true) return { refused: result.inherited?.detail ?? "it has no usable launch." };
    const skipped = ownVerdict && ownVerdict.usable === false && own
      ? [{ layer: "agent_default" as const, runtimeKind: own.runtimeKind, llmModelIdentifier: own.llmModelIdentifier, reason: ownVerdict.reason, detail: ownVerdict.detail }]
      : [];
    return { launchConfiguration: result.inherited.launch, launchSource: source("team_default", skipped) };
  }
}

/** The planner of a scope whose Team runs never follow their definition (an application's runs are bound to it). */
export const NO_TEAM_DEFINITION_FOLLOWING: Pick<TeamMembershipPlanner, "viewFor" | "followStored"> = Object.freeze({
  viewFor: async () => null,
  followStored: async () => null,
});

/** The change, or none with a warning when the definition cannot be taken (the run stays as it is). */
export const planOrWarn = (tree: TeamRunExecutionTreeSnapshot, view: TeamDefinitionView): TeamMembershipChange | null => {
  try {
    return planTeamMembershipChange(tree, view);
  } catch (error) {
    console.warn(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '${tree.rootTeam.teamRunId}' keeps its members: ${message(error)}.`);
    return null;
  }
};

const source = (origin: "agent_default" | "team_default", fallbacks: LaunchConfigurationSource["fallbacks"]): LaunchConfigurationSource =>
  Object.freeze({ origin, fallbacks: Object.freeze([...fallbacks]) });
