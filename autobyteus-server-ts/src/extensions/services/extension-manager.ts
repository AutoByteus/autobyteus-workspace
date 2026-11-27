import fs from "node:fs/promises";
import path from "node:path";
import type { ExtensionCatalog } from "../catalog/extension-catalog.js";
import type { ExtensionRole } from "../domain/extension-description.js";
import {
  compareExtensionVersions,
  isExtensionId,
  readExtensionDescription,
  SUPPORTED_CONTRACT_VERSION,
  type ExtensionCatalogEntry,
  type ExtensionDescription,
} from "../domain/extension-description.js";
import { ExtensionError, errorMessage } from "../domain/extension-error.js";
import type { ExtensionItem, ExtensionList, ExtensionProgress, ExtensionUpdate } from "../domain/extension-item.js";
import type { ExtensionPackageInstaller } from "../packages/extension-package-installer.js";
import {
  SERVER_PART_STOP_TIMEOUT_MS,
  type LoadedServerPart,
  type ServerPartActionInput,
  type ServerPartHost,
} from "../server-parts/server-part-host.js";
import type { ExtensionLog } from "../storage/extension-log.js";
import type { ExtensionStateStore, ExtensionStates } from "../storage/extension-state-store.js";

export type ExtensionManagerDependencies = Readonly<{
  catalog: ExtensionCatalog;
  installer: ExtensionPackageInstaller;
  host: ServerPartHost;
  store: ExtensionStateStore;
  log: ExtensionLog;
  /** `<os>-<cpu>` of this computer. */
  platform: string;
  /** Whether this node is the desktop app's own node, where `desktop-node` extensions are offered. */
  isDesktopNode: boolean;
}>;

type Operation = Readonly<{ kind: "install" | "update"; progress: ExtensionProgress }>;
type Installed =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "readable"; description: ExtensionDescription }>
  | Readonly<{ kind: "unreadable"; reason: string }>;

/**
 * The Extension Manager: the lifecycle of each extension on this node (extension-contract.md §6, §7; design-spec.md
 * DS-001…DS-006). It answers the list, runs Install, Update, Remove and the on/off switch one at a time per extension
 * (`EXTENSION_BUSY` otherwise), keeps progress and failures in memory, gates every action call (installed, on, not
 * busy, one of its own actions), starts the server parts that are on and stops them. It is the only writer of
 * `state.json`; routes and resolvers reach extensions only through it.
 */
export class ExtensionManager {
  private readonly busy = new Set<string>();
  /** Being removed: its server part is unloaded, so the list must not load it again. */
  private readonly removing = new Set<string>();
  private readonly operations = new Map<string, Operation>();
  private readonly installFailures = new Map<string, string>();
  private readonly updateFailures = new Map<string, string>();
  private readonly startFailures = new Map<string, string>();
  /** A running `start()`; a later on/off or update replaces or deletes its token, so its late result is ignored. */
  private readonly startTokens = new Map<string, number>();
  private readonly loaded = new Map<string, Promise<LoadedServerPart>>();
  private readonly warned = new Set<string>();
  private startCounter = 0;

  constructor(private readonly deps: ExtensionManagerDependencies) {}

  /** The extensions of this node: `refreshCatalog` fetches the catalog first (≤ 10 s), otherwise the copy in memory. */
  async list(options: Readonly<{ refreshCatalog: boolean }>): Promise<ExtensionList> {
    const catalog = options.refreshCatalog ? await this.deps.catalog.fetch() : this.deps.catalog.current();
    const offered = catalog.entries.filter((entry) => this.isOfferedHere(entry));
    const states = await this.deps.store.read();
    const ids = [...new Set([
      ...offered.map((entry) => entry.id),
      ...await this.deps.store.packagedIds(),
      ...this.operations.keys(),
      ...this.installFailures.keys(),
    ])];
    const items = await Promise.all(ids.map((id) => this.itemOf(id, offered.find((entry) => entry.id === id) ?? null, states)));
    return {
      catalog: catalog.status,
      platform: this.deps.platform,
      extensions: items.filter((item): item is ExtensionItem => item !== null),
    };
  }

  /** Whether this node lists an extension (REQ-011): `desktop-node` ones only on the desktop app's own node. */
  isOfferedHere(entry: ExtensionCatalogEntry): boolean {
    return entry.offeredOn === "every-node" || this.deps.isDesktopNode;
  }

