import { useBrowserShellStore } from '~/stores/browserShellStore';

const INITIALIZED_MARKER = '__browserShellInitialized';

export default defineNuxtPlugin(async () => {
  if (!process.client) {
    return;
  }

  const browserShellStore = useBrowserShellStore();
  const tagged = browserShellStore as typeof browserShellStore & {
    [INITIALIZED_MARKER]?: boolean;
  };
  if (tagged[INITIALIZED_MARKER]) {
    return;
  }

  tagged[INITIALIZED_MARKER] = true;
  await browserShellStore.initialize();
});
