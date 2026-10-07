import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { chatDraftHasText, chatDraftText, useChatDraftStore, type ChatDraft } from '~/stores/chatDraftStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useLocalization } from '~/composables/useLocalization'

export interface ChatDraftRow {
  id: string
  /** The draft's text on one line; empty for a cleared open draft, which reads "Empty draft". */
  preview: string
  /** The open draft on the New chat surface. */
  selected: boolean
  tooltip: string
  accessibleName: string
  discardLabel: string
}

/**
 * The Draft rows under the Chat row (REQ-002/003/008): which kept drafts are rows here, newest
 * started first, and which one is selected. Read-only over `chatDraftStore` apart from `discard`.
 */
export function useChatDraftRows() {
  const route = useRoute()
  const { t } = useLocalization()
  const chatDraftStore = useChatDraftStore()
  const agentDefinitions = useAgentDefinitionStore()
  const teamDefinitions = useAgentTeamDefinitionStore()

  /** The New chat surface: `/chat` without a run id. */
  const onNewChatSurface = computed(() => route.path === '/chat' && !route.query.id)

  const targetName = (draft: ChatDraft): string => {
    const target = draft.target
    if (target.kind === 'team') {
      return teamDefinitions.agentTeamDefinitions.find((team) => team.id === target.teamDefinitionId)?.name ?? ''
    }
    return agentDefinitions.getAgentDefinitionById(target.agentDefinitionId)?.name
      || draft.context.config.agentDefinitionName
  }

  const toRow = (draft: ChatDraft, selected: boolean): ChatDraftRow => {
    const preview = chatDraftText(draft).replace(/\s+/g, ' ').trim()
    const label = preview || t('shell.components.AppLeftPanel.draft_empty')
    const target = targetName(draft)
    return {
      id: draft.id,
      preview,
      selected,
      tooltip: target ? `${label}\n${target}` : label,
      accessibleName: `${t('shell.components.AppLeftPanel.draft')}: ${label}${target ? ` — ${target}` : ''}`,
      discardLabel: `${t('shell.components.AppLeftPanel.discard_draft')}: ${label}`,
    }
  }

  // A listed draft with text is a row everywhere; the open one stays a row while it is shown even
  // with its text cleared ("Empty draft", REQ-008) and is dropped once left.
  const rows = computed<ChatDraftRow[]>(() => chatDraftStore.drafts
    .filter((draft) => {
      if (!draft.listed) return false
      const shownOpen = onNewChatSurface.value && draft.id === chatDraftStore.openDraftId
      return shownOpen || chatDraftHasText(draft)
    })
    .map((draft) => toRow(draft, onNewChatSurface.value && draft.id === chatDraftStore.openDraftId))
    .reverse())

  /** A Draft row, not the Chat row, is selected (REQ-003). */
  const rowSelected = computed(() => rows.value.some((row) => row.selected))

  const discard = (draftId: string) => chatDraftStore.discardDraft(draftId)

  return { rows, rowSelected, discard }
}
