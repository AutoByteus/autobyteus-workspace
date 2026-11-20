/** How much of a download has arrived: bytes so far, and the file's length when the reply declares it. */
export type DownloadProgress = Readonly<{ loaded: number; total: number | null }>;

const declaredLength = (response: Response): number | null => {
  const header = response.headers.get('content-length');
  if (header === null) return null;
  const length = Number(header);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
};

/**
 * A reply's body as a `Blob`, reporting each part as it arrives (autobyteus-572 D-1), so a viewer can show that a file
 * is loading and how much of it is there. `total` comes from `Content-Length` (null when the reply has none). A reply
 * without a readable body is read whole, as before.
 */
export const readResponseBlobWithProgress = async (
  response: Response,
  onProgress: (progress: DownloadProgress) => void,
): Promise<Blob> => {
  const total = declaredLength(response);
  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    onProgress({ loaded: blob.size, total: total ?? blob.size });
    return blob;
  }
  const parts: Uint8Array[] = [];
  let loaded = 0;
  onProgress({ loaded, total });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.byteLength;
    onProgress({ loaded, total });
  }
  return new Blob(parts as BlobPart[], { type: response.headers.get('content-type') ?? '' });
};
