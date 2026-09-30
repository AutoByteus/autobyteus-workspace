<template>
  <div ref="rootRef">
    <textarea
      ref="textareaRef"
      :value="context?.requirement ?? ''"
      data-test="chat-message-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="menuOpen ? 'true' : 'false'"
      :aria-controls="menuOpen ? listId : undefined"
      :aria-activedescendant="menuOpen && activeCount ? `${listId}-option-${highlight}` : undefined"
      :aria-label="placeholder"
      class="block w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[0.9375rem] leading-6 focus:outline-none focus:ring-0"
      :style="{ height: `${height}px`, minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }"
      :placeholder="placeholder"
      :disabled="disabled || !context"
      @input="onInput"
      @click="detectTrigger"
      @keydown="onKeydown"
      @dragover.prevent
      @drop.prevent="onDrop"
      data-file-drop-target="true"
    ></textarea>

    <div v-if="menuOpen && popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
    <div
      v-if="menuOpen"
      class="z-50"
      :class="popover.narrow.value
        ? 'fixed inset-x-2 bottom-2 [&>div]:w-auto'
        : ['absolute left-2 flex flex-col', popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
      :style="popover.narrow.value ? undefined : { maxHeight: `${popover.maxHeight.value}px` }"
    >
      <ChatTargetMenu
        v-if="menuKind === 'target'"
        :list-id="listId"
        :query="triggerQuery"
        :targets="filteredTargets"
        :highlight="highlight"
        @highlight="highlight = $event"
        @choose="chooseTarget"
      />
      <ChatSkillMenu
        v-else
        :list-id="listId"
        :query="triggerQuery"
        :skills="filteredSkills"
        :has-any-skills="(skillOptions?.length ?? 0) > 0"
        :selected="context?.requestedSkillNames ?? []"
        :highlight="highlight"
        :all-installed="skillsAllInstalled"
        @highlight="highlight = $event"
        @choose="chooseSkill"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import ChatSkillMenu from '~/components/chat/ChatSkillMenu.vue'
import ChatTargetMenu from '~/components/chat/ChatTargetMenu.vue'
import { filterTargets, toChatTarget, type ChatTargetOption } from '~/components/chat/chatComposerMenus'
import { detectMenuTrigger, rankSkills, type SkillTagOption } from '~/utils/skills/skillTagMenu'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useComposerFilePathDrop } from '~/composables/agentInput/useComposerFilePathDrop'
import type { ChatTarget } from '~/stores/chatDraftStore'
import type { AgentContext } from '~/types/agent/AgentContext'

/**
 * The Chat textarea: `/` adds skill tags to the context, `@` (New chat only) addresses an
 * agent or team, Enter submits and Shift+Enter inserts a newline.
 */
const props = defineProps<{
  context: AgentContext | null
  placeholder: string
  disabled?: boolean
  /** The addressed agent's skills; null when `/` is not offered (team target). */
  skillOptions: SkillTagOption[] | null
  skillsAllInstalled: boolean
  /** Agents and teams for `@`; null when addressing is not offered (after the first message). */
  targetOptions: ChatTargetOption[] | null
  autofocus?: boolean
}>()
const emit = defineEmits<{
  (event: 'submit'): void
  (event: 'select-target', target: ChatTarget): void
}>()

