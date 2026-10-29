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
        : [align === 'left' ? 'absolute left-0' : 'absolute right-0', 'w-44 overflow-y-auto', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : { maxHeight: `${popover.maxHeight.value}px`, ...inBoundary.style.value }"
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
        <button
          v-for="option in parameter.options"
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
import { useMenuInBoundary } from '~/composables/popover/useMenuInBoundary'
import { useLocalization } from '~/composables/useLocalization'
import { buildChatThinkingMenu, type ChatThinkingParameter } from '~/components/chat/chatThinkingMenu'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Thinking follows the selected model's config schema (DEC-009): only the parameters the model
 * exposes are offered, and the control is hidden when there are none. Models with an on/off switch
 * get Off / On, then their effort group (independent of the switch), then the settings that only
 * apply with thinking on; the adapter decides which choices also turn thinking on.
 */
const props = withDefaults(defineProps<{
  schema: UiModelConfigSchema | null
  llmConfig: Record<string, unknown> | null
  /** Run-settings rows open menus where they fit and align them to the chip. */
  placement?: 'above' | 'auto'
  align?: 'left' | 'right'
}>(), { placement: 'above', align: 'right' })
const emit = defineEmits<{ (event: 'update', value: Record<string, unknown> | null): void }>()

const { t } = useLocalization()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
// Fits the tallest menu (Claude switch: Off · On, five effort levels, two display options) unscrolled;
// the popover still clamps to the space available.
const popover = useAnchoredPopover(rootRef, triggerRef, 380, { placement: props.placement })
const inBoundary = useMenuInBoundary(menuRef, computed(() => popover.open.value), computed(() => !popover.narrow.value))

const menu = computed(() => buildChatThinkingMenu(props.schema, props.llmConfig, (key, params) => t(key, params)))
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
      ?? menuRef.value?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus()
  }
}

const choose = (next: Record<string, unknown> | null) => {
  emit('update', next)
  popover.close(true)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  items[event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1)]?.focus()
}
</script>
