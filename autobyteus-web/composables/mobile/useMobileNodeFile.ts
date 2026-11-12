import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { OpenFileState } from '~/stores/fileExplorerState';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';
import { loadNodeFileFromUrl, NODE_FILE_REFUSAL_MESSAGE_KEYS, nodeFileContentUrl } from '~/utils/fileExplorer/nodeFileContent';
import { resolveContextAttachmentUrl } from '~/utils/contextFiles/contextAttachmentUrl';

/**
 * A node file the phone viewer opens: a file on the node's computer by its absolute path (autobyteus-436), or a file
 * attached to a message by its node URL path and the name it was sent with (autobyteus-450).
 */
export type MobileNodeFileSource =
  | Readonly<{ kind: 'path'; path: string }>
  | Readonly<{ kind: 'contextFile'; locator: string; name: string }>;

/** The name the viewer shows and the file type is read from. */
export const mobileNodeFileName = (source: MobileNodeFileSource): string =>
  source.kind === 'path' ? source.path : source.name;

const contentUrlOf = (source: MobileNodeFileSource, restBaseUrl: string): string =>
  source.kind === 'path' ? nodeFileContentUrl(restBaseUrl, source.path) : resolveContextAttachmentUrl(source.locator);

/**
 * The phone's open-file state for one node file, read-only (autobyteus-436 DS-001). It is fetched once with the phone
 * credential by the shared node-file loader (`nodeFileContent.ts`, autobyteus-471); its type comes from its name; text
 * is kept as content, anything else as an object URL (revoked when the file closes, so the blob never outlives the
 * viewer). A refusal becomes the viewer's message: not found, a folder, or "could not be opened".
 */
export function useMobileNodeFile(source: Ref<MobileNodeFileSource | null>) {
  const { t } = useLocalization();
  const windowNodeContextStore = useWindowNodeContextStore();
  const fileState = ref<OpenFileState | null>(null);
  const errorMessage = ref<string | null>(null);
  let objectUrl: string | null = null;
  let loadSerial = 0;

  const release = (): void => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  const load = async (next: MobileNodeFileSource): Promise<void> => {
    const serial = ++loadSerial;
    const name = mobileNodeFileName(next);
    const type = await determineFileType(name);
    const state: OpenFileState = {
      path: name, type, mode: 'edit', accessIntent: { source: 'event-monitor', readOnly: true },
      content: null, url: null, contentRevision: 0, relativeResourceContext: null, isLoading: true, error: null,
    };
    fileState.value = state;
    errorMessage.value = null;
    const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest;
    const loaded = await loadNodeFileFromUrl(contentUrlOf(next, restBaseUrl), type === 'Text');
    if (serial !== loadSerial) return;
    if (loaded.kind === 'refused') {
      errorMessage.value = t(NODE_FILE_REFUSAL_MESSAGE_KEYS[loaded.refusal]);
      fileState.value = { ...state, isLoading: false, error: errorMessage.value };
      return;
    }
    if (loaded.kind === 'text') {
      fileState.value = { ...state, content: loaded.content, isLoading: false };
      return;
    }
    objectUrl = URL.createObjectURL(loaded.blob);
    fileState.value = { ...state, url: objectUrl, isLoading: false };
  };

  // Keyed by value: a new object for the same file does not read it again.
  const sourceKey = computed(() => (source.value ? JSON.stringify(source.value) : null));
  watch(sourceKey, () => {
    loadSerial += 1;
    release();
    fileState.value = null;
    errorMessage.value = null;
    if (source.value) void load(source.value);
  }, { immediate: true });

  onBeforeUnmount(() => {
    loadSerial += 1;
    release();
  });

  return { fileState, errorMessage };
}
