<template>
  <div :data-testid="testId">
    <button
      type="button"
      class="flex w-full min-w-0 items-center gap-2 rounded-md py-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :aria-expanded="open"
      :data-testid="`${testId}-toggle`"
      @click="open = !open"
    >
      <svg class="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform" :class="open ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="flex-shrink-0 font-medium text-slate-800" :data-testid="`${testId}-summary`">{{ summary }}</span>
      <span v-if="!open" class="min-w-0 truncate text-slate-500" :data-testid="`${testId}-preview`">{{ preview }}</span>
    </button>
    <div v-if="open" class="mt-3 pl-6">
      <RemoteCollaborationOfferList v-if="entries.length" :entries="entries" :test-id="`${testId}-list`" />
      <div v-if="$slots.default" :class="entries.length ? 'mt-4 border-t border-slate-200 pt-4' : ''"><slot /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import RemoteCollaborationOfferList from '~/components/settings/RemoteCollaborationOfferList.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { PeerOfferEntry } from '~/stores/remoteCollaborationOffersStore'

const props = withDefaults(defineProps<{
  entries: PeerOfferEntry[]
  /** Replaces the "7 Agents · 2 Agent Teams" counts (one-nodes-tab: "Connection details", or an empty offer). */
  label?: string
  testId: string
  /** Optional: lets the page open the details itself (one-nodes-tab: Change address from the row's line). */
  modelValue?: boolean
}>(), { label: undefined, modelValue: undefined })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { t } = useLocalization()
const local = ref(false)
const open = computed({
  get: () => props.modelValue ?? local.value,
  set: (value: boolean) => { local.value = value; emit('update:modelValue', value) },
})

const base = 'settings.components.settings.RemoteCollaboration.offer.'
const agents = computed(() => props.entries.filter((entry) => entry.kind === 'agent').length)
const teams = computed(() => props.entries.filter((entry) => entry.kind === 'agent_team').length)

const summary = computed(() => {
  if (props.label) return props.label
  const parts: string[] = []
  if (agents.value) parts.push(agents.value === 1 ? t(`${base}agentOne`) : t(`${base}agentsCount`, { count: agents.value }))
  if (teams.value) parts.push(teams.value === 1 ? t(`${base}teamOne`) : t(`${base}teamsCount`, { count: teams.value }))
  return parts.join(' · ')
})

/** The short default view: the first names, cut by the line's width. */
const preview = computed(() => [...props.entries].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => entry.name).join(', '))
</script>
