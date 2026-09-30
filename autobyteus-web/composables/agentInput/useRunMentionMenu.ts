import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { detectMenuTrigger } from '~/utils/skills/skillTagMenu'
import { useAnchoredPopover } from '~/composables/popover/useAnchoredPopover'
import { useLocalization } from '~/composables/useLocalization'
import { filterTargets, initialsFor, type ChatTargetOption } from '~/components/chat/chatComposerMenus'
import {
  collaboratorCandidatesService,
  type CollaboratorMentionCandidate,
} from '~/services/collaborators/collaboratorCandidatesService'
import {
  mentionToken,
  mentionsPresentInText,
  removeMentionFromText,
  type RequestedCollaboratorMention,
} from '~/utils/collaborators/collaboratorMentionText'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { RunMentionScope } from '~/composables/agentInput/runMentionScope'

/** A server candidate shown in the menu (same row shape as the New chat target menu). */
export interface RunMentionOption extends ChatTargetOption {
  candidate: CollaboratorMentionCandidate
}

/** A chosen mention whose `@Name` is still in the composer text. */
export type RunMentionChip = Readonly<{ key: string; kind: 'agent' | 'agent_team'; name: string }>

const mentionKey = (mention: Pick<RequestedCollaboratorMention, 'kind' | 'definitionId'>): string =>
  `${mention.kind}:${mention.definitionId}`

/** The chips of a composer: its chosen mentions whose `@Name` is still in the text. */
export const runMentionChipsOf = (context: AgentContext | null): RunMentionChip[] => context
  ? mentionsPresentInText(context.requirement, context.requestedMentions)
    .map((mention) => Object.freeze({ key: mentionKey(mention), kind: mention.kind, name: mention.name }))
  : []

/** Removing a chip keeps the words and drops the mention (`@Name` → `Name`). */
export const removeRunMentionChip = (context: AgentContext, chip: RunMentionChip): void => {
  context.requestedMentions = context.requestedMentions.filter((entry) => mentionKey(entry) !== chip.key)
  context.requirement = removeMentionFromText(context.requirement, chip.name)
}

/**
 * `@` over a live-run textarea: an `@query` token before the caret opens the menu of shared
 * Agents and Teams the server offers for this run. Choosing one replaces the token with
 * `@Name ` and records the mention on the composer's AgentContext.
 */
export function useRunMentionMenu(options: {
  rootRef: Ref<HTMLElement | null>
  textareaRef: Ref<HTMLTextAreaElement | null>
  context: Ref<AgentContext | null>
  scope: Ref<RunMentionScope | null>
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

  const available = computed(() => Boolean(options.scope.value && options.context.value))
  const open = computed(() => available.value && popover.open.value)
  const focusedName = computed(() => options.scope.value?.focusedName ?? '')

  const candidates = computed<readonly CollaboratorMentionCandidate[]>(() => {
    const scope = options.scope.value
    if (!scope) return []
    const entry = collaboratorCandidatesService.entry(scope.rootKind, scope.rootRunId)
    return entry?.available === false ? [] : entry?.candidates ?? []
  })

  const allOptions = computed<RunMentionOption[]>(() => candidates.value.map((candidate) => ({
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
  const filtered = computed(() => filterTargets(allOptions.value, query.value) as RunMentionOption[])
  watch(query, () => { highlight.value = 0 })

  const close = () => { if (popover.open.value) popover.close(false) }

  /** Re-evaluates the token before the caret; returns true when the `@` menu owns it. */
  const detect = (): boolean => {
    const element = options.textareaRef.value
    const scope = options.scope.value
    if (!available.value || !scope || !element) return false
    const before = element.value.slice(0, element.selectionStart ?? element.value.length)
    const trigger = detectMenuTrigger(before, { mentions: true, skills: false })
    if (!trigger) { close(); return false }
    query.value = trigger.query
    start.value = trigger.start
    if (!popover.open.value) {
      // Each opening asks the server again: what is "in the run" changes as collaborators join.
      void collaboratorCandidatesService.refresh(scope.rootKind, scope.rootRunId)
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

  return { popover, available, open, query, highlight, filtered, focusedName, detect, choose, onKeydown, close }
}
