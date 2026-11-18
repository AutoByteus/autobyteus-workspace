import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { MultipartFile } from "@fastify/multipart";
import {
  allowedMimeTypes, contextFileMaxBytesFor, type ContextFileSizeLimits,
} from "../domain/context-file-upload-policy.js";
import { ContextFileTooLargeError, UnsupportedContextFileTypeError } from "../domain/context-file-upload-errors.js";

/** Reads the rest of an upload and throws it away; a route calls it before every refusal after `request.file()`, so the connection can finish. */
export async function discardUploadedFile(file: MultipartFile): Promise<void> {
  try { await pipeline(file.file, new Transform({ transform(_chunk, _encoding, callback) { callback(); } })); }
  catch { /* the client went away; nothing is left to read */ }
}

/**
 * Neutral, exclusive byte writer. Ownership and names are supplied by the caller. The file's own limit comes from
 * its type; a file over it is read to its end and discarded (not cut off: an undrained request keeps the connection
 * busy), then removed, and refused with `ContextFileTooLargeError`.
 */
export async function writeContextFileUpload(
  file: MultipartFile, filePath: string, limits: ContextFileSizeLimits,
): Promise<number> {
  if (!allowedMimeTypes.has(file.mimetype)) throw new UnsupportedContextFileTypeError(file.mimetype);
  const maxBytes = contextFileMaxBytesFor(file.mimetype, limits);
  let bytes = 0;
  let overLimit = false;
  const limit = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length;
    if (bytes > maxBytes) overLimit = true;
    if (overLimit) callback(); else callback(null, chunk);
  }});
  let created = false;
  const output = fs.createWriteStream(filePath, { flags: "wx" });
  output.on("open", () => { created = true; });
  try {
    await pipeline(file.file, limit, output);
    if (overLimit || file.file.truncated) throw new ContextFileTooLargeError(maxBytes);
    return bytes;
  } catch (error) {
    if (created) await fs.promises.rm(filePath, { force: true });
    throw error;
  }
}
