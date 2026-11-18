import { useLocalization } from '~/composables/useLocalization'

/**
 * The words for a participant's messages that are not loaded yet or cannot be read (autobyteus-358, AC-006): the
 * desktop Team tab's strings, for the screens that show the same list (the mobile message screens).
 */
export const participantMessagesStatusText = () => {
  const { t } = useLocalization()
  return Object.freeze({
    loading: () => t('workspace.components.workspace.team.TeamCommunicationPanel.loading_messages'),
    unavailable: () => t('workspace.components.workspace.team.TeamCommunicationPanel.messages_unavailable'),
  })
}
