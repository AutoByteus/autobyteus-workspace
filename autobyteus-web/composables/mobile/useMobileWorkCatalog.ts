import { computed, reactive } from 'vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type {
  MobileCatalogSegmentId,
  MobileCatalogSegmentState,
  MobileCatalogSegmentStatus,
  MobileWorkContext,
  MobileWorkListItem,
} from '~/types/mobileWork';
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

type SegmentLoadState = {
  status: MobileCatalogSegmentStatus;
  errorMessage: string;
};

const segmentDefaultError: Record<MobileCatalogSegmentId, string> = {
  recent: 'Could not load recent runs.',
  agents: 'Could not load agent definitions.',
  teams: 'Could not load agent teams.',
  workspaces: 'Could not load workspaces.',
};

const normalizeErrorMessage = (cause: unknown, fallback: string): string => {
  if (!cause) {
    return fallback;
  }
  if (cause instanceof Error && cause.message.trim()) {
    return cause.message.trim();
  }
  if (typeof cause === 'string' && cause.trim()) {
    return cause.trim();
  }
  if (typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string' && cause.message.trim()) {
    return cause.message.trim();
  }
  return fallback;
};

export type MobileWorkCatalogRefreshResult = {
  hadSuccess: boolean;
  hadFailure: boolean;
};

export function useMobileWorkCatalog() {
  const runHistoryStore = useRunHistoryStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const mobileWorkStore = useMobileWorkStore();
  const workspaceStore = useWorkspaceStore();

  const segmentLoadState = reactive<Record<MobileCatalogSegmentId, SegmentLoadState>>({
    recent: { status: 'idle', errorMessage: '' },
    agents: { status: 'idle', errorMessage: '' },
    teams: { status: 'idle', errorMessage: '' },
    workspaces: { status: 'idle', errorMessage: '' },
  });

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
          const validMemberRouteKeys = new Set(run.members.map((member) => member.memberRouteKey).filter(Boolean));
          const rememberedMemberRouteKey = mobileWorkStore.getRememberedFocusedTeamMember(run.teamRunId);
          const focusedMemberRouteKey = rememberedMemberRouteKey && validMemberRouteKeys.has(rememberedMemberRouteKey)
            ? rememberedMemberRouteKey
            : (run.coordinatorMemberRouteKey && validMemberRouteKeys.has(run.coordinatorMemberRouteKey)
                ? run.coordinatorMemberRouteKey
                : (run.members[0]?.memberRouteKey || ''));
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

  const getItemsForSegment = (segmentId: MobileCatalogSegmentId): MobileWorkListItem[] => {
    switch (segmentId) {
      case 'agents':
        return agentItems.value;
      case 'teams':
        return teamItems.value;
      case 'workspaces':
        return workspaceItems.value;
      case 'recent':
      default:
        return recentWorkItems.value;
    }
  };

  const getStoreErrorForSegment = (segmentId: MobileCatalogSegmentId): unknown => {
    switch (segmentId) {
      case 'agents':
        return agentDefinitionStore.error;
      case 'teams':
        return teamDefinitionStore.error;
      case 'workspaces':
        return workspaceStore.error;
      case 'recent':
      default:
        return runHistoryStore.error;
    }
  };

  const buildSegmentState = (segmentId: MobileCatalogSegmentId): MobileCatalogSegmentState => {
    const loadState = segmentLoadState[segmentId];
    const items = getItemsForSegment(segmentId);
    const status = loadState.status === 'idle' && items.length > 0 ? 'success' : loadState.status;
    return {
      id: segmentId,
      status,
      items,
      errorMessage: loadState.errorMessage,
    };
  };

  const recentSegment = computed(() => buildSegmentState('recent'));
  const agentsSegment = computed(() => buildSegmentState('agents'));
  const teamsSegment = computed(() => buildSegmentState('teams'));
  const workspacesSegment = computed(() => buildSegmentState('workspaces'));
  const catalogSegments = computed<Record<MobileCatalogSegmentId, MobileCatalogSegmentState>>(() => ({
    recent: recentSegment.value,
    agents: agentsSegment.value,
    teams: teamsSegment.value,
    workspaces: workspacesSegment.value,
  }));

  const markSegmentLoading = (segmentId: MobileCatalogSegmentId): void => {
    segmentLoadState[segmentId] = { status: 'loading', errorMessage: '' };
  };

  const markSegmentSuccess = (segmentId: MobileCatalogSegmentId): void => {
    segmentLoadState[segmentId] = { status: 'success', errorMessage: '' };
  };

  const markSegmentError = (segmentId: MobileCatalogSegmentId, cause: unknown): void => {
    segmentLoadState[segmentId] = {
      status: 'error',
      errorMessage: normalizeErrorMessage(cause, segmentDefaultError[segmentId]),
    };
  };

  async function refreshMobileCatalogSegment(segmentId: MobileCatalogSegmentId): Promise<boolean> {
    markSegmentLoading(segmentId);
    try {
      switch (segmentId) {
        case 'agents':
          await agentDefinitionStore.fetchAllAgentDefinitions();
          break;
        case 'teams':
          await teamDefinitionStore.fetchAllAgentTeamDefinitions();
          break;
        case 'workspaces':
          await workspaceStore.fetchAllWorkspaces();
          break;
        case 'recent':
        default:
          await runHistoryStore.fetchTree(5);
          break;
      }
    } catch (cause) {
      markSegmentError(segmentId, cause);
      return false;
    }

    const storeError = getStoreErrorForSegment(segmentId);
    if (storeError && getItemsForSegment(segmentId).length === 0) {
      markSegmentError(segmentId, storeError);
      return false;
    }
    markSegmentSuccess(segmentId);
    return true;
  }

  async function refreshMobileWorkCatalog(): Promise<MobileWorkCatalogRefreshResult> {
    const results = await Promise.all([
      refreshMobileCatalogSegment('recent'),
      refreshMobileCatalogSegment('agents'),
      refreshMobileCatalogSegment('teams'),
      refreshMobileCatalogSegment('workspaces'),
    ]);
    return {
      hadSuccess: results.some(Boolean),
      hadFailure: results.some((success) => !success),
    };
  }

  return {
    recentWorkItems,
    latestRunItem,
    agentItems,
    teamItems,
    workspaceItems,
    recentSegment,
    agentsSegment,
    teamsSegment,
    workspacesSegment,
    catalogSegments,
    refreshMobileCatalogSegment,
    refreshMobileWorkCatalog,
  };
}
