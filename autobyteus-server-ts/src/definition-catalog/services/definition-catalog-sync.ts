import fs from "node:fs/promises";
import {
  DEFINITION_SUBJECTS,
  type DefinitionCatalogChangeSubject,
  type DefinitionSourceReaders,
  type DefinitionSubject,
  type RegisteredPackageRoot,
} from "../domain/definition-catalog-types.js";
import type { DefinitionCatalog } from "./definition-catalog.js";

export const DEFAULT_SETTLE_QUIET_MS = 1000;
export const DEFAULT_SETTLE_CAP_MS = 3000;

export type DefinitionCatalogPublisher = (subjects: readonly DefinitionCatalogChangeSubject[]) => void;
export type DefinitionRootRegistrationListener = (roots: readonly RegisteredPackageRoot[]) => Promise<void> | void;

export type DefinitionCatalogSyncOptions = Readonly<{
  catalog: DefinitionCatalog;
  readers: DefinitionSourceReaders;
  /** Every registered package root in precedence order, present or not. */
  listPackageRoots: () => readonly RegisteredPackageRoot[];
  settleQuietMs?: number;
  settleCapMs?: number;
  isRootPresent?: (rootPath: string) => Promise<boolean>;
  logger?: Pick<Console, "warn">;
}>;

const ALL_CHANGE_SUBJECTS: readonly DefinitionCatalogChangeSubject[] = Object.freeze([
  "agent", "agent_team", "agent_org", "agent_package",
]);

/**
 * Dependency-aware publication: team and org availability depends on agents, orgs reference
 * teams, and team-local agents are listed with the agents.
 */
export const expandChangedSubjects = (
  changed: Iterable<DefinitionSubject>,
  rootsChanged: boolean,
): DefinitionCatalogChangeSubject[] => {
  const output = new Set<DefinitionCatalogChangeSubject>();
  for (const subject of changed) {
    output.add(subject);
    if (subject === "agent") { output.add("agent_team"); output.add("agent_org"); }
    if (subject === "agent_team") { output.add("agent_org"); output.add("agent"); }
  }
  if (rootsChanged) output.add("agent_package");
  return ALL_CHANGE_SUBJECTS.filter((subject) => output.has(subject));
};

const unitKey = (subject: DefinitionSubject, unitId: string): string => `${subject}\u0000${unitId}`;

const defaultIsRootPresent = async (rootPath: string): Promise<boolean> =>
  fs.stat(rootPath).then((stats) => stats.isDirectory()).catch(() => false);

/**
 * The registered roots of one reconcile. `readable` roots are present and listable; every other
 * registered root is in `unavailable` with the reason (missing, or unreadable), and its units keep
 * their last loaded version (DEC-005) while other roots reconcile normally.
 */
type RootContext = {
  registered: readonly RegisteredPackageRoot[];
  readable: RegisteredPackageRoot[];
  registeredPaths: ReadonlySet<string>;
  unavailable: Map<string, string | null>;
};

const errorText = (error: unknown): string => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return code && !message.includes(code) ? `${code}: ${message}` : message;
};

/** Null when every existing kind folder of the root can be listed; otherwise why it cannot. */
const kindDirsUnreadableReason = async (root: RegisteredPackageRoot): Promise<string | null> => {
  for (const kindDir of Object.values(root.kindDirs)) {
    try {
      await fs.readdir(kindDir);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") return errorText(error);
    }
  }
  return null;
};

type PendingUnit = Readonly<{ subject: DefinitionSubject; unitId: string }>;

/**
 * The only writer of the definition catalog. It owns initial population, the pending change set
 * and its settle window, the serialized reconcile queue, full reconciles and publication.
 * Any read first calls `settle()`, which applies every detected change before answering.
 */
export class DefinitionCatalogSync {
  private readonly quietMs: number;
  private readonly capMs: number;
  private readonly isRootPresent: (rootPath: string) => Promise<boolean>;
  private readonly logger: Pick<Console, "warn">;
  private populated = false;
  private populatePromise: Promise<void> | null = null;
  private readonly pendingUnits = new Map<string, PendingUnit>();
  private readonly pendingRoots = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private firstPendingAt: number | null = null;
  /** Units a read applied early; re-read once after the quiet window (see `settle`). */
  private readonly trailingUnits = new Map<string, PendingUnit>();
  private trailingTimer: NodeJS.Timeout | null = null;
  private tail: Promise<void> = Promise.resolve();
  private queuedReload: Promise<void> | null = null;
  private publisher: DefinitionCatalogPublisher | null = null;
  private registrationListener: DefinitionRootRegistrationListener | null = null;
  private closed = false;

  constructor(private readonly options: DefinitionCatalogSyncOptions) {
    this.quietMs = options.settleQuietMs ?? DEFAULT_SETTLE_QUIET_MS;
    this.capMs = Math.max(options.settleCapMs ?? DEFAULT_SETTLE_CAP_MS, this.quietMs);
    this.isRootPresent = options.isRootPresent ?? defaultIsRootPresent;
    this.logger = options.logger ?? console;
  }

