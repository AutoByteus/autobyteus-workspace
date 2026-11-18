import fs from "node:fs/promises";
import {
  AGENT_PACKAGE_DEFINITION_KINDS,
  AGENT_PACKAGE_DEFINITION_LISTS,
  type AgentPackageDefinitionKind,
  type AgentPackageDefinitionList,
  type DefinitionFolderReaders,
  type RegisteredPackageRoot,
} from "../domain/agent-package-definition-types.js";
import { errorText, kindFoldersUnreadableError } from "../domain/definition-files.js";
import type { AgentPackageDefinitionStore } from "./agent-package-definition-store.js";

export const DEFAULT_SETTLE_QUIET_MS = 1000;
export const DEFAULT_SETTLE_CAP_MS = 3000;

export type AgentPackageDefinitionChangePublisher = (changedLists: readonly AgentPackageDefinitionList[]) => void;
export type PackageRegistrationListener = (roots: readonly RegisteredPackageRoot[]) => Promise<void> | void;

export type AgentPackageDefinitionReloaderOptions = Readonly<{
  store: AgentPackageDefinitionStore;
  readers: DefinitionFolderReaders;
  /** Every registered agent package folder in precedence order, present or not. */
  listPackageRoots: () => readonly RegisteredPackageRoot[];
  settleQuietMs?: number;
  settleCapMs?: number;
  isRootPresent?: (rootPath: string) => Promise<boolean>;
  logger?: Pick<Console, "warn">;
}>;

const LIST_OF_KIND: Readonly<Record<AgentPackageDefinitionKind, AgentPackageDefinitionList>> = {
  agent: "agents",
  agent_team: "agent_teams",
  agent_org: "agent_orgs",
};

/**
 * The web lists to reload after definitions of the given kinds changed. Team and org
 * availability depends on agents, orgs reference teams, and team-local agents are listed with
 * the agents.
 */
export const listsAffectedBy = (
  changedKinds: Iterable<AgentPackageDefinitionKind>,
  packageFoldersChanged: boolean,
): AgentPackageDefinitionList[] => {
  const output = new Set<AgentPackageDefinitionList>();
  for (const kind of changedKinds) {
    output.add(LIST_OF_KIND[kind]);
    if (kind === "agent") { output.add("agent_teams"); output.add("agent_orgs"); }
    if (kind === "agent_team") { output.add("agent_orgs"); output.add("agents"); }
  }
  if (packageFoldersChanged) output.add("agent_packages");
  return AGENT_PACKAGE_DEFINITION_LISTS.filter((list) => output.has(list));
};

const folderKey = (kind: AgentPackageDefinitionKind, folderId: string): string => `${kind}\u0000${folderId}`;

const defaultIsRootPresent = async (rootPath: string): Promise<boolean> =>
  fs.stat(rootPath).then((stats) => stats.isDirectory()).catch(() => false);

/**
 * The registered package folders of one reload. `readable` ones are present and listable; every
 * other registered package folder is in `unavailable` with the reason (missing, or unreadable),
 * and its definition folders keep their last loaded version (DEC-005) while the others reload
 * normally.
 */
type RootContext = {
  registered: readonly RegisteredPackageRoot[];
  readable: RegisteredPackageRoot[];
  registeredPaths: ReadonlySet<string>;
  unavailable: Map<string, string | null>;
};

type PendingFolder = Readonly<{ kind: AgentPackageDefinitionKind; folderId: string }>;

/**
 * The only writer of the agent package definition store. It owns the first load, the pending
 * changed folders and their settle window, the serialized reload queue, full reloads and change
 * announcements. Every read first calls `applyPendingChanges()`, which applies every detected
 * change before answering.
 */