  /** Starts Install and returns at once (`installing`); the page follows the progress by polling the list (DS-009). */
  async install(id: string): Promise<ExtensionItem | null> {
    await this.reserve(id, async () => {
      const entry = await this.verifiedEntry(id);
      if ((await this.item(id))?.state === "installed") {
        throw new ExtensionError("EXTENSION_ALREADY_INSTALLED", `${entry.name} is already installed.`);
      }
      this.installFailures.delete(id);
      this.operations.set(id, { kind: "install", progress: { message: `Downloading ${entry.name} ${entry.version}`, percent: null } });
      void this.runInstall(entry);
    });
    return this.item(id);
  }

  /** Starts Update to the catalog's newer version and returns at once (`updating`). */
  async update(id: string): Promise<ExtensionItem | null> {
    await this.reserve(id, async () => {
      const entry = await this.verifiedEntry(id);
      const current = await this.item(id);
      if (current?.state !== "installed" || current.update !== "available") {
        throw new ExtensionError("EXTENSION_NO_UPDATE", `There is no update of ${entry.name} to install.`);
      }
      this.updateFailures.delete(id);
      this.operations.set(id, { kind: "update", progress: { message: `Downloading ${entry.name} ${entry.version}`, percent: null } });
      void this.runUpdate(entry);
    });
    return this.item(id);
  }

  /** Stops the extension, deletes its folder (package, data, log), then its `state.json` entry. */
  async remove(id: string): Promise<ExtensionItem | null> {
    await this.reserve(id, async () => {
      const exists = await fs.access(this.deps.store.folder(id)).then(() => true, () => false);
      if (!exists) throw new ExtensionError("EXTENSION_NOT_INSTALLED", `${id} is not installed.`);
      this.removing.add(id);
      try {
        await this.unload(id);
        await this.deps.log.idle(id);
        await fs.rm(this.deps.store.folder(id), { recursive: true, force: true });
        await this.deps.store.update((states) => { delete states[id]; });
      } finally {
        this.removing.delete(id);
        this.installFailures.delete(id);
        this.updateFailures.delete(id);
        this.startFailures.delete(id);
        this.warned.forEach((key) => { if (key.startsWith(`${id}\n`)) this.warned.delete(key); });
      }
    }, false);
    return this.item(id);
  }

  /** On writes `enabled: true` and starts the server part; Off writes `false` and stops it. */
  async setEnabled(id: string, enabled: boolean): Promise<ExtensionItem | null> {
    await this.reserve(id, async () => {
      if ((await this.item(id))?.state !== "installed") {
        throw new ExtensionError("EXTENSION_NOT_INSTALLED", `${id} is not installed.`);
      }
      const holder = enabled ? await this.otherProviderOf(id) : null;
      if (holder) throw new ExtensionError("EXTENSION_ROLE_TAKEN", `${holder} already provides this on this node: turn it off first.`);
      await this.deps.store.update((states) => { states[id] = { enabled }; });
      this.startFailures.delete(id);
      this.deps.log.append(id, enabled ? "turned on" : "turned off");
      if (enabled) {
        this.startInBackground(id);
        return;
      }
      this.startTokens.delete(id);
      const part = await this.loadedPart(id).catch(() => null);
      await part?.stop().catch((error) => this.deps.log.append(id, `stop failed: ${errorMessage(error)}`));
    });
    return this.item(id);
  }

  /**
   * One action call (contract §6): the extension must be installed, on and not busy, and the action one of its own.
   * Its output is returned as the extension gave it.
   */
  async callAction(id: string, action: string, input: ServerPartActionInput): Promise<unknown> {
    if (!isExtensionId(id)) throw new ExtensionError("EXTENSION_NOT_INSTALLED", `${id} is not installed on this node.`);
    if (this.busy.has(id)) throw new ExtensionError("EXTENSION_BUSY", `${id} is being installed, updated or removed.`);
    if ((await this.readInstalled(id)).kind !== "readable") {
      throw new ExtensionError("EXTENSION_NOT_INSTALLED", `${id} is not installed on this node.`);
    }
    if ((await this.deps.store.read())[id]?.enabled !== true) {
      throw new ExtensionError("EXTENSION_OFF", `${id} is turned off on this node.`);
    }
    let part: LoadedServerPart;
    try {
      part = await this.loadedPart(id);
    } catch (error) {
      throw new ExtensionError("ACTION_FAILED", errorMessage(error));
    }
    if (!part.hasAction(action)) throw new ExtensionError("UNKNOWN_ACTION", `${id} has no action ${action}.`);
    try {
      return await part.call(action, input);
    } catch (error) {
      this.deps.log.append(id, `${action} failed: ${errorMessage(error)}`);
      throw new ExtensionError("ACTION_FAILED", errorMessage(error));
    }
  }

