<template>
  <!-- `@` mentions chosen for the next message of a live run. No explanatory line (VIS-003). -->
  <div
    v-if="chips.length"
    class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pt-2.5"
    data-test="agent-input-mention-chips"
  >
    <span
      v-for="chip in chips"
      :key="chip.key"
      class="inline-flex max-w-full items-center gap-1 rounded-md border border-sky-200 bg-sky-50 py-0.5 pl-1.5 pr-1 text-xs font-medium text-sky-800"
      :data-test="`run-mention-chip-${chip.name}`"
    >
      <Icon :icon="chip.kind === 'agent_team' ? 'heroicons:user-group-20-solid' : 'heroicons:user-20-solid'" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span class="truncate">@{{ chip.name }}</span>
      <button
        type="button"
        class="rounded p-0.5 text-sky-500 hover:bg-sky-100 hover:text-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        :aria-label="$t('chat.mentions.removeMention', { name: chip.name })"
        @click="emit('remove', chip)"
      >
        <Icon icon="heroicons:x-mark" class="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { RunMentionChip } from '~/composables/agentInput/useRunMentionMenu'

defineProps<{ chips: readonly RunMentionChip[] }>()
const emit = defineEmits<{ (event: 'remove', chip: RunMentionChip): void }>()
</script>
