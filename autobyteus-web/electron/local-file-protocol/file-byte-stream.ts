import type { FileHandle } from 'fs/promises';

export type FileByteWindow = {
  start: number;
  length: number;
};

const FILE_READ_CHUNK_SIZE = 64 * 1024;

export function createFileByteStream(
  handle: FileHandle,
  window: FileByteWindow,
): ReadableStream<Uint8Array> {
  let position = window.start;
  let remaining = window.length;
  let cancelled = false;
  let closePromise: Promise<void> | null = null;

  const closeHandle = (): Promise<void> => {
    if (!closePromise) {
      closePromise = handle.close();
    }
    return closePromise;
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled) {
        return;
      }

      if (remaining === 0) {
        try {
          await closeHandle();
          if (!cancelled) {
            controller.close();
          }
        } catch (error) {
          if (!cancelled) {
            controller.error(error);
          }
        }
        return;
      }

      const requestedLength = Math.min(FILE_READ_CHUNK_SIZE, remaining);
      const buffer = new Uint8Array(requestedLength);

      try {
        const { bytesRead } = await handle.read(buffer, 0, requestedLength, position);
        if (cancelled) {
          return;
        }
        if (bytesRead === 0) {
          throw new Error('Unexpected end of local file stream.');
        }

        position += bytesRead;
        remaining -= bytesRead;
        controller.enqueue(bytesRead === buffer.byteLength ? buffer : buffer.subarray(0, bytesRead));

        if (remaining === 0) {
          await closeHandle();
          if (!cancelled) {
            controller.close();
          }
        }
      } catch (error) {
        try {
          await closeHandle();
        } catch {
          // Preserve the read/stream error as the response body's failure reason.
        }
        if (!cancelled) {
          controller.error(error);
        }
      }
    },

    async cancel() {
      cancelled = true;
      await closeHandle();
    },
  });
}
