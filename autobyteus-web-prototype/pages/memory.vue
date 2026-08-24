<template>
  <div class="h-full overflow-auto bg-gray-50">
    <MemoryHome v-if="currentView === 'home'" @change-tab="changeHomeTab" @change-source="changeSource" @select-agent="selectAgent" @select-team="selectTeam" />
    <AgentMemoryDetail
      v-else-if="currentView === 'agent-detail' && currentAgentSelector"
      :selector="currentAgentSelector"
      @back="goHome('agents')"
      @inspect-run="inspectAgentRun"
    />
    <AgentTeamMemoryDetail
      v-else-if="currentView === 'team-detail' && currentTeamDefinitionId"
      :team-definition-id="currentTeamDefinitionId"
      @back="goHome('teams')"
      @inspect-member="inspectTeamMember"
    />
    <MemoryInspector
      v-else-if="currentView === 'agent-inspector' || currentView === 'team-inspector'"
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
import AgentTeamMemoryDetail from '~/components/memory/AgentTeamMemoryDetail.vue';
import MemoryInspector from '~/components/memory/MemoryInspector.vue';
import { useMemoryExplorerStore, type MemoryHomeTab } from '~/stores/memoryExplorerStore';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import type { AgentRunMemorySummary, AgentTeamRunMemorySummary, AgentTeamWithMemorySummary, AgentWithMemorySelector, AgentWithMemorySummary, MemoryExplorerSourceInput, MemoryInspectTarget, TeamMemberMemoryTargetSummary } from '~/types/memory';

const route = useRoute();
const router = useRouter();
const explorerStore = useMemoryExplorerStore();
const inspectorStore = useMemoryInspectorStore();

type MemoryView = 'home' | 'agent-detail' | 'team-detail' | 'agent-inspector' | 'team-inspector';

const queryValue = (key: string): string | undefined => {
  const value = route.query[key];
  return Array.isArray(value) ? value[0] ?? undefined : value ?? undefined;
};

const cleanQuery = (query: Record<string, string | null | undefined>) => Object.fromEntries(
  Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
) as Record<string, string>;

const currentView = computed((): MemoryView => {
  const view = queryValue('view') as MemoryView | undefined;
  return view && ['home', 'agent-detail', 'team-detail', 'agent-inspector', 'team-inspector'].includes(view) ? view : 'home';
});

const currentAgentSelector = computed((): AgentWithMemorySelector | null => {
  const attribution = queryValue('agentAttribution') === 'UNATTRIBUTED' ? 'UNATTRIBUTED' : 'DEFINITION';
  if (attribution === 'UNATTRIBUTED') return { attribution };
  const agentDefinitionId = queryValue('agentDefinitionId');
  return agentDefinitionId ? { attribution, agentDefinitionId } : null;
});

const currentTeamDefinitionId = computed(() => queryValue('teamDefinitionId') ?? null);

