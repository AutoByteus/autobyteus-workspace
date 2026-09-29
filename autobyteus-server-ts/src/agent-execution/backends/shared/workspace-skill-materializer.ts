import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../skills/domain/models.js";
import { isWeakSkillRequest, type SkillRequestStrength } from "./skill-request-strength.js";
import {
  WorkspaceSkillLinks,
  type WorkspaceSkillFileSystem,
  type WorkspaceSkillPathState,
} from "./workspace-skill-links.js";

export type WorkspaceSkillMaterializationProfile = { runtimeLabel: string; workspaceSkillsRootSegments: readonly string[] };

export type WorkspaceSkillReconciliationRequest =
  | { kind: "expose-resolved"; skill: Skill }
  | { kind: "reconcile-discoverable"; skill: Skill }
  | { kind: "reconcile-unresolved"; name: string };

/**
 * One run's hold on a materialized workspace skill path. Release is keyed by `registryKey` +
 * `holderId`; `sourceRootPath` is the source at acquisition time and may be stale after the
 * path was re-pointed to a configured source.
 */
export type MaterializedWorkspaceSkill = {
  name: string;
  sourceRootPath: string;
  materializedRootPath: string;
  registryKey: string;
  holderId: number;
  requestStrength: SkillRequestStrength;
};

type WorkspaceSkillMaterializerOptions = { logger?: { warn: (...args: unknown[]) => void }; fileSystem?: Partial<WorkspaceSkillFileSystem> };

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

type RegistryHolder = { runId: string; strength: SkillRequestStrength };

/** `workspace-owned`: a user-owned entry occupies the path (Rule 1); strong holders throw `error`, weak holders skip. */
type AcquisitionOutcome = { kind: "ready" } | { kind: "absent" } | { kind: "workspace-owned"; error: Error };

type AcquiringRegistryEntry = { phase: "acquiring"; sourceRootPath: string; holders: Map<number, RegistryHolder>; claimWhenAvailable: boolean; readiness: Promise<AcquisitionOutcome> };

type ReadyRegistryEntry = { phase: "ready"; sourceRootPath: string; holders: Map<number, RegistryHolder> };

type ReleasingRegistryEntry = { phase: "releasing"; sourceRootPath: string; cleanup: Promise<void> };

type WorkspaceSkillRegistryEntry = AcquiringRegistryEntry | ReadyRegistryEntry | ReleasingRegistryEntry;

type ResolvedRequest = Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>;

type AcquisitionTarget = {
  runId: string; strength: SkillRequestStrength; request: ResolvedRequest;
  sourceRootPath: string; materializedRootPath: string; registryKey: string;
};

type Disposition = "repaired" | "removed-and-skipped" | "skipped"
  | "skipped-workspace-owned" | "skipped-held-by-other-run" | "yielded-to-configured"
  | "skipped-unresolved-held-by-weak";

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

export const strongHolderCount = (holders: ReadonlyMap<number, RegistryHolder>): number =>
  [...holders.values()].filter((holder) => !isWeakSkillRequest(holder.strength)).length;

export const weakHolderCount = (holders: ReadonlyMap<number, RegistryHolder>): number =>
  [...holders.values()].filter((holder) => isWeakSkillRequest(holder.strength)).length;

/**
 * Process-wide owner of materialized workspace skill links for one runtime profile. The
 * registry is the authority for every path: acquisition, re-pointing and release go through its
 * `acquiring` / `ready` / `releasing` phases, and it tracks each holder's request strength (D-15).
 */
export class WorkspaceSkillMaterializer {
  private readonly registry = new Map<string, WorkspaceSkillRegistryEntry>();
  private readonly logger: NonNullable<WorkspaceSkillMaterializerOptions["logger"]>;
  private readonly links: WorkspaceSkillLinks;
  private nextHolderId = 0;

