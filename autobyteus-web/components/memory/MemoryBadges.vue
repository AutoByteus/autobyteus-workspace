<template>
  <div v-if="notes.length" class="flex flex-wrap gap-2 text-[11px]">
    <span v-for="note in notes" :key="note.key" class="rounded-full px-2 py-0.5" :class="note.class">{{ note.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { MemoryAvailabilitySummary } from '~/types/memory';

/** A run has its Work Journal and Raw traces: that is the normal case and says nothing. Only what is missing, or archived, is shown. */
const props = defineProps<{ memory: MemoryAvailabilitySummary }>();
const { t } = useLocalization();

const notes = computed(() => {
  const m = props.memory;
  if (!m.hasWorkJournal && !m.hasRawTraces && !m.hasRawArchive) return [{ key: 'empty', label: t('memory.components.memory.MemoryBadges.empty'), class: 'bg-gray-100 text-gray-500' }];
  const list: Array<{ key: string; label: string; class: string }> = [];
  if (!m.hasWorkJournal) list.push({ key: 'no-journal', label: t('memory.badges.no_work_journal'), class: 'bg-gray-100 text-gray-500' });
  if (!m.hasRawTraces) list.push({ key: 'no-raw', label: t('memory.badges.no_raw_traces'), class: 'bg-gray-100 text-gray-500' });
  if (m.hasRawArchive) list.push({ key: 'archive', label: t('memory.components.memory.MemoryBadges.archive'), class: 'bg-slate-100 text-slate-700' });
  return list;
});
</script>