  setPublisher(publisher: DefinitionCatalogPublisher | null): void {
    this.publisher = publisher;
  }

  /** Called after every full reconcile with the registered roots (the studio monitor re-syncs its watches). */
  setRegistrationListener(listener: DefinitionRootRegistrationListener | null): void {
    this.registrationListener = listener;
  }

  listPackageRoots(): readonly RegisteredPackageRoot[] {
    return this.options.listPackageRoots();
  }

  noteUnitChange(subject: DefinitionSubject, unitId: string): void {
    if (this.closed) return;
    this.pendingUnits.set(unitKey(subject, unitId), Object.freeze({ subject, unitId }));
    this.armTimer();
  }

  /** A root appeared, disappeared, was replaced or changed watch status: reconcile all of its units. */
  noteRootChanged(rootPath: string): void {
    if (this.closed) return;
    this.pendingRoots.add(rootPath);
    this.armTimer();
  }

  /**
   * Applies every pending change (and the initial population) before a read answers. A read can
   * apply a change while its file is still being written, and the watcher may report that write
   * only once (it drops a second change event for the same file within a few milliseconds), so
   * units applied early are re-read once after the quiet window.
   */
  async settle(): Promise<void> {
    await this.ensurePopulated();
    if (this.pendingUnits.size > 0 || this.pendingRoots.size > 0) {
      for (const [key, unit] of this.pendingUnits) this.trailingUnits.set(key, unit);
      this.flushPending();
      this.armTrailingTimer();
    }
    await this.tail;
  }

  /** Full reconcile of every registered root and application-owned list entry, then publication. */
  reloadAll(): Promise<void> {
    if (this.queuedReload) return this.queuedReload;
    const run = this.enqueue(async () => {
      this.queuedReload = null;
      await this.runFullReconcile(true);
    });
    this.queuedReload = run;
    return run;
  }

  /** Reconciles the given units now (in-app writes), then publishes what changed. */
  async reconcileNow(subject: DefinitionSubject, unitIds: readonly string[]): Promise<void> {
    await this.ensurePopulated();
    const units = new Map<string, PendingUnit>();
    for (const unitId of unitIds) {
      const key = unitKey(subject, unitId);
      this.pendingUnits.delete(key);
      units.set(key, Object.freeze({ subject, unitId }));
    }
    await this.enqueue(() => this.reconcileBatch(units, new Set()));
  }

  close(): void {
    this.closed = true;
    this.clearTimer();
    if (this.trailingTimer) clearTimeout(this.trailingTimer);
    this.trailingTimer = null;
    this.trailingUnits.clear();
    this.publisher = null;
    this.registrationListener = null;
  }