  constructor(private readonly profile: WorkspaceSkillMaterializationProfile,
    options: WorkspaceSkillMaterializerOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.links = new WorkspaceSkillLinks(profile.runtimeLabel, {
      lstat: options.fileSystem?.lstat ?? fs.lstat, readlink: options.fileSystem?.readlink ?? fs.readlink,
      stat: options.fileSystem?.stat ?? fs.stat, realpath: options.fileSystem?.realpath ?? fs.realpath,
      mkdir: options.fileSystem?.mkdir ?? fs.mkdir, symlink: options.fileSystem?.symlink ?? fs.symlink,
      unlink: options.fileSystem?.unlink ?? fs.unlink, rename: options.fileSystem?.rename ?? fs.rename,
    });
  }

  async materializeConfiguredWorkspaceSkills(options: {
    runId: string;
    workingDirectory: string;
    requests?: WorkspaceSkillReconciliationRequest[] | null;
    skillAccessMode?: SkillAccessMode | null;
    /** From `SkillService.resolveSkillScope` via `skillRequestStrengthForScope`. */
    requestStrength: SkillRequestStrength;
  }): Promise<MaterializedWorkspaceSkill[]> {
    const requests = options.skillAccessMode === SkillAccessMode.NONE
      ? []
      : options.requests ?? [];
    const acquired: MaterializedWorkspaceSkill[] = [];
    try {
      for (const request of requests) {
        const descriptor = request.kind === "reconcile-unresolved"
          ? await this.reconcileUnresolved(options.runId, options.workingDirectory, request.name)
          : await this.acquireResolved(this.targetFor(options.runId, options.workingDirectory, request, options.requestStrength));
        if (descriptor) acquired.push(descriptor);
      }
      return acquired;
    } catch (originalError) {
      for (const descriptor of [...acquired].reverse()) {
        try {
          await this.releaseMaterializedSkill(descriptor, options.runId);
        } catch (rollbackError) {
          this.logger.warn(`Failed to roll back ${this.profile.runtimeLabel} workspace skill acquisition for run '${options.runId}', skill '${descriptor.name}', path '${descriptor.materializedRootPath}'.`, rollbackError);
        }
      }
      throw originalError;
    }
  }

  async cleanupMaterializedWorkspaceSkills(
    materializedSkills: MaterializedWorkspaceSkill[] | null | undefined): Promise<void> {
    for (const descriptor of materializedSkills ?? []) {
      await this.releaseMaterializedSkill(descriptor);
    }
  }

  private buildMaterializedRootPath(workingDirectory: string, skillName: string): string {
    return path.join(workingDirectory, ...this.profile.workspaceSkillsRootSegments,
      sanitizeDirectorySegment(skillName));
  }

  private targetFor(runId: string, workingDirectory: string, request: ResolvedRequest,
    strength: SkillRequestStrength): AcquisitionTarget {
    const materializedRootPath = this.buildMaterializedRootPath(workingDirectory, request.skill.name);
    return { runId, strength, request, sourceRootPath: path.resolve(request.skill.rootPath),
      materializedRootPath, registryKey: path.resolve(materializedRootPath) };
  }

  private async acquireResolved(target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    while (true) {
      const existing = this.registry.get(target.registryKey);
      if (existing?.phase === "releasing") {
        await existing.cleanup;
        continue;
      }
      if (!existing) return this.startAcquisition(target);
      if (existing.sourceRootPath === target.sourceRootPath) return this.joinHolders(existing, target);

      // Rule 2: another live run holds this path with a different source.
      if (isWeakSkillRequest(target.strength)) {
        // Direction A: the name stays discoverable through the holder's link.
        this.warnDisposition(target, existing.sourceRootPath, "skipped-held-by-other-run");
        return null;
      }
      if (strongHolderCount(existing.holders) > 0) {
        throw this.links.sourceCollisionError(target.request.skill.name, target.materializedRootPath,
          existing.sourceRootPath, target.sourceRootPath);
      }
      if (existing.phase === "acquiring") {
        await existing.readiness.catch(() => undefined);
        continue;
      }
      // Direction B: only weak holders; the configured source takes the path.
      return this.yieldToConfigured(existing, target);
    }
  }

