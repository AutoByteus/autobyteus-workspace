import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { extension } from "mime-types";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export async function downloadFileFromUrl(url: string, destinationDir: string): Promise<string> {
  logger.info(`Attempting to download file from: ${url}`);
  fs.mkdirSync(destinationDir, { recursive: true });

  let filePath: string | null = null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    let fileExt = "";
    const contentType = response.headers.get("content-type");
    if (contentType) {
      const mimeType = contentType.split(";")[0].trim();
      const guessed = extension(mimeType);
      if (guessed) {
        fileExt = `.${guessed}`;
        logger.debug(`Determined extension '${fileExt}' from Content-Type: '${mimeType}'`);
      }
    }

    if (!fileExt) {
      logger.debug(`Could not determine extension from Content-Type: '${contentType}'. Falling back to URL.`);
      const urlPath = new URL(url).pathname;
      const extFromUrl = path.extname(path.basename(urlPath));
      if (extFromUrl) {
        fileExt = extFromUrl;
        logger.debug(`Using extension '${fileExt}' from URL path.`);
      } else {
        logger.warn(`URL has no extension. Defaulting to .bin for ${url}`);
        fileExt = ".bin";
      }
    }

    const uniqueFilename = `${randomUUID()}${fileExt}`;
    filePath = path.join(destinationDir, uniqueFilename);

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const body = response.body as unknown as NodeReadableStream<Uint8Array>;
    const nodeStream = Readable.fromWeb(body);
    await pipeline(nodeStream, fs.createWriteStream(filePath));

    logger.info(`Successfully downloaded file to: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Failed during download process for ${url}: ${String(error)}`);
    if (filePath && fs.existsSync(filePath)) {
      try {
        logger.warn(`Deleting incomplete or failed download file: ${filePath}`);
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error(`Error during file cleanup for ${filePath}: ${String(cleanupError)}`);
      }
    }
    throw error;
  }
}
