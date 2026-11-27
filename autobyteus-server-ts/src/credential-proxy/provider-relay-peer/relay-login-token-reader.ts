import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RelayCredential } from "../provider-relays/provider-relays.js";

/** What reading a runtime login gave: the credential, or why there is none (never its value). */
export type RelayLoginRead =
  | Readonly<{ kind: "found"; credential: RelayCredential }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "expired" }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

const readJson = async (file: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch {
    return null;
  }
};

/**
 * C10: the relay node's own Grok login, read from its login file for each relayed call and **never renewed** by
 * AutoByteus (DEC-102): renewing from two places would sign one of them out. An expired login is refused so its owner
 * signs in again in Grok itself. (Codex's login is not relayed, DEC-115.)
 */
export class RelayLoginTokenReader {
  constructor(private readonly options: Readonly<{
    grokHome?: () => string;
    now?: () => number;
  }> = {}) {}

  /** `~/.grok/auth.json`: the signed-in issuer entry's `key`, refused after its `expires_at`. */
  async readGrokLogin(): Promise<RelayLoginRead> {
    const home = this.options.grokHome?.() ?? path.join(os.homedir(), ".grok");
    const auth = await readJson(path.join(home, "auth.json"));
    if (!isRecord(auth)) return { kind: "missing" };
    const entries = Object.values(auth).filter(isRecord)
      .map((entry) => ({ key: nonEmpty(entry.key), expiresAt: Date.parse(String(entry.expires_at ?? "")) }))
      .filter((entry): entry is { key: string; expiresAt: number } => entry.key !== null)
      .sort((a, b) => (Number.isNaN(b.expiresAt) ? 0 : b.expiresAt) - (Number.isNaN(a.expiresAt) ? 0 : a.expiresAt));
    const latest = entries[0];
    if (!latest) return { kind: "missing" };
    if (!Number.isNaN(latest.expiresAt) && latest.expiresAt <= this.now()) return { kind: "expired" };
    return { kind: "found", credential: Object.freeze({ secret: latest.key }) };
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