const inspectorBackLabel = computed(() => {
  const target = inspectorStore.target;
  if (!target) return 'Back to Memory';
  if (target.kind === 'agent_run') return `Back to ${target.agentDisplayName || target.agentDefinitionId || 'Agent'}`;
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

function selectedSourceInput(): MemoryExplorerSourceInput {
  return explorerStore.selectedSourceInput;
}

async function syncRouteSource(): Promise<void> {
  await explorerStore.loadSources();
  const valid = explorerStore.setSelectedSourceByKey(routeSourceKey());
  if (!valid && queryValue('source')) {
    const nextQuery = { ...(route.query as Record<string, string | undefined>), source: undefined };
    await router.replace({ path: '/memory', query: cleanQuery(nextQuery) });
  }
}

async function syncRouteState() {
  await syncRouteSource();
  if (currentView.value === 'home') {
    const tab = queryValue('tab') === 'teams' ? 'teams' : 'agents';
    explorerStore.setHomeTab(tab);
    inspectorStore.clear();
    if (tab === 'agents') await explorerStore.fetchAgents();
    else await explorerStore.fetchTeams();
    return;
  }

  if (currentView.value === 'agent-detail' && currentAgentSelector.value) {
    inspectorStore.clear();
    explorerStore.setSelectedAgentFromRoute(currentAgentSelector.value, queryValue('agentName'));
    await explorerStore.fetchAgentRuns(currentAgentSelector.value);
    return;
  }

  if (currentView.value === 'team-detail' && currentTeamDefinitionId.value) {
    inspectorStore.clear();
    explorerStore.setSelectedTeamFromRoute(currentTeamDefinitionId.value, queryValue('teamName'));
    await explorerStore.fetchTeamRuns(currentTeamDefinitionId.value);
    return;
  }

  const target = buildTargetFromRoute();
  if (target) await inspectorStore.inspect(target);
}

function buildTargetFromRoute(): MemoryInspectTarget | null {
  const source = selectedSourceInput();
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
    const agentRunId = queryValue('agentRunId');
    if (!teamRunId || !agentRunId) return null;
    return {
      kind: 'team_member_run',
      source,
      teamDefinitionId: queryValue('teamDefinitionId') ?? null,
      teamDefinitionName: queryValue('teamName') ?? null,
      teamRunId,
      agentRunId,
      memberAddress: queryValue('memberAddress') ?? null,
      memberName: queryValue('memberName') ?? null,
      lastUpdatedAt: queryValue('updatedAt') ?? null,
    };
  }
  return null;
}

const pushHome = (tab: MemoryHomeTab = explorerStore.homeTab) => router.push({ path: '/memory', query: cleanQuery({ view: 'home', tab, source: sourceQuery() }) });
const goHome = pushHome;
const changeHomeTab = pushHome;

const changeSource = async (sourceKey: string) => {
  explorerStore.setSelectedSourceByKey(sourceKey);
  await router.push({ path: '/memory', query: cleanQuery({ view: 'home', tab: explorerStore.homeTab, source: sourceQuery() }) });
};

const selectAgent = async (agent: AgentWithMemorySummary) => {
  await explorerStore.openAgentMemory(agent);
  router.push({
    path: '/memory',
    query: cleanQuery({
      view: 'agent-detail',
      source: sourceQuery(),
      agentAttribution: agent.attribution,
      agentDefinitionId: agent.agentDefinitionId,
      agentName: agent.displayName,
    }),
  });
};

const selectTeam = async (team: AgentTeamWithMemorySummary) => {
  await explorerStore.openTeamMemory(team);
  router.push({ path: '/memory', query: cleanQuery({ view: 'team-detail', source: sourceQuery(), teamDefinitionId: team.teamDefinitionId, teamName: team.teamDefinitionName }) });
};

const inspectAgentRun = async (run: AgentRunMemorySummary) => {
  const agent = explorerStore.selectedAgent;
  const target: MemoryInspectTarget = {
    kind: 'agent_run',
    source: selectedSourceInput(),
    runId: run.runId,
    agentAttribution: agent?.attribution,
    agentDefinitionId: agent?.agentDefinitionId ?? run.agentDefinitionId ?? null,
    agentDisplayName: agent?.displayName ?? run.agentName ?? null,
    runLabel: run.summary || run.runId,
    workspaceRootPath: run.workspaceRootPath ?? null,
    lastUpdatedAt: run.lastUpdatedAt ?? null,
  };
  await inspectorStore.inspect(target);
  router.push({
    path: '/memory',
    query: cleanQuery({
      view: 'agent-inspector',
      source: sourceQuery(),
      runId: run.runId,
      agentAttribution: target.agentAttribution,
      agentDefinitionId: target.agentDefinitionId,
      agentName: target.agentDisplayName,
      runLabel: target.runLabel,
      workspace: target.workspaceRootPath,
      updatedAt: target.lastUpdatedAt,
    }),
  });
};

const inspectTeamMember = async (run: AgentTeamRunMemorySummary, member: TeamMemberMemoryTargetSummary) => {
  const target: MemoryInspectTarget = {
    kind: 'team_member_run',
    source: selectedSourceInput(),
    teamDefinitionId: run.teamDefinitionId,
    teamDefinitionName: run.teamDefinitionName,
    teamRunId: run.teamRunId,
    agentRunId: member.agentRunId,
    memberAddress: member.memberAddress,
    memberName: member.memberName,
    lastUpdatedAt: member.lastUpdatedAt ?? run.lastUpdatedAt ?? null,
  };
  await inspectorStore.inspect(target);
  router.push({
    path: '/memory',
    query: cleanQuery({
      view: 'team-inspector',
      source: sourceQuery(),
      teamDefinitionId: run.teamDefinitionId,
      teamName: run.teamDefinitionName,
      teamRunId: run.teamRunId,
      agentRunId: member.agentRunId,
      memberAddress: member.memberAddress,
      memberName: member.memberName,
      updatedAt: target.lastUpdatedAt,
    }),
  });
};

function backFromInspector() {
  const target = inspectorStore.target;
  if (!target) return goHome('agents');
  if (target.kind === 'agent_run') {
    router.push({
      path: '/memory',
      query: cleanQuery({
        view: 'agent-detail',
        source: sourceQuery(),
        agentAttribution: target.agentAttribution,
        agentDefinitionId: target.agentDefinitionId,
        agentName: target.agentDisplayName,
      }),
    });
    return;
  }
  router.push({
    path: '/memory',
    query: cleanQuery({
      view: 'team-detail',
      source: sourceQuery(),
      teamDefinitionId: target.teamDefinitionId,
      teamName: target.teamDefinitionName,
    }),
  });
}
</script>
