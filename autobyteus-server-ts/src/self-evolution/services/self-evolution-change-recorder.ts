import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { SelfEvolutionChangeSummary, SelfEvolutionSkillTarget } from "../domain/models.js";
import {
  SelfEvolutionGitChangeAuditor,
  type SelfEvolutionGitRootSnapshot,
} from "./self-evolution-git-change-auditor.js";

type FileSnapshot = {
  path: string;
  hash: string | null;
  metadataToken: string | null;
};

export type SelfEvolutionChangeRecorderSnapshot = {
  files: FileSnapshot[];
  gitRoots: SelfEvolutionGitRootSnapshot[];
};

export class SelfEvolutionChangeRecorder {
  private readonly gitAuditor = new SelfEvolutionGitChangeAuditor();

  async captureBefore(skillTargets: SelfEvolutionSkillTarget[]): Promise<SelfEvolutionChangeRecorderSnapshot> {
    return {
      files: await Promise.all(skillTargets.map((target) => this.snapshotFile(target.skillMdPath))),
      gitRoots: await this.gitAuditor.snapshotGitRoots(this.gitAuditor.listGitRoots(skillTargets)),
    };
  }

  async summarizeChanges(input: {
    before: SelfEvolutionChangeRecorderSnapshot;
    auditedSkillTargets: SelfEvolutionSkillTarget[];
    editableSkillTargets: SelfEvolutionSkillTarget[];
  }): Promise<SelfEvolutionChangeSummary> {
    const beforeByPath = new Map(input.before.files.map((snapshot) => [snapshot.path, snapshot]));
    const editableSkillPathSet = new Set(
      input.editableSkillTargets.map((target) => path.resolve(target.skillMdPath)),
    );
    const afterFiles = await Promise.all(input.auditedSkillTargets.map((target) => this.snapshotFile(target.skillMdPath)));
    const fileChanges = afterFiles.map((snapshot) => ({
      snapshot,
      change: this.describeFileChange(beforeByPath.get(snapshot.path) ?? null, snapshot),
    }));
    const changedAuditedPaths = fileChanges
      .filter((entry) => entry.change.changed)
      .map((entry) => entry.snapshot.path);
    const changedSkillPaths = changedAuditedPaths
      .filter((changedPath) => editableSkillPathSet.has(changedPath));
    const changedNonEditableConfiguredPaths = changedAuditedPaths
      .filter((changedPath) => !editableSkillPathSet.has(changedPath));
    const gitRoots = this.gitAuditor.listGitRoots(input.auditedSkillTargets);
    const afterGitRoots = await this.gitAuditor.snapshotGitRoots(gitRoots);
    const gitAudit = await this.gitAuditor.auditGitRootChanges({
      before: input.before.gitRoots,
      after: afterGitRoots,
      editableSkillTargets: input.editableSkillTargets,
    });
    const diffStat = await this.gitAuditor.buildDiffStat(input.before.gitRoots, afterGitRoots);
    const uncertaintyWarnings = fileChanges
      .filter((entry) => entry.change.warning)
      .map((entry) => entry.change.warning!);
    const warnings = [
      ...uncertaintyWarnings,
      ...gitAudit.warnings,
      ...diffStat.warnings,
      ...this.gitAuditor.buildUnversionedWarnings(input.editableSkillTargets),
    ];
    const nonEditablePathSet = new Set(changedNonEditableConfiguredPaths);
    const offTargetChangePaths = Array.from(new Set([
      ...gitAudit.offTargetChangePaths,
      ...changedNonEditableConfiguredPaths,
    ])).sort();
    const policyViolations = [
      ...changedNonEditableConfiguredPaths.map(
        (changedPath) => `Self-evolver changed non-editable configured skill path '${changedPath}'.`,
      ),
      ...gitAudit.offTargetChangePaths
        .filter((changedPath) => !nonEditablePathSet.has(changedPath))
        .map((changedPath) => `Self-evolver changed off-target path '${changedPath}'.`),
    ];

    return {
      detectionMode: this.resolveDetectionMode({
        changedSkillPaths,
        gitOffTargetChangePaths: gitAudit.offTargetChangePaths,
        changedNonEditableConfiguredPaths,
        uncertain: uncertaintyWarnings.length > 0,
      }),
      changedSkillPaths,
      offTargetChangePaths,
      gitRoots,
      diffStat: diffStat.text,
      warnings,
      policyViolations,
    };
  }

  private async snapshotFile(filePath: string): Promise<FileSnapshot> {
    const resolved = path.resolve(filePath);
    try {
      const [stat, content] = await Promise.all([fs.stat(resolved), fs.readFile(resolved)]);
      return {
        path: resolved,
        hash: crypto.createHash("sha256").update(content).digest("hex"),
        metadataToken: `${stat.mtimeMs}:${stat.size}`,
      };
    } catch {
      return { path: resolved, hash: null, metadataToken: null };
    }
  }

  private describeFileChange(
    before: FileSnapshot | null,
    after: FileSnapshot,
  ): { changed: boolean; warning: string | null } {
    if (!before) {
      return {
        changed: after.hash !== null,
        warning: after.hash === null ? `Could not read target skill file '${after.path}' after evolution.` : null,
      };
    }
    if (before.hash !== null && after.hash !== null) {
      return { changed: before.hash !== after.hash, warning: null };
    }
    const changed = before.metadataToken !== after.metadataToken;
    return {
      changed,
      warning: changed
        ? `Target skill file '${after.path}' changed by metadata only because content hash was unavailable.`
        : null,
    };
  }

  private resolveDetectionMode(input: {
    changedSkillPaths: string[];
    gitOffTargetChangePaths: string[];
    changedNonEditableConfiguredPaths: string[];
    uncertain: boolean;
  }): SelfEvolutionChangeSummary["detectionMode"] {
    if (input.gitOffTargetChangePaths.length > 0) {
      return "git";
    }
    if (input.changedSkillPaths.length > 0 || input.changedNonEditableConfiguredPaths.length > 0) {
      return input.uncertain ? "file_metadata_uncertain" : "file_hash";
    }
    return "none";
  }
}
