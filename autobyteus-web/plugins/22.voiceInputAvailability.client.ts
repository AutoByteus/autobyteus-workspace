import { useVoiceInputStore } from '~/stores/voiceInputStore';

/**
 * At window start, every window reads this computer's Voice Input from the embedded node (design AR-001), after the
 * node registry is known (20.windowNodeBootstrap). In the background: a window never waits for it.
 */
export default defineNuxtPlugin(() => {
  if (!process.client) return;
  void useVoiceInputStore().initialize();
});
