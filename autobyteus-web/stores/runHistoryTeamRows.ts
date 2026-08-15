import type {
  ConfiguredMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamMemberTreeRow, TeamRunHistoryItem } from './runHistoryTypes';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';

const isActiveStatus = (status: AgentStatus): boolean => (
  status !== AgentStatus.Error && status !== AgentStatus.Offline
);

const projectConfiguredRows = (input: {
  rootTeamRunId: string;
  members: readonly ConfiguredMemberExecutionDto[];
  summary: string;
  lastActivityAt: string;
  statusByAgentRunId: ReadonlyMap<string, AgentStatus>;
  workspaceByAgentRunId: ReadonlyMap<string, string | null>;
}): TeamMemberTreeRow[] => input.members.map((member): TeamMemberTreeRow => {
  if (member.kind === 'configured_team') {
    return {
      teamRunId: input.rootTeamRunId,
      kind: 'agent_team',
      memberAddress: member.address,
      displayName: memberAddressBasename(member.address),
      agentRunId: null,
      teamDefinitionId: member.team_definition_id,
      teamRunIdForNode: member.team_run_id,
      coordinatorAddress: member.coordinator_address,
      workspaceRootPath: null,
      summary: input.summary,
      lastActivityAt: input.lastActivityAt,
      currentStatus: null,
      isActive: false,
      deleteLifecycle: 'READY',
      children: projectConfiguredRows({ ...input, members: member.members }),
    };
  }
  const currentStatus = normalizeAgentRuntimeStatus(
    input.statusByAgentRunId.get(member.agent_run_id) ?? AgentStatus.Offline,
  );
  return {
    teamRunId: input.rootTeamRunId,
    kind: 'agent',
    memberAddress: member.address,
    displayName: memberAddressBasename(member.address),
    agentRunId: member.agent_run_id,
    teamRunIdForNode: null,
    workspaceRootPath: input.workspaceByAgentRunId.get(member.agent_run_id)
      ?? member.launch_configuration.workspace_root_path,
    summary: input.summary,
    lastActivityAt: input.lastActivityAt,
    currentStatus,
    isActive: isActiveStatus(currentStatus),
    deleteLifecycle: 'READY',
    children: [],
  };
});

const mapFromHistory = <T>(
  values: readonly T[],
  key: (value: T) => string,
  map: (value: T) => string | null,
): ReadonlyMap<string, string | null> => new Map(values.map((value) => [key(value), map(value)]));

export const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

export const buildTeamRowsFromHistoryItem = (team: TeamRunHistoryItem): TeamMemberTreeRow[] =>
  projectConfiguredRows({
    rootTeamRunId: team.teamRunId,
    members: team.rootTeam.members,
    summary: team.summary,
    lastActivityAt: team.createdAt,
    statusByAgentRunId: new Map(team.members.map((member) => [
      member.agentRunId,
      normalizeAgentRuntimeStatus(member.status),
    ])),
    workspaceByAgentRunId: mapFromHistory(
      team.members,
      (member) => member.agentRunId,
      (member) => member.workspaceRootPath ?? null,
    ),
  });

export const buildTeamRowsFromContext = (
  teamContext: AgentTeamContext,
  summary: string,
  fallbackLastActivityAt: string,
  resolveWorkspaceRootPath: (workspaceId: string | null) => string,
): TeamMemberTreeRow[] => {
  const tree = teamContext.view.getExecutionTree();
  const entries = teamContext.view.listAgentContextEntries();
  return projectConfiguredRows({
    rootTeamRunId: teamContext.view.getRootTeamRunId(),
    members: tree.root_team.members,
    summary,
    lastActivityAt: fallbackLastActivityAt,
    statusByAgentRunId: new Map(entries.map((entry) => [
      entry.agentRunId,
      normalizeAgentRuntimeStatus(entry.agentContext.state.currentStatus),
    ])),
    workspaceByAgentRunId: new Map(entries.map((entry) => [
      entry.agentRunId,
      entry.agentContext.config.workspaceMetadata?.workspaceRootPath
        || resolveWorkspaceRootPath(entry.agentContext.config.workspaceId ?? null)
        || null,
    ])),
  });
};

export const rootConfiguredTeam = (
  tree: TeamRunExecutionTreeDto,
): TeamRunExecutionTreeDto['root_team'] => tree.root_team;