  private ensurePopulated(): Promise<void> {
    if (this.populated) return Promise.resolve();
    if (!this.populatePromise) {
      const run = this.enqueue(async () => {
        if (!this.populated) await this.runFullReconcile(false);
      });
      this.populatePromise = run;
      run.catch(() => {
        // A failed population is not cached; the next read retries it.
        if (this.populatePromise === run) this.populatePromise = null;
      });
    }
    return this.populatePromise;
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
      this.ensurePopulated()
        .then(() => { if (this.pendingUnits.size > 0 || this.pendingRoots.size > 0) this.flushPending(); })
        .catch((error) => this.logger.warn("DEFINITION_CATALOG_SETTLE_FAILED", error));
    }, delay);
    this.timer.unref?.();
  }

  private armTrailingTimer(): void {
    if (this.trailingTimer || this.closed) return;
    this.trailingTimer = setTimeout(() => {
      this.trailingTimer = null;
      const units = new Map(this.trailingUnits);
      this.trailingUnits.clear();
      void this.enqueue(() => this.reconcileBatch(units, new Set()));
    }, this.quietMs);
    this.trailingTimer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.firstPendingAt = null;
  }

  private flushPending(): void {
    const units = new Map(this.pendingUnits);
    const roots = new Set(this.pendingRoots);
    this.pendingUnits.clear();
    this.pendingRoots.clear();
    this.clearTimer();
    void this.enqueue(() => this.reconcileBatch(units, roots));
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
      const unreadable = await kindDirsUnreadableReason(root);
      if (unreadable) this.markRootUnreadable(context, root, unreadable);
      else context.readable.push(root);
    }
    return context;
  }

  private markRootUnreadable(context: RootContext, root: RegisteredPackageRoot, reason: string): void {
    this.logger.warn(`DEFINITION_CATALOG_ROOT_UNREADABLE:${root.rootPath}: ${reason}`);
    context.unavailable.set(root.rootPath, reason);
    context.readable = context.readable.filter((candidate) => candidate.rootPath !== root.rootPath);
  }

  /** Unit IDs of one subject under the readable roots; a root that cannot be listed becomes unavailable. */
  private async enumerateUnits(subject: DefinitionSubject, roots: readonly RegisteredPackageRoot[], context: RootContext): Promise<string[]> {
    const ids: string[] = [];
    for (const root of roots) {
      try {
        ids.push(...await this.options.readers[subject].listUnitIds([root]));
      } catch (error) {
        this.markRootUnreadable(context, root, errorText(error));
      }
    }
    return ids;
  }

  private async reconcileBatch(units: ReadonlyMap<string, PendingUnit>, roots: ReadonlySet<string>): Promise<void> {
    let context: RootContext;
    const targets = new Map(units);
    try {
      context = await this.rootContext();
      for (const rootPath of roots) {
        for (const subject of DEFINITION_SUBJECTS) {
          for (const unitId of this.options.catalog.unitIds(subject)) {
            if (this.options.catalog.unitLocation(subject, unitId)?.packageRoot === rootPath) {
              targets.set(unitKey(subject, unitId), { subject, unitId });
            }
          }
          const root = context.readable.find((candidate) => candidate.rootPath === rootPath);
          if (!root) continue;
          for (const unitId of await this.enumerateUnits(subject, [root], context)) {
            targets.set(unitKey(subject, unitId), { subject, unitId });
          }
        }
      }
    } catch (error) {
      // Infrastructure failure: keep the work pending for the next settle; reads keep the current catalog.
      for (const [key, unit] of units) this.pendingUnits.set(key, unit);
      for (const rootPath of roots) this.pendingRoots.add(rootPath);
      this.logger.warn("DEFINITION_CATALOG_RECONCILE_FAILED", error);
      return;
    }
    const changed = new Set<DefinitionSubject>();
    for (const { subject, unitId } of targets.values()) {
      if (await this.reconcileUnit(subject, unitId, context)) changed.add(subject);
    }
    if (changed.size > 0 || roots.size > 0) this.publish(expandChangedSubjects(changed, roots.size > 0));
  }

  private async runFullReconcile(publish: boolean): Promise<void> {
    const context = await this.rootContext();
    this.pendingUnits.clear();
    this.pendingRoots.clear();
    this.clearTimer();
    const idsBySubject = new Map<DefinitionSubject, Set<string>>();
    for (const subject of DEFINITION_SUBJECTS) {
      idsBySubject.set(subject, new Set<string>([
        ...this.options.catalog.unitIds(subject),
        ...await this.enumerateUnits(subject, context.readable, context),
        ...await this.listApplicationOwnedUnitIds(subject),
      ]));
    }
    // Enumeration is complete before any read, so every read sees the final readable roots.
    for (const [subject, ids] of idsBySubject) {
      for (const unitId of ids) await this.reconcileUnit(subject, unitId, context);
    }
    this.populated = true;
    try {
      await this.registrationListener?.(context.registered);
    } catch (error) {
      this.logger.warn("DEFINITION_CATALOG_REGISTRATION_LISTENER_FAILED", error);
    }
    if (publish) this.publish(ALL_CHANGE_SUBJECTS);
  }

  private async listApplicationOwnedUnitIds(subject: DefinitionSubject): Promise<readonly string[]> {
    try {
      return await this.options.readers[subject].listApplicationOwnedUnitIds();
    } catch (error) {
      // Application-owned list entries keep their current state; package roots are unaffected.
      this.logger.warn(`DEFINITION_CATALOG_APPLICATION_SOURCES_FAILED:${subject}`, error);
      return this.options.catalog.unitIds(subject)
        .filter((unitId) => this.options.catalog.unitLocation(subject, unitId)?.fromRegisteredRoot === false);
    }
  }

  private async reconcileUnit(subject: DefinitionSubject, unitId: string, context: RootContext): Promise<boolean> {
    const catalog = this.options.catalog;
    try {
      const location = catalog.unitLocation(subject, unitId);
      if (location?.fromRegisteredRoot
        && context.registeredPaths.has(location.packageRoot)
        && context.unavailable.has(location.packageRoot)) {
        return catalog.markSourceUnavailable(subject, unitId, context.unavailable.get(location.packageRoot) ?? null);
      }
      const outcome = await this.options.readers[subject].readUnit(unitId, {
        roots: context.readable,
        previousRoot: catalog.unitRootDefinition(subject, unitId) as never,
      });
      return catalog.apply(subject, unitId, outcome);
    } catch (error) {
      // An unexpected read failure keeps this unit as it is; other units are unaffected.
      this.logger.warn(`DEFINITION_CATALOG_UNIT_READ_FAILED:${subject}:${unitId}`, error);
      return false;
    }
  }

  private publish(subjects: readonly DefinitionCatalogChangeSubject[]): void {
    if (!this.publisher || subjects.length === 0) return;
    try {
      this.publisher(subjects);
    } catch (error) {
      this.logger.warn("DEFINITION_CATALOG_PUBLISH_FAILED", error);
    }
  }
}
