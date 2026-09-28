<template>
  <div v-if="parameters.length" ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      data-test="chat-thinking-trigger"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] leading-5 text-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      :class="[
        lockedReason ? 'cursor-default text-gray-400' : 'hover:bg-gray-100 hover:text-gray-700',
        popover.open.value ? 'bg-gray-100 text-gray-700' : '',
      ]"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      aria-haspopup="menu"
      :aria-disabled="lockedReason ? 'true' : undefined"
      :aria-label="lockedReason
        ? $t('chat.thinking.triggerLockedAria', { value: summary, reason: lockedReason })
        : $t('chat.thinking.triggerAria', { value: summary })"
      :title="lockedReason || $t('chat.thinking.title')"
      :data-locked="lockedReason ? 'true' : undefined"
      @click="!lockedReason && toggle()"
    >
      <Icon :icon="lockedReason ? 'heroicons:lock-closed' : 'heroicons:light-bulb'" class="h-3.5 w-3.5" aria-hidden="true" />
      <span class="whitespace-nowrap">{{ summary }}</span>
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
      <template v-for="parameter in parameters" :key="parameter.key">
        <p class="px-2 pb-0.5 pt-1 text-[0.6875rem] font-medium text-gray-400">{{ parameter.label }}</p>
        <template v-if="parameter.kind === 'number'">
          <div class="px-2 py-1">
            <input
              type="number"
              class="w-full rounded-md border border-gray-200 px-2 py-1 text-[0.8125rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              :min="parameter.minimum ?? undefined"
              :max="parameter.maximum ?? undefined"
              :value="parameter.value"
              :aria-label="parameter.label"
              @change="setNumber(parameter.key, ($event.target as HTMLInputElement).value)"
            >
          </div>
        </template>
        <button
          v-for="option in parameter.options"
          v-else
          :key="String(option.value)"
          type="button"
          role="menuitemradio"
          :aria-checked="Object.is(option.value, parameter.value) ? 'true' : 'false'"
          :data-test="`chat-thinking-option-${parameter.key}-${String(option.value)}`"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          @click="setValue(parameter.key, option.value)"
        >
          <span class="flex-1">{{ option.label }}</span>
          <Icon v-if="Object.is(option.value, parameter.value)" icon="heroicons:check" class="h-4 w-4 text-blue-600" aria-hidden="true" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useChatPopover } from '~/composables/chat/useChatPopover'
import { useLocalization } from '~/composables/useLocalization'
import { applyThinkingToggle, getThinkingParamKeys, getThinkingToggleOwnedParamKeys } from '~/utils/llmThinkingConfigAdapter'
import { resolveEffectiveConfigValue, type UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Thinking follows the selected model's config schema (DEC-009): only the parameters the model
 * exposes (on/off, effort, budget or level) are offered, and the control is hidden when there are none.
 */
const props = defineProps<{
  schema: UiModelConfigSchema | null
  llmConfig: Record<string, unknown> | null
  lockedReason?: string | null
}>()
const emit = defineEmits<{ (event: 'update', value: Record<string, unknown> | null): void }>()

const { t } = useLocalization()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const popover = useChatPopover(rootRef, triggerRef, 240)

type ThinkingOption = { value: unknown; label: string }
type ThinkingParameter = {
  key: string
  label: string
  kind: 'choice' | 'number'
  value: unknown
  options: ThinkingOption[]
  minimum: number | null
  maximum: number | null
}

const humanize = (value: string): string => {
  const text = value.replace(/[_-]+/g, ' ').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text
}
const optionLabel = (value: unknown): string => {
  if (value === true) return t('chat.thinking.on')
  if (value === false) return t('chat.thinking.off')
  return humanize(String(value))
}

const parameters = computed<ThinkingParameter[]>(() => {
  const schema = props.schema
  if (!schema) return []
  return getThinkingParamKeys(schema).flatMap((key): ThinkingParameter[] => {
    const param = schema[key]
    if (!param) return []
    const value = resolveEffectiveConfigValue(param, props.llmConfig?.[key])
    const label = param.title?.trim() || humanize(key)
    if (Array.isArray(param.enum) && param.enum.length) {
      return [{ key, label, kind: 'choice', value, options: param.enum.map((entry) => ({ value: entry, label: optionLabel(entry) })), minimum: null, maximum: null }]
    }
    if (param.type === 'boolean') {
      return [{ key, label, kind: 'choice', value: value === true, options: [true, false].map((entry) => ({ value: entry, label: optionLabel(entry) })), minimum: null, maximum: null }]
    }
    if (param.type === 'integer' || param.type === 'number') {
      return [{ key, label, kind: 'number', value: typeof value === 'number' ? value : '', options: [], minimum: param.minimum ?? null, maximum: param.maximum ?? null }]
    }
    return []
  })
})

const summary = computed(() => {
  const primary = parameters.value.find((parameter) => parameter.kind === 'choice')
  if (!primary) return t('chat.thinking.title')
  return primary.value === undefined ? t('chat.thinking.default') : optionLabel(primary.value)
})

const toggle = async () => {
  await popover.toggle()
  if (popover.open.value) {
    await nextTick()
    menuRef.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
      ?? menuRef.value?.querySelector<HTMLElement>('[role="menuitemradio"], input')?.focus()
  }
}

const setValue = (key: string, value: unknown) => {
  const schema = props.schema
  if (typeof value === 'boolean' && getThinkingToggleOwnedParamKeys(schema).includes(key)) {
    emit('update', applyThinkingToggle(schema, value, props.llmConfig))
  } else {
    emit('update', { ...(props.llmConfig ?? {}), [key]: value })
  }
  popover.close(true)
}

const setNumber = (key: string, raw: string) => {
  const parsed = Number(raw)
  if (!raw.trim() || !Number.isFinite(parsed)) return
  emit('update', { ...(props.llmConfig ?? {}), [key]: parsed })
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"], input') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  items[event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1)]?.focus()
}
</script>
