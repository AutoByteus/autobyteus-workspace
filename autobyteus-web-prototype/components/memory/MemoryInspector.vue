<template>
  <div class="mx-auto max-w-5xl p-6">
    <button class="mb-4 text-sm font-semibold text-blue-600 hover:underline" @click="$emit('back')">← {{ backLabel }}</button>
    <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header class="border-b border-gray-100 p-5">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t('memory.components.memory.MemoryInspector.memory_inspector') }}</h1>
        <p class="mt-2 text-sm text-gray-600">{{ breadcrumb }}</p>
        <p v-if="metadataLine" class="mt-1 text-xs text-gray-500">{{ metadataLine }}</p>
        <span v-if="isImported" class="mt-3 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.MemoryInspector.importedReadOnlyCorpus') }}</span>
      </header>

      <div v-if="store.error" class="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{{ store.error }}</div>
      <div v-if="!store.target" class="p-12 text-center text-gray-400">{{ $t('memory.components.memory.MemoryInspector.select_a_memory_entry_to_inspect') }}</div>

      <div v-else>
        <nav class="flex gap-2 border-b border-gray-100 px-5 pt-4">
          <button v-for="tab in tabs" :key="tab.id" class="rounded-t-lg px-3 py-2 text-sm font-semibold" :class="store.activeTab === tab.id ? 'border border-gray-200 border-b-white bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'" @click="store.setActiveTab(tab.id)">
            {{ tab.label }}
          </button>
        </nav>

        <div class="min-h-[360px] p-5">
          <div v-if="store.loading && !store.memoryView" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryInspector.loading_memory_view') }}</div>
          <WorkingContextTab v-else-if="store.activeTab === 'working'" :messages="store.memoryView?.workingContext ?? null" />
          <EpisodicTab v-else-if="store.activeTab === 'episodic'" :items="store.memoryView?.episodic ?? null" />
          <SemanticTab v-else-if="store.activeTab === 'semantic'" :items="store.memoryView?.semantic ?? null" />
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import type { MemoryInspectorTab } from '~/types/memory';
import WorkingContextTab from './WorkingContextTab.vue';
import EpisodicTab from './EpisodicTab.vue';
import SemanticTab from './SemanticTab.vue';
import RawTracesTab from './RawTracesTab.vue';

withDefaults(defineProps<{ backLabel?: string }>(), { backLabel: 'Back to Memory' });
defineEmits<{ back: [] }>();

const store = useMemoryInspectorStore();
const tabs: Array<{ id: MemoryInspectorTab; label: string }> = [
  { id: 'working', label: 'Working Context' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'raw', label: 'Raw Traces' },
];

const breadcrumb = computed(() => {
  const target = store.target;
  if (!target) return 'No memory selected';
  if (target.kind === 'agent_run') {
    const agent = target.agentDisplayName || target.agentDefinitionId || 'Unattributed runs';
    return `Agents / ${agent} / ${target.runLabel || target.runId}`;
  }
  const team = target.teamDefinitionName || target.teamDefinitionId || 'Agent Team';
  const member = target.memberName || target.memberAddress || target.agentRunId;
  return `Agent Teams / ${team} / ${target.teamRunId} / ${member}`;
});

const isImported = computed(() => store.target?.source?.type === 'IMPORTED');

const metadataLine = computed(() => {
  const target = store.target;
  if (!target) return '';
  if (target.kind === 'agent_run') {
    const workspace = target.workspaceRootPath ? `Workspace: ${target.workspaceRootPath}` : `Run: ${target.runId}`;
    return target.lastUpdatedAt ? `${workspace} · Updated: ${formatTimestamp(target.lastUpdatedAt)}` : workspace;
  }
  const memberRun = `Member run: ${target.agentRunId}`;
  return target.lastUpdatedAt ? `${memberRun} · Updated: ${formatTimestamp(target.lastUpdatedAt)}` : memberRun;
});

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