export class AgentPackageDefinitionReloader {
  private readonly quietMs: number;
  private readonly capMs: number;
  private readonly isRootPresent: (rootPath: string) => Promise<boolean>;
  private readonly logger: Pick<Console, "warn">;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private readonly pendingFolders = new Map<string, PendingFolder>();
  private readonly pendingPackageFolders = new Set<string>();
  /** Packages the watcher asked to re-read quietly: expanded like a package change, announced only if something changed. */
  private readonly pendingReconcile = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private firstPendingAt: number | null = null;
  /** Folders a read applied early; re-read once after the quiet window (see `applyPendingChanges`). */
  private readonly trailingFolders = new Map<string, PendingFolder>();
  private trailingTimer: NodeJS.Timeout | null = null;
  private tail: Promise<void> = Promise.resolve();
  private queuedReload: Promise<void> | null = null;
  private publisher: AgentPackageDefinitionChangePublisher | null = null;
  private registrationListener: PackageRegistrationListener | null = null;
  private closed = false;

  constructor(private readonly options: AgentPackageDefinitionReloaderOptions) {
    this.quietMs = options.settleQuietMs ?? DEFAULT_SETTLE_QUIET_MS;
    this.capMs = Math.max(options.settleCapMs ?? DEFAULT_SETTLE_CAP_MS, this.quietMs);
    this.isRootPresent = options.isRootPresent ?? defaultIsRootPresent;
    this.logger = options.logger ?? console;
  }

  setPublisher(publisher: AgentPackageDefinitionChangePublisher | null): void {
    this.publisher = publisher;
  }

  /** Called after every full reload with the registered package folders (the studio watcher re-syncs its watches). */
  setRegistrationListener(listener: PackageRegistrationListener | null): void {
    this.registrationListener = listener;
  }

  listPackageRoots(): readonly RegisteredPackageRoot[] {
    return this.options.listPackageRoots();
  }

  markFolderChanged(kind: AgentPackageDefinitionKind, folderId: string): void {
    if (this.closed) return;
    this.pendingFolders.set(folderKey(kind, folderId), Object.freeze({ kind, folderId }));
    this.armTimer();
  }

  /** A package folder appeared, disappeared, was replaced or changed watch status: reload all of its definition folders. */
  markPackageFolderChanged(rootPath: string): void {
    if (this.closed) return;
    this.pendingPackageFolders.add(rootPath);
    this.armTimer();
  }

  /**
   * The watcher's catch-up: the OS may have dropped events of this package folder, so re-read all of its definition
   * folders once the burst has settled. Unlike `markPackageFolderChanged`, nothing is announced unless a definition
   * really changed.
   */
  reconcilePackageFolder(rootPath: string): void {
    if (this.closed) return;
    this.pendingReconcile.add(rootPath);
    this.armTimer();
  }

  /**
   * Applies every pending change (and the first load) before a read answers. A read can apply a
   * change while its file is still being written, and the watcher may report that write only
   * once (it drops a second change event for the same file within a few milliseconds), so
   * folders applied early are re-read once after the quiet window.
   */
  async applyPendingChanges(): Promise<void> {
    await this.ensureLoaded();
    if (this.hasPending()) {
      for (const [key, folder] of this.pendingFolders) this.trailingFolders.set(key, folder);
      this.flushPending();
      this.armTrailingTimer();
    }
    await this.tail;
  }

  /** Full reload of every registered agent package, then a change announcement. */
  reloadAllPackages(): Promise<void> {
    if (this.queuedReload) return this.queuedReload;
    const run = this.enqueue(async () => {
      this.queuedReload = null;
      await this.runFullReload(true);
    });
    this.queuedReload = run;
    return run;
  }

  /** Reloads the given definition folders now (in-app writes), then announces what changed. */
  async reloadFoldersNow(kind: AgentPackageDefinitionKind, folderIds: readonly string[]): Promise<void> {
    await this.ensureLoaded();
    const folders = new Map<string, PendingFolder>();
    for (const folderId of folderIds) {
      const key = folderKey(kind, folderId);
      this.pendingFolders.delete(key);
      folders.set(key, Object.freeze({ kind, folderId }));
    }
    await this.enqueue(() => this.reloadBatch(folders, new Set(), new Set()));
  }

  close(): void {
    this.closed = true;
    this.clearTimer();
    if (this.trailingTimer) clearTimeout(this.trailingTimer);
    this.trailingTimer = null;
    this.trailingFolders.clear();
    this.publisher = null;
    this.registrationListener = null;
  }

