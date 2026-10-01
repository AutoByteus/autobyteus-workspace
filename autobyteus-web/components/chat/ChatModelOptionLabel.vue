<template>
  <span class="min-w-0 flex-1">
    <span class="flex min-w-0 items-center gap-2">
      <span class="min-w-0 truncate whitespace-nowrap text-gray-900" data-test="chat-model-option-label">{{ option.label }}</span>
      <!-- Same badge as the launch form's SearchableGroupedSelect. -->
      <span
        v-if="option.recommended"
        class="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200"
        data-test="chat-model-option-recommended"
      >{{ $t('chat.model.recommended') }}</span>
    </span>
    <span
      v-if="option.secondary"
      class="mt-0.5 block truncate whitespace-nowrap text-xs leading-4 text-gray-500"
      data-test="chat-model-option-secondary"
    >{{ option.secondary }}</span>
  </span>
</template>

<script setup lang="ts">
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'

defineProps<{ option: ChatModelOption }>()
</script>
