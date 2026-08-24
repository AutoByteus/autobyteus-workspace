<template>
  <div class="flex flex-wrap gap-2 text-[11px]">
    <span v-if="memory.hasWorkingContext" class="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{{ $t('memory.components.memory.MemoryBadges.working') }}</span>
    <span v-if="memory.hasEpisodic" class="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">{{ $t('memory.components.memory.MemoryBadges.episodic') }}</span>
    <span v-if="memory.hasSemantic" class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{{ $t('memory.components.memory.MemoryBadges.semantic') }}</span>
    <span v-if="memory.hasRawTraces" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{{ $t('memory.components.memory.MemoryBadges.raw_traces') }}</span>
    <span v-if="memory.hasRawArchive" class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{{ $t('memory.components.memory.MemoryBadges.archive') }}</span>
    <span v-if="isEmpty" class="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">{{ $t('memory.components.memory.MemoryBadges.empty') }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MemoryAvailabilitySummary } from '~/types/memory';

const props = defineProps<{ memory: MemoryAvailabilitySummary }>();

const isEmpty = computed(() => !props.memory.hasWorkingContext && !props.memory.hasEpisodic && !props.memory.hasSemantic && !props.memory.hasRawTraces && !props.memory.hasRawArchive);
</script>
