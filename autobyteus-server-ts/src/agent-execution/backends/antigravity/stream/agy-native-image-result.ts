import fs from "node:fs";
import path from "node:path";

const imageBytes = (bytes: Buffer): boolean =>
  bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  || bytes.subarray(0, 6).toString("ascii") === "GIF89a"
  || (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP");

/** Only explicit provider result fields are eligible; never scrape model prose. */
export const verifiedAgyNativeImagePath = (output: unknown): string | null => {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const value = output as Record<string, unknown>;
  const candidate = value.file_path ?? value.local_file_path ?? value.output_path ?? value.image_path;
  if (typeof candidate !== "string" || !path.isAbsolute(candidate)) return null;
  try {
    const real = fs.realpathSync(candidate);
    const stat = fs.statSync(real);
    if (!stat.isFile() || stat.size < 12 || !/\.(?:png|jpe?g|webp|gif)$/i.test(real)) return null;
    const descriptor = fs.openSync(real, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const bytes = Buffer.alloc(16);
      fs.readSync(descriptor, bytes, 0, bytes.length, 0);
      return imageBytes(bytes) ? real : null;
    } finally { fs.closeSync(descriptor); }
  } catch { return null; }
};
