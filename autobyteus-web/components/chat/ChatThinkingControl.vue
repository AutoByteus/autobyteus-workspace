<template>
  <div v-if="menu.mode !== 'hidden'" ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      data-test="chat-thinking-trigger"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] leading-5 text-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :class="['hover:bg-gray-100 hover:text-gray-700', popover.open.value ? 'bg-gray-100 text-gray-700' : '']"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      aria-haspopup="menu"
      :aria-label="$t('chat.thinking.triggerAria', { value: menu.summary })"
      :title="$t('chat.thinking.title')"
      @click="toggle()"
    >
      <Icon
        icon="heroicons:light-bulb"
        class="h-3.5 w-3.5"
        :class="menu.active ? '' : 'text-gray-300'"
        data-test="chat-thinking-bulb"
        aria-hidden="true"
      />
      <span class="whitespace-nowrap">{{ menu.summary }}</span>
      <Icon icon="heroicons:chevron-down" class="h-3 w-3 text-gray-400" aria-hidden="true" />
    </button>

    <div v-if="popover.open.value && popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
    <div
      v-if="popover.open.value"
      ref="menuRef"
      role="menu"
      :aria-label="$t('chat.thinking.title')"
      data-test="chat-thinking-menu"
      class="z-50 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2'
        : ['absolute right-0 w-44', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      @keydown="onKeydown"
    >
      <template v-if="menu.mode === 'merged'">
        <p class="px-2 pb-0.5 pt-1 text-[0.6875rem] font-medium text-gray-400">{{ menu.title }}</p>
        <button
          v-for="option in menu.primary"
          :key="option.id"
          type="button"
          role="menuitemradio"
          :aria-checked="option.checked ? 'true' : 'false'"
          :data-test="`chat-thinking-option-primary-${option.id}`"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          @click="choose(option.next)"
        >
          <span class="flex-1">{{ option.label }}</span>
          <Icon v-if="option.checked" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
        </button>
        <div v-if="groups.length" class="mx-1 my-1 border-t border-gray-100" role="separator"></div>
      </template>

      <template v-for="parameter in groups" :key="parameter.key">
        <p class="px-2 pb-0.5 pt-1 text-[0.6875rem] font-medium text-gray-400">{{ parameter.label }}</p>
        <div v-if="parameter.kind === 'number'" class="px-2 py-1">
          <input
            type="number"
            class="w-full rounded-md border border-gray-200 px-2 py-1 text-[0.8125rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            :min="parameter.minimum ?? undefined"
            :max="parameter.maximum ?? undefined"
            :value="parameter.value"
            :aria-label="parameter.label"
            :data-test="`chat-thinking-input-${parameter.key}`"
            @change="setNumber(parameter, ($event.target as HTMLInputElement).value)"
          >
        </div>
        <button
          v-for="option in parameter.options"
          v-else
          :key="option.id"
          type="button"
          role="menuitemradio"
          :aria-checked="option.checked ? 'true' : 'false'"
          :data-test="`chat-thinking-option-${parameter.key}-${option.id}`"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          @click="choose(option.next)"
        >
          <span class="flex-1">{{ option.label }}</span>
          <Icon v-if="option.checked" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useLocalization } from '~/composables/useLocalization'
import { buildChatThinkingMenu, type ChatThinkingParameter } from '~/components/chat/chatThinkingMenu'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Thinking follows the selected model's config schema (DEC-009): only the parameters the model
 * exposes are offered, and the control is hidden when there are none. Models with an on/off switch
 * get one merged list (Off · effort levels); picking any dependent setting turns thinking on.
 */
const props = defineProps<{
  schema: UiModelConfigSchema | null
  llmConfig: Record<string, unknown> | null
}>()
const emit = defineEmits<{ (event: 'update', value: Record<string, unknown> | null): void }>()

const { t } = useLocalization()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const popover = useAnchoredPopover(rootRef, triggerRef, 240)

const menu = computed(() => buildChatThinkingMenu(props.schema, props.llmConfig, (key) => t(key)))
const groups = computed<ChatThinkingParameter[]>(() => {
  if (menu.value.mode === 'merged') return menu.value.secondary
  if (menu.value.mode === 'parameters') return menu.value.parameters
  return []
})

const toggle = async () => {
  await popover.toggle()
  if (popover.open.value) {
    await nextTick()
    menuRef.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
      ?? menuRef.value?.querySelector<HTMLElement>('[role="menuitemradio"], input')?.focus()
  }
}

const choose = (next: Record<string, unknown> | null) => {
  emit('update', next)
  popover.close(true)
}

const setNumber = (parameter: ChatThinkingParameter, raw: string) => {
  const parsed = Number(raw)
  if (!raw.trim() || !Number.isFinite(parsed)) return
  emit('update', parameter.applyNumber(parsed))
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"], input') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  items[event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1)]?.focus()
}
</script>
