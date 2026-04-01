import { usePreviewShellStore } from '~/stores/previewShellStore';

const INITIALIZED_MARKER = '__previewShellInitialized';

export default defineNuxtPlugin(async () => {
  if (!process.client) {
    return;
  }

  const previewShellStore = usePreviewShellStore();
  const tagged = previewShellStore as typeof previewShellStore & {
    [INITIALIZED_MARKER]?: boolean;
  };
  if (tagged[INITIALIZED_MARKER]) {
    return;
  }

  tagged[INITIALIZED_MARKER] = true;
  await previewShellStore.initialize();
});