  /**
   * The installed extension that is on and provides `role` on this node (autobyteus-661 `PrivateNetworkRole`), or
   * `null` when none does: the caller says the role is not set up.
   */
  async enabledProvider(role: ExtensionRole): Promise<string | null> {
    const states = await this.deps.store.read();
    for (const id of Object.keys(states).sort()) {
      if (states[id]?.enabled !== true) continue;
      const installed = await this.readInstalled(id);
      if (installed.kind === "readable" && installed.description.provides === role) return id;
    }
    return null;
  }

  /** Another extension that is on and provides the role this one provides; `null` when this one provides none. */
  private async otherProviderOf(id: string): Promise<string | null> {
    const installed = await this.readInstalled(id);
    const role = installed.kind === "readable" ? installed.description.provides : null;
    if (!role) return null;
    const holder = await this.enabledProvider(role);
    return holder && holder !== id ? holder : null;
  }

  /** A file of the installed extension's page (`package/ui/…`); `null` when there is none at that path. */
  async pageFile(id: string, relativePath: string): Promise<string | null> {
    if (!isExtensionId(id) || (await this.readInstalled(id)).kind !== "readable") return null;
    const root = path.join(this.deps.store.packageDir(id), "ui");
    const file = path.resolve(root, relativePath || "index.html");
    if (!file.startsWith(`${root}${path.sep}`)) return null;
    const stat = await fs.stat(file).catch(() => null);
    return stat?.isFile() ? file : null;
  }

  /** The last lines of the extension's log. */
  async readLog(id: string): Promise<string[]> {
    return isExtensionId(id) ? this.deps.log.tail(id) : [];
  }

  /** In the background after the node listens: fetches the catalog once. */
  refreshCatalog(): Promise<unknown> {
    return this.deps.catalog.fetch();
  }

  /** After the node listens: starts every installed extension that is on, each in the background (DS-006). */
  async startEnabled(): Promise<void> {
    const states = await this.deps.store.read();
    for (const id of await this.deps.store.packagedIds()) {
      if (states[id]?.enabled === true && (await this.readInstalled(id)).kind === "readable") this.startInBackground(id);
    }
  }

  /** Node shutdown: stops every loaded server part, each bounded. */
  async stopAll(): Promise<void> {
    this.startTokens.clear();
    const parts = [...this.loaded.entries()];
    this.loaded.clear();
    await Promise.all(parts.map(async ([id, loading]) => {
      const part = await loading.catch(() => null);
      await part?.stop(SERVER_PART_STOP_TIMEOUT_MS).catch((error) => console.warn(`EXTENSION_STOP_FAILED: ${id}: ${errorMessage(error)}`));
    }));
  }

  private async item(id: string): Promise<ExtensionItem | null> {
    const entry = this.deps.catalog.current().entries.find((candidate) => candidate.id === id && this.isOfferedHere(candidate)) ?? null;
    return this.itemOf(id, entry, await this.deps.store.read());
  }

  private async itemOf(id: string, entry: ExtensionCatalogEntry | null, states: ExtensionStates): Promise<ExtensionItem | null> {
    const installed = await this.readInstalled(id);
    const shown = installed.kind === "readable" ? installed.description : entry;
    const base = {
      id,
      name: shown?.name ?? id,
      description: shown?.description ?? "",
      translations: shown?.translations ?? null,
      platforms: shown?.platforms ?? [],
      catalogVersion: entry?.version ?? null,
      notAvailableReason: null,
      progress: null,
      installedVersion: installed.kind === "readable" ? installed.description.version : null,
      enabled: null,
      ready: null,
      message: null,
      starting: false,
      update: null,
      failureMessage: null,
    } as const;
    const operation = this.operations.get(id);
    if (operation) return { ...base, state: operation.kind === "install" ? "installing" : "updating", progress: operation.progress };
    const installFailure = this.installFailures.get(id);
    if (installFailure) {
      return { ...base, state: "failed", enabled: installed.kind === "none" ? null : states[id]?.enabled === true, failureMessage: installFailure };
    }
    if (installed.kind === "unreadable") {
      return this.failed(base, states, `Its installed files cannot be read: ${installed.reason}`);
    }
    if (installed.kind === "none") {
      if (!entry) return null;
      if (entry.contractVersion !== SUPPORTED_CONTRACT_VERSION) return { ...base, state: "notAvailableHere", notAvailableReason: "newerAutoByteus" };
      if (!entry.platforms.includes(this.deps.platform)) return { ...base, state: "notAvailableHere", notAvailableReason: "platform" };
      return { ...base, state: "notInstalled" };
    }
    if (this.removing.has(id)) return { ...base, state: "installed", enabled: states[id]?.enabled === true, ready: false };
    let status;
    try {
      status = await (await this.loadedPart(id)).status();
    } catch (error) {
      return this.failed(base, states, errorMessage(error));
    }
    return {
      ...base,
      state: "installed",
      enabled: states[id]?.enabled === true,
      ready: status.ready,
      message: this.updateFailures.get(id) ?? this.startFailures.get(id) ?? status.message,
      starting: this.startTokens.has(id),
      update: this.updateOf(installed.description, entry),
    };
  }

