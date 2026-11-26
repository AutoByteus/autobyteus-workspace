import { createPublicKey, verify, type KeyObject } from "node:crypto";
import {
  readExtensionCatalogEntry,
  type ExtensionCatalogEntry,
} from "../domain/extension-description.js";
import type { ExtensionCatalogStatus } from "../domain/extension-item.js";
import type { ExtensionCatalogSource } from "./extension-catalog-source.js";

/** Every catalog fetch is bounded by this time (design: AR-002). */
export const EXTENSION_CATALOG_FETCH_TIMEOUT_MS = 10_000;

export type ExtensionCatalogView = Readonly<{
  /** The result of the latest fetch: `unreachable` before the first one. */
  status: ExtensionCatalogStatus;
  /** The entries of the last verified copy (empty before one). */
  entries: readonly ExtensionCatalogEntry[];
}>;

/**
 * The Extension Catalog: fetches `extensions-catalog.json` and its `.sig`, verifies the signature over the exact bytes
 * with AutoByteus's public key (Ed25519), and keeps the last verified copy in memory for the process.
 *
 * It fetches only when asked (`fetch()`): once after the node listens, when the Extensions page opens or the owner
 * presses Try again, and at the start of Install and Update. Fetches running at the same time share one request.
 * `current()` never waits on the network.
 */
export class ExtensionCatalog {
  private status: ExtensionCatalogStatus = "unreachable";
  private entries: readonly ExtensionCatalogEntry[] = [];
  private running: Promise<ExtensionCatalogView> | null = null;
  private readonly publicKey: KeyObject | null;

  constructor(
    private readonly source: ExtensionCatalogSource,
    private readonly fetchUrl: typeof fetch,
  ) {
    this.publicKey = readPublicKey(source.publicKeyPem);
  }

  current(): ExtensionCatalogView {
    return { status: this.status, entries: this.entries };
  }

  fetch(): Promise<ExtensionCatalogView> {
    this.running ??= this.fetchOnce().finally(() => { this.running = null; });
    return this.running;
  }

  private async fetchOnce(): Promise<ExtensionCatalogView> {
    const signal = AbortSignal.timeout(EXTENSION_CATALOG_FETCH_TIMEOUT_MS);
    let bytes: Buffer;
    let signature: Buffer;
    try {
      [bytes, signature] = await Promise.all([
        this.download(this.source.url, signal),
        this.download(`${this.source.url}.sig`, signal).then((text) => Buffer.from(text.toString("utf8").trim(), "base64")),
      ]);
    } catch (error) {
      console.warn(`EXTENSIONS_CATALOG_UNREACHABLE: ${this.source.url}: ${String(error)}`);
      this.status = "unreachable";
      return this.current();
    }
    if (!this.verifies(bytes, signature)) {
      console.warn(`EXTENSIONS_CATALOG_UNVERIFIED: ${this.source.url}: its signature does not verify with this AutoByteus's public key`);
      this.status = "unverified";
      return this.current();
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      console.warn(`EXTENSIONS_CATALOG_UNREADABLE: ${this.source.url}: ${String(error)}`);
      this.status = "unverified";
      return this.current();
    }
    const listed = (parsed as { extensions?: unknown } | null)?.extensions;
    const entries: ExtensionCatalogEntry[] = [];
    for (const value of Array.isArray(listed) ? listed : []) {
      try {
        const entry = readExtensionCatalogEntry(value);
        if (!entries.some((known) => known.id === entry.id)) entries.push(entry);
      } catch (error) {
        console.warn(`EXTENSIONS_CATALOG_ENTRY_SKIPPED: ${String((value as { id?: unknown } | null)?.id)}: ${String(error)}`);
      }
    }
    this.entries = entries;
    this.status = "verified";
    return this.current();
  }

  private verifies(bytes: Buffer, signature: Buffer): boolean {
    if (!this.publicKey) return false;
    try {
      return verify(null, bytes, this.publicKey, signature);
    } catch {
      return false;
    }
  }

  private async download(url: string, signal: AbortSignal): Promise<Buffer> {
    const response = await this.fetchUrl(url, { signal, redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}

const readPublicKey = (pem: string): KeyObject | null => {
  if (!pem) return null;
  try {
    const key = createPublicKey(pem);
    return key.asymmetricKeyType === "ed25519" ? key : null;
  } catch {
    return null;
  }
};
