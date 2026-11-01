import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The release this server build belongs to (autobyteus-285, D1), from the stamp the server build writes
 * (`scripts/write-release-identity.mjs` → `dist/release-identity.json`). `null` when the server has no
 * stamp (run from `src`) or it cannot be read; such a server never counts a restart as an update.
 */
const DEFAULT_STAMP_PATH = fileURLToPath(new URL("../release-identity.json", import.meta.url));

export const readReleaseIdentityFrom = (stampPath: string): string | null => {
  let raw: string;
  try { raw = readFileSync(stampPath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") console.warn(`Release identity '${stampPath}' could not be read: ${String(error)}`);
    return null;
  }
  try {
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    if (typeof version === "string" && version.trim()) return version.trim();
    console.warn(`Release identity '${stampPath}' has no version.`);
  } catch (error) {
    console.warn(`Release identity '${stampPath}' is not valid JSON: ${String(error)}`);
  }
  return null;
};

let cached: { version: string | null } | null = null;

/** The server's release version, read once. */
export const readReleaseIdentity = (): string | null => (cached ??= { version: readReleaseIdentityFrom(DEFAULT_STAMP_PATH) }).version;
