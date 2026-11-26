<template>
  <!-- autobyteus-608: one column that fills the page, so the Work Journal takes the window's remaining height. -->
  <div class="mx-auto flex min-h-full max-w-7xl flex-col space-y-4 px-5 py-4 sm:px-7 sm:py-5">
    <!-- One header row (DC-007): Back, the run (its agent only when Back does not already name it, then the run's title
         or its run ID and workspace) and Work Journal / Raw Traces. -->
    <MemoryPageHeader :back-text="backText" :back-label="backLabel" @back="$emit('back')">
      <h1 :class="backNamesAgent ? 'sr-only' : 'min-w-0 flex-shrink-0 truncate text-lg font-semibold tracking-tight text-gray-900'" data-test="memory-inspector-name">{{ heading }}</h1>
      <span v-if="runTitle" class="min-w-0 truncate text-sm font-medium text-gray-800" :title="runIdentity" data-test="memory-inspector-run-title">{{ runTitle }}</span>
      <span v-else-if="runIdentity" class="min-w-0 truncate font-mono text-xs text-gray-500" :title="runIdentity" data-test="memory-inspector-run-identity">{{ runIdentity }}</span>
      <span v-if="isImported" class="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{{ $t('memory.components.memory.MemoryInspector.importedReadOnlyCorpus') }}</span>
      <template v-if="store.target || folderRun" #actions>
        <MemoryPaneSwitch :tabs="visibleTabs" :selected="activeTab" test-id-prefix="memory-inspector-tab-" @select="store.setActiveTab" />
      </template>
    </MemoryPageHeader>

    <div v-if="store.error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ store.error }}</div>
    <div v-if="!store.target && !folderRun" class="py-16 text-center text-sm text-gray-400">{{ $t('memory.components.memory.MemoryInspector.select_a_memory_entry_to_inspect') }}</div>

    <div v-else class="flex min-h-[360px] flex-1 flex-col">
      <div v-if="store.loading && !store.memoryView && store.activeTab !== 'journal'" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryInspector.loading_memory_view') }}</div>
      <WorkJournalTab v-else-if="folderRun || store.activeTab === 'journal'" class="flex-1" @open-index="$emit('openIndex')" />
      <RawTracesTab
        v-else
        :traces="store.memoryView?.rawTraces ?? null"
        :raw-trace-files="store.memoryView?.rawTraceFiles ?? null"
        :selected-raw-trace-file-name="store.memoryView?.selectedRawTraceFileName ?? store.selectedRawTraceFileName"
        :limit="store.rawTraceLimit"
        :loading="store.loading"
        @updateLimit="store.setRawTraceLimit"
        @selectFile="store.setRawTraceFileName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import type { MemoryInspectorTab } from '~/types/memory';
import MemoryPageHeader from './MemoryPageHeader.vue';
import MemoryPaneSwitch, { type MemoryPaneTab } from './MemoryPaneSwitch.vue';
import WorkJournalTab from './WorkJournalTab.vue';
import RawTracesTab from './RawTracesTab.vue';

/** A run the memory index knows only by its folder: its Work Journal only (it has no memory view). */
export type FolderRun = { runKey: string; runId: string; agentName: string | null; groupName: string | null; runLabel: string | null };
/** `backText`: where Back goes, shown; `backLabel`: its accessible name and tooltip ("Back to …"). */
const props = withDefaults(defineProps<{ backText: string; backLabel: string; folderRun?: FolderRun | null }>(), { folderRun: null });
defineEmits<{ back: []; openIndex: [] }>();

const { t } = useLocalization();
const store = useMemoryInspectorStore();
const tabs = computed((): Array<MemoryPaneTab<MemoryInspectorTab>> => [
  { id: 'journal', label: t('memory.inspector.work_journal') },
  { id: 'raw', label: t('memory.inspector.raw_traces') },
]);
const visibleTabs = computed(() => (props.folderRun ? tabs.value.slice(0, 1) : tabs.value));
const activeTab = computed((): MemoryInspectorTab => (props.folderRun ? 'journal' : store.activeTab));

/** The run's agent (or member), and the team or org it ran in. */
const owner = computed((): { name: string; group: string | null } | null => {
  const folder = props.folderRun;
  if (folder) return { name: folder.agentName || folder.runId, group: folder.groupName };
  const target = store.target;
  if (!target) return null;
  if (target.kind === 'agent_run') return { name: target.agentDisplayName || target.agentDefinitionId || target.runId, group: null };
  const group = target.kind === 'org_member_run'
    ? (target.orgDefinitionName || target.orgDefinitionId || null)
    : (target.teamDefinitionName || target.teamDefinitionId || null);
  return { name: target.memberName || target.memberAddress || target.agentRunId, group };
});
/** The agent, with its team or org unless Back already names that. */
const heading = computed(() => {
  const current = owner.value;
  if (!current) return '';
  return current.group && current.group !== props.backText ? `${current.name} · ${current.group}` : current.name;
});
/** Back already shows the agent (opened from its own page): its name stays for screen readers only. */
const backNamesAgent = computed(() => !!owner.value && owner.value.name === props.backText);

/** The run's title when its summary is known (REQ-005), else none: the run identity stands in. */
const runTitle = computed(() => props.folderRun?.runLabel || store.target?.runLabel || '');

const isImported = computed(() => store.target?.source?.type === 'IMPORTED');

/** The run ID and, when there is one, its workspace; a member run: its run ID; a folder run: its run key. */
const runIdentity = computed(() => {
  if (props.folderRun) return props.folderRun.runKey;
  const target = store.target;
  if (!target) return '';
  if (target.kind === 'agent_run') return [target.runId, target.workspaceRootPath].filter(Boolean).join(' · ');
  return target.agentRunId;
});
</script>
