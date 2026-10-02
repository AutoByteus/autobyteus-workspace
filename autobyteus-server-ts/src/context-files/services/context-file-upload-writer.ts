import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { MultipartFile } from "@fastify/multipart";
import { allowedMimeTypes, CONTEXT_FILE_MAX_BYTES } from "../domain/context-file-upload-policy.js";
/** Neutral, exclusive byte writer. Ownership and names are supplied by the caller. */
export async function writeContextFileUpload(file: MultipartFile, filePath: string): Promise<number> {
  if (!allowedMimeTypes.has(file.mimetype)) throw new Error(`Unsupported file type: ${file.mimetype}`);
  let bytes = 0;
  const limit = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length;
    callback(bytes > CONTEXT_FILE_MAX_BYTES ? new Error("Uploaded file is too large.") : null, chunk);
  }});
  let created = false;
  const output = fs.createWriteStream(filePath, { flags: "wx" });
  output.on("open", () => { created = true; });
  try {
    await pipeline(file.file, limit, output);
    if (file.file.truncated) throw new Error("Uploaded file is too large.");
    return bytes;
  } catch (error) {
    if (created) await fs.promises.rm(filePath, { force: true });
    throw error;
  }
}
