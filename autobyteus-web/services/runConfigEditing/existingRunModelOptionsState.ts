import type { ExistingRunModelOptionsAnswer, ExistingRunModelOptionsState } from '~/types/agent/ExistingRunModelConfigDraft'

/**
 * One scope's options state from the server's answer. An answer whose `modelListReadable` is false carries no options
 * (the runtime's list could not be read): it is `unavailable` with the server's message, never a `ready` empty list.
 * Only that flag decides; the message text and an empty replacement list say nothing about readability.
 */
export const optionsStateOfAnswer = ({ modelListReadable, ...options }: ExistingRunModelOptionsAnswer): ExistingRunModelOptionsState =>
  modelListReadable ? { status: 'ready', options } : { status: 'unavailable', options: null, message: options.unavailableReason }

/**
 * A re-read answer folded into the options already shown, row by row (REQ-010/011, QR-001). A readable row replaces its
 * row; an unreadable row never replaces a `ready` one (the list that loaded stays usable), and otherwise becomes the
 * answer's `unavailable` state. `complete` is false when any row could not be read, so the caller reports the refresh as
 * failed.
 */
export const mergeReloadedOptions = <Key extends string>(
  shown: Readonly<Record<Key, ExistingRunModelOptionsState>>,
  answered: Readonly<Record<Key, ExistingRunModelOptionsState>>,
): { options: Record<Key, ExistingRunModelOptionsState>; complete: boolean } => {
  const entries = (Object.entries(answered) as [Key, ExistingRunModelOptionsState][])
  const unreadable = (state: ExistingRunModelOptionsState) => state.status === 'unavailable'
  return {
    options: Object.fromEntries(entries.map(([key, state]) =>
      [key, unreadable(state) && shown[key]?.status === 'ready' ? shown[key] : state])) as Record<Key, ExistingRunModelOptionsState>,
    complete: !entries.some(([, state]) => unreadable(state)),
  }
}
