import { useAppFontSizeStore } from '~/stores/appFontSizeStore';

const INITIALIZED_MARKER = '__appFontSizeStoreInitialized';

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  const appFontSizeStore = useAppFontSizeStore();
  const taggedStore = appFontSizeStore as typeof appFontSizeStore & {
    [INITIALIZED_MARKER]?: boolean;
  };

  if (taggedStore[INITIALIZED_MARKER]) {
    return;
  }

  taggedStore[INITIALIZED_MARKER] = true;
  appFontSizeStore.initialize();
});
