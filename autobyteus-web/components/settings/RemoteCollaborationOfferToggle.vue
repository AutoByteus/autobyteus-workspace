<template>
  <button
    type="button"
    class="-ml-1.5 inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    :aria-expanded="open"
    :title="preview || undefined"
    :data-testid="`${testId}-toggle`"
    @click="emit('update:open', !open)"
  >
    <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform" :class="open ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="min-w-0 leading-5" :data-testid="`${testId}-summary`">{{ summary }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { PeerOfferEntry } from '~/stores/remoteCollaborationOffersStore'

/** The offer summary ("7 Agents · 2 Agent Teams", "Connection details" or an empty offer) as the button that opens the node's panel.
 * The names that used to trail it are the button's tooltip; the whole list is in the panel. */
const props = defineProps<{ entries: PeerOfferEntry[]; label?: string; testId: string; open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useLocalization()
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
const preview = computed(() => [...props.entries].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => entry.name).join(', '))
</script>
