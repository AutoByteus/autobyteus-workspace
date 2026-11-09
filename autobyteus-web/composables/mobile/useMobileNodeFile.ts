import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { OpenFileState } from '~/stores/fileExplorerState';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';
import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';

const NODE_FILE_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  NODE_FILE_NOT_FOUND: 'workspace.components.mobile.views.MobileFiles.node_file_not_found',
  NODE_FILE_IS_FOLDER: 'workspace.components.mobile.views.MobileFiles.node_file_is_folder',
};
const OTHER_FAILURE_KEY = 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed';

/** The node-file URL for one absolute path (autobyteus-436, `GET /rest/node-files/content?path=`). */
export const nodeFileContentUrl = (restBaseUrl: string, absolutePath: string): string =>
  `${restBaseUrl.replace(/\/$/, '')}/node-files/content?path=${encodeURIComponent(absolutePath)}`;

/**
 * The phone's open-file state for one node file: a file on the node's computer opened by its absolute path, read-only
 * (autobyteus-436 DS-001). It is fetched once with the phone credential; its type comes from the path; text is kept as
 * content, anything else as an object URL (revoked when the file closes, so the blob never outlives the viewer). A
 * refusal becomes the viewer's message: not found, a folder, or "could not be opened".
 */
export function useMobileNodeFile(path: Ref<string | null>) {
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

  const refusalMessage = async (response: Response): Promise<string> => {
    const body = await response.json().catch(() => null) as { code?: unknown } | null;
    const key = typeof body?.code === 'string' ? NODE_FILE_MESSAGE_KEYS[body.code] : undefined;
    return t(key ?? OTHER_FAILURE_KEY);
  };

  const load = async (absolutePath: string): Promise<void> => {
    const serial = ++loadSerial;
    const type = await determineFileType(absolutePath);
    const state: OpenFileState = {
      path: absolutePath, type, mode: 'edit', accessIntent: { source: 'event-monitor', readOnly: true },
      content: null, url: null, relativeResourceContext: null, isLoading: true, error: null,
    };
    fileState.value = state;
    errorMessage.value = null;
    try {
      const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest;
      const response = await authorizedFetch(nodeFileContentUrl(restBaseUrl, absolutePath));
      if (serial !== loadSerial) return;
      if (!response.ok) {
        const message = await refusalMessage(response);
        if (serial !== loadSerial) return;
        errorMessage.value = message;
        fileState.value = { ...state, isLoading: false, error: message };
        return;
      }
      if (type === 'Text') {
        const content = await response.text();
        if (serial !== loadSerial) return;
        fileState.value = { ...state, content, isLoading: false };
        return;
      }
      const blob = await response.blob();
      if (serial !== loadSerial) return;
      objectUrl = URL.createObjectURL(blob);
      fileState.value = { ...state, url: objectUrl, isLoading: false };
    } catch {
      if (serial !== loadSerial) return;
      errorMessage.value = t(OTHER_FAILURE_KEY);
      fileState.value = { ...state, isLoading: false, error: errorMessage.value };
    }
  };

  watch(path, (next) => {
    loadSerial += 1;
    release();
    fileState.value = null;
    errorMessage.value = null;
    if (next) void load(next);
  }, { immediate: true });

  onBeforeUnmount(() => {
    loadSerial += 1;
    release();
  });

  return { fileState, errorMessage };
}
