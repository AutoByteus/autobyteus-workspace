import { useLocalization } from '~/composables/useLocalization'

/**
 * The words for a participant's messages that are not loaded yet or cannot be read (autobyteus-358, AC-006), and for
 * their older pages (autobyteus-565): the
 * desktop Team tab's strings, for the screens that show the same list (the mobile message screens).
 */
export const participantMessagesStatusText = () => {
  const { t } = useLocalization()
  return Object.freeze({
    loading: () => t('workspace.components.workspace.team.TeamCommunicationPanel.loading_messages'),
    unavailable: () => t('workspace.components.workspace.team.TeamCommunicationPanel.messages_unavailable'),
    loadMore: () => t('workspace.components.workspace.team.TeamCommunicationPanel.load_more'),
    loadingMore: () => t('workspace.components.workspace.team.TeamCommunicationPanel.loading_more'),
    loadMoreFailed: () => t('workspace.components.workspace.team.TeamCommunicationPanel.load_more_failed'),
  })
}
