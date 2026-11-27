/**
 * The extension contract's description file (`extension.json`, extension-contract.md §1) and the signed catalog's
 * entries (§3): one entry is a description plus `packageUrl` and `sha256`. The reader is tolerant: it requires the
 * fields AutoByteus reads, checks their types and ignores the rest, so a description that grew by an optional field
 * still reads (the contract grows only by optional fields).
 */

/** The contract version this AutoByteus supports; an extension that needs another one is "not available here". */
export const SUPPORTED_CONTRACT_VERSION = 1;

/** `desktop-node`: only the desktop app's own node (used by every window); `every-node`: any node. */
export type ExtensionOfferedOn = "desktop-node" | "every-node";

/**
 * Optional (autobyteus-661, contract §1 `provides`): a role the node itself uses. At most one extension that is on may
 * provide a role on a node; an unknown value reads as none (the contract grows by optional fields).
 */
export type ExtensionRole = "private-network";
const EXTENSION_ROLES: readonly ExtensionRole[] = ["private-network"];

/** Optional (DEC-015): the card's name and description per app language, e.g. `{ "zh-CN": { name, description } }`. */
export type ExtensionTranslations = Readonly<Record<string, Readonly<{ name: string; description: string }>>>;

export type ExtensionDescription = Readonly<{
  id: string;
  name: string;
  description: string;
  version: string;
  contractVersion: number;
  offeredOn: ExtensionOfferedOn;
  platforms: readonly string[];
  translations: ExtensionTranslations | null;
  provides: ExtensionRole | null;
}>;

export type ExtensionCatalogEntry = ExtensionDescription & Readonly<{ packageUrl: string; sha256: string }>;

export class ExtensionDescriptionError extends Error {}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const SHA256 = /^[0-9a-f]{64}$/;

/** An extension id: lowercase letters and digits with single dashes (it names folders and route segments). */
export const isExtensionId = (value: string): boolean => ID.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Keeps the locales whose entry has a string name and description; anything else in the map is ignored. */
const readTranslations = (value: unknown): ExtensionTranslations | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value).filter(([, text]) =>
    isRecord(text) && typeof text.name === "string" && typeof text.description === "string");
  if (!entries.length) return null;
  return Object.fromEntries(entries.map(([locale, text]) => {
    const { name, description } = text as { name: string; description: string };
    return [locale, { name, description }];
  }));
};

export const readExtensionDescription = (value: unknown): ExtensionDescription => {
  if (!isRecord(value)) throw new ExtensionDescriptionError("the description is not a JSON object");
  const problem = (field: string) => new ExtensionDescriptionError(`its ${field} is missing or invalid`);
  if (typeof value.id !== "string" || !ID.test(value.id)) throw problem("id");
  if (typeof value.name !== "string" || !value.name.trim()) throw problem("name");
  if (typeof value.description !== "string") throw problem("description");
  if (typeof value.version !== "string" || !VERSION.test(value.version)) throw problem("version");
  if (!Number.isInteger(value.contractVersion)) throw problem("contractVersion");
  if (value.offeredOn !== "desktop-node" && value.offeredOn !== "every-node") throw problem("offeredOn");
  if (!Array.isArray(value.platforms) || !value.platforms.every((platform) => typeof platform === "string")) {
    throw problem("platforms");
  }
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    version: value.version,
    contractVersion: value.contractVersion as number,
    offeredOn: value.offeredOn,
    platforms: [...value.platforms] as string[],
    translations: readTranslations(value.translations),
    provides: EXTENSION_ROLES.includes(value.provides as ExtensionRole) ? value.provides as ExtensionRole : null,
  };
};

export const readExtensionCatalogEntry = (value: unknown): ExtensionCatalogEntry => {
  const description = readExtensionDescription(value);
  const entry = value as Record<string, unknown>;
  if (typeof entry.packageUrl !== "string" || !/^https?:\/\//.test(entry.packageUrl)) {
    throw new ExtensionDescriptionError("its packageUrl is missing or invalid");
  }
  if (typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256)) {
    throw new ExtensionDescriptionError("its sha256 is missing or invalid");
  }
  return { ...description, packageUrl: entry.packageUrl, sha256: entry.sha256 };
};

/** The package's `extension.json` must equal its catalog entry without `packageUrl` and `sha256` (contract §3). */
export const describesSameExtension = (packaged: ExtensionDescription, entry: ExtensionCatalogEntry): boolean => {
  const canonical = (description: ExtensionDescription) => JSON.stringify([
    description.id, description.name, description.description, description.version, description.contractVersion,
    description.offeredOn, description.platforms, description.provides,
    Object.entries(description.translations ?? {}).sort(([a], [b]) => a.localeCompare(b))
      .map(([locale, text]) => [locale, text.name, text.description]),
  ]);
  return canonical(packaged) === canonical(entry);
};

/** Semantic versions `x.y.z`: negative when `a` is older than `b`. */
export const compareExtensionVersions = (a: string, b: string): number => {
  const parts = (version: string) => (VERSION.exec(version) ?? []).slice(1).map(Number);
  const [left, right] = [parts(a), parts(b)];
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

/** This computer as the contract's `platforms` names it: `<os>-<cpu>`, e.g. `darwin-arm64`. */
export const thisPlatform = (): string => `${process.platform}-${process.arch}`;
