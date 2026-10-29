<template>
  <div :data-testid="testId">
    <div v-if="showSearch" class="mb-3">
      <div class="relative w-full max-w-xs">
        <svg class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3.5 3.5" stroke-linecap="round" />
        </svg>
        <input
          v-model="query"
          type="search"
          class="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :placeholder="t('settings.components.settings.RemoteCollaboration.offer.search')"
          :aria-label="t('settings.components.settings.RemoteCollaboration.offer.search')"
          :data-testid="`${testId}-search`"
        >
      </div>
    </div>

    <p v-if="needle && matchCount === 0" class="text-sm text-slate-500" role="status" :data-testid="`${testId}-no-match`">
      {{ t('settings.components.settings.RemoteCollaboration.offer.noMatch', { query: query.trim() }) }}
      <button type="button" class="font-medium text-blue-700 hover:underline" @click="query = ''">
        {{ t('settings.components.settings.RemoteCollaboration.offer.clearSearch') }}
      </button>
    </p>

    <div v-else class="grid gap-x-10 gap-y-5" :class="twoColumns ? 'md:grid-cols-2' : ''">
      <section v-for="group in groups" :key="group.kind" :data-testid="`${testId}-${group.testKey}`">
        <h4 class="border-b border-slate-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ group.title }}
          <span class="ml-1 font-medium normal-case tracking-normal text-slate-400" :data-testid="`${testId}-${group.testKey}-count`">{{ group.countLabel }}</span>
        </h4>
        <p v-if="group.items.length === 0" class="py-2 text-sm text-slate-400">{{ group.emptyLabel }}</p>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="(entry, index) in group.items" :key="`${index}:${entry.name}`" class="py-2" :data-testid="`${testId}-entry`">
            <p class="text-sm font-medium text-slate-900 break-words">{{ entry.name }}</p>
            <p v-if="entry.description" class="mt-0.5 text-xs text-slate-500">{{ entry.description }}</p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { PeerOfferEntry } from '~/stores/remoteCollaborationOffersStore'

/** The search box appears once either kind has more entries than this. */
const SEARCH_FROM = 6

const props = defineProps<{ entries: PeerOfferEntry[]; testId: string }>()

const { t } = useLocalization()
const query = ref('')
const needle = computed(() => query.value.trim().toLowerCase())

const countOf = (kind: string): number => props.entries.filter((entry) => entry.kind === kind).length
const showSearch = computed(() => countOf('agent') > SEARCH_FROM || countOf('agent_team') > SEARCH_FROM)
const twoColumns = computed(() => countOf('agent') > 0 && countOf('agent_team') > 0)

const matches = (entry: PeerOfferEntry): boolean => !needle.value || entry.name.toLowerCase().includes(needle.value)
const matchCount = computed(() => props.entries.filter(matches).length)

const groups = computed(() => (['agent', 'agent_team'] as const)
  .map((kind) => {
    const all = props.entries.filter((entry) => entry.kind === kind)
    const items = all.filter(matches).sort((a, b) => a.name.localeCompare(b.name))
    const isAgent = kind === 'agent'
    return {
      kind, all: all.length, items,
      testKey: isAgent ? 'agents' : 'teams',
      title: t(`settings.components.settings.RemoteCollaboration.offer.${isAgent ? 'agents' : 'teams'}`),
      countLabel: needle.value && items.length !== all.length
        ? t('settings.components.settings.RemoteCollaboration.offer.countFiltered', { shown: items.length, count: all.length })
        : String(all.length),
      emptyLabel: t('settings.components.settings.RemoteCollaboration.offer.noMatchInKind'),
    }
  })
  // A kind the list has none of is left out; the counts line above already says so.
  .filter((group) => group.all > 0))
</script>
