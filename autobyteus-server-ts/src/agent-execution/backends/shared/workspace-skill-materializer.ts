import syncFs from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Skill } from "../../../skills/domain/models.js";
import type { WorkspaceCollisionPolicy } from "./workspace-skill-collision-policy.js";
import {
  WorkspaceSkillLinks,
  type WorkspaceSkillFileSystem,
  type WorkspaceSkillSyncFileSystem,
  type WorkspaceSkillPathState,
} from "./workspace-skill-links.js";

export type WorkspaceSkillMaterializationProfile = { runtimeLabel: string; workspaceSkillsRootSegments: readonly string[] };

export type WorkspaceSkillReconciliationRequest =
  | { kind: "expose-resolved"; skill: Skill }
  | { kind: "reconcile-discoverable"; skill: Skill }
  | { kind: "reconcile-unresolved"; name: string };

/** One run's hold on a materialized workspace skill path. Release is keyed by `registryKey` + `holderId`. */
export type MaterializedWorkspaceSkill = {
  name: string;
  sourceRootPath: string;
  materializedRootPath: string;
  registryKey: string;
  holderId: number;
};

export type WorkspaceSkillMaterializationResult = {
  materializedSkills: MaterializedWorkspaceSkill[];
  effectiveRequests: WorkspaceSkillReconciliationRequest[];
};
type WorkspaceSkillMaterializerOptions = {
  logger?: { warn: (...args: unknown[]) => void };
  fileSystem?: Partial<WorkspaceSkillFileSystem>;
  syncFileSystem?: Partial<WorkspaceSkillSyncFileSystem>;
  resolveManagedSkill?: (sourceId: string, name: string) => Skill | null;
};

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

/** `workspace-owned`: a user-owned entry occupies the path (Rule 1); the collision policy decides. */
type AcquisitionOutcome = { kind: "ready" } | { kind: "absent" } | { kind: "workspace-owned"; error: Error };

type EntryIdentity = { name: string; managedSourceId: string | null; generation: string | null };

type AcquiringRegistryEntry = EntryIdentity & { phase: "acquiring"; sourceRootPath: string; holders: Set<number>; claimWhenAvailable: boolean; readiness: Promise<AcquisitionOutcome> };

type ReadyRegistryEntry = EntryIdentity & { phase: "ready"; sourceRootPath: string; holders: Set<number> };

type TransferringRegistryEntry = EntryIdentity & { phase: "transferring"; sourceRootPath: string; holders: Set<number>; readiness: Promise<void> };

type ReleasingRegistryEntry = { phase: "releasing"; sourceRootPath: string; holderId: number; cleanup: Promise<void> | null };

type WorkspaceSkillRegistryEntry = AcquiringRegistryEntry | ReadyRegistryEntry | ReleasingRegistryEntry | TransferringRegistryEntry;

type ResolvedRequest = Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>;

type AcquisitionTarget = {
  runId: string; collisionPolicy: WorkspaceCollisionPolicy; request: ResolvedRequest;
  sourceRootPath: string; materializedRootPath: string; registryKey: string;
  onAcquired?: (descriptor: MaterializedWorkspaceSkill) => void;
};

type Disposition = "repaired" | "removed-and-skipped" | "skipped" | "skipped-workspace-owned";

const defaultLogger = { warn: (...args: unknown[]) => console.warn(...args) };

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const sanitizeDirectorySegment = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

/**
 * Process-wide owner of materialized workspace skill links for one runtime profile. The registry
 * is the authority for each path and its occurrence holders. Unmanaged roots retain hard source
 * collisions. Managed generations may advance only for the same catalog-trusted source ID and
 * exact name; the shared link is changed lazily for a later run, never by source publication.
 */
export class WorkspaceSkillMaterializer {
  private readonly registry = new Map<string, WorkspaceSkillRegistryEntry>();
  private readonly logger: NonNullable<WorkspaceSkillMaterializerOptions["logger"]>;
  private readonly links: WorkspaceSkillLinks;
  private nextHolderId = 0;
  private readonly releasedHolders = new Set<number>();

