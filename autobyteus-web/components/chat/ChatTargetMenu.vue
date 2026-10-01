<template>
  <!--
    `launch`: New chat `@` picks the launch target.
    `run`: `@` in a live run brings a shared Agent or Team into that run.
  -->
  <div
    :data-test="isRun ? 'run-mention-menu' : 'chat-target-menu'"
    class="flex min-h-0 w-[23rem] max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-gray-200 bg-white text-left shadow-lg"
  >
    <p class="border-b border-gray-100 px-3 py-1.5 text-[0.6875rem] text-gray-400">
      {{ isRun ? $t('chat.mentions.headerPrefix') : $t('chat.targets.headerPrefix') }} <span class="font-medium text-gray-600">@{{ query }}</span> · {{ $t('chat.targets.headerHint') }}
    </p>
    <ul
      :id="listId"
      role="listbox"
      :aria-label="isRun ? $t('chat.mentions.listAria') : $t('chat.targets.listAria')"
      class="max-h-64 min-h-0 overflow-y-auto p-1"
    >
      <li
        v-if="!targets.length"
        class="px-2 py-3 text-center"
        :data-test="isRun ? 'run-mention-menu-empty' : 'chat-target-menu-empty'"
      >
        <span class="block text-[0.8125rem] text-gray-500">{{ $t('chat.targets.noMatch') }}</span>
        <span v-if="isRun" class="mt-0.5 block text-xs text-gray-400">{{ $t('chat.mentions.noMatchHint') }}</span>
      </li>
      <template v-for="(target, index) in targets" :key="target.key">
        <li v-if="index === 0 || targets[index - 1]!.kind !== target.kind" role="presentation" class="px-2 pb-0.5 pt-1.5 text-[0.6875rem] font-medium text-gray-400">
          {{ target.kind === 'team' ? $t('chat.targets.teams') : $t('chat.targets.agents') }}
        </li>
        <li :id="`${listId}-option-${index}`" role="option" :aria-selected="index === highlight ? 'true' : 'false'">
          <button
            type="button"
            tabindex="-1"
            :data-test="`${isRun ? 'run-mention-option' : 'chat-target-option'}-${target.id}`"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left focus:outline-none"
            :class="index === highlight ? 'bg-gray-100' : 'hover:bg-gray-50'"
            @mouseenter="emit('highlight', index)"
            @mousedown.prevent
            @click="emit('choose', index)"
          >
            <span
              class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center text-[0.5625rem] font-semibold text-slate-600"
              :class="target.kind === 'team' ? 'rounded-md border border-gray-200 bg-gray-50' : 'rounded-full border border-emerald-200 bg-emerald-50'"
              aria-hidden="true"
            >{{ target.initials }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[0.8125rem] font-medium text-gray-900">{{ target.name }}</span>
              <span class="block truncate text-xs text-gray-500">{{ target.description }}</span>
            </span>
          </button>
        </li>
      </template>
    </ul>
    <footer class="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400" :data-test="isRun ? 'run-mention-menu-footer' : undefined">
      {{ isRun ? $t('chat.mentions.footerRelay', { agent: focusedName }) : $t('chat.targets.footer') }}
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatTargetOption } from '~/components/chat/chatComposerMenus'

const props = withDefaults(defineProps<{
  listId: string
  query: string
  targets: ChatTargetOption[]
  highlight: number
  variant?: 'launch' | 'run'
  /** `run` only: the agent the user is talking to; it receives the message. */
  focusedName?: string
}>(), { variant: 'launch', focusedName: '' })
const emit = defineEmits<{
  (event: 'choose', index: number): void
  (event: 'highlight', index: number): void
}>()

const isRun = computed(() => props.variant === 'run')
</script>
