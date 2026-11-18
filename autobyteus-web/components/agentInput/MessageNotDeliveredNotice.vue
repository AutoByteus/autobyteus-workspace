<template>
  <!-- A message that did not reach the node, or may not have (autobyteus-540 REQ-003, REQ-004): its draft is back in
       the message box below. The next send or the dismiss button clears it. -->
  <div v-if="certainty" class="mb-2" data-test="message-not-delivered">
    <div
      class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      role="alert"
      :data-certainty="certainty"
    >
      <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <p class="min-w-0 flex-1" data-test="message-not-delivered-text">
        {{ certainty === 'not_sent' ? $t('agents.send.notDelivered.notSent') : $t('agents.send.notDelivered.unknown') }}
      </p>
      <button
        type="button"
        class="flex-shrink-0 rounded p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="$t('agents.send.notDelivered.dismiss')"
        data-test="message-not-delivered-dismiss"
        @click="dismiss"
      >
        <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useActiveContextStore } from '~/stores/activeContextStore'

const active = useActiveContextStore()

/** Whether the focused conversation's last send was not delivered; on the context, so a snapshot does not clear it. */
const certainty = computed(() => active.activeWorkspaceTarget?.context.messageNotDelivered ?? null)

const dismiss = (): void => {
  const context = active.activeWorkspaceTarget?.context
  if (context) context.messageNotDelivered = null
}
</script>