  private failed(base: Omit<ExtensionItem, "state">, states: ExtensionStates, message: string): ExtensionItem {
    const key = `${base.id}\n${message}`;
    if (!this.warned.has(key)) {
      this.warned.add(key);
      console.warn(`EXTENSION_FAILED: ${base.id}: ${message}`);
      this.deps.log.append(base.id, `failed: ${message}`);
    }
    return { ...base, state: "failed", enabled: states[base.id]?.enabled === true, failureMessage: message };
  }

  private updateOf(installed: ExtensionDescription, entry: ExtensionCatalogEntry | null): ExtensionUpdate {
    if (!entry || compareExtensionVersions(entry.version, installed.version) <= 0 || !entry.platforms.includes(this.deps.platform)) return "none";
    return entry.contractVersion === SUPPORTED_CONTRACT_VERSION ? "available" : "needsNewerAutoByteus";
  }

  /** Installed ⇔ a valid `package/extension.json` that describes this extension. */
  private async readInstalled(id: string): Promise<Installed> {
    let raw: string;
    try {
      raw = await fs.readFile(path.join(this.deps.store.packageDir(id), "extension.json"), "utf8");
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT" ? { kind: "none" } : { kind: "unreadable", reason: errorMessage(error) };
    }
    try {
      const description = readExtensionDescription(JSON.parse(raw));
      if (description.id !== id) return { kind: "unreadable", reason: `package/extension.json describes ${description.id}` };
      return { kind: "readable", description };
    } catch (error) {
      return { kind: "unreadable", reason: `package/extension.json: ${errorMessage(error)}` };
    }
  }

  /** Runs one lifecycle step with the extension marked busy; `keep` leaves it busy for the background operation. */
  private async reserve(id: string, step: () => Promise<void>, keep = true): Promise<void> {
    if (!isExtensionId(id)) throw new ExtensionError("EXTENSION_NOT_OFFERED", `${id} is not an extension of this node.`);
    if (this.busy.has(id)) throw new ExtensionError("EXTENSION_BUSY", `${id} is being installed, updated or removed.`);
    this.busy.add(id);
    try {
      await step();
    } finally {
      if (!(keep && this.operations.has(id))) this.busy.delete(id);
    }
  }

  /** Install and Update need a catalog fetched now that verifies, listing the extension for this node and platform. */
  private async verifiedEntry(id: string): Promise<ExtensionCatalogEntry> {
    const catalog = await this.deps.catalog.fetch();
    if (catalog.status !== "verified") {
      throw new ExtensionError("EXTENSION_CATALOG_NOT_VERIFIED", "The list of extensions could not be verified or reached; nothing can be installed or updated now.");
    }
    const entry = catalog.entries.find((candidate) => candidate.id === id && this.isOfferedHere(candidate));
    if (!entry) throw new ExtensionError("EXTENSION_NOT_OFFERED", `${id} is not offered on this node.`);
    if (entry.contractVersion !== SUPPORTED_CONTRACT_VERSION) {
      throw new ExtensionError("EXTENSION_NOT_AVAILABLE", `${entry.name} ${entry.version} needs a newer AutoByteus.`);
    }
    if (!entry.platforms.includes(this.deps.platform)) {
      throw new ExtensionError("EXTENSION_NOT_AVAILABLE", `${entry.name} is not available on ${this.deps.platform}.`);
    }
    return entry;
  }

