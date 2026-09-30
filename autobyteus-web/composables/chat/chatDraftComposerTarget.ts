import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'
import type { ChatDraft } from '~/stores/chatDraftStore'
import { launchAgentChat, launchTeamChat, type ChatLaunchNavigate } from '~/services/chat/chatLaunchService'
import { buildAgentDraftContextFileOwner } from '~/utils/contextFiles/contextFileOwner'

/**
 * The New chat composer target: the unregistered draft context, uploads under
 * `agent_draft(<draft id>)`, and a send that launches the chat.
 */
export const createChatDraftComposerTarget = (
  draft: ChatDraft,
  deps: { navigate: ChatLaunchNavigate },
): ComposerTarget => Object.freeze({
  key: draft.context.state.runId,
  context: draft.context,
  draftOwner: buildAgentDraftContextFileOwner(draft.context.state.runId),
  access: 'draft',
  send: async () => {
    if (draft.target.kind === 'team') {
      await launchTeamChat(draft, deps)
      return
    }
    await launchAgentChat(draft, deps)
  },
})
