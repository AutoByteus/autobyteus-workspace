import { useAppFontSizeStore } from '~/stores/appFontSizeStore';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';

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
  // The source of the app's font metrics, chosen once before the app mounts: the phone's Text size on the phone page
  // (autobyteus-525), the Display font size preset everywhere else.
  if (isMobileRemoteAccessRuntime()) {
    appFontSizeStore.initializePhoneTextSize();
  } else {
    appFontSizeStore.initialize();
  }
});
