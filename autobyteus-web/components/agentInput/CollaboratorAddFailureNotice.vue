<template>
  <!-- A send rejected because a mentioned collaborator could not be added (REQ-008, D-R1): the draft
       stays in the composer below. Success has no notice: the run tree shows the collaborator. -->
  <div v-if="failure" class="mb-2" data-test="collaborator-add-failures">
    <div
      class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      role="alert"
      data-test="collaborator-add-failure"
    >
      <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="font-medium">{{ $t('chat.mentions.noticeFailed', { name: failure.name }) }}</p>
        <p class="mt-0.5 text-xs text-red-700">{{ $t('chat.mentions.noticeFailedDetail', { reason: failure.reason }) }}</p>
      </div>
      <button
        type="button"
        class="flex-shrink-0 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="$t('chat.mentions.noticeDismiss')"
        data-test="collaborator-add-failure-dismiss"
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

/** The rejection of the focused conversation's last send; the next send replaces it. */
const failure = computed(() => active.activeWorkspaceTarget?.context.collaboratorAddFailure ?? null)

const dismiss = (): void => {
  const context = active.activeWorkspaceTarget?.context
  if (context) context.collaboratorAddFailure = null
}
</script>
