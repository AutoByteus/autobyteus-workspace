import type { ExtensionTranslations } from "./extension-description.js";

/**
 * What a node answers about its extensions (extension-contract.md §6; the exact payload is design-spec.md, Data
 * Contract). One item per extension offered on this node, plus every installed one. Each field is set only in the
 * states the contract table names and is `null` otherwise.
 */

/** The result of the latest catalog fetch; entries always come from the last verified copy. */
export type ExtensionCatalogStatus = "verified" | "unverified" | "unreachable";

export type ExtensionState = "notAvailableHere" | "notInstalled" | "installing" | "updating" | "installed" | "failed";

export type ExtensionNotAvailableReason = "platform" | "newerAutoByteus";

export type ExtensionUpdate = "available" | "needsNewerAutoByteus" | "none";

/** Install or update progress, as the extension's `ctx.progress` reports it: a percent only when it knows one. */
export type ExtensionProgress = Readonly<{ message: string; percent: number | null }>;

export type ExtensionItem = Readonly<{
  id: string;
  /** From the installed package, else the catalog entry. */
  name: string;
  description: string;
  translations: ExtensionTranslations | null;
  platforms: readonly string[];
  state: ExtensionState;
  /** The catalog's version; `null` when no verified catalog lists the extension. */
  catalogVersion: string | null;
  /** Only in `notAvailableHere`. */
  notAvailableReason: ExtensionNotAvailableReason | null;
  /** Only in `installing` and `updating`. */
  progress: ExtensionProgress | null;
  /** In `installed` and `updating`, and in `failed` when the package is readable. */
  installedVersion: string | null;
  /** `state.json` (installed, and failed with a package). */
  enabled: boolean | null;
  /** From the server part's `status()` (installed only). */
  ready: boolean | null;
  /** "Update to x failed: …", else "Could not start: …", else `status().message` (installed only). */
  message: string | null;
  /** The server part's `start()` is running now. */
  starting: boolean;
  /** Installed only. */
  update: ExtensionUpdate | null;
  /** Why the extension is `failed`. */
  failureMessage: string | null;
}>;

export type ExtensionList = Readonly<{
  catalog: ExtensionCatalogStatus;
  /** This node's `<os>-<cpu>`: the card names it when an extension has no build for it. */
  platform: string;
  extensions: readonly ExtensionItem[];
}>;
