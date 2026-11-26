import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { extract } from "tar";
import {
  describesSameExtension,
  readExtensionDescription,
  type ExtensionCatalogEntry,
} from "../domain/extension-description.js";
import { errorMessage } from "../domain/extension-error.js";

/** A package download is refused when it takes longer than this. */
export const EXTENSION_PACKAGE_DOWNLOAD_TIMEOUT_MS = 5 * 60_000;

/** The fixed package layout (extension-contract.md §2). */
const REQUIRED_FILES = ["extension.json", path.join("server", "index.mjs"), path.join("ui", "index.html")];

const isSafeEntryPath = (entryPath: string): boolean => {
  const normalized = entryPath.replace(/\\/g, "/");
  return Boolean(normalized)
    && !normalized.startsWith("/")
    && !/^[a-zA-Z]:/.test(normalized)
    && !normalized.split("/").some((part) => part === "..");
};

/**
 * The Package Installer: downloads a catalog entry's package, checks its SHA-256 against the signed catalog, unpacks
 * it into the extension's `package.new/` (entries outside it, links and devices refused), checks the layout and that
 * its `extension.json` equals the entry, and later swaps it into `package/` (contract §2, §3, §7).
 */
export class ExtensionPackageInstaller {
  constructor(private readonly fetchUrl: typeof fetch) {}

  /** Leaves a checked, unpacked package in `stagedDir`; throws with the reason the card shows otherwise. */
  async stage(entry: ExtensionCatalogEntry, stagedDir: string): Promise<void> {
    await fs.rm(stagedDir, { recursive: true, force: true });
    const bytes = await this.download(entry);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== entry.sha256) {
      throw new Error(`The download of ${entry.name} ${entry.version} does not match the signed list of extensions (SHA-256). Nothing was installed.`);
    }
    await fs.mkdir(stagedDir, { recursive: true });
    const archive = `${stagedDir}.tar.gz`;
    await fs.writeFile(archive, bytes);
    try {
      await this.unpack(archive, stagedDir);
    } finally {
      await fs.rm(archive, { force: true });
    }
    for (const file of REQUIRED_FILES) {
      await fs.access(path.join(stagedDir, file)).catch(() => {
        throw new Error(`The package of ${entry.name} ${entry.version} has no ${file.replace(/\\/g, "/")}.`);
      });
    }
    let packaged;
    try {
      packaged = readExtensionDescription(JSON.parse(await fs.readFile(path.join(stagedDir, "extension.json"), "utf8")));
    } catch (error) {
      throw new Error(`The package of ${entry.name} ${entry.version} has an unreadable extension.json: ${errorMessage(error)}`);
    }
    if (!describesSameExtension(packaged, entry)) {
      throw new Error(`The package of ${entry.name} ${entry.version} does not describe the same extension as the signed list of extensions.`);
    }
  }

  /**
   * Makes the staged package the installed one. An earlier package is renamed aside first and deleted after the swap,
   * so the node never has two half packages.
   */
  async swapIn(stagedDir: string, packageDir: string): Promise<void> {
    const previous = `${packageDir}.old`;
    await fs.rm(previous, { recursive: true, force: true });
    const hadPackage = await fs.rename(packageDir, previous).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return false;
      throw error;
    });
    await fs.rename(stagedDir, packageDir);
    if (hadPackage) await fs.rm(previous, { recursive: true, force: true });
  }

  async discard(stagedDir: string): Promise<void> {
    await fs.rm(stagedDir, { recursive: true, force: true });
  }

  private async download(entry: ExtensionCatalogEntry): Promise<Buffer> {
    let response: Response;
    try {
      response = await this.fetchUrl(entry.packageUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(EXTENSION_PACKAGE_DOWNLOAD_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(`The package of ${entry.name} ${entry.version} could not be downloaded: ${errorMessage(error)}`);
    }
    if (!response.ok) {
      throw new Error(`The package of ${entry.name} ${entry.version} could not be downloaded: HTTP ${response.status}.`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async unpack(archive: string, target: string): Promise<void> {
    let refused: string | null = null;
    try {
      await extract({
        file: archive,
        cwd: target,
        strict: true,
        filter: (entryPath, entry) => {
          const type = (entry as { type?: string }).type;
          if (!isSafeEntryPath(entryPath) || (type !== "File" && type !== "Directory")) {
            refused ??= entryPath;
            return false;
          }
          return true;
        },
      });
    } catch (error) {
      throw new Error(`The package could not be unpacked: ${errorMessage(error)}`);
    }
    if (refused !== null) throw new Error(`The package holds an entry it may not have: ${refused}`);
  }
}
