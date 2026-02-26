import { useServerStore } from '~/stores/serverStore';

const INITIALIZED_MARKER = '__nodeBootstrapServerStoreInitialized';

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  const serverStore = useServerStore();
  const tagged = serverStore as typeof serverStore & { [INITIALIZED_MARKER]?: boolean };
  if (tagged[INITIALIZED_MARKER]) {
    return;
  }

  tagged[INITIALIZED_MARKER] = true;
  serverStore.initialize();
});

