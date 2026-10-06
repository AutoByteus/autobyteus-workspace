import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { detectMenuTrigger } from '~/utils/skills/skillTagMenu'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useLocalization } from '~/composables/useLocalization'
import { filterTargets, initialsFor, type ChatTargetOption } from '~/components/chat/chatComposerMenus'
import type { CollaboratorMentionCandidate } from '~/services/collaborators/collaboratorCandidatesService'
import { mentionToken, type RequestedCollaboratorMention } from '~/utils/collaborators/collaboratorMentionText'
import type { AgentContext } from '~/types/agent/AgentContext'

/** A candidate shown in the `@` menu. */
export interface ComposerMentionOption extends ChatTargetOption {
  candidate: CollaboratorMentionCandidate
}

const mentionKey = (mention: Pick<RequestedCollaboratorMention, 'kind' | 'definitionId'>): string =>
  `${mention.kind}:${mention.definitionId}`

/**
 * `@` in any composer (New chat and running Agent/Team chats): an `@query` token before the caret
 * opens "Delegate to an agent or team" over the candidates the caller provides. Choosing one replaces the
 * token with `@Name ` and records the mention on the composer's AgentContext. It never changes who
 * the message goes to.
 */
export function useComposerMentionMenu(options: {
  rootRef: Ref<HTMLElement | null>
  textareaRef: Ref<HTMLTextAreaElement | null>
  context: Ref<AgentContext | null>
  /** False when this composer offers no `@` (e.g. a read-only run). */
  available: Ref<boolean>
  candidates: Ref<readonly CollaboratorMentionCandidate[]>
  focusedName: Ref<string>
  /** Called each time the menu opens, so the caller can refresh its candidates. */
  onOpen?: () => void
  /** Reads the current text (the caller's local mirror). */
  getText: () => string
  /** Writes the requirement text (keeps the caller's local mirror in sync). */
  setText: (text: string) => void
}) {
  const { t } = useLocalization()
  const popover = useAnchoredPopover(options.rootRef, options.textareaRef, 300, { placement: 'above' })
  const query = ref('')
  const start = ref(-1)
  const highlight = ref(0)

  const available = computed(() => options.available.value && Boolean(options.context.value))
  const open = computed(() => available.value && popover.open.value)

  const allOptions = computed<ComposerMentionOption[]>(() => options.candidates.value.map((candidate) => ({
    key: mentionKey(candidate),
    kind: candidate.kind === 'agent_team' ? 'team' : 'agent',
    id: candidate.definitionId,
    name: candidate.name,
    initials: initialsFor(candidate.name),
    description: candidate.kind === 'agent_team'
      ? t('chat.targets.teamDescription', { count: candidate.memberCount, coordinator: candidate.coordinatorName })
      : candidate.description,
    candidate,
  })))
  const filtered = computed(() => filterTargets(allOptions.value, query.value) as ComposerMentionOption[])
  watch(query, () => { highlight.value = 0 })

  const close = () => { if (popover.open.value) popover.close(false) }

  /** Re-evaluates the token before the caret; returns true when the `@` menu owns it. */
  const detect = (): boolean => {
    const element = options.textareaRef.value
    if (!available.value || !element) return false
    const before = element.value.slice(0, element.selectionStart ?? element.value.length)
    const trigger = detectMenuTrigger(before, { mentions: true, skills: false })
    if (!trigger) { close(); return false }
    query.value = trigger.query
    start.value = trigger.start
    if (!popover.open.value) {
      options.onOpen?.()
      void popover.show()
    }
    return true
  }

  const choose = (index: number) => {
    const option = filtered.value[index]
    const context = options.context.value
    const element = options.textareaRef.value
    if (!option || !context) return
    const text = options.getText()
    const caret = element?.selectionStart ?? text.length
    const tokenStart = Math.max(0, start.value)
    const inserted = `${mentionToken(option.name)} `
    const after = text.slice(caret).replace(/^ /, '')
    options.setText(text.slice(0, tokenStart) + inserted + after)
    const mention: RequestedCollaboratorMention = {
      kind: option.candidate.kind, definitionId: option.candidate.definitionId, name: option.candidate.name,
    }
    if (!context.requestedMentions.some((entry) => mentionKey(entry) === option.key)) {
      context.requestedMentions = [...context.requestedMentions, mention]
    }
    close()
    void nextTick(() => {
      const position = tokenStart + inserted.length
      element?.focus()
      element?.setSelectionRange(position, position)
    })
  }

  /** Handles menu keys; returns true when the event was consumed. */
  const onKeydown = (event: KeyboardEvent): boolean => {
    if (!open.value) return false
    const count = filtered.value.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (count) highlight.value = (highlight.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      return true
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && count) {
      event.preventDefault()
      choose(highlight.value)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return true
    }
    // Enter with no match must not send a half-typed mention.
    if (event.key === 'Enter') { event.preventDefault(); return true }
    return false
  }

  return {
    popover, available, open, query, highlight, filtered,
    focusedName: computed(() => options.focusedName.value), detect, choose, onKeydown, close,
  }
}
