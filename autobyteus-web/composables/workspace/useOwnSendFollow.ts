import { watch } from 'vue';

/**
 * DC-007 (autobyteus-279, REQ-009): your own send moves the conversation to your message and follows the reply, even when
 * you had scrolled up to read; activity you did not cause still waits behind "Jump to latest". `follow` is the feed's own
 * move to the latest (stick to the bottom, nothing unseen); it runs only while the feed shows the latest, not a browsed
 * earlier page.
 */
export const useOwnSendFollow = (
  messages: () => ReadonlyArray<{ type?: string }> | undefined,
  showsLatest: () => boolean,
  follow: () => void,
): void => {
  watch(() => messages()?.length ?? 0, (count, previous) => {
    if (count <= (previous ?? 0)) return;
    if (messages()?.[count - 1]?.type !== 'user' || !showsLatest()) return;
    follow();
  });
};