  constructor(private readonly profile: WorkspaceSkillMaterializationProfile,
    private readonly options: WorkspaceSkillMaterializerOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.links = new WorkspaceSkillLinks(profile.runtimeLabel, {
      lstat: options.fileSystem?.lstat ?? fs.lstat, readlink: options.fileSystem?.readlink ?? fs.readlink,
      stat: options.fileSystem?.stat ?? fs.stat, realpath: options.fileSystem?.realpath ?? fs.realpath,
      mkdir: options.fileSystem?.mkdir ?? fs.mkdir, symlink: options.fileSystem?.symlink ?? fs.symlink,
      unlink: options.fileSystem?.unlink ?? fs.unlink,
    }, { ...syncFs, ...options.syncFileSystem });
  }

  async materializeConfiguredWorkspaceSkills(options: {
    runId: string;
    workingDirectory: string;
    onAcquired?: (descriptor: MaterializedWorkspaceSkill) => void;
    assertAccepting?: () => void;
    requests?: WorkspaceSkillReconciliationRequest[] | null;
    /** From `SkillService.resolveSkillScope` via `workspaceCollisionPolicyForScope`. */
    workspaceCollisionPolicy: WorkspaceCollisionPolicy;
  }): Promise<WorkspaceSkillMaterializationResult> {
    const requests = options.requests ?? [];
    const acquired: MaterializedWorkspaceSkill[] = [];
    const receipts: MaterializedWorkspaceSkill[] = [];
    const effectiveRequests: WorkspaceSkillReconciliationRequest[] = [];
    const onAcquired = (descriptor: MaterializedWorkspaceSkill) => {
      receipts.push(descriptor); options.onAcquired?.(descriptor);
    };
    try {
      for (const request of requests) {
        options.assertAccepting?.();
        if (request.kind !== "reconcile-unresolved" && request.skill.managedSource) {
          const result = await this.acquireManaged({ ...options, onAcquired }, request);
          effectiveRequests.push(result.request);
          if (result.descriptor) acquired.push(result.descriptor);
          options.assertAccepting?.();
          continue;
        }
        effectiveRequests.push(request);
        const descriptor = request.kind === "reconcile-unresolved"
          ? await this.reconcileUnresolved(options.runId, options.workingDirectory, request.name)
          : await this.acquireResolved({ ...this.targetFor(options.runId, options.workingDirectory, request, options.workspaceCollisionPolicy), onAcquired });
        if (descriptor) acquired.push(descriptor);
        options.assertAccepting?.();
      }
      return { materializedSkills: acquired, effectiveRequests };
    } catch (originalError) {
      const failures: unknown[] = [];
      for (const descriptor of [...receipts].reverse()) {
        try { await this.releaseMaterializedSkill(descriptor, options.runId); }
        catch (error) { failures.push(error); }
      }
      if (failures.length) throw new AggregateError([originalError, ...failures], "Workspace skill acquisition and rollback failed.");
      throw originalError;
    }
  }

