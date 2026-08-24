<template>
  <div class="py-1">
    <!-- Header -->
    <div 
        class="group-header flex items-center justify-between pl-1 pr-2 py-1.5 hover:bg-gray-50 cursor-pointer select-none"
        @click="toggleExpand"
    >
        <div class="flex items-center text-sm text-gray-700">
            <!-- Chevron -->
            <span 
                class="mr-1.5 transition-transform duration-200 flex items-center text-gray-500"
                :class="isExpanded ? 'rotate-0' : '-rotate-90'"
            >
                <Icon icon="heroicons:chevron-down" class="w-3.5 h-3.5" />
            </span>
            <span class="font-medium">{{ definitionName }}</span>
            <span class="ml-1.5 text-xs text-gray-400">({{ runs.length }})</span>
        </div>
        
        <!-- Add Button -->
        <button 
            @click.stop="$emit('create', definitionId)"
            class="create-btn p-0.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-0 group-header:hover:opacity-100"
            :title="$t('workspace.components.workspace.running.RunningAgentGroup.start_new_run')"
        >
            <span class="i-heroicons-plus-20-solid w-4 h-4"></span>
        </button>
    </div>

    <!-- Body - Runs -->
    <div v-if="isExpanded" class="ml-2">
        <RunningRunRow
            v-for="run in runs"
            :key="run.state.runId"
            :run="run"
            :is-selected="run.state.runId === selectedRunId"
            @select="$emit('select', $event)"
            @delete="$emit('delete', $event)"
        />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import type { AgentContext } from '~/types/agent/AgentContext';
import RunningRunRow from './RunningRunRow.vue';

const props = defineProps<{
    definitionName: string;
    definitionId: string;
    runs: AgentContext[];
    selectedRunId: string | null;
}>();

defineEmits<{
    (e: 'create', definitionId: string): void;
    (e: 'select', runId: string): void;
    (e: 'delete', runId: string): void;
}>();

const isExpanded = ref(true);

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};
</script>