  private async runInstall(entry: ExtensionCatalogEntry): Promise<void> {
    const { id } = entry;
    const staged = this.deps.store.stagedPackageDir(id);
    let installed = false;
    try {
      await this.unload(id);
      await fs.mkdir(this.deps.store.dataDir(id), { recursive: true });
      this.deps.log.append(id, `install: ${id} ${entry.version} from ${entry.packageUrl}`);
      await this.stageAndPrepare(entry, staged);
      await this.deps.installer.swapIn(staged, this.deps.store.packageDir(id));
      // One extension per role is on (autobyteus-661): another one already providing it leaves this one off.
      const holder = await this.otherProviderOf(id);
      await this.deps.store.update((states) => { states[id] = { enabled: !holder }; });
      this.deps.log.append(id, holder ? `install: ${id} ${entry.version} installed; left off: ${holder} already provides its role`
        : `install: ${id} ${entry.version} installed and turned on`);
      installed = !holder;
    } catch (error) {
      this.installFailures.set(id, errorMessage(error));
      this.deps.log.append(id, `install failed: ${errorMessage(error)}`);
      await this.deps.installer.discard(staged).catch(() => undefined);
    } finally {
      this.operations.delete(id);
      this.busy.delete(id);
    }
    if (installed) this.startInBackground(id);
  }

  private async runUpdate(entry: ExtensionCatalogEntry): Promise<void> {
    const { id } = entry;
    const staged = this.deps.store.stagedPackageDir(id);
    try {
      this.startTokens.delete(id);
      await this.unload(id);
      this.deps.log.append(id, `update: to ${entry.version} from ${entry.packageUrl}`);
      await this.stageAndPrepare(entry, staged);
      await this.deps.installer.swapIn(staged, this.deps.store.packageDir(id));
      this.deps.log.append(id, `update: ${id} ${entry.version} installed`);
    } catch (error) {
      this.updateFailures.set(id, `Update to ${entry.version} failed: ${errorMessage(error)}`);
      this.deps.log.append(id, `update to ${entry.version} failed: ${errorMessage(error)}; the installed version stays`);
      await this.deps.installer.discard(staged).catch(() => undefined);
    } finally {
      this.operations.delete(id);
      this.busy.delete(id);
    }
    if ((await this.deps.store.read())[id]?.enabled === true) this.startInBackground(id);
  }

  /** Download and check into `package.new/`, then the extension's own `install(ctx)` from there, with progress. */
  private async stageAndPrepare(entry: ExtensionCatalogEntry, staged: string): Promise<void> {
    const { id } = entry;
    await this.deps.installer.stage(entry, staged);
    this.deps.log.append(id, "package verified: its SHA-256 matches the signed list of extensions");
    const part = await this.deps.host.load(id, staged, this.deps.store.dataDir(id), entry.provides);
    await part.install((progress) => {
      const operation = this.operations.get(id);
      if (operation) this.operations.set(id, { ...operation, progress });
    });
  }

  private startInBackground(id: string): void {
    const token = ++this.startCounter;
    this.startTokens.set(id, token);
    this.startFailures.delete(id);
    const current = () => this.startTokens.get(id) === token;
    void (async () => {
      try {
        const part = await this.loadedPart(id);
        if (!part.hasStart) return;
        this.deps.log.append(id, "start: starting");
        await part.start();
        if (current()) this.deps.log.append(id, "start: started");
      } catch (error) {
        if (!current()) return;
        this.startFailures.set(id, `Could not start: ${errorMessage(error)}`);
        this.deps.log.append(id, `start failed: ${errorMessage(error)}`);
      } finally {
        if (current()) this.startTokens.delete(id);
      }
    })();
  }

  private loadedPart(id: string): Promise<LoadedServerPart> {
    let loading = this.loaded.get(id);
    if (!loading) {
      loading = this.readInstalled(id).then((installed) => this.deps.host.load(id, this.deps.store.packageDir(id), this.deps.store.dataDir(id),
        installed.kind === "readable" ? installed.description.provides : null));
      loading.catch(() => undefined);
      this.loaded.set(id, loading);
    }
    return loading;
  }

  /** Stops and forgets the loaded server part, so the next use imports the package anew. */
  private async unload(id: string): Promise<void> {
    this.startTokens.delete(id);
    const loading = this.loaded.get(id);
    this.loaded.delete(id);
    const part = await loading?.catch(() => null);
    await part?.stop(SERVER_PART_STOP_TIMEOUT_MS).catch((error) => this.deps.log.append(id, `stop failed: ${errorMessage(error)}`));
  }
}
