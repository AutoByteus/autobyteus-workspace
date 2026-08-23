import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../skills/domain/models.js";

export type WorkspaceSkillMaterializationProfile = { runtimeLabel: string; workspaceSkillsRootSegments: readonly string[] };

export type WorkspaceSkillReconciliationRequest =
  | { kind: "expose-resolved"; skill: Skill }
  | { kind: "reconcile-discoverable"; skill: Skill }
  | { kind: "reconcile-unresolved"; name: string };

export type MaterializedWorkspaceSkill = { name: string; sourceRootPath: string; materializedRootPath: string; registryKey: string };

type WorkspaceSkillFileSystem = Pick<typeof fs,
  "lstat" | "readlink" | "stat" | "realpath" | "mkdir" | "symlink" | "unlink">;

type WorkspaceSkillMaterializerOptions = { logger?: { warn: (...args: unknown[]) => void }; fileSystem?: Partial<WorkspaceSkillFileSystem> };

type BrokenSymlinkState = { kind: "broken-symlink"; rawTargetPath: string; resolvedTargetPath: string; device: number; inode: number };

type WorkspaceSkillPathState =
  | { kind: "missing" }
  | { kind: "same-source-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | BrokenSymlinkState
  | { kind: "live-different-symlink"; rawTargetPath: string; resolvedTargetPath: string }
  | { kind: "non-symlink"; pathType: "file" | "directory" | "other" };

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

type AcquiringRegistryEntry = { phase: "acquiring"; sourceRootPath: string; holderCount: number; claimWhenAvailable: boolean; readiness: Promise<MaterializedWorkspaceSkill | null> };

type ReadyRegistryEntry = { phase: "ready"; sourceRootPath: string; holderCount: number; descriptor: MaterializedWorkspaceSkill };

type ReleasingRegistryEntry = { phase: "releasing"; sourceRootPath: string; holderCount: 0; descriptor: MaterializedWorkspaceSkill; cleanup: Promise<void> };

type WorkspaceSkillRegistryEntry = AcquiringRegistryEntry | ReadyRegistryEntry | ReleasingRegistryEntry;

const defaultLogger = { warn: (...args: unknown[]) => console.warn(...args) };

const isAbsenceError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const sanitizeDirectorySegment = (value: string): string => {
  const normalized = collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

const resolveSymlinkTargetPath = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const pathTypeForStats = (
  stats: Awaited<ReturnType<typeof fs.lstat>>,
): "file" | "directory" | "other" =>
  stats.isFile() ? "file" : stats.isDirectory() ? "directory" : "other";

export class WorkspaceSkillMaterializer {
  private readonly registry = new Map<string, WorkspaceSkillRegistryEntry>();
  private readonly logger: NonNullable<WorkspaceSkillMaterializerOptions["logger"]>;
  private readonly fileSystem: WorkspaceSkillFileSystem;

  constructor(private readonly profile: WorkspaceSkillMaterializationProfile,
    options: WorkspaceSkillMaterializerOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.fileSystem = {
      lstat: options.fileSystem?.lstat ?? fs.lstat, readlink: options.fileSystem?.readlink ?? fs.readlink,
      stat: options.fileSystem?.stat ?? fs.stat, realpath: options.fileSystem?.realpath ?? fs.realpath,
      mkdir: options.fileSystem?.mkdir ?? fs.mkdir, symlink: options.fileSystem?.symlink ?? fs.symlink,
      unlink: options.fileSystem?.unlink ?? fs.unlink,
    };
  }

  async materializeConfiguredWorkspaceSkills(options: {
    runId: string;
    workingDirectory: string;
    requests?: WorkspaceSkillReconciliationRequest[] | null;
    skillAccessMode?: SkillAccessMode | null;
  }): Promise<MaterializedWorkspaceSkill[]> {
    const requests = options.skillAccessMode === SkillAccessMode.NONE
      ? []
      : options.requests ?? [];
    const acquired: MaterializedWorkspaceSkill[] = [];
    try {
      for (const request of requests) {
        const descriptor = request.kind === "reconcile-unresolved"
          ? await this.reconcileUnresolved(options.runId, options.workingDirectory, request.name)
          : await this.acquireResolved(options.runId, options.workingDirectory, request);
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

  private async acquireResolved(
    runId: string,
    workingDirectory: string,
    request: Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>,
  ): Promise<MaterializedWorkspaceSkill | null> {
    const sourceRootPath = path.resolve(request.skill.rootPath);
    const materializedRootPath = this.buildMaterializedRootPath(workingDirectory, request.skill.name), registryKey = path.resolve(materializedRootPath);

    while (true) {
      const existing = this.registry.get(registryKey);
      if (existing?.phase === "releasing") {
        await existing.cleanup;
        continue;
      }
      if (existing) {
        if (existing.sourceRootPath !== sourceRootPath) {
          throw this.sourceCollisionError(request.skill.name, materializedRootPath,
            existing.sourceRootPath, sourceRootPath);
        }
        if (existing.phase === "ready") {
          existing.holderCount += 1;
          return existing.descriptor;
        }
        existing.holderCount += 1;
        if (request.kind === "expose-resolved") existing.claimWhenAvailable = true;
        return existing.readiness;
      }

      const deferred = createDeferred<MaterializedWorkspaceSkill | null>();
      const acquiring: AcquiringRegistryEntry = { phase: "acquiring", sourceRootPath,
        holderCount: 1, claimWhenAvailable: request.kind === "expose-resolved",
        readiness: deferred.promise };
      this.registry.set(registryKey, acquiring);
      void this.completeAcquisition({ runId, request, sourceRootPath, materializedRootPath,
        registryKey, acquiring, deferred });
      return deferred.promise;
    }
  }

  private async completeAcquisition(input: {
    request: Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>;
    runId: string; sourceRootPath: string; materializedRootPath: string; registryKey: string;
    acquiring: AcquiringRegistryEntry;
    deferred: Deferred<MaterializedWorkspaceSkill | null>;
  }): Promise<void> {
    try {
      const descriptor = await this.reconcileResolved(input);
      if (this.registry.get(input.registryKey) !== input.acquiring) {
        throw new Error(`Workspace skill acquisition registry changed unexpectedly for '${input.materializedRootPath}'.`);
      }
      if (descriptor) {
        this.registry.set(input.registryKey, {
          phase: "ready",
          sourceRootPath: input.sourceRootPath,
          holderCount: input.acquiring.holderCount,
          descriptor,
        });
      } else {
        this.registry.delete(input.registryKey);
      }
      input.deferred.resolve(descriptor);
    } catch (error) {
      if (this.registry.get(input.registryKey) === input.acquiring) {
        this.registry.delete(input.registryKey);
      }
      input.deferred.reject(error);
    }
  }

  private async reconcileResolved(input: {
    request: Exclude<WorkspaceSkillReconciliationRequest, { kind: "reconcile-unresolved" }>;
    runId: string; sourceRootPath: string; materializedRootPath: string; registryKey: string;
    acquiring: AcquiringRegistryEntry;
  }): Promise<MaterializedWorkspaceSkill | null> {
    const sourceAvailable = await this.hasValidSkillManifest(input.sourceRootPath);
    let state = await this.inspectPath(input.materializedRootPath, input.sourceRootPath);
    if (!sourceAvailable) {
      return this.reconcileWithoutSource({
        runId: input.runId,
        skillName: input.request.skill.name,
        sourceRootPath: input.sourceRootPath,
        materializedRootPath: input.materializedRootPath,
        state,
      });
    }

    let observedBrokenTarget: string | null = null;
    for (let reclassificationCount = 0; reclassificationCount <= 1; reclassificationCount += 1) {
      if (state.kind === "broken-symlink") {
        observedBrokenTarget ??= state.resolvedTargetPath;
        if (!(await this.unlinkBrokenLinkIfStillMatching(input.materializedRootPath, state))) {
          state = await this.inspectPath(input.materializedRootPath, input.sourceRootPath);
          continue;
        }
        await this.createOrAcceptSameSourceLink(input.materializedRootPath,
          input.sourceRootPath, input.request.skill.name);
        this.warnDisposition({
          runId: input.runId,
          skillName: input.request.skill.name,
          materializedRootPath: input.materializedRootPath,
          previousTarget: observedBrokenTarget,
          currentSource: input.sourceRootPath,
          disposition: "repaired",
        });
        return this.descriptorFor(input);
      }
      if (state.kind === "missing") {
        if (!input.acquiring.claimWhenAvailable) return null;
        await this.createOrAcceptSameSourceLink(input.materializedRootPath,
          input.sourceRootPath, input.request.skill.name);
        return this.descriptorFor(input);
      }
      if (state.kind === "same-source-symlink") {
        return input.acquiring.claimWhenAvailable ? this.descriptorFor(input) : null;
      }
      throw this.pathStateCollisionError(input.request.skill.name,
        input.materializedRootPath, input.sourceRootPath, state);
    }
    throw new Error(`Workspace skill path '${input.materializedRootPath}' changed repeatedly during broken-link repair.`);
  }

  private descriptorFor(input: {
    request: { skill: Skill }; sourceRootPath: string; materializedRootPath: string;
    registryKey: string;
  }): MaterializedWorkspaceSkill {
    return {
      name: input.request.skill.name,
      sourceRootPath: input.sourceRootPath,
      materializedRootPath: input.materializedRootPath,
      registryKey: input.registryKey,
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
      return this.reconcileUnavailable(runId, skillName, materializedRootPath, null);
    }
  }

  private async reconcileWithoutSource(input: {
    runId: string;
    skillName: string;
    sourceRootPath: string;
    materializedRootPath: string;
    state: WorkspaceSkillPathState;
  }): Promise<null> {
    return this.reconcileUnavailable(input.runId, input.skillName, input.materializedRootPath,
      input.sourceRootPath, input.state);
  }

  private async reconcileUnavailable(runId: string, skillName: string,
    materializedRootPath: string, sourceRootPath: string | null,
    initialState?: WorkspaceSkillPathState): Promise<null> {
    let state = initialState ?? await this.inspectPath(materializedRootPath, sourceRootPath);
    for (let reclassificationCount = 0; reclassificationCount <= 1; reclassificationCount += 1) {
      if (state.kind === "missing" || state.kind === "same-source-symlink") {
        this.warnDisposition({
          runId, skillName, materializedRootPath,
          previousTarget: state.kind === "same-source-symlink" ? state.resolvedTargetPath : null,
          currentSource: sourceRootPath,
          disposition: "skipped",
        });
        return null;
      }
      if (state.kind === "broken-symlink") {
        if (!(await this.unlinkBrokenLinkIfStillMatching(materializedRootPath, state))) {
          state = await this.inspectPath(materializedRootPath, sourceRootPath);
          continue;
        }
        this.warnDisposition({
          runId, skillName, materializedRootPath,
          previousTarget: state.resolvedTargetPath,
          currentSource: sourceRootPath,
          disposition: "removed-and-skipped",
        });
        return null;
      }
      throw this.pathStateCollisionError(skillName, materializedRootPath, sourceRootPath, state);
    }
    throw new Error(`Workspace skill path '${materializedRootPath}' changed repeatedly during unavailable-source reconciliation.`);
  }

  private async releaseMaterializedSkill(descriptor: MaterializedWorkspaceSkill, rollbackRunId?: string): Promise<void> {
    const entry = this.registry.get(descriptor.registryKey);
    if (entry?.phase !== "ready" || entry.descriptor !== descriptor) return;
    entry.holderCount -= 1;
    if (entry.holderCount > 0) return;

    const cleanup = Promise.resolve()
      .then(() => this.removeOwnedLink(descriptor))
      .catch((error) => {
        this.logger.warn(rollbackRunId
            ? `Failed to roll back ${this.profile.runtimeLabel} workspace skill acquisition for run '${rollbackRunId}', skill '${descriptor.name}', path '${descriptor.materializedRootPath}'.`
            : `Failed to clean up materialized ${this.profile.runtimeLabel} workspace skill '${descriptor.name}' at '${descriptor.materializedRootPath}'.`,
          error);
      });
    const releasing: ReleasingRegistryEntry = {
      phase: "releasing",
      sourceRootPath: entry.sourceRootPath,
      holderCount: 0,
      descriptor,
      cleanup,
    };
    this.registry.set(descriptor.registryKey, releasing);
    try {
      await cleanup;
    } finally {
      if (this.registry.get(descriptor.registryKey) === releasing) {
        this.registry.delete(descriptor.registryKey);
      }
    }
  }

  private async hasValidSkillManifest(sourceRootPath: string): Promise<boolean> {
    try {
      const stats = await this.fileSystem.stat(path.join(sourceRootPath, "SKILL.md"));
      return stats.isFile();
    } catch (error) {
      if (isAbsenceError(error)) return false;
      throw error;
    }
  }

  private async inspectPath(
    materializedRootPath: string,
    sourceRootPath: string | null,
  ): Promise<WorkspaceSkillPathState> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return { kind: "missing" };
      throw error;
    }
    if (!stats.isSymbolicLink()) {
      return { kind: "non-symlink", pathType: pathTypeForStats(stats) };
    }
    const rawTargetPath = await this.fileSystem.readlink(materializedRootPath);
    const resolvedTargetPath = resolveSymlinkTargetPath(materializedRootPath, rawTargetPath);
    try {
      await this.fileSystem.stat(resolvedTargetPath);
    } catch (error) {
      if (isAbsenceError(error)) {
        return {
          kind: "broken-symlink",
          rawTargetPath,
          resolvedTargetPath,
          device: stats.dev,
          inode: stats.ino,
        };
      }
      throw error;
    }
    if (
      sourceRootPath &&
      await this.pathsReferToSameTarget(resolvedTargetPath, sourceRootPath)
    ) {
      return { kind: "same-source-symlink", rawTargetPath, resolvedTargetPath };
    }
    return { kind: "live-different-symlink", rawTargetPath, resolvedTargetPath };
  }

  private async pathsReferToSameTarget(leftPath: string, rightPath: string): Promise<boolean> {
    if (path.resolve(leftPath) === path.resolve(rightPath)) return true;
    try {
      const [leftRealPath, rightRealPath] = await Promise.all([
        this.fileSystem.realpath(leftPath),
        this.fileSystem.realpath(rightPath),
      ]);
      return leftRealPath === rightRealPath;
    } catch (error) {
      if (isAbsenceError(error)) return false;
      throw error;
    }
  }

  private async unlinkBrokenLinkIfStillMatching(
    materializedRootPath: string,
    expected: BrokenSymlinkState,
  ): Promise<boolean> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return true;
      throw error;
    }
    if (
      !stats.isSymbolicLink() ||
      stats.dev !== expected.device ||
      stats.ino !== expected.inode
    ) {
      return false;
    }
    const rawTargetPath = await this.fileSystem.readlink(materializedRootPath);
    if (rawTargetPath !== expected.rawTargetPath) return false;
    try {
      await this.fileSystem.stat(expected.resolvedTargetPath);
      return false;
    } catch (error) {
      if (!isAbsenceError(error)) throw error;
    }
    try {
      await this.fileSystem.unlink(materializedRootPath);
    } catch (error) {
      if (!isAbsenceError(error)) throw error;
    }
    return true;
  }

  private async createOrAcceptSameSourceLink(
    materializedRootPath: string,
    sourceRootPath: string,
    skillName: string,
  ): Promise<void> {
    await this.fileSystem.mkdir(path.dirname(materializedRootPath), { recursive: true });
    try {
      await this.fileSystem.symlink(sourceRootPath, materializedRootPath, "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
      const state = await this.inspectPath(materializedRootPath, sourceRootPath);
      if (state.kind === "same-source-symlink") return;
      throw this.pathStateCollisionError(
        skillName,
        materializedRootPath,
        sourceRootPath,
        state,
      );
    }
  }

  private async removeOwnedLink(descriptor: MaterializedWorkspaceSkill): Promise<void> {
    let stats: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stats = await this.fileSystem.lstat(descriptor.materializedRootPath);
    } catch (error) {
      if (isAbsenceError(error)) return;
      throw error;
    }
    if (!stats.isSymbolicLink()) return;
    const rawTargetPath = await this.fileSystem.readlink(descriptor.materializedRootPath);
    const resolvedTargetPath = resolveSymlinkTargetPath(
      descriptor.materializedRootPath,
      rawTargetPath,
    );
    if (!(await this.pathsReferToSameTarget(resolvedTargetPath, descriptor.sourceRootPath))) {
      return;
    }
    try {
      await this.fileSystem.unlink(descriptor.materializedRootPath);
    } catch (error) {
      if (!isAbsenceError(error)) throw error;
    }
  }

  private sourceCollisionError(
    skillName: string,
    materializedRootPath: string,
    existingSource: string,
    requestedSource: string,
  ): Error {
    return new Error(
      `Workspace skill path collision for ${this.profile.runtimeLabel} skill '${skillName}': path '${materializedRootPath}' is being materialized from '${existingSource}' instead of '${requestedSource}'.`,
    );
  }

  private pathStateCollisionError(
    skillName: string,
    materializedRootPath: string,
    sourceRootPath: string | null,
    state: WorkspaceSkillPathState,
  ): Error {
    const detail = state.kind === "live-different-symlink"
      ? `already points to live target '${state.resolvedTargetPath}'${sourceRootPath ? ` instead of '${sourceRootPath}'` : ""}`
      : state.kind === "non-symlink"
        ? `already exists as a ${state.pathType}`
        : state.kind === "broken-symlink"
          ? `is a broken symlink to '${state.resolvedTargetPath}'`
          : state.kind === "missing"
            ? "changed during an exclusive link creation"
            : `already points to the configured source but is not owned by this request`;
    return new Error(
      `Workspace skill path collision for ${this.profile.runtimeLabel} skill '${skillName}': path '${materializedRootPath}' ${detail}.`,
    );
  }

  private warnDisposition(input: {
    runId: string;
    skillName: string;
    materializedRootPath: string;
    previousTarget: string | null;
    currentSource: string | null;
    disposition: "repaired" | "removed-and-skipped" | "skipped";
  }): void {
    this.logger.warn(
      `${this.profile.runtimeLabel} workspace skill reconciliation: run='${input.runId}', skill='${input.skillName}', path='${input.materializedRootPath}', previousTarget='${input.previousTarget ?? "none"}', currentSource='${input.currentSource ?? "none"}', disposition='${input.disposition}'.`,
    );
  }
}
