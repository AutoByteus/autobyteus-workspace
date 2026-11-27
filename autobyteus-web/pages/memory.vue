<template>
  <div class="h-full overflow-auto bg-gray-50">
    <MemoryHome
      v-if="currentView === 'home'"
      :section="routeSection()"
      :node-key="browseNode.key"
      :pane="queryValue('pane') ?? null"
      @change-section="changeSection"
      @search="searchMemory"
      @clear-search="clearMemorySearch"
      @open-result="openSearchResult"
      @change-source="changeSource"
      @select-node="selectNode"
      @open-episode="openEpisode"
      @inspect-member="inspectGroupMember"
    />
    <MemoryInspector
      v-else-if="currentView === 'agent-inspector' || currentView === 'team-inspector' || currentView === 'org-inspector'"
      :back-label="inspectorBackLabel"
      :back-text="inspectorBackText"
      @back="backFromInspector"
      @open-index="changeSection('index')"
    />
    <MemoryInspector
      v-else-if="currentView === 'folder-inspector' && folderRun"
      :folder-run="folderRun"
      :back-label="inspectorBackLabel"
      :back-text="inspectorBackText"
      @back="backFromInspector"
      @open-index="changeSection('index')"
    />
    <div v-else class="mx-auto mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
      <h2 class="text-xl font-bold text-gray-900">{{ $t('memory.pages.memory.invalid_memory_view') }}</h2>
      <p class="mt-2 text-gray-600">{{ $t('memory.pages.memory.the_requested_memory_page_is_not_available') }}</p>
      <button type="button" class="mt-4 text-blue-600 hover:underline" @click="goHome('agents')">{{ $t('memory.pages.memory.go_to_memory') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MemoryHome from '~/components/memory/MemoryHome.vue';
import MemoryInspector from '~/components/memory/MemoryInspector.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import { useMemoryJournalStore, type JournalFocus } from '~/stores/memoryJournalStore';
import { useMemorySearchStore, type MemorySection } from '~/stores/memorySearchStore';
import type { JournalSubject, SearchMatch, SearchResult } from '~/types/memorySearch';
import type { AgentEpisode, CollaborationMemberMemoryTargetSummary, MemoryInspectTarget } from '~/types/memory';
import { ownerOf, parseMemoryBrowseNode, type MemoryBrowseGroup } from '~/utils/memoryBrowseNode';

const route = useRoute();
const router = useRouter();
const { t } = useLocalization();
const explorerStore = useMemoryExplorerStore();
const inspectorStore = useMemoryInspectorStore();
const journalStore = useMemoryJournalStore();
const searchStore = useMemorySearchStore();

const MEMORY_VIEWS = ['home', 'agent-inspector', 'team-inspector', 'org-inspector', 'folder-inspector'] as const;
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

/** The Memory page's tabs: Browse (the entry), Search, Index. */
const routeSection = (): MemorySection => {
  const section = queryValue('section');
  if (section === 'browse' || section === 'index' || section === 'search') return section;
  return 'browse';
};

/** Browse's address (autobyteus-554): a tab (Global, Agents, Agent Teams, Agent Orgs) or an owner reached through it. */
const browseNode = computed(() => parseMemoryBrowseNode(queryValue('node')));

/** A run the memory index knows only by its folder (no record names it): it has a Work Journal and no memory view. */
const folderRun = computed(() => {
  const runKey = queryValue('runKey');
  if (currentView.value !== 'folder-inspector' || !runKey) return null;
  return {
    runKey,
    runId: queryValue('runId') ?? runKey.split('/').pop() ?? runKey,
    agentName: queryValue('agentName') ?? null,
    groupName: queryValue('teamName') ?? null,
    runLabel: queryValue('runLabel') ?? null,
  };
});

/** Back from a run: to the search results, to the owner page it was opened from, or to Memory. */
const inspectorBackName = computed((): string | null => (queryValue('back') ? queryValue('backName') ?? null : null));
/** What Back shows: where it goes (autobyteus-608 DC-007). */
const inspectorBackText = computed(() => {
  if (queryValue('q')) return t('memory.inspector.search_results');
  return inspectorBackName.value ?? t('memory.page.title');
});
/** Back's accessible name and tooltip. */
const inspectorBackLabel = computed(() => {
  if (queryValue('q')) return t('memory.inspector.back_to_search_results');
  if (inspectorBackName.value) return t('memory.semantic.back_to', { name: inspectorBackName.value });
  return t('memory.components.memory.AgentMemoryDetail.back_to_memory');
});

watch(() => route.fullPath, () => { void syncRouteState(); }, { immediate: true });
onBeforeUnmount(() => searchStore.stopPolling());

function routeSourceKey(): string {
  const source = queryValue('source');
  return source && source.startsWith('imported:') ? source : 'local';
}

function sourceQuery(): string | undefined {
  return explorerStore.selectedSourceQueryValue;
}

/** Drops an unknown imported source from the URL; the replace triggers the next sync on Local. */
const replaceUnknownSource = () => router.replace({
  path: '/memory',
  query: cleanQuery({ ...(route.query as Record<string, string | undefined>), source: undefined }),
});

/** The home view is where the source selector lives: refresh the list in the background, never delaying the list. */
async function refreshSourcesForHome(): Promise<void> {
  await explorerStore.loadSources();
  const key = routeSourceKey();
  if (currentView.value === 'home' && key !== 'local' && !explorerStore.hasSource(key)) await replaceUnknownSource();
}

/**
 * What a Browse address shows (UIS-001…UIS-006): a tab's cards; an agent's episodes (and the teams and orgs it works
 * in, for its subtitle); a team's or org's members, or its runs. Global and an agent's Semantic tab read their folder
 * in SemanticMemoryFolder, which also holds the folder view's workspace for as long as it is shown.
 */
async function syncBrowse(): Promise<void> {
  const node = browseNode.value;
  const owner = ownerOf(node);
  if (!owner) {
    if (node.group !== 'global') await explorerStore.fetchOwners();
    return;
  }
  await explorerStore.ensureOwners();
  if (owner.kind === 'agent' || owner.kind === 'unattributed') {
    if (owner.kind === 'agent' || node.path.length > 1) void explorerStore.loadAllGroupMembers();
    await explorerStore.fetchEpisodes(owner.kind === 'agent'
      ? { attribution: 'DEFINITION', agentDefinitionId: owner.id }
      : { attribution: 'UNATTRIBUTED' });
    return;
  }
  if (node.path.length > 1) void explorerStore.loadAllGroupMembers();
  const kind = owner.kind === 'org' ? 'ORG' : 'TEAM';
  const membersLoad = explorerStore.fetchMembers(kind, owner.id);
  if (queryValue('pane') === 'runs') {
    if (kind === 'ORG') {
      explorerStore.setSelectedOrgFromRoute(owner.id);
      await explorerStore.fetchOrgRuns(owner.id);
    } else {
      explorerStore.setSelectedTeamFromRoute(owner.id);
      await explorerStore.fetchTeamRuns(owner.id);
    }
  }
  await membersLoad;
}

/**
 * The single fetch owner: every route-driven view loads its data here exactly once per route change. The sources
 * list is only awaited for an imported source the loaded list does not know yet; inspector navigation never requests it.
 */
async function syncRouteState() {
  const key = routeSourceKey();
  if (key !== 'local' && !explorerStore.hasSource(key)) {
    await explorerStore.loadSources();
    if (!explorerStore.hasSource(key)) {
      await replaceUnknownSource();
      return;
    }
  }
  explorerStore.setSelectedSourceByKey(key);
  if (currentView.value === 'home') {
    inspectorStore.clear();
    journalStore.clear();
    // Memory search: the cue is in the address, so Back from a Work Journal returns to the same results.
    const cue = queryValue('q');
    if (cue) { if (!(searchStore.query === cue && searchStore.status === 'ready')) void searchStore.runSearch(cue); }
    else searchStore.clearSearch();
    void refreshSourcesForHome();
    if (routeSection() === 'browse') await syncBrowse();
    return;
  }

  if (folderRun.value) {
    inspectorStore.clear();
    void journalStore.open({ kind: 'folder', runKey: folderRun.value.runKey }, folderRun.value.runId, routeFocus());
    return;
  }

  const target = buildTargetFromRoute();
  if (target) {
    void journalStore.open(journalSubjectOf(target), target.kind === 'agent_run' ? target.runId : target.agentRunId, routeFocus());
    await inspectorStore.inspect(target);
  }
}

/** The matched lines a search result opened the run at, from the address. */
function routeFocus(): JournalFocus | null {
  const file = queryValue('file');
  const from = Number(queryValue('from'));
  if (!file || !Number.isFinite(from) || from <= 0) return null;
  return {
    file,
    fromLine: from,
    toLine: Number(queryValue('to')) || from,
    cue: queryValue('q') ?? null,
    kind: queryValue('kind') === 'meaning' ? 'meaning' : queryValue('kind') === 'text' ? 'text' : null,
    words: (queryValue('words') ?? '').split(',').filter(Boolean),
  };
}

function journalSubjectOf(target: MemoryInspectTarget): JournalSubject {
  const source = target.source ?? { type: 'LOCAL' as const };
  if (target.kind === 'agent_run') return { kind: 'agent', runId: target.runId, source };
  if (target.kind === 'org_member_run') return { kind: 'org', orgRunId: target.orgRunId, agentRunId: target.agentRunId, source };
  return { kind: 'team', teamRunId: target.teamRunId, agentRunId: target.agentRunId, source };
}

function buildTargetFromRoute(): MemoryInspectTarget | null {
  const source = explorerStore.selectedSourceInput;
  const agentRunId = queryValue('agentRunId');
  const member = {
    agentRunId: agentRunId ?? '',
    memberAddress: queryValue('memberAddress') ?? null,
    memberName: queryValue('memberName') ?? null,
    lastUpdatedAt: queryValue('updatedAt') ?? null,
    runLabel: queryValue('runLabel') ?? null,
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

const goHome = (group: MemoryBrowseGroup = 'agents') => pushMemory({ view: 'home', section: 'browse', node: group });

const selectNode = (nodeKey: string, pane?: string) => pushMemory({ view: 'home', section: 'browse', node: nodeKey, pane });

const searchMemory = (query: string) => pushMemory({ view: 'home', section: 'search', q: query });
const clearMemorySearch = () => pushMemory({ view: 'home', section: 'search' });

/** Switching tabs keeps the search in the address, so its results are still there when the user comes back. */
const changeSection = (section: MemorySection) => pushMemory({
  view: 'home',
  section,
  node: section === 'browse' ? queryValue('node') : undefined,
  q: searchStore.query || undefined,
});

/**
 * A result opens the run's Work Journal at the matched lines (the run detail, Work Journal tab), addressed by the
 * result's subject. Memory search is local only, so the source is always local.
 */
const openSearchResult = (result: SearchResult, match: SearchMatch) => {
  const lines = { source: undefined, q: searchStore.query, file: match.file, from: String(match.fromLine), to: String(match.toLine), kind: match.kind, words: match.matchedWords.join(',') || undefined };
  const subject = result.subject;
  const memberName = result.member ?? result.agentName;
  if (subject.kind === 'TEAM_MEMBER') {
    return pushMemory({ view: 'team-inspector', teamName: result.team?.name, teamRunId: subject.teamRunId, agentRunId: subject.agentRunId, memberName, ...lines });
  }
  if (subject.kind === 'ORG_MEMBER') {
    return pushMemory({ view: 'org-inspector', orgName: result.team?.name, orgRunId: subject.orgRunId, agentRunId: subject.agentRunId, memberName, ...lines });
  }
  if (subject.kind === 'RUN_FOLDER') {
    return pushMemory({ view: 'folder-inspector', runKey: subject.runKey, runId: result.runId, agentName: result.agentName, teamName: result.team?.name, ...lines });
  }
  return pushMemory({
    view: 'agent-inspector',
    agentAttribution: subject.agentDefinitionId ? 'DEFINITION' : 'UNATTRIBUTED',
    agentDefinitionId: subject.agentDefinitionId,
    agentName: result.agentName,
    runId: subject.runId,
    workspace: result.workspace,
    ...lines,
  });
};

/** Another source keeps the owner and its tab: Global and every Semantic tab then show the not-synced note. */
const changeSource = async (sourceKey: string) => {
  explorerStore.setSelectedSourceByKey(sourceKey);
  await pushMemory({ view: 'home', section: 'browse', node: queryValue('node'), pane: queryValue('pane') });
};

/**
 * An agent's episode opens that run's Work Journal / Raw traces inspector; Back returns to the agent's page. The run's
 * title is its summary or Task title, never its run ID: the page shows the run ID itself when there is none (DEC-002).
 */
const openEpisode = (episode: AgentEpisode, agentName: string) => {
  const back = { back: browseNode.value.key, backName: agentName, updatedAt: episode.lastActivityAt ?? null, runLabel: episode.summary || episode.taskTitle || null };
  const subject = episode.subject;
  if (subject.kind === 'TEAM_MEMBER') {
    return pushMemory({ view: 'team-inspector', teamName: episode.place?.name, teamRunId: subject.teamRunId, agentRunId: subject.agentRunId, memberName: agentName, ...back });
  }
  if (subject.kind === 'ORG_MEMBER') {
    return pushMemory({ view: 'org-inspector', orgName: episode.place?.name, orgRunId: subject.orgRunId, agentRunId: subject.agentRunId, memberName: agentName, ...back });
  }
  if (subject.kind === 'RUN_FOLDER') {
    return pushMemory({ view: 'folder-inspector', runKey: subject.runKey, runId: episode.runId, agentName, ...back });
  }
  return pushMemory({
    view: 'agent-inspector',
    agentAttribution: subject.agentDefinitionId ? 'DEFINITION' : 'UNATTRIBUTED',
    agentDefinitionId: subject.agentDefinitionId,
    agentName,
    runId: subject.runId,
    workspace: episode.workspaceRootPath ?? null,
    ...back,
  });
};

/**
 * A member of a team's or org's run (its Runs tab) opens that member's inspector; Back returns to the Runs tab. The run's
 * summary is the member run page's title (DEC-002).
 */
const inspectGroupMember = (runId: string, member: CollaborationMemberMemoryTargetSummary, groupName: string, runLabel: string | null) => {
  const owner = ownerOf(browseNode.value);
  if (!owner) return;
  const common = {
    agentRunId: member.agentRunId, memberAddress: member.memberAddress, memberName: member.displayName,
    updatedAt: member.lastUpdatedAt ?? null, back: browseNode.value.key, backPane: 'runs', backName: groupName, runLabel,
  };
  if (owner.kind === 'org') return pushMemory({ view: 'org-inspector', orgDefinitionId: owner.id, orgName: groupName, orgRunId: runId, ...common });
  return pushMemory({ view: 'team-inspector', teamDefinitionId: owner.id, teamName: groupName, teamRunId: runId, ...common });
};

function backFromInspector() {
  const cue = queryValue('q');
  if (cue) return pushMemory({ view: 'home', section: 'search', q: cue });
  const back = queryValue('back');
  if (back) return pushMemory({ view: 'home', section: 'browse', node: back, pane: queryValue('backPane') });
  return goHome('agents');
}
</script>
