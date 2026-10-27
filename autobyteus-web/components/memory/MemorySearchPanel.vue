<template>
  <div :class="centered ? 'flex min-h-[60vh] flex-col items-center justify-center gap-5 pb-16' : 'space-y-3'" data-test="memory-search-panel" :data-centered="centered">
    <section :class="centered ? 'w-full max-w-2xl' : ''">
      <form class="flex gap-3" :class="centered ? '' : 'max-w-3xl'" role="search" @submit.prevent="submit">
        <div class="relative flex-1">
          <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            v-model="queryInput"
            type="text"
            :disabled="!store.searchReady"
            :placeholder="store.searchReady ? $t('memory.search.placeholder') : $t('memory.search.placeholder_not_ready')"
            :aria-label="$t('memory.search.label')"
            class="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
            :class="centered ? 'py-3.5 text-base shadow-sm' : 'py-2.5 text-sm'"
            data-test="memory-search-input"
          />
        </div>
        <button
          type="submit"
          :disabled="!store.searchReady || !queryInput.trim()"
          class="rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          :class="centered ? 'py-3.5' : 'py-2'"
        >{{ $t('memory.search.button') }}</button>
      </form>
    </section>

    <section v-if="index?.phase === 'needs_index'" class="text-center" data-test="memory-search-not-indexed">
      <h2 class="text-base font-semibold text-gray-900">{{ $t('memory.search.not_indexed_title') }}</h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-gray-600">{{ $t('memory.search.not_indexed_body') }}</p>
      <button type="button" class="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700" data-test="memory-search-index-now" @click="indexNow">{{ $t('memory.index.index_now') }}</button>
    </section>

    <button
      v-else-if="showNotice && (index && index.phase !== 'ready' || store.modelChanged)"
      type="button"
      class="flex w-full items-center gap-2 rounded-lg border px-4 py-2.5 text-left text-sm"
      :class="[centered ? 'max-w-2xl' : '', status.attention ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100/60' : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100/60']"
      data-test="memory-search-index-notice"
      @click="$emit('openIndex')"
    >
      <MemorySpinner v-if="status.spinner" class="h-4 w-4 text-blue-600" />
      <Icon v-else icon="heroicons:exclamation-triangle-20-solid" class="h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <span class="min-w-0 flex-1 font-semibold">{{ status.label }}</span>
      <span class="flex-shrink-0 font-semibold underline">{{ $t('memory.search.view_index') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useMemoryIndexView } from '~/composables/useMemoryIndexView';
import MemorySpinner from './MemorySpinner.vue';

withDefaults(defineProps<{ showNotice?: boolean; centered?: boolean }>(), { showNotice: true, centered: false });
const emit = defineEmits<{ search: [query: string]; openIndex: [] }>();

const { store, index, status } = useMemoryIndexView();
const queryInput = ref(store.query);
watch(() => store.query, (value) => { queryInput.value = value; });

const submit = () => {
  const query = queryInput.value.trim();
  if (query && store.searchReady) emit('search', query);
};

/** The first build is started by the user's click and watched on the Index tab. */
const indexNow = () => { void store.startIndex(); emit('openIndex'); };
</script>
