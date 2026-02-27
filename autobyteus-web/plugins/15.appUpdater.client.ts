import { useAppUpdateStore } from '~/stores/appUpdateStore';

const INITIALIZED_MARKER = '__appUpdateStoreInitialized';

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  const appUpdateStore = useAppUpdateStore();
  const tagged = appUpdateStore as typeof appUpdateStore & { [INITIALIZED_MARKER]?: boolean };

  if (tagged[INITIALIZED_MARKER]) {
    return;
  }

  tagged[INITIALIZED_MARKER] = true;
  appUpdateStore.initialize();
});
