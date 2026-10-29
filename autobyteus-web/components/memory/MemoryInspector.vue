<template>
  <div class="mx-auto max-w-7xl space-y-5 p-8">
    <button class="text-sm font-medium text-blue-600 hover:underline" @click="$emit('back')">← {{ backLabel }}</button>

    <header>
      <h1 class="break-words text-xl font-semibold text-gray-900">{{ breadcrumb }}</h1>
      <p v-if="metadataLine" class="mt-1 break-words text-sm text-gray-500">{{ metadataLine }}</p>
      <span v-if="isImported" class="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.MemoryInspector.importedReadOnlyCorpus') }}</span>
    </header>

    <div v-if="store.error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ store.error }}</div>
    <div v-if="!store.target && !folderRun" class="py-16 text-center text-sm text-gray-400">{{ $t('memory.components.memory.MemoryInspector.select_a_memory_entry_to_inspect') }}</div>

    <template v-else>
      <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          @click="store.setActiveTab(tab.id)"
        >{{ tab.label }}</button>
      </div>

      <div class="min-h-[360px]">
        <div v-if="store.loading && !store.memoryView && store.activeTab !== 'journal'" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryInspector.loading_memory_view') }}</div>
        <WorkJournalTab v-else-if="folderRun || store.activeTab === 'journal'" @open-index="$emit('openIndex')" />
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import type { MemoryInspectorTab } from '~/types/memory';
import WorkJournalTab from './WorkJournalTab.vue';
import RawTracesTab from './RawTracesTab.vue';

/** A run the memory index knows only by its folder: its Work Journal only (it has no memory view). */
type FolderRun = { runKey: string; runId: string; agentName: string | null; groupName: string | null };
const props = withDefaults(defineProps<{ backLabel?: string; folderRun?: FolderRun | null }>(), { backLabel: 'Back to Memory', folderRun: null });
defineEmits<{ back: []; openIndex: [] }>();

const store = useMemoryInspectorStore();
const tabs: Array<{ id: MemoryInspectorTab; label: string }> = [
  { id: 'journal', label: 'Work Journal' },
  { id: 'raw', label: 'Raw Traces' },
];
const visibleTabs = computed(() => (props.folderRun ? tabs.slice(0, 1) : tabs));
const activeTab = computed((): MemoryInspectorTab => (props.folderRun ? 'journal' : store.activeTab));

/** The run's name: the agent, or the member and its team. No path words: the page already says where you are. */
const breadcrumb = computed(() => {
  const folder = props.folderRun;
  if (folder) return [folder.agentName || folder.runId, folder.groupName].filter(Boolean).join(' · ');
  const target = store.target;
  if (!target) return '';
  if (target.kind === 'agent_run') return target.agentDisplayName || target.agentDefinitionId || target.runId;
  const member = target.memberName || target.memberAddress || target.agentRunId;
  const group = target.kind === 'org_member_run'
    ? (target.orgDefinitionName || target.orgDefinitionId || '')
    : (target.teamDefinitionName || target.teamDefinitionId || '');
  return group ? `${member} · ${group}` : member;
});

const isImported = computed(() => store.target?.source?.type === 'IMPORTED');

/** The run ID and, when there is one, its workspace. */
const metadataLine = computed(() => {
  if (props.folderRun) return props.folderRun.runKey;
  const target = store.target;
  if (!target) return '';
  if (target.kind === 'agent_run') return [target.runId, target.workspaceRootPath].filter(Boolean).join(' · ');
  return target.agentRunId;
});
</script>