const MIN_HEIGHT = 56
const MAX_HEIGHT = 220
const listId = `chat-menu-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const height = ref(MIN_HEIGHT)
const popover = useAnchoredPopover(rootRef, textareaRef, 300, { placement: 'above' })
const menuKind = ref<'skill' | 'target'>('skill')
const triggerQuery = ref('')
const triggerStart = ref(-1)
const highlight = ref(0)
const { resolveDroppedFilePaths } = useComposerFilePathDrop()

const menuOpen = computed(() => popover.open.value)
const filteredSkills = computed(() => rankSkills(props.skillOptions ?? [], triggerQuery.value))
const filteredTargets = computed(() => filterTargets(props.targetOptions ?? [], triggerQuery.value))
const activeCount = computed(() => (menuKind.value === 'target' ? filteredTargets.value.length : filteredSkills.value.length))
watch(triggerQuery, () => { highlight.value = 0 })

const resize = () => {
  const element = textareaRef.value
  if (!element) return
  element.style.height = 'auto'
  height.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, element.scrollHeight))
  element.style.height = `${height.value}px`
  element.style.overflowY = element.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
}
watch(() => props.context?.requirement, () => nextTick(resize))

const setText = (text: string) => {
  if (props.context) props.context.requirement = text
}

const detectTrigger = () => {
  const element = textareaRef.value
  if (!element) return
  const before = element.value.slice(0, element.selectionStart ?? element.value.length)
  const trigger = detectMenuTrigger(before, {
    mentions: props.targetOptions !== null,
    skills: props.skillOptions !== null,
  })
  if (trigger) {
    menuKind.value = trigger.kind
    triggerQuery.value = trigger.query
    triggerStart.value = trigger.start
    if (!popover.open.value) void popover.show()
  } else if (popover.open.value) {
    popover.close(false)
  }
}

const onInput = (event: Event) => {
  setText((event.target as HTMLTextAreaElement).value)
  void nextTick(() => {
    resize()
    detectTrigger()
  })
}

/** Remove the typed `/q` or `@q` token and keep the caret where it was. */
const removeTriggerText = () => {
  const element = textareaRef.value
  const text = props.context?.requirement ?? ''
  const caret = element?.selectionStart ?? text.length
  const start = Math.max(0, triggerStart.value)
  const next = (text.slice(0, start) + text.slice(caret)).replace(/^\s+/, '')
  setText(next)
  void nextTick(() => {
    resize()
    const position = Math.min(start, next.length)
    element?.focus()
    element?.setSelectionRange(position, position)
  })
}

const chooseSkill = (name: string) => {
  const context = props.context
  if (!context) return
  removeTriggerText()
  if (!context.requestedSkillNames.includes(name)) {
    context.requestedSkillNames = [...context.requestedSkillNames, name]
  }
  popover.close(false)
}

const chooseTarget = (index: number) => {
  const option = filteredTargets.value[index]
  if (!option) return
  removeTriggerText()
  popover.close(false)
  emit('select-target', toChatTarget(option))
}

const moveHighlight = (delta: number) => {
  const count = activeCount.value
  if (!count) return
  highlight.value = (highlight.value + delta + count) % count
}

const onKeydown = (event: KeyboardEvent) => {
  if (popover.open.value) {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveHighlight(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveHighlight(-1); return }
    if ((event.key === 'Enter' || event.key === 'Tab') && activeCount.value) {
      event.preventDefault()
      if (menuKind.value === 'target') chooseTarget(highlight.value)
      else chooseSkill(filteredSkills.value[highlight.value]!.name)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      popover.close(false)
      return
    }
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    emit('submit')
  }
}

const onDrop = async (event: DragEvent) => {
  const context = props.context
  if (!context) return
  const filePaths = await resolveDroppedFilePaths(event)
  if (!filePaths.length || props.context !== context) return
  const element = textareaRef.value
  const text = context.requirement
  const start = element?.selectionStart ?? text.length
  const end = element?.selectionEnd ?? text.length
  const insert = filePaths.join(' ')
  setText(text.slice(0, start) + insert + text.slice(end))
  void nextTick(() => {
    resize()
    element?.focus()
    element?.setSelectionRange(start + insert.length, start + insert.length)
  })
}

const handleResize = () => resize()
onMounted(() => {
  resize()
  window.addEventListener('resize', handleResize)
  if (props.autofocus) textareaRef.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('resize', handleResize))

defineExpose({ focus: () => textareaRef.value?.focus() })
</script>
