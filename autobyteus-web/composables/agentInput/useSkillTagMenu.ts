import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { detectMenuTrigger, rankSkills, type SkillTagOption } from '~/utils/skills/skillTagMenu'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import type { AgentContext } from '~/types/agent/AgentContext'

/**
 * Standalone skill tagging for the product message box (D-17). Supplied only for standalone agent
 * runs; team and org boxes never receive it.
 */
export interface SkillTaggingCapability {
  /** The run agent's effective skills. */
  skills: SkillTagOption[]
  /** The agent uses every installed skill (ALL_INSTALLED). */
  allInstalled: boolean
  placeholder: string
}

/**
 * The `/` menu over a textarea: a `/query` token before the caret opens it, choosing a skill
 * removes the token and adds the skill to `context.requestedSkillNames`.
 */
export function useSkillTagMenu(options: {
  rootRef: Ref<HTMLElement | null>
  textareaRef: Ref<HTMLTextAreaElement | null>
  context: Ref<AgentContext | null>
  capability: Ref<SkillTaggingCapability | null | undefined>
  /** Writes the requirement text (keeps the caller's local mirror in sync). */
  setText: (text: string) => void
}) {
  const popover = useAnchoredPopover(options.rootRef, options.textareaRef, 300)
  const query = ref('')
  const start = ref(-1)
  const highlight = ref(0)

  const open = computed(() => Boolean(options.capability.value) && popover.open.value)
  const filteredSkills = computed(() => rankSkills(options.capability.value?.skills ?? [], query.value))
  watch(query, () => { highlight.value = 0 })

  const close = () => { if (popover.open.value) popover.close(false) }

  /** Re-evaluates the token before the caret; call after input and caret moves. */
  const detect = () => {
    const element = options.textareaRef.value
    if (!options.capability.value || !element) return
    const before = element.value.slice(0, element.selectionStart ?? element.value.length)
    const trigger = detectMenuTrigger(before, { mentions: false, skills: true })
    if (!trigger) { close(); return }
    query.value = trigger.query
    start.value = trigger.start
    if (!popover.open.value) void popover.show()
  }

  const choose = (name: string) => {
    const context = options.context.value
    const element = options.textareaRef.value
    if (!context) return
    const text = context.requirement
    const caret = element?.selectionStart ?? text.length
    const tokenStart = Math.max(0, start.value)
    const next = (text.slice(0, tokenStart) + text.slice(caret)).replace(/^\s+/, '')
    options.setText(next)
    if (!context.requestedSkillNames.includes(name)) {
      context.requestedSkillNames = [...context.requestedSkillNames, name]
    }
    close()
    void nextTick(() => {
      const position = Math.min(tokenStart, next.length)
      element?.focus()
      element?.setSelectionRange(position, position)
    })
  }

  /** Handles menu keys; returns true when the event was consumed. */
  const onKeydown = (event: KeyboardEvent): boolean => {
    if (!open.value) return false
    const count = filteredSkills.value.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (count) highlight.value = (highlight.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      return true
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && count) {
      event.preventDefault()
      choose(filteredSkills.value[highlight.value]!.name)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return true
    }
    return false
  }

  return { popover, open, query, highlight, filteredSkills, detect, choose, onKeydown, close }
}
