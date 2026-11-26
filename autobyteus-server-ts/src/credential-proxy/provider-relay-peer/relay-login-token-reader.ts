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

/** A JWT's `exp` in milliseconds; `null` when the value is not a JWT with one. */
const jwtExpiryMs = (token: string): number | null => {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const exp = (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const readJson = async (file: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch {
    return null;
  }
};

/**
 * C10: the relay node's own Codex and Grok logins, read from their login files for each relayed call and **never
 * renewed** by AutoByteus (DEC-102): renewing from two places would sign one of them out. An expired login is refused
 * so its owner signs in again in the runtime itself.
 */
export class RelayLoginTokenReader {
  constructor(private readonly options: Readonly<{
    codexHome?: () => string;
    grokHome?: () => string;
    now?: () => number;
  }> = {}) {}

  /** `$CODEX_HOME/auth.json` (else `~/.codex`): ChatGPT tokens' `access_token` and `account_id`. */
  async readCodexLogin(): Promise<RelayLoginRead> {
    const home = this.options.codexHome?.() ?? (process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex"));
    const auth = await readJson(path.join(home, "auth.json"));
    const tokens = isRecord(auth) && isRecord(auth.tokens) ? auth.tokens : null;
    const accessToken = nonEmpty(tokens?.access_token);
    if (!accessToken) return { kind: "missing" };
    const expiresAt = jwtExpiryMs(accessToken);
    if (expiresAt !== null && expiresAt <= this.now()) return { kind: "expired" };
    return { kind: "found", credential: Object.freeze({ secret: accessToken, accountId: nonEmpty(tokens?.account_id) }) };
  }

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
    return { kind: "found", credential: Object.freeze({ secret: latest.key, accountId: null }) };
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
