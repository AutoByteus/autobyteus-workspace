<template>
  <button
    v-if="locked"
    type="button"
    data-test="chat-approval-toggle"
    data-locked="true"
    class="inline-flex cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] leading-5 text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    aria-pressed="true"
    aria-disabled="true"
    :aria-label="$t('chat.approval.agyLockedAria')"
    :title="$t('chat.approval.agyLockedTooltip')"
  >
    <Icon icon="heroicons:shield-check" class="h-4 w-4" aria-hidden="true" />
    <span>{{ $t('chat.approval.autoApprove') }}</span>
    <Icon icon="heroicons:lock-closed" class="h-3 w-3 text-gray-400" aria-hidden="true" data-test="chat-approval-lock" />
  </button>
  <button
    v-else
    type="button"
    data-test="chat-approval-toggle"
    class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.8125rem] leading-5 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    :class="modelValue ? 'text-gray-600' : 'text-amber-700'"
    :aria-pressed="modelValue ? 'true' : 'false'"
    :aria-label="modelValue ? $t('chat.approval.autoApproveAria') : $t('chat.approval.askFirstAria')"
    :title="modelValue ? $t('chat.approval.autoApproveTooltip') : $t('chat.approval.askFirstTooltip')"
    @click="emit('update:modelValue', !modelValue)"
  >
    <Icon :icon="modelValue ? 'heroicons:shield-check' : 'heroicons:shield-exclamation'" class="h-4 w-4" aria-hidden="true" />
    <span>{{ modelValue ? $t('chat.approval.autoApprove') : $t('chat.approval.askFirst') }}</span>
  </button>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

/** `locked`: the runtime always auto-approves (Antigravity); shown on and not changeable. */
defineProps<{ modelValue: boolean; locked?: boolean }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>()
</script>