  private startAcquisition(target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    const deferred = createDeferred<AcquisitionOutcome>();
    const holders = new Map<number, RegistryHolder>();
    const holderId = this.addHolder(holders, target);
    const acquiring: AcquiringRegistryEntry = { phase: "acquiring", sourceRootPath: target.sourceRootPath,
      holders, claimWhenAvailable: target.request.kind === "expose-resolved", readiness: deferred.promise };
    this.registry.set(target.registryKey, acquiring);
    void this.completeAcquisition(target, acquiring, deferred);
    return this.descriptorForOutcome(deferred.promise, target, holderId);
  }

  private joinHolders(existing: AcquiringRegistryEntry | ReadyRegistryEntry,
    target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    const holderId = this.addHolder(existing.holders, target);
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
        this.registry.set(target.registryKey, { phase: "ready", sourceRootPath: target.sourceRootPath, holders: acquiring.holders });
      } else {
        this.registry.delete(target.registryKey);
      }
      deferred.resolve(outcome);
    } catch (error) {
      if (this.registry.get(target.registryKey) === acquiring) {
        this.registry.delete(target.registryKey);
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
      if (!isWeakSkillRequest(target.strength)) throw outcome.error;
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

  /**
   * Re-points a path held only by all-installed runs to the configured source (D-15 Direction B).
   * The entry stays `acquiring` for the whole switch, so the registry serializes it; the weak
   * holders are merged into the configured entry and keep a skill of the same name.
   */
  private async yieldToConfigured(existing: ReadyRegistryEntry, target: AcquisitionTarget): Promise<MaterializedWorkspaceSkill | null> {
    const previousSource = existing.sourceRootPath;
    const holders = existing.holders;
    const originalHolderIds = new Set(holders.keys());
    const yieldingRunIds = [...new Set([...holders.values()].map((holder) => holder.runId))];
    const holderId = this.addHolder(holders, target);
    const deferred = createDeferred<AcquisitionOutcome>();
    // Joiners observe a failed switch through `readiness`; with none, the rejection is expected.
    deferred.promise.catch(() => undefined);
    const repointing: AcquiringRegistryEntry = { phase: "acquiring", sourceRootPath: target.sourceRootPath,
      holders, claimWhenAvailable: true, readiness: deferred.promise };
    this.registry.set(target.registryKey, repointing);

    // Back to the previous source without the holders that joined this switch.
    const restorePrevious = (): void => {
      for (const id of [...holders.keys()]) if (!originalHolderIds.has(id)) holders.delete(id);
      if (this.registry.get(target.registryKey) !== repointing) return;
      const restored: ReadyRegistryEntry = { phase: "ready", sourceRootPath: previousSource, holders };
      this.registry.set(target.registryKey, restored);
      if (holders.size === 0) void this.releaseUnheldEntry(target.registryKey, restored, target.request.skill.name);
    };

    try {
      if (!(await this.links.hasValidSkillManifest(target.sourceRootPath))) {
        restorePrevious();
        deferred.resolve({ kind: "absent" });
        this.warnDisposition(target, previousSource, "skipped");
        return null;
      }
      const state = await this.links.inspectPath(target.materializedRootPath, previousSource);
      if (state.kind === "same-source-symlink" || state.kind === "broken-symlink") {
        await this.links.replaceOwnedLink(target.materializedRootPath, target.sourceRootPath);
      } else if (state.kind === "missing") {
        await this.links.createOrAcceptSameSourceLink(target.materializedRootPath, target.sourceRootPath, target.request.skill.name);
      } else {
        throw this.links.pathStateCollisionError(target.request.skill.name, target.materializedRootPath, target.sourceRootPath, state);
      }
      if (this.registry.get(target.registryKey) !== repointing) {
        throw new Error(`Workspace skill re-point registry changed unexpectedly for '${target.materializedRootPath}'.`);
      }
      this.registry.set(target.registryKey, { phase: "ready", sourceRootPath: target.sourceRootPath, holders });
      deferred.resolve({ kind: "ready" });
      this.warnDisposition(target, previousSource, "yielded-to-configured", yieldingRunIds);
      return this.descriptorFor(target, holderId);
    } catch (error) {
      restorePrevious();
      deferred.reject(error);
      throw error;
    }
  }

  private addHolder(holders: Map<number, RegistryHolder>, target: AcquisitionTarget): number {
    this.nextHolderId += 1;
    holders.set(this.nextHolderId, { runId: target.runId, strength: target.strength });
    return this.nextHolderId;
  }

  private descriptorFor(target: AcquisitionTarget, holderId: number): MaterializedWorkspaceSkill {
    return {
      name: target.request.skill.name,
      sourceRootPath: target.sourceRootPath,
      materializedRootPath: target.materializedRootPath,
      registryKey: target.registryKey,
      holderId,
      requestStrength: target.strength,
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
        await existing.cleanup;
        continue;
      }
      if (existing?.phase === "acquiring") {
        await existing.readiness.catch(() => null);
        continue;
      }
      // Rule 3 (D-15): the path is held only by all-installed runs. An unresolved name is not
      // provided to this run anyway; leave the weak holders' link alone (no join, no re-point).
      if (existing?.phase === "ready" && existing.holders.size > 0 && strongHolderCount(existing.holders) === 0) {
        this.warnDisposition({ runId, request: { skill: { name: skillName } }, materializedRootPath, sourceRootPath: null },
          existing.sourceRootPath, "skipped-unresolved-held-by-weak");
        return null;
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
   * Releases one holder (IC-1). The registry entry decides: the holder is removed from it, and the
   * link is removed only when no holder remains, checked against the entry's current source.
   * Neither descriptor identity nor the descriptor's original source gates release.
   */
  private async releaseMaterializedSkill(descriptor: MaterializedWorkspaceSkill, rollbackRunId?: string): Promise<void> {
    const entry = this.registry.get(descriptor.registryKey);
    if (!entry || entry.phase === "releasing") return;
    if (!entry.holders.delete(descriptor.holderId)) return;
    if (entry.phase !== "ready" || entry.holders.size > 0) return;
    await this.releaseUnheldEntry(descriptor.registryKey, entry, descriptor.name, rollbackRunId);
  }

  private async releaseUnheldEntry(registryKey: string, entry: ReadyRegistryEntry, skillName: string,
    rollbackRunId?: string): Promise<void> {
    const cleanup = Promise.resolve()
      .then(() => this.links.removeLinkToSource(registryKey, entry.sourceRootPath))
      .catch((error) => {
        this.logger.warn(rollbackRunId
            ? `Failed to roll back ${this.profile.runtimeLabel} workspace skill acquisition for run '${rollbackRunId}', skill '${skillName}', path '${registryKey}'.`
            : `Failed to clean up materialized ${this.profile.runtimeLabel} workspace skill '${skillName}' at '${registryKey}'.`,
          error);
      });
    const releasing: ReleasingRegistryEntry = { phase: "releasing", sourceRootPath: entry.sourceRootPath, cleanup };
    this.registry.set(registryKey, releasing);
    try {
      await cleanup;
    } finally {
      if (this.registry.get(registryKey) === releasing) {
        this.registry.delete(registryKey);
      }
    }
  }

  private warnDisposition(
    target: { runId: string; request: { skill: { name: string } }; materializedRootPath: string; sourceRootPath: string | null },
    previousTarget: string | null,
    disposition: Disposition,
    yieldingRunIds: readonly string[] = [],
  ): void {
    const yielding = yieldingRunIds.length ? `, yieldingRuns='${yieldingRunIds.join(",")}'` : "";
    this.logger.warn(
      `${this.profile.runtimeLabel} workspace skill reconciliation: run='${target.runId}', skill='${target.request.skill.name}', path='${target.materializedRootPath}', previousTarget='${previousTarget ?? "none"}', currentSource='${target.sourceRootPath ?? "none"}', disposition='${disposition}'${yielding}.`,
    );
  }
}
