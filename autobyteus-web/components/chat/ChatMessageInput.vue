<template>
  <div ref="rootRef" class="relative">
    <ComposerMentionMirror
      :text="context?.requirement ?? ''"
      :mentions="context?.requestedMentions"
      :metrics="mirrorMetrics"
      padding="10px 12px"
    />
    <textarea
      ref="textareaRef"
      :value="context?.requirement ?? ''"
      data-test="chat-message-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="activeMenu ? 'true' : 'false'"
      :aria-controls="activeMenu?.listId"
      :aria-activedescendant="activeMenu && activeMenu.count ? `${activeMenu.listId}-option-${activeMenu.highlight}` : undefined"
      :aria-label="placeholder"
      class="relative block w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[0.9375rem] leading-6 focus:outline-none focus:ring-0"
      :style="{ height: `${height}px`, minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }"
      :placeholder="placeholder"
      :disabled="disabled || !context"
      @input="onInput"
      @scroll="syncMirrorMetrics"
      @click="detectMenus"
      @keydown="onKeydown"
      @dragover.prevent
      @drop.prevent="onDrop"
      data-file-drop-target="true"
    ></textarea>

    <!-- `/` skill menu -->
    <template v-if="skillMenuOpen">
      <div v-if="skillPopover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
      <div
        class="z-50"
        :class="skillPopover.narrow.value
          ? 'fixed inset-x-2 bottom-2 [&>div]:w-auto'
          : ['absolute left-2 flex flex-col', skillPopover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
        :style="skillPopover.narrow.value ? undefined : { maxHeight: `${skillPopover.maxHeight.value}px` }"
      >
        <ChatSkillMenu
          :list-id="skillListId"
          :query="skillQuery"
          :skills="filteredSkills"
          :has-any-skills="(skillOptions?.length ?? 0) > 0"
          :selected="context?.requestedSkillNames ?? []"
          :highlight="skillHighlight"
          :all-installed="skillsAllInstalled"
          @highlight="skillHighlight = $event"
          @choose="chooseSkill"
        />
      </div>
    </template>

    <!-- `@` menu: bring an Agent or Agent Team into the run. -->
    <template v-if="mentionMenu.open.value">
      <div v-if="mentionMenu.popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
      <div
        class="z-50"
        :class="mentionMenu.popover.narrow.value
          ? 'fixed inset-x-2 bottom-2 [&>div]:w-auto'
          : ['absolute left-2 flex flex-col', mentionMenu.popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
        :style="mentionMenu.popover.narrow.value ? undefined : { maxHeight: `${mentionMenu.popover.maxHeight.value}px` }"
      >
        <ChatTargetMenu
          :list-id="mentionListId"
          :query="mentionMenu.query.value"
          :targets="mentionMenu.filtered.value"
          :highlight="mentionMenu.highlight.value"
          :focused-name="mentionMenu.focusedName.value"
          @highlight="mentionMenu.highlight.value = $event"
          @choose="mentionMenu.choose"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, useId, watch } from 'vue'
import ChatSkillMenu from '~/components/chat/ChatSkillMenu.vue'
import ChatTargetMenu from '~/components/chat/ChatTargetMenu.vue'
import ComposerMentionMirror from '~/components/agentInput/ComposerMentionMirror.vue'
import { detectMenuTrigger, rankSkills, type SkillTagOption } from '~/utils/skills/skillTagMenu'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useComposerFilePathDrop } from '~/composables/agentInput/useComposerFilePathDrop'
import { useComposerMentionMenu } from '~/composables/agentInput/useComposerMentionMenu'
import { useMentionCandidates, type MentionCandidateSource } from '~/composables/runSettings/useMentionCandidates'
import type { AgentContext } from '~/types/agent/AgentContext'

/**
 * The Chat textarea: `/` adds skill tags to the context, `@` brings an Agent or Agent Team into
 * the run (the agent you are talking to receives the message and brings them in), Enter submits
 * and Shift+Enter inserts a newline.
 */
const props = defineProps<{
  context: AgentContext | null
  placeholder: string
  disabled?: boolean
  /** The addressed agent's skills; null when `/` is not offered (team target). */
  skillOptions: SkillTagOption[] | null
  skillsAllInstalled: boolean
  /** Where `@` candidates come from; null when `@` is not offered. */
  mentionSource: MentionCandidateSource | null
  autofocus?: boolean
}>()
const emit = defineEmits<{ (event: 'submit'): void }>()

