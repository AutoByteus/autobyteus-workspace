<template>
  <!-- One other model setting (e.g. Codex Fast mode) as its own control next to Thinking (REQ-022).
       "Default or one value" is a toggle chip; otherwise a menu chip. -->
  <button
    v-if="option.kind === 'toggle'"
    type="button"
    class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    :class="option.set ? 'bg-blue-50 font-medium text-blue-700 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'"
    :aria-pressed="option.set ? 'true' : 'false'"
    :aria-label="toggleTitle"
    :title="toggleTitle"
    :data-test="`chat-model-option-${option.key}`"
    :data-state="option.set ? 'on' : 'off'"
    @click="emit('update', option.set ? undefined : option.onValue)"
  >
    <Icon :icon="option.set ? `${option.icon}-solid` : option.icon" class="h-3.5 w-3.5" :class="option.set ? 'text-blue-600' : 'text-gray-400'" aria-hidden="true" />
    <!-- Phones: the icon alone (the name stays in the accessible label and tooltip), so Send keeps its place. -->
    <span class="whitespace-nowrap" :class="compactOnPhone ? 'max-sm:hidden' : ''">{{ option.onLabel }}</span>
  </button>

  <div v-else ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] leading-5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :class="popover.open.value ? 'bg-gray-100 text-gray-700' : ''"
      aria-haspopup="menu"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      :aria-label="`${option.title}: ${option.valueLabel}`"
      :title="option.title"
      :data-test="`chat-model-option-${option.key}`"
      @click="toggleMenu"
    >
      <Icon :icon="option.icon" class="h-3.5 w-3.5" :class="option.set ? 'text-gray-600' : 'text-gray-300'" aria-hidden="true" />
      <span class="whitespace-nowrap">{{ option.valueLabel }}</span>
      <Icon icon="heroicons:chevron-down" class="h-3 w-3 text-gray-400" aria-hidden="true" />
    </button>
    <div v-if="popover.open.value && popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
    <div
      v-if="popover.open.value"
      ref="menuRef"
      role="menu"
      :aria-label="option.title"
      class="z-50 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2'
        : [align === 'left' ? 'absolute left-0' : 'absolute right-0', 'w-44', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : inBoundary.style.value"
      :data-test="`chat-model-option-menu-${option.key}`"
      @keydown="onKeydown"
    >
      <p class="px-2 pb-0.5 pt-1 text-[0.6875rem] font-medium text-gray-400">{{ option.title }}</p>
      <button
        v-for="choice in option.choices"
        :key="choice.id"
        type="button"
        role="menuitemradio"
        :aria-checked="choice.checked ? 'true' : 'false'"
        :data-test="`chat-model-option-${option.key}-${choice.id}`"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
        @click="choose(choice.value)"
      >
        <span class="flex-1">{{ choice.label }}</span>
        <Icon v-if="choice.checked" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useMenuInBoundary } from '~/composables/popover/useMenuInBoundary'
import { useLocalization } from '~/composables/useLocalization'
import type { ModelOption } from '~/components/chat/chatModelOptions'

const props = withDefaults(defineProps<{
  option: ModelOption
  placement?: 'above' | 'auto'
  align?: 'left' | 'right'
  /** The message box footer: icon only below `sm`. Labelled rows always show the word. */
  compactOnPhone?: boolean
}>(), { placement: 'above', align: 'right', compactOnPhone: false })
const emit = defineEmits<{ (event: 'update', value: unknown): void }>()

const { t } = useLocalization()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const popover = useAnchoredPopover(rootRef, triggerRef, 160, { placement: props.placement })
const inBoundary = useMenuInBoundary(menuRef, computed(() => popover.open.value), computed(() => !popover.narrow.value))

const toggleTitle = computed(() => t('chat.modelOption.toggleTitle', {
  setting: props.option.title,
  state: props.option.set ? t('chat.modelOption.on') : t('chat.modelOption.off'),
}))

const toggleMenu = async () => {
  await popover.toggle()
  if (!popover.open.value) return
  await nextTick()
  menuRef.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
}
const choose = (value: unknown) => {
  emit('update', value)
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
