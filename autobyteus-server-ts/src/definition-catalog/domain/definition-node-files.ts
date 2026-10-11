import { createHash } from "node:crypto";
import fs from "node:fs/promises";

/** A definition file's text, or null when it does not exist. Other read errors are thrown. */
export const readOptionalText = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR") {
      return null;
    }
    throw error;
  }
};

export const pathExists = (filePath: string): Promise<boolean> =>
  fs.access(filePath).then(() => true).catch(() => false);

/** Names of the sub-folders of a directory (empty when it does not exist). */
export const listChildDirNames = async (directory: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw error;
  }
};

/** SHA-256 over ordered parts; a null part is distinct from an empty one. */
export const fingerprintOf = (parts: readonly (string | null)[]): string => {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part === null ? "\u0001" : `\u0002${part}`).update("\u0000");
  return hash.digest("hex");
};

export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
