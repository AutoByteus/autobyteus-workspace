import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";

/** SHA-256 of a whole file, read as a stream: memory use does not grow with the file size. */
export const hashFile = async (filePath: string): Promise<string> => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
};

/**
 * SHA-256 of a file that was listed with `size` and `mtimeMs`, or `null` when the file is not what was listed: its
 * stat or the number of bytes read differs before, during or after the read (it changed while being read).
 */
export const hashStableFile = async (
  filePath: string,
  expected: { size: number; mtimeMs: number },
): Promise<string | null> => {
  const before = await fs.stat(filePath);
  if (before.size !== expected.size || before.mtimeMs !== expected.mtimeMs) {
    return null;
  }
  const hash = createHash("sha256");
  let bytesRead = 0;
  for await (const chunk of createReadStream(filePath, { end: Math.max(expected.size - 1, 0) })) {
    const buffer = chunk as Buffer;
    bytesRead += buffer.byteLength;
    hash.update(buffer);
  }
  const after = await fs.stat(filePath);
  if (bytesRead !== expected.size || after.size !== expected.size || after.mtimeMs !== expected.mtimeMs) {
    return null;
  }
  return hash.digest("hex");
};
