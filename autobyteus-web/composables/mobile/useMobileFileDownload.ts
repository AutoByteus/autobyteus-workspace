import { useToasts } from '~/composables/useToasts';
import type { FileDataType } from '~/stores/fileExplorerState';
import { fetchAuthorizedResourceBlob } from '~/utils/remoteAccess/authorizedResourceUrl';
import { getShellBridge } from '~/utils/remoteAccess/shellBridge';

/** The types Download saves, by extension; the Android app accepts the same pairs (`ShellBridgeMessages`). */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

export const SAVE_FAILED_MESSAGE = "Couldn't save the file.";

type DownloadableFile = Readonly<{ path: string; type: FileDataType; url: string | null }>;

/** The file's plain name (its last path segment). */
const fileNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).at(-1) ?? '';

/** The MIME type Download saves this file as, or null when it is not a PDF or an image it can save. */
export const downloadMimeTypeOf = (file: Pick<DownloadableFile, 'path' | 'type'>): string | null => {
  if (file.type !== 'PDF' && file.type !== 'Image') return null;
  const extension = fileNameOf(file.path).split('.').at(-1)?.toLowerCase() ?? '';
  const mimeType = MIME_BY_EXTENSION[extension] ?? null;
  if (!mimeType) return null;
  return (file.type === 'PDF') === (mimeType === 'application/pdf') ? mimeType : null;
};

const BASE64_CHUNK_BYTES = 0x8000;

/** The bytes as base64 (the bridge message's baseline encoding), built in chunks so large files fit the call stack. */
const base64Of = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK_BYTES));
  }
  return btoa(binary);
};

const BROWSER_DOWNLOAD_URL_LIFETIME_MS = 10_000;

/**
 * Download in the phone viewer (autobyteus-472 DS-003, REQ-004/005): the bytes of the open PDF or image, read from the
 * open file's own URL (a workspace file's content URL with the phone's key, or a node file's object URL), go to the
 * Android app over the shell bridge, which saves them to Downloads and shows the result; in a phone browser they go
 * to the browser's own download. The key never leaves the page's own request: no URL, name or message carries it.
 */
export function useMobileFileDownload() {
  const { addToast } = useToasts();

  const download = async (file: DownloadableFile): Promise<void> => {
    const mimeType = downloadMimeTypeOf(file);
    const fileName = fileNameOf(file.path);
    if (!mimeType || !file.url || !fileName) return;
    let blob: Blob;
    try {
      blob = await fetchAuthorizedResourceBlob(file.url);
    } catch {
      addToast(SAVE_FAILED_MESSAGE, 'error');
      return;
    }
    const shell = getShellBridge();
    if (shell) {
      try {
        shell.saveFile({ fileName, mimeType, base64: await base64Of(blob) });
      } catch {
        addToast(SAVE_FAILED_MESSAGE, 'error');
      }
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), BROWSER_DOWNLOAD_URL_LIFETIME_MS);
  };

  return { download };
}
