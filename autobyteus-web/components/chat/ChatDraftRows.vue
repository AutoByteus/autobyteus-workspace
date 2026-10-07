<template>
  <!-- Kept New chats directly under the Chat row (REQ-002): one line of text each, newest first. -->
  <TransitionGroup
    ref="listRef"
    tag="ul"
    name="chat-draft-row"
    data-test="chat-draft-rows"
    :aria-label="$t('shell.components.AppLeftPanel.drafts')"
    :aria-hidden="rows.length ? undefined : 'true'"
  >
    <li
      v-for="row in rows"
      :key="row.id"
      class="chat-draft-row group relative mt-px first:mt-0.5"
      :data-draft-id="row.id"
    >
      <button
        type="button"
        data-test="chat-draft-row"
        class="flex w-full min-w-0 items-center rounded-md py-1.5 pl-9 pr-9 text-left text-[0.8125rem] leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        :class="row.selected ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'"
        :aria-current="row.selected ? 'page' : undefined"
        :aria-label="row.accessibleName"
        :title="row.tooltip"
        @click="emit('open', row.id)"
      >
        <span v-if="row.preview" class="truncate" data-test="chat-draft-preview">{{ row.preview }}</span>
        <span v-else class="truncate italic text-gray-400" data-test="chat-draft-preview">{{ $t('shell.components.AppLeftPanel.draft_empty') }}</span>
      </button>

      <button
        type="button"
        data-test="chat-draft-discard"
        class="chat-draft-discard absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover:opacity-100 group-focus-within:opacity-100"
        :class="row.selected ? 'opacity-100' : 'opacity-0'"
        :title="$t('shell.components.AppLeftPanel.discard_draft')"
        :aria-label="row.discardLabel"
        @click.stop="discardRow(row.id)"
      >
        <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatDraftRows } from '~/composables/chat/useChatDraftRows'

const emit = defineEmits<{
  (event: 'open', draftId: string): void
}>()

const { rows, discard } = useChatDraftRows()
const listRef = ref<ComponentPublicInstance | null>(null)

/** Discard (REQ-007); keyboard focus moves to the next row, else the previous row, else the Chat row. */
const discardRow = async (draftId: string) => {
  const ids = rows.value.map((row) => row.id)
  const index = ids.indexOf(draftId)
  const neighbour = ids[index + 1] ?? ids[index - 1] ?? null
  const list = listRef.value?.$el as HTMLElement | undefined
  // The list sits directly under the Chat row, inside the Chat item.
  const chatRow = list?.parentElement?.querySelector<HTMLElement>('[data-test="app-left-panel-chat"]') ?? null
  discard(draftId)
  await nextTick()
  const target = neighbour
    ? list?.querySelector<HTMLElement>(`[data-draft-id="${neighbour}"] [data-test="chat-draft-row"]`)
    : chatRow
  target?.focus()
}
</script>

<style scoped>
.chat-draft-row-enter-active,
.chat-draft-row-leave-active {
  transition: opacity 150ms ease-out, max-height 150ms ease-out;
  overflow: hidden;
  max-height: 2rem;
}

.chat-draft-row-enter-from,
.chat-draft-row-leave-to {
  opacity: 0;
  max-height: 0;
}

@media (hover: none) {
  .chat-draft-discard {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-draft-row-enter-active,
  .chat-draft-row-leave-active {
    transition: none;
  }
}
</style>
