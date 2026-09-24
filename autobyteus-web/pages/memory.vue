<template>
  <div class="h-full overflow-auto bg-gray-50">
    <MemoryHome v-if="currentView === 'home'" @change-tab="changeHomeTab" @change-source="changeSource" @select-agent="selectAgent" @select-team="selectTeam" @select-org="selectOrg" />
    <AgentMemoryDetail
      v-else-if="currentView === 'agent-detail' && currentAgentSelector"
      :selector="currentAgentSelector"
      @back="goHome('agents')"
      @inspect-run="inspectAgentRun"
    />
    <CollaborationMemoryDetail
      v-else-if="collaborationDetail"
      :title="collaborationDetail.title"
      :rows="collaborationDetail.rows"
      :loading="collaborationDetail.list.loading"
      :error="collaborationDetail.list.error"
      :page="collaborationDetail.list.page"
      :total-pages="collaborationDetail.list.totalPages"
      :search="collaborationDetail.list.search"
      :read-only="explorerStore.selectedSource.readOnly"
      @back="goHome(collaborationDetail.family)"
      @search="searchCollaborationRuns"
      @change-page="changeCollaborationRunsPage"
      @retry="fetchCollaborationRuns"
      @inspect-member="inspectCollaborationMember"
    />
    <MemoryInspector
      v-else-if="currentView === 'agent-inspector' || currentView === 'team-inspector' || currentView === 'org-inspector'"
      :back-label="inspectorBackLabel"
      @back="backFromInspector"
    />
    <div v-else class="mx-auto mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
      <h2 class="text-xl font-bold text-gray-900">{{ $t('memory.pages.memory.invalid_memory_view') }}</h2>
      <p class="mt-2 text-gray-600">{{ $t('memory.pages.memory.the_requested_memory_page_is_not_available') }}</p>
      <button type="button" class="mt-4 text-blue-600 hover:underline" @click="goHome('agents')">{{ $t('memory.pages.memory.go_to_memory') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MemoryHome from '~/components/memory/MemoryHome.vue';
import AgentMemoryDetail from '~/components/memory/AgentMemoryDetail.vue';
import CollaborationMemoryDetail from '~/components/memory/CollaborationMemoryDetail.vue';
import MemoryInspector from '~/components/memory/MemoryInspector.vue';
import { useMemoryExplorerStore, type MemoryHomeTab } from '~/stores/memoryExplorerStore';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import type {
  AgentOrgWithMemorySummary,
  AgentRunMemorySummary,
  AgentTeamWithMemorySummary,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  CollaborationMemberMemoryTargetSummary,
  CollaborationRunMemoryRow,
  MemoryInspectTarget,
} from '~/types/memory';

const route = useRoute();
const router = useRouter();
const explorerStore = useMemoryExplorerStore();
const inspectorStore = useMemoryInspectorStore();

const MEMORY_VIEWS = ['home', 'agent-detail', 'team-detail', 'org-detail', 'agent-inspector', 'team-inspector', 'org-inspector'] as const;
type MemoryView = typeof MEMORY_VIEWS[number];

const queryValue = (key: string): string | undefined => {
  const value = route.query[key];
  return Array.isArray(value) ? value[0] ?? undefined : value ?? undefined;
};

const cleanQuery = (query: Record<string, string | null | undefined>) => Object.fromEntries(
  Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
) as Record<string, string>;

const currentView = computed((): MemoryView => {
  const view = queryValue('view') as MemoryView | undefined;
  return view && MEMORY_VIEWS.includes(view) ? view : 'home';
});

const currentAgentSelector = computed((): AgentWithMemorySelector | null => {
  const attribution = queryValue('agentAttribution') === 'UNATTRIBUTED' ? 'UNATTRIBUTED' : 'DEFINITION';
  if (attribution === 'UNATTRIBUTED') return { attribution };
  const agentDefinitionId = queryValue('agentDefinitionId');
  return agentDefinitionId ? { attribution, agentDefinitionId } : null;
});

const currentTeamDefinitionId = computed(() => queryValue('teamDefinitionId') ?? null);
const currentOrgDefinitionId = computed(() => queryValue('orgDefinitionId') ?? null);

const routeHomeTab = (): MemoryHomeTab => {
  const tab = queryValue('tab');
  return tab === 'teams' || tab === 'orgs' ? tab : 'agents';
};

/** Team and org runs rendered by the shared detail view; the family decides which store list and actions apply. */
const collaborationDetail = computed(() => {
  if (currentView.value === 'team-detail' && currentTeamDefinitionId.value) {
    return {
      family: 'teams' as const,
      definitionId: currentTeamDefinitionId.value,
      title: explorerStore.selectedTeam?.teamDefinitionName || currentTeamDefinitionId.value,
      list: explorerStore.teamRuns,
      rows: explorerStore.teamRuns.entries.map((run): CollaborationRunMemoryRow => ({ ...run, runId: run.teamRunId })),
    };
  }
  if (currentView.value === 'org-detail' && currentOrgDefinitionId.value) {
    return {
      family: 'orgs' as const,
      definitionId: currentOrgDefinitionId.value,
      title: explorerStore.selectedOrg?.orgDefinitionName || currentOrgDefinitionId.value,
      list: explorerStore.orgRuns,
      rows: explorerStore.orgRuns.entries.map((run): CollaborationRunMemoryRow => ({ ...run, runId: run.orgRunId })),
    };
  }
  return null;
});

const inspectorBackLabel = computed(() => {
  const target = inspectorStore.target;
  if (!target) return 'Back to Memory';
  if (target.kind === 'agent_run') return `Back to ${target.agentDisplayName || target.agentDefinitionId || 'Agent'}`;
  if (target.kind === 'org_member_run') return `Back to ${target.orgDefinitionName || target.orgDefinitionId || 'Agent Org'}`;
  return `Back to ${target.teamDefinitionName || target.teamDefinitionId || 'Agent Team'}`;
});

watch(() => route.fullPath, () => { void syncRouteState(); }, { immediate: true });

function routeSourceKey(): string {
  const source = queryValue('source');
  return source && source.startsWith('imported:') ? source : 'local';
}

function sourceQuery(): string | undefined {
  return explorerStore.selectedSourceQueryValue;
}

async function syncRouteSource(): Promise<void> {
  await explorerStore.loadSources();
  const valid = explorerStore.setSelectedSourceByKey(routeSourceKey());
  if (!valid && queryValue('source')) {
    const nextQuery = { ...(route.query as Record<string, string | undefined>), source: undefined };
    await router.replace({ path: '/memory', query: cleanQuery(nextQuery) });
  }
}

/**
 * Applies the routed home tab or detail selection. Selecting a different agent, team or org resets its list,
 * so the new view never renders the previous selection's runs.
 */
function selectRouteSubject(): void {
  if (currentView.value === 'home') explorerStore.setHomeTab(routeHomeTab());
  else if (currentView.value === 'agent-detail' && currentAgentSelector.value) {
    explorerStore.setSelectedAgentFromRoute(currentAgentSelector.value, queryValue('agentName'));
  } else if (currentView.value === 'team-detail' && currentTeamDefinitionId.value) {
    explorerStore.setSelectedTeamFromRoute(currentTeamDefinitionId.value, queryValue('teamName'));
  } else if (currentView.value === 'org-detail' && currentOrgDefinitionId.value) {
    explorerStore.setSelectedOrgFromRoute(currentOrgDefinitionId.value, queryValue('orgName'));
  }
}

/** The single fetch owner: every route-driven view loads its data here exactly once per route change. */
async function syncRouteState() {
  // Select before the sources load so the first paint of the new view already shows the routed subject.
  selectRouteSubject();
  await syncRouteSource();
  // A source change clears selections; re-apply the routed subject (a no-op when the source is unchanged).
  selectRouteSubject();

  if (currentView.value === 'home') {
    inspectorStore.clear();
    await explorerStore.fetchHomeTab(routeHomeTab());
    return;
  }

  if (currentView.value === 'agent-detail' && currentAgentSelector.value) {
    inspectorStore.clear();
    await explorerStore.fetchAgentRuns(currentAgentSelector.value);
    return;
  }

  if (currentView.value === 'team-detail' && currentTeamDefinitionId.value) {
    inspectorStore.clear();
    await explorerStore.fetchTeamRuns(currentTeamDefinitionId.value);
    return;
  }

  if (currentView.value === 'org-detail' && currentOrgDefinitionId.value) {
    inspectorStore.clear();
    await explorerStore.fetchOrgRuns(currentOrgDefinitionId.value);
    return;
  }

  const target = buildTargetFromRoute();
  if (target) await inspectorStore.inspect(target);
}

function buildTargetFromRoute(): MemoryInspectTarget | null {
  const source = explorerStore.selectedSourceInput;
  const agentRunId = queryValue('agentRunId');
  const member = {
    agentRunId: agentRunId ?? '',
    memberAddress: queryValue('memberAddress') ?? null,
    memberName: queryValue('memberName') ?? null,
    lastUpdatedAt: queryValue('updatedAt') ?? null,
  };
  if (currentView.value === 'agent-inspector') {
    const runId = queryValue('runId');
    if (!runId) return null;
    return {
      kind: 'agent_run',
      runId,
      source,
      agentAttribution: queryValue('agentAttribution') === 'UNATTRIBUTED' ? 'UNATTRIBUTED' : 'DEFINITION',
      agentDefinitionId: queryValue('agentDefinitionId') ?? null,
      agentDisplayName: queryValue('agentName') ?? null,
      runLabel: queryValue('runLabel') ?? null,
      workspaceRootPath: queryValue('workspace') ?? null,
      lastUpdatedAt: queryValue('updatedAt') ?? null,
    };
  }
  if (currentView.value === 'team-inspector') {
    const teamRunId = queryValue('teamRunId');
    if (!teamRunId || !agentRunId) return null;
    return {
      kind: 'team_member_run',
      source,
      teamDefinitionId: queryValue('teamDefinitionId') ?? null,
      teamDefinitionName: queryValue('teamName') ?? null,
      teamRunId,
      ...member,
    };
  }
  if (currentView.value === 'org-inspector') {
    const orgRunId = queryValue('orgRunId');
    if (!orgRunId || !agentRunId) return null;
    return {
      kind: 'org_member_run',
      source,
      orgDefinitionId: queryValue('orgDefinitionId') ?? null,
      orgDefinitionName: queryValue('orgName') ?? null,
      orgRunId,
      ...member,
    };
  }
  return null;
}

const pushMemory = (query: Record<string, string | null | undefined>) =>
  router.push({ path: '/memory', query: cleanQuery({ source: sourceQuery(), ...query }) });

const pushHome = (tab: MemoryHomeTab = explorerStore.homeTab) => pushMemory({ view: 'home', tab });
const goHome = pushHome;
const changeHomeTab = pushHome;

const changeSource = async (sourceKey: string) => {
  explorerStore.setSelectedSourceByKey(sourceKey);
  await pushMemory({ view: 'home', tab: explorerStore.homeTab });
};

const agentDetailQuery = (agent: { attribution?: string | null; agentDefinitionId?: string | null; displayName?: string | null }) => ({
  view: 'agent-detail',
  agentAttribution: agent.attribution,
  agentDefinitionId: agent.agentDefinitionId,
  agentName: agent.displayName,
});

const selectAgent = (agent: AgentWithMemorySummary) => pushMemory(agentDetailQuery(agent));

const selectTeam = (team: AgentTeamWithMemorySummary) =>
  pushMemory({ view: 'team-detail', teamDefinitionId: team.teamDefinitionId, teamName: team.teamDefinitionName });

const selectOrg = (org: AgentOrgWithMemorySummary) =>
  pushMemory({ view: 'org-detail', orgDefinitionId: org.orgDefinitionId, orgName: org.orgDefinitionName });

const inspectAgentRun = (run: AgentRunMemorySummary) => {
  const agent = explorerStore.selectedAgent;
  return pushMemory({
    ...agentDetailQuery({
      attribution: agent?.attribution,
      agentDefinitionId: agent?.agentDefinitionId ?? run.agentDefinitionId ?? null,
      displayName: agent?.displayName ?? run.agentName ?? null,
    }),
    view: 'agent-inspector',
    runId: run.runId,
    runLabel: run.summary || run.runId,
    workspace: run.workspaceRootPath ?? null,
    updatedAt: run.lastUpdatedAt ?? null,
  });
};

const searchCollaborationRuns = (search: string) => {
  const detail = collaborationDetail.value;
  if (!detail) return;
  if (detail.family === 'teams') void explorerStore.setTeamRunsSearch(detail.definitionId, search);
  else void explorerStore.setOrgRunsSearch(detail.definitionId, search);
};

const changeCollaborationRunsPage = (page: number) => {
  const detail = collaborationDetail.value;
  if (!detail) return;
  if (detail.family === 'teams') void explorerStore.changeTeamRunsPage(detail.definitionId, page);
  else void explorerStore.changeOrgRunsPage(detail.definitionId, page);
};

const fetchCollaborationRuns = () => {
  const detail = collaborationDetail.value;
  if (!detail) return;
  if (detail.family === 'teams') void explorerStore.fetchTeamRuns(detail.definitionId);
  else void explorerStore.fetchOrgRuns(detail.definitionId);
};

const inspectCollaborationMember = (runId: string, member: CollaborationMemberMemoryTargetSummary) => {
  const memberQuery = (runLastUpdatedAt?: string | null) => ({
    agentRunId: member.agentRunId,
    memberAddress: member.memberAddress,
    memberName: member.displayName,
    updatedAt: member.lastUpdatedAt ?? runLastUpdatedAt ?? null,
  });
  if (collaborationDetail.value?.family === 'orgs') {
    const run = explorerStore.orgRuns.entries.find((entry) => entry.orgRunId === runId);
    return pushMemory({
      view: 'org-inspector',
      orgDefinitionId: run?.orgDefinitionId ?? currentOrgDefinitionId.value,
      orgName: run?.orgDefinitionName ?? explorerStore.selectedOrg?.orgDefinitionName,
      orgRunId: runId,
      ...memberQuery(run?.lastUpdatedAt),
    });
  }
  const run = explorerStore.teamRuns.entries.find((entry) => entry.teamRunId === runId);
  return pushMemory({
    view: 'team-inspector',
    teamDefinitionId: run?.teamDefinitionId ?? currentTeamDefinitionId.value,
    teamName: run?.teamDefinitionName ?? explorerStore.selectedTeam?.teamDefinitionName,
    teamRunId: runId,
    ...memberQuery(run?.lastUpdatedAt),
  });
};

function backFromInspector() {
  const target = inspectorStore.target;
  if (!target) return goHome('agents');
  if (target.kind === 'agent_run') {
    return pushMemory(agentDetailQuery({
      attribution: target.agentAttribution,
      agentDefinitionId: target.agentDefinitionId,
      displayName: target.agentDisplayName,
    }));
  }
  if (target.kind === 'org_member_run') {
    return pushMemory({ view: 'org-detail', orgDefinitionId: target.orgDefinitionId, orgName: target.orgDefinitionName });
  }
  return pushMemory({ view: 'team-detail', teamDefinitionId: target.teamDefinitionId, teamName: target.teamDefinitionName });
}
</script>
