import type { TeamRunHistoryDefinitionGroup, TeamTreeNode } from '~/stores/runHistoryTypes';

export type WorkspaceHistoryTeamDefinitionDisplayGroup = {
  key: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamTreeNode[];
  representativeRun: TeamTreeNode;
  hasActiveRuns: boolean;
};

export const resolveTeamDefinitionGroupKey = (
  team: Pick<TeamTreeNode, 'teamDefinitionId' | 'teamDefinitionName' | 'teamRunId'>,
): string =>
  team.teamDefinitionId?.trim() || team.teamDefinitionName?.trim() || 'team';

const buildDisplayGroupsFromTeamNodes = (
  teams: TeamTreeNode[],
): WorkspaceHistoryTeamDefinitionDisplayGroup[] => {
  const groups = new Map<string, WorkspaceHistoryTeamDefinitionDisplayGroup>();

  for (const team of teams) {
    const key = resolveTeamDefinitionGroupKey(team);
    const existing = groups.get(key);
    if (existing) {
      existing.runs.push(team);
      existing.hasActiveRuns ||= team.isActive;
      if (existing.representativeRun.lastActivityAt < team.lastActivityAt) {
        existing.representativeRun = team;
      }
      continue;
    }

    groups.set(key, {
      key,
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName || 'Team',
      runs: [team],
      representativeRun: team,
      hasActiveRuns: team.isActive,
    });
  }

  return Array.from(groups.values());
};

const buildDisplayGroupsFromHistory = (
  historyGroups: TeamRunHistoryDefinitionGroup[],
  teamNodes: TeamTreeNode[],
): WorkspaceHistoryTeamDefinitionDisplayGroup[] => {
  const teamNodeByRunId = new Map(teamNodes.map((team) => [team.teamRunId, team]));
  const seenRunIds = new Set<string>();
  const displayGroups: WorkspaceHistoryTeamDefinitionDisplayGroup[] = [];

  for (const historyGroup of historyGroups) {
    const runs = historyGroup.runs
      .map((run) => {
        const node = teamNodeByRunId.get(run.teamRunId) ?? null;
        if (node) {
          seenRunIds.add(node.teamRunId);
        }
        return node;
      })
      .filter((team): team is TeamTreeNode => team !== null);

    if (runs.length === 0) {
      continue;
    }

    let representativeRun = runs[0]!;
    for (const run of runs) {
      if (representativeRun.lastActivityAt < run.lastActivityAt) {
        representativeRun = run;
      }
    }

    displayGroups.push({
      key:
        historyGroup.teamDefinitionId.trim()
        || historyGroup.teamDefinitionName.trim()
        || representativeRun.teamRunId,
      teamDefinitionId: historyGroup.teamDefinitionId,
      teamDefinitionName: historyGroup.teamDefinitionName || representativeRun.teamDefinitionName || 'Team',
      runs,
      representativeRun,
      hasActiveRuns: runs.some((run) => run.isActive),
    });
  }

  const leftoverRuns = teamNodes.filter((team) => !seenRunIds.has(team.teamRunId));
  if (leftoverRuns.length > 0) {
    displayGroups.push(...buildDisplayGroupsFromTeamNodes(leftoverRuns));
  }

  return displayGroups;
};

export const buildWorkspaceTeamDefinitionDisplayGroups = (
  historyGroups: TeamRunHistoryDefinitionGroup[],
  teamNodes: TeamTreeNode[],
): WorkspaceHistoryTeamDefinitionDisplayGroup[] => {
  if (historyGroups.length === 0) {
    return buildDisplayGroupsFromTeamNodes(teamNodes);
  }
  return buildDisplayGroupsFromHistory(historyGroups, teamNodes);
};