const MIN_HEIGHT = 56
const MAX_HEIGHT = 220
const skillListId = `chat-skill-menu-${useId()}`
const mentionListId = `chat-mention-menu-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const height = ref(MIN_HEIGHT)
const { resolveDroppedFilePaths } = useComposerFilePathDrop()

const setText = (text: string) => {
  if (props.context) props.context.requirement = text
}

// `/` skills
const skillPopover = useAnchoredPopover(rootRef, textareaRef, 300, { placement: 'above' })
const skillQuery = ref('')
const skillStart = ref(-1)
const skillHighlight = ref(0)
const skillMenuOpen = computed(() => skillPopover.open.value)
const filteredSkills = computed(() => rankSkills(props.skillOptions ?? [], skillQuery.value))
watch(skillQuery, () => { skillHighlight.value = 0 })

// `@` mentions
const mentionCandidates = useMentionCandidates(toRef(props, 'mentionSource'))
const mentionMenu = useComposerMentionMenu({
  rootRef,
  textareaRef,
  context: toRef(props, 'context'),
  available: mentionCandidates.available,
  candidates: mentionCandidates.candidates,
  focusedName: mentionCandidates.focusedName,
  onOpen: mentionCandidates.refresh,
  getText: () => props.context?.requirement ?? '',
  setText,
})

/** The open menu, for the textarea's combobox semantics. */
const activeMenu = computed(() => {
  if (mentionMenu.open.value) {
    return { listId: mentionListId, count: mentionMenu.filtered.value.length, highlight: mentionMenu.highlight.value }
  }
  if (skillMenuOpen.value) return { listId: skillListId, count: filteredSkills.value.length, highlight: skillHighlight.value }
  return null
})

const mirrorMetrics = ref({ width: 0, height: 0, scrollTop: 0, scrollLeft: 0 })
const syncMirrorMetrics = () => {
  const element = textareaRef.value
  if (!element) return
  mirrorMetrics.value = { width: element.clientWidth, height: element.clientHeight, scrollTop: element.scrollTop, scrollLeft: element.scrollLeft }
}

const resize = () => {
  const element = textareaRef.value
  if (!element) return
  element.style.height = 'auto'
  height.value = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, element.scrollHeight))
  element.style.height = `${height.value}px`
  element.style.overflowY = element.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  syncMirrorMetrics()
}
watch(() => props.context?.requirement, () => nextTick(resize))

const detectSkill = () => {
  const element = textareaRef.value
  if (!element || props.skillOptions === null) {
    if (skillPopover.open.value) skillPopover.close(false)
    return
  }
  const before = element.value.slice(0, element.selectionStart ?? element.value.length)
  const trigger = detectMenuTrigger(before, { mentions: false, skills: true })
  if (trigger) {
    skillQuery.value = trigger.query
    skillStart.value = trigger.start
    if (!skillPopover.open.value) void skillPopover.show()
  } else if (skillPopover.open.value) {
    skillPopover.close(false)
  }
}

/** One menu at a time: `@` takes the token when it matches, otherwise `/`. */
const detectMenus = () => {
  if (mentionMenu.detect()) {
    if (skillPopover.open.value) skillPopover.close(false)
    return
  }
  detectSkill()
}

const onInput = (event: Event) => {
  setText((event.target as HTMLTextAreaElement).value)
  void nextTick(() => {
    resize()
    detectMenus()
  })
}

/** Remove the typed `/q` token and keep the caret where it was. */
const removeSkillTrigger = () => {
  const element = textareaRef.value
  const text = props.context?.requirement ?? ''
  const caret = element?.selectionStart ?? text.length
  const start = Math.max(0, skillStart.value)
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
  removeSkillTrigger()
  if (!context.requestedSkillNames.includes(name)) {
    context.requestedSkillNames = [...context.requestedSkillNames, name]
  }
  skillPopover.close(false)
}

const onSkillKeydown = (event: KeyboardEvent): boolean => {
  if (!skillPopover.open.value) return false
  const count = filteredSkills.value.length
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (count) skillHighlight.value = (skillHighlight.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
    return true
  }
  if ((event.key === 'Enter' || event.key === 'Tab') && count) {
    event.preventDefault()
    chooseSkill(filteredSkills.value[skillHighlight.value]!.name)
    return true
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    skillPopover.close(false)
    return true
  }
  return false
}

const onKeydown = (event: KeyboardEvent) => {
  if (mentionMenu.onKeydown(event)) return
  if (onSkillKeydown(event)) return
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