  private ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (!this.loadPromise) {
      const run = this.enqueue(async () => {
        if (!this.loaded) await this.runFullReload(false);
      });
      this.loadPromise = run;
      run.catch(() => {
        // A failed first load is not cached; the next read retries it.
        if (this.loadPromise === run) this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const run = this.tail.then(operation);
    this.tail = run.catch(() => undefined);
    return run;
  }

  private armTimer(): void {
    const now = Date.now();
    this.firstPendingAt ??= now;
    if (this.timer) clearTimeout(this.timer);
    const delay = Math.max(0, Math.min(this.quietMs, this.firstPendingAt + this.capMs - now));
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.closed) return;
      // The quiet window has passed: apply the burst without a trailing re-check.
      this.ensureLoaded()
        .then(() => { if (this.hasPending()) this.flushPending(); })
        .catch((error) => this.logger.warn("AGENT_PACKAGE_DEFINITIONS_SETTLE_FAILED", error));
    }, delay);
    this.timer.unref?.();
  }

  private armTrailingTimer(): void {
    if (this.trailingTimer || this.closed) return;
    this.trailingTimer = setTimeout(() => {
      this.trailingTimer = null;
      const folders = new Map(this.trailingFolders);
      this.trailingFolders.clear();
      void this.enqueue(() => this.reloadBatch(folders, new Set(), new Set()));
    }, this.quietMs);
    this.trailingTimer.unref?.();
  }

  private hasPending(): boolean {
    return this.pendingFolders.size > 0 || this.pendingPackageFolders.size > 0 || this.pendingReconcile.size > 0;
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.firstPendingAt = null;
  }

  private flushPending(): void {
    const folders = new Map(this.pendingFolders);
    const packageFolders = new Set(this.pendingPackageFolders);
    const reconcile = new Set(this.pendingReconcile);
    this.pendingFolders.clear();
    this.pendingPackageFolders.clear();
    this.pendingReconcile.clear();
    this.clearTimer();
    void this.enqueue(() => this.reloadBatch(folders, packageFolders, reconcile));
  }

  private async rootContext(): Promise<RootContext> {
    const registered = [...this.options.listPackageRoots()];
    const context: RootContext = {
      registered,
      readable: [],
      registeredPaths: new Set(registered.map((root) => root.rootPath)),
      unavailable: new Map(),
    };
    for (const root of registered) {
      if (!await this.isRootPresent(root.rootPath)) {
        context.unavailable.set(root.rootPath, null);
        continue;
      }
      const unreadable = await kindFoldersUnreadableError(root);
      if (unreadable) this.markRootUnreadable(context, root, errorText(unreadable));
      else context.readable.push(root);
    }
    return context;
  }

  private markRootUnreadable(context: RootContext, root: RegisteredPackageRoot, reason: string): void {
    this.logger.warn(`AGENT_PACKAGE_DEFINITIONS_PACKAGE_FOLDER_UNREADABLE:${root.rootPath}: ${reason}`);
    context.unavailable.set(root.rootPath, reason);
    context.readable = context.readable.filter((candidate) => candidate.rootPath !== root.rootPath);
  }

  /** Definition folder IDs of one kind under the readable packages; a package that cannot be listed becomes unavailable. */
  private async listFolderIds(kind: AgentPackageDefinitionKind, roots: readonly RegisteredPackageRoot[], context: RootContext): Promise<string[]> {
    const ids: string[] = [];
    for (const root of roots) {
      try {
        ids.push(...await this.options.readers[kind].listFolderIds([root]));
      } catch (error) {
        this.markRootUnreadable(context, root, errorText(error));
      }
    }
    return ids;
  }

  /** Adds every definition folder the store knows of, or the package lists now, for one package folder. */
  private async addPackageTargets(rootPath: string, targets: Map<string, PendingFolder>, context: RootContext): Promise<void> {
    const store = this.options.store;
    for (const kind of AGENT_PACKAGE_DEFINITION_KINDS) {
      for (const folderId of store.folderIds(kind)) {
        if (store.folderLocation(kind, folderId)?.packageRoot === rootPath) {
          targets.set(folderKey(kind, folderId), { kind, folderId });
        }
      }
      const root = context.readable.find((candidate) => candidate.rootPath === rootPath);
      if (!root) continue;
      for (const folderId of await this.listFolderIds(kind, [root], context)) {
        targets.set(folderKey(kind, folderId), { kind, folderId });
      }
    }
  }

  private async reloadBatch(
    folders: ReadonlyMap<string, PendingFolder>,
    packageFolders: ReadonlySet<string>,
    reconcile: ReadonlySet<string>,
  ): Promise<void> {
    let context: RootContext;
    const targets = new Map(folders);
    try {
      context = await this.rootContext();
      for (const rootPath of new Set([...packageFolders, ...reconcile])) await this.addPackageTargets(rootPath, targets, context);
    } catch (error) {
      // Infrastructure failure: keep the work pending for the next read; reads keep the current store.
      for (const [key, folder] of folders) this.pendingFolders.set(key, folder);
      for (const rootPath of packageFolders) this.pendingPackageFolders.add(rootPath);
      for (const rootPath of reconcile) this.pendingReconcile.add(rootPath);
      this.logger.warn("AGENT_PACKAGE_DEFINITIONS_RELOAD_FAILED", error);
      return;
    }
    const changedKinds = new Set<AgentPackageDefinitionKind>();
    for (const { kind, folderId } of targets.values()) {
      if (await this.reloadFolder(kind, folderId, context)) changedKinds.add(kind);
    }
    if (changedKinds.size > 0 || packageFolders.size > 0) this.publish(listsAffectedBy(changedKinds, packageFolders.size > 0));
  }

  private async runFullReload(announce: boolean): Promise<void> {
    const store = this.options.store;
    const context = await this.rootContext();
    this.pendingFolders.clear();
    this.pendingPackageFolders.clear();
    this.pendingReconcile.clear();
    this.clearTimer();
    const idsByKind = new Map<AgentPackageDefinitionKind, Set<string>>();
    for (const kind of AGENT_PACKAGE_DEFINITION_KINDS) {
      idsByKind.set(kind, new Set<string>([
        ...store.folderIds(kind),
        ...await this.listFolderIds(kind, context.readable, context),
      ]));
    }
    // Listing is complete before any read, so every read sees the final readable packages.
    for (const [kind, ids] of idsByKind) {
      for (const folderId of ids) await this.reloadFolder(kind, folderId, context);
    }
    this.loaded = true;
    try {
      await this.registrationListener?.(context.registered);
    } catch (error) {
      this.logger.warn("AGENT_PACKAGE_DEFINITIONS_REGISTRATION_LISTENER_FAILED", error);
    }
    if (announce) this.publish(AGENT_PACKAGE_DEFINITION_LISTS);
  }

  private async reloadFolder(kind: AgentPackageDefinitionKind, folderId: string, context: RootContext): Promise<boolean> {
    const store = this.options.store;
    try {
      const location = store.folderLocation(kind, folderId);
      if (location && context.registeredPaths.has(location.packageRoot) && context.unavailable.has(location.packageRoot)) {
        return store.markSourceUnavailable(kind, folderId, context.unavailable.get(location.packageRoot) ?? null);
      }
      const read = await this.options.readers[kind].readFolder(folderId, {
        roots: context.readable,
        previousRoot: store.folderRootDefinition(kind, folderId) as never,
      });
      return store.apply(kind, folderId, read);
    } catch (error) {
      // An unexpected read failure keeps this folder as it is; other folders are unaffected.
      this.logger.warn(`AGENT_PACKAGE_DEFINITIONS_FOLDER_READ_FAILED:${kind}:${folderId}`, error);
      return false;
    }
  }

  private publish(changedLists: readonly AgentPackageDefinitionList[]): void {
    if (!this.publisher || changedLists.length === 0) return;
    try {
      this.publisher(changedLists);
    } catch (error) {
      this.logger.warn("AGENT_PACKAGE_DEFINITIONS_ANNOUNCE_FAILED", error);
    }
  }
}