  async cleanupMaterializedWorkspaceSkills(
    materializedSkills: MaterializedWorkspaceSkill[] | null | undefined): Promise<void> {
    const errors: unknown[] = [];
    for (const descriptor of materializedSkills ?? []) {
      try { await this.releaseMaterializedSkill(descriptor); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Workspace skill release failed.");
  }

  private buildMaterializedRootPath(workingDirectory: string, skillName: string): string {
    return path.join(workingDirectory, ...this.profile.workspaceSkillsRootSegments,
      sanitizeDirectorySegment(skillName));
  }

  private targetFor(runId: string, workingDirectory: string, request: ResolvedRequest,
    collisionPolicy: WorkspaceCollisionPolicy): AcquisitionTarget {
    const materializedRootPath = this.buildMaterializedRootPath(workingDirectory, request.skill.name);
    return { runId, collisionPolicy, request, sourceRootPath: path.resolve(request.skill.rootPath),
      materializedRootPath, registryKey: path.resolve(materializedRootPath) };
  }

  private async acquireResolved(target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    while (true) {
      const existing = this.registry.get(target.registryKey);
      if (existing?.phase === "releasing") {
        if (!existing.cleanup) throw new Error(`Workspace skill cleanup remains failed at '${target.registryKey}'.`);
        await existing.cleanup;
        continue;
      }
      if (!existing) return this.startAcquisition(target);
      if (existing.sourceRootPath !== target.sourceRootPath || existing.name !== target.request.skill.name || existing.managedSourceId) {
        throw this.links.sourceCollisionError(target.request.skill.name, target.materializedRootPath,
          existing.sourceRootPath, target.sourceRootPath);
      }
      if (existing.phase === "transferring") { await existing.readiness; continue; }
      return this.joinHolders(existing, target);
    }
  }

  private async acquireManaged(
    options: { runId: string; workingDirectory: string; workspaceCollisionPolicy: WorkspaceCollisionPolicy;
      assertAccepting?: () => void; onAcquired(descriptor: MaterializedWorkspaceSkill): void },
    original: ResolvedRequest,
  ): Promise<{ descriptor: MaterializedWorkspaceSkill | null; request: WorkspaceSkillReconciliationRequest }> {
    const identity = original.skill.managedSource!;
    const resolve = () => {
      const skill = this.options.resolveManagedSkill?.(identity.sourceId, original.skill.name);
      return skill?.name === original.skill.name && skill.managedSource?.sourceId === identity.sourceId ? skill : null;
    };
    while (true) {
      options.assertAccepting?.();
      const skill = resolve();
      if (!skill) {
        await this.reconcileUnresolved(options.runId, options.workingDirectory, original.skill.name);
        return { descriptor: null, request: { kind: "reconcile-unresolved", name: original.skill.name } };
      }
      const request: ResolvedRequest = { kind: skill.rootPath === original.skill.rootPath ? original.kind : "expose-resolved", skill };
      const target = this.targetFor(options.runId, options.workingDirectory, request, options.workspaceCollisionPolicy);
      const existing = this.registry.get(target.registryKey);
      if (existing?.phase === "releasing") {
        if (!existing.cleanup) throw new Error(`Workspace skill cleanup remains failed at '${target.registryKey}'.`);
        await existing.cleanup; continue;
      }
      if (existing && (existing.name !== skill.name || existing.managedSourceId !== identity.sourceId)) {
        throw this.links.sourceCollisionError(skill.name, target.materializedRootPath, existing.sourceRootPath, skill.rootPath);
      }
      if (existing?.phase === "acquiring" || existing?.phase === "transferring") {
        await existing.readiness.catch(() => undefined);
        continue;
      }
      const deferred = createDeferred<void>();
      // Attach a handler even with no waiting callers: failures must not become unhandled rejections.
      void deferred.promise.catch(() => undefined);
      const transition: TransferringRegistryEntry = {
        phase: "transferring", name: skill.name, managedSourceId: identity.sourceId, generation: existing?.generation ?? skill.managedSource!.generation,
        sourceRootPath: existing?.sourceRootPath ?? target.sourceRootPath,
        holders: existing?.holders ?? new Set(), readiness: deferred.promise,
      };
      this.registry.set(target.registryKey, transition);
      try {
        await fs.mkdir(path.dirname(target.materializedRootPath), { recursive: true });
        await this.links.hasValidSkillManifest(target.sourceRootPath);
        options.assertAccepting?.();
        // No await from authority revalidation through link swap and holder publication.
        const current = resolve();
        if (!current || current.rootPath !== skill.rootPath || current.managedSource?.generation !== skill.managedSource?.generation) {
          await this.restoreManagedEntry(target.registryKey, transition, existing, options.onAcquired);
          deferred.resolve();
          continue;
        }
        let owned: boolean;
        try {
          owned = this.links.replaceOwnedLinkSync(target.materializedRootPath, existing?.sourceRootPath ?? null,
            target.sourceRootPath, skill.name, Boolean(existing) || request.kind === "expose-resolved");
        } catch (error) {
          if (target.collisionPolicy !== "prefer_workspace" || !(error instanceof Error) || !error.message.startsWith("Workspace skill path collision")) throw error;
          await this.restoreManagedEntry(target.registryKey, transition, existing, options.onAcquired);
          deferred.resolve();
          return { descriptor: null, request };
        }
        if (!owned) {
          this.registry.delete(target.registryKey);
          deferred.resolve();
          return { descriptor: null, request };
        }
        const holder = this.addHolder(transition.holders);
        this.registry.set(target.registryKey, { phase: "ready", name: skill.name, managedSourceId: identity.sourceId, generation: skill.managedSource!.generation,
          sourceRootPath: target.sourceRootPath, holders: transition.holders });
        deferred.resolve();
        const descriptor = this.descriptorFor(target, holder);
        options.onAcquired(descriptor);
        return { descriptor, request };
      } catch (error) {
        let failure = error;
        if (this.registry.get(target.registryKey) === transition) {
          try { await this.restoreManagedEntry(target.registryKey, transition, existing, options.onAcquired); }
          catch (cleanupError) { failure = new AggregateError([error, cleanupError], "Managed skill transfer and rollback failed."); }
        }
        deferred.reject(failure);
        throw failure;
      }
    }
  }

  private async restoreManagedEntry(key: string, transition: TransferringRegistryEntry, previous: ReadyRegistryEntry | undefined,
    onAcquired: (descriptor: MaterializedWorkspaceSkill) => void): Promise<void> {
    if (!previous) { this.registry.delete(key); return; }
    this.registry.set(key, previous);
    if (!transition.holders.size) {
      // Route zero-holder restoration through normal cleanup, which uses the entry's current root.
      const holderId = this.addHolder(previous.holders);
      const descriptor = { name: previous.name, registryKey: key, holderId,
        sourceRootPath: previous.sourceRootPath, materializedRootPath: key };
      onAcquired(descriptor);
      await this.releaseMaterializedSkill(descriptor);
    }
  }

  private startAcquisition(target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    const deferred = createDeferred<AcquisitionOutcome>();
    const holders = new Set<number>();
    const holderId = this.addHolder(holders);
    const acquiring: AcquiringRegistryEntry = { name: target.request.skill.name, managedSourceId: null, generation: null, phase: "acquiring", sourceRootPath: target.sourceRootPath,
      holders, claimWhenAvailable: target.request.kind === "expose-resolved", readiness: deferred.promise };
    this.registry.set(target.registryKey, acquiring);
    target.onAcquired?.(this.descriptorFor(target, holderId));
    void this.completeAcquisition(target, acquiring, deferred);
    return this.descriptorForOutcome(deferred.promise, target, holderId);
  }

  private joinHolders(existing: AcquiringRegistryEntry | ReadyRegistryEntry,
    target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    const holderId = this.addHolder(existing.holders);
    target.onAcquired?.(this.descriptorFor(target, holderId));
    if (existing.phase === "ready") return Promise.resolve(this.descriptorFor(target, holderId));
    if (target.request.kind === "expose-resolved") existing.claimWhenAvailable = true;
    return this.descriptorForOutcome(existing.readiness, target, holderId);
  }

  private async completeAcquisition(target: AcquisitionTarget, acquiring: AcquiringRegistryEntry,
    deferred: Deferred<AcquisitionOutcome>): Promise<void> {
    try {
      const outcome = await this.reconcileResolved(target, acquiring);
      if (this.registry.get(target.registryKey) !== acquiring) {
        throw new Error(`Workspace skill acquisition registry changed unexpectedly for '${target.materializedRootPath}'.`);
      }
      if (outcome.kind === "ready") {
        this.registry.set(target.registryKey, { name: acquiring.name, managedSourceId: null, generation: null, phase: "ready", sourceRootPath: target.sourceRootPath, holders: acquiring.holders });
      } else {
        for (const holderId of acquiring.holders) this.releasedHolders.add(holderId);
        this.registry.delete(target.registryKey);
      }
      deferred.resolve(outcome);
    } catch (error) {
      if (this.registry.get(target.registryKey) === acquiring) {
        this.registry.set(target.registryKey, { phase: "ready", name: acquiring.name, managedSourceId: null, generation: null,
          sourceRootPath: target.sourceRootPath, holders: acquiring.holders });
      }
      deferred.reject(error);
    }
  }

  private async descriptorForOutcome(readiness: Promise<AcquisitionOutcome>, target: AcquisitionTarget,
    holderId: number): Promise<MaterializedWorkspaceSkill | null> {
    const outcome = await readiness;
    if (outcome.kind === "ready") return this.descriptorFor(target, holderId);
    if (outcome.kind === "workspace-owned") {
      // Rule 1: a configured request fails fast; an all-installed request leaves the user's entry.
      if (target.collisionPolicy === "fail") throw outcome.error;
      this.warnDisposition(target, null, "skipped-workspace-owned");
    }
    return null;
  }

  private async reconcileResolved(target: AcquisitionTarget, acquiring: AcquiringRegistryEntry): Promise<AcquisitionOutcome> {
    const skillName = target.request.skill.name;
    const sourceAvailable = await this.links.hasValidSkillManifest(target.sourceRootPath);
    let state = await this.links.inspectPath(target.materializedRootPath, target.sourceRootPath);
    if (!sourceAvailable) {
      await this.reconcileUnavailable(target.runId, skillName, target.materializedRootPath, target.sourceRootPath, state);
      return { kind: "absent" };
    }

    let observedBrokenTarget: string | null = null;
    for (let reclassificationCount = 0; reclassificationCount <= 1; reclassificationCount += 1) {
      if (state.kind === "broken-symlink") {
        observedBrokenTarget ??= state.resolvedTargetPath;
        if (!(await this.links.unlinkBrokenLinkIfStillMatching(target.materializedRootPath, state))) {
          state = await this.links.inspectPath(target.materializedRootPath, target.sourceRootPath);
          continue;
        }
        await this.links.createOrAcceptSameSourceLink(target.materializedRootPath, target.sourceRootPath, skillName);
        this.warnDisposition(target, observedBrokenTarget, "repaired");
        return { kind: "ready" };
      }
      if (state.kind === "missing") {
        if (!acquiring.claimWhenAvailable) return { kind: "absent" };
        await this.links.createOrAcceptSameSourceLink(target.materializedRootPath, target.sourceRootPath, skillName);
        return { kind: "ready" };
      }
      if (state.kind === "same-source-symlink") {
        return acquiring.claimWhenAvailable ? { kind: "ready" } : { kind: "absent" };
      }
      // A non-symlink or a link the registry does not own: the workspace owns this name.
      return { kind: "workspace-owned",
        error: this.links.pathStateCollisionError(skillName, target.materializedRootPath, target.sourceRootPath, state) };
    }
    throw new Error(`Workspace skill path '${target.materializedRootPath}' changed repeatedly during broken-link repair.`);
  }

  private addHolder(holders: Set<number>): number {
    this.nextHolderId += 1;
    holders.add(this.nextHolderId);
    return this.nextHolderId;
  }

  private descriptorFor(target: AcquisitionTarget, holderId: number): MaterializedWorkspaceSkill {
    return {
      name: target.request.skill.name,
      sourceRootPath: target.sourceRootPath,
      materializedRootPath: target.materializedRootPath,
      registryKey: target.registryKey,
      holderId,
    };
  }

  private async reconcileUnresolved(
    runId: string,
    workingDirectory: string,
    skillName: string,
  ): Promise<null> {
    const materializedRootPath = this.buildMaterializedRootPath(workingDirectory, skillName);
    const registryKey = path.resolve(materializedRootPath);
    while (true) {
      const existing = this.registry.get(registryKey);
      if (existing?.phase === "releasing") {
        if (!existing.cleanup) throw new Error(`Workspace skill cleanup remains failed at '${registryKey}'.`);
        await existing.cleanup;
        continue;
      }
      if (existing?.phase === "acquiring" || existing?.phase === "transferring") {
        await existing.readiness.catch(() => null);
        continue;
      }
      return this.reconcileUnavailable(runId, skillName, materializedRootPath, null);
    }
  }

  private async reconcileUnavailable(runId: string, skillName: string,
    materializedRootPath: string, sourceRootPath: string | null,
    initialState?: WorkspaceSkillPathState): Promise<null> {
    const log = { runId, request: { skill: { name: skillName } }, materializedRootPath, sourceRootPath };
    let state = initialState ?? await this.links.inspectPath(materializedRootPath, sourceRootPath);
    for (let reclassificationCount = 0; reclassificationCount <= 1; reclassificationCount += 1) {
      if (state.kind === "missing" || state.kind === "same-source-symlink") {
        this.warnDisposition(log, state.kind === "same-source-symlink" ? state.resolvedTargetPath : null, "skipped");
        return null;
      }
      if (state.kind === "broken-symlink") {
        if (!(await this.links.unlinkBrokenLinkIfStillMatching(materializedRootPath, state))) {
          state = await this.links.inspectPath(materializedRootPath, sourceRootPath);
          continue;
        }
        this.warnDisposition(log, state.resolvedTargetPath, "removed-and-skipped");
        return null;
      }
      throw this.links.pathStateCollisionError(skillName, materializedRootPath, sourceRootPath, state);
    }
    throw new Error(`Workspace skill path '${materializedRootPath}' changed repeatedly during unavailable-source reconciliation.`);
  }

  /**
   * Releases one holder. The holder is removed from the registry entry, and the link is removed
   * only when no holder remains and it still points at the entry's source.
   */
  private async releaseMaterializedSkill(descriptor: MaterializedWorkspaceSkill, rollbackRunId?: string): Promise<void> {
    if (this.releasedHolders.has(descriptor.holderId)) return;
    let entry = this.registry.get(descriptor.registryKey);
    if (!entry) throw new Error("Workspace skill exact holder release proof is unavailable.");
    if (entry.phase === "transferring") {
      // A later acquisition owns the pending link transfer, not this released run.
      // Its failure path owns zero-holder cleanup; do not wait on another Task.
      if (!entry.holders.delete(descriptor.holderId)) throw new Error("Workspace skill holder was not acquired by this receipt.");
      this.releasedHolders.add(descriptor.holderId);
      return;
    }
    if (entry.phase === "acquiring") {
      await entry.readiness.catch(() => undefined);
      entry = this.registry.get(descriptor.registryKey);
      if (!entry) { if (this.releasedHolders.has(descriptor.holderId)) return; throw new Error("Workspace skill holder authority disappeared."); }
    }
    // Managed source publication transfers this path's existing holders to the
    // catalog-trusted generation. The exact holder, not its old source path,
    // owns release; never unlink the newly shared generation while others hold it.
    if (entry.phase !== "releasing" && !entry.managedSourceId && entry.sourceRootPath !== descriptor.sourceRootPath) {
      throw new Error("Workspace skill release generation mismatch.");
    }
    let releasing: ReleasingRegistryEntry;
    if (entry.phase === "releasing") {
      if (entry.holderId !== descriptor.holderId) throw new Error("Workspace skill release holder mismatch.");
      if (entry.cleanup) return entry.cleanup;
      releasing = entry;
    } else {
      if (!entry.holders.delete(descriptor.holderId)) throw new Error("Workspace skill holder was not acquired by this receipt.");
      if (entry.holders.size > 0) { this.releasedHolders.add(descriptor.holderId); return; }
      releasing = { phase: "releasing", sourceRootPath: entry.sourceRootPath, holderId: descriptor.holderId, cleanup: null };
      this.registry.set(descriptor.registryKey, releasing);
    }
    const cleanup = this.links.removeLinkToSource(descriptor.registryKey, releasing.sourceRootPath);
    releasing.cleanup = cleanup;
    try {
      await cleanup;
      if (this.registry.get(descriptor.registryKey) === releasing) this.registry.delete(descriptor.registryKey);
      this.releasedHolders.add(descriptor.holderId);
    } finally { if (releasing.cleanup === cleanup) releasing.cleanup = null; }
  }

  private warnDisposition(
    target: { runId: string; request: { skill: { name: string } }; materializedRootPath: string; sourceRootPath: string | null },
    previousTarget: string | null,
    disposition: Disposition,
  ): void {
    this.logger.warn(
      `${this.profile.runtimeLabel} workspace skill reconciliation: run='${target.runId}', skill='${target.request.skill.name}', path='${target.materializedRootPath}', previousTarget='${previousTarget ?? "none"}', currentSource='${target.sourceRootPath ?? "none"}', disposition='${disposition}'.`,
    );
  }
}
