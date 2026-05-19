import { computed } from 'vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { MobileWorkContext, MobileWorkListItem } from '~/types/mobileWork';
import type { RunHistoryItem, TeamRunHistoryItem } from '~/stores/runHistoryTypes';

const toStatusLabel = (value: string | null | undefined, isActive: boolean): string => {
  if (isActive) {
    return 'Running';
  }
  const normalized = String(value || '').toLowerCase();
  if (!normalized || normalized === 'idle') {
    return 'Idle';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const summarizeRun = (run: RunHistoryItem): string => run.summary || run.runId;
const summarizeTeamRun = (run: TeamRunHistoryItem): string => run.summary || run.teamRunId;

export type MobileWorkCatalogRefreshResult = {
  hadSuccess: boolean;
  hadFailure: boolean;
};

export function useMobileWorkCatalog() {
  const runHistoryStore = useRunHistoryStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const workspaceStore = useWorkspaceStore();

  const recentWorkItems = computed<MobileWorkListItem[]>(() => {
    const items: MobileWorkListItem[] = [];

    for (const workspace of runHistoryStore.workspaceGroups) {
      for (const agent of workspace.agentDefinitions) {
        for (const run of agent.runs) {
          const context: MobileWorkContext = {
            kind: 'agent-run',
            runId: run.runId,
            agentDefinitionId: agent.agentDefinitionId,
            title: agent.agentName || 'Agent run',
            summary: summarizeRun(run),
            workspaceRootPath: workspace.workspaceRootPath,
            isActive: run.isActive,
            lastActivityAt: run.lastActivityAt,
            statusLabel: toStatusLabel(run.lastKnownStatus, run.isActive),
          };
          items.push({
            key: `agent-run:${run.runId}`,
            label: context.title,
            detail: context.summary,
            meta: `${context.statusLabel} · ${workspace.workspaceName || workspace.workspaceRootPath || 'Workspace'}`,
            context,
          });
        }
      }

      for (const team of workspace.teamDefinitions) {
        for (const run of team.runs) {
          const focusedMemberRouteKey = run.coordinatorMemberRouteKey
            || run.members[0]?.memberRouteKey
            || 'coordinator';
          const context: MobileWorkContext = {
            kind: 'team-run',
            teamRunId: run.teamRunId,
            teamDefinitionId: run.teamDefinitionId,
            title: run.teamDefinitionName || team.teamDefinitionName || 'Team run',
            summary: summarizeTeamRun(run),
            workspaceRootPath: workspace.workspaceRootPath,
            focusedMemberRouteKey,
            isActive: run.isActive,
            lastActivityAt: run.lastActivityAt,
            statusLabel: toStatusLabel(run.lastKnownStatus, run.isActive),
          };
          items.push({
            key: `team-run:${run.teamRunId}:${focusedMemberRouteKey}`,
            label: context.title,
            detail: context.summary,
            meta: `${context.statusLabel} · ${workspace.workspaceName || workspace.workspaceRootPath || 'Workspace'}`,
            context,
          });
        }
      }
    }

    return items.sort((a, b) => {
      const aActive = 'isActive' in a.context && a.context.isActive ? 1 : 0;
      const bActive = 'isActive' in b.context && b.context.isActive ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive;
      }
      const aTime = 'lastActivityAt' in a.context ? a.context.lastActivityAt : '';
      const bTime = 'lastActivityAt' in b.context ? b.context.lastActivityAt : '';
      return bTime.localeCompare(aTime);
    });
  });

  const latestRunItem = computed(() => recentWorkItems.value[0] ?? null);

  const agentItems = computed<MobileWorkListItem[]>(() => agentDefinitionStore.agentDefinitions.map((agent) => {
    const context: MobileWorkContext = {
      kind: 'agent-definition',
      agentDefinitionId: agent.id,
      title: agent.name,
      description: agent.description || agent.role || 'Agent profile',
    };
    return {
      key: `agent-definition:${agent.id}`,
      label: context.title,
      detail: context.description,
      meta: 'Agent',
      context,
    };
  }));

  const teamItems = computed<MobileWorkListItem[]>(() => teamDefinitionStore.agentTeamDefinitions.map((team) => {
    const context: MobileWorkContext = {
      kind: 'team-definition',
      teamDefinitionId: team.id,
      title: team.name,
      description: team.description || 'Agent team profile',
      memberCount: team.nodes?.length ?? 0,
    };
    return {
      key: `team-definition:${team.id}`,
      label: context.title,
      detail: context.description,
      meta: `${context.memberCount} members`,
      context,
    };
  }));

  const workspaceItems = computed<MobileWorkListItem[]>(() => workspaceStore.allWorkspaces.map((workspace) => {
    const context: MobileWorkContext = {
      kind: 'workspace',
      workspaceId: workspace.workspaceId,
      title: workspace.name || workspace.absolutePath || 'Workspace',
      rootPath: workspace.absolutePath || workspace.workspaceConfig?.root_path || workspace.workspaceConfig?.rootPath || '',
    };
    return {
      key: `workspace:${workspace.workspaceId}`,
      label: context.title,
      detail: context.rootPath || 'Workspace root',
      meta: 'Workspace',
      context,
    };
  }));

  async function refreshMobileWorkCatalog(): Promise<MobileWorkCatalogRefreshResult> {
    const results = await Promise.allSettled([
      runHistoryStore.fetchTree(5),
      agentDefinitionStore.fetchAllAgentDefinitions(),
      teamDefinitionStore.fetchAllAgentTeamDefinitions(),
      workspaceStore.fetchAllWorkspaces(),
    ]);
    const ownerSuccesses = [
      results[0]?.status === 'fulfilled' && !runHistoryStore.error,
      results[1]?.status === 'fulfilled' && !agentDefinitionStore.error,
      results[2]?.status === 'fulfilled' && !teamDefinitionStore.error,
      results[3]?.status === 'fulfilled' && !workspaceStore.error,
    ];
    return {
      hadSuccess: ownerSuccesses.some(Boolean),
      hadFailure: results.some((result) => result.status === 'rejected') || ownerSuccesses.some((success) => !success),
    };
  }

  return {
    recentWorkItems,
    latestRunItem,
    agentItems,
    teamItems,
    workspaceItems,
    refreshMobileWorkCatalog,
  };
}
