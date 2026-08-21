import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSkillMaterializer } from "../../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

const tempRoots: string[] = [];
const profile = { runtimeLabel: "Test", workspaceSkillsRootSegments: [".test", "skills"] };

const tempDir = async (prefix: string): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
};

const skillFixture = async (root: string, name: string, withManifest = true): Promise<Skill> => {
  const skillRoot = path.join(root, `${name}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(skillRoot, { recursive: true });
  if (withManifest) await fs.writeFile(path.join(skillRoot, "SKILL.md"), `# ${name}\n`, "utf8");
  return new Skill({ name, description: `${name} skill`, content: `# ${name}`, rootPath: skillRoot, fileCount: withManifest ? 1 : 0 });
};

const materializedPath = (workspace: string, name: string): string =>
  path.join(workspace, ".test", "skills", name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"));

const expose = (skill: Skill) => ({ kind: "expose-resolved" as const, skill });
const discoverable = (skill: Skill) => ({ kind: "reconcile-discoverable" as const, skill });
const run = (materializer: WorkspaceSkillMaterializer, workspace: string, requests: Array<ReturnType<typeof expose> | ReturnType<typeof discoverable> | { kind: "reconcile-unresolved"; name: string }>, skillAccessMode = SkillAccessMode.PRELOADED_ONLY) =>
  materializer.materializeConfiguredWorkspaceSkills({ runId: "run-1", workingDirectory: workspace, requests, skillAccessMode });

const isAbsent = async (target: string): Promise<boolean> => {
  try { await fs.lstat(target); return false; } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT";
  }
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("WorkspaceSkillMaterializer", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
    vi.restoreAllMocks();
  });

  it("creates a link-only exposure, reflects source changes, and removes only the link", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "Example Skill");
    const materializer = new WorkspaceSkillMaterializer(profile);

    const descriptor = (await run(materializer, workspace, [expose(skill)]))[0]!;
    expect(descriptor.materializedRootPath).toBe(materializedPath(workspace, "example-skill"));
    expect((await fs.lstat(descriptor.materializedRootPath)).isSymbolicLink()).toBe(true);
    await fs.writeFile(path.join(skill.rootPath, "SKILL.md"), "# updated\n", "utf8");
    expect(await fs.readFile(path.join(descriptor.materializedRootPath, "SKILL.md"), "utf8")).toBe("# updated\n");

    await materializer.cleanupMaterializedWorkspaceSkills([descriptor]);
    expect(await isAbsent(descriptor.materializedRootPath)).toBe(true);
    expect((await fs.stat(skill.rootPath)).isDirectory()).toBe(true);
  });

  it("retains a shared link until every occurrence holder releases", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "shared");
    const materializer = new WorkspaceSkillMaterializer(profile);
    const first = await run(materializer, workspace, [expose(skill), expose(skill)]);
    const second = await run(materializer, workspace, [expose(skill)]);

    expect(first[0]).toBe(first[1]);
    expect(second[0]).toBe(first[0]);
    await materializer.cleanupMaterializedWorkspaceSkills(first);
    expect((await fs.lstat(first[0]!.materializedRootPath)).isSymbolicLink()).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills(second);
    expect(await isAbsent(first[0]!.materializedRootPath)).toBe(true);
  });

  it("joins concurrent acquisition and publishes one shared descriptor", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "concurrent");
    const gate = deferred();
    const symlinkEntered = deferred();
    const materializer = new WorkspaceSkillMaterializer(profile, { fileSystem: {
      symlink: async (...args: Parameters<typeof fs.symlink>) => {
        symlinkEntered.resolve();
        await gate.promise;
        return fs.symlink(...args);
      },
    } });

    const firstPromise = run(materializer, workspace, [expose(skill)]);
    await symlinkEntered.promise;
    const secondPromise = run(materializer, workspace, [expose(skill)]);
    gate.resolve();
    const results = await Promise.all([firstPromise, secondPromise]);
    const first = results[0][0]!;
    const second = results[1][0]!;
    expect(second).toBe(first);

    await materializer.cleanupMaterializedWorkspaceSkills([first]);
    expect((await fs.lstat(first.materializedRootPath)).isSymbolicLink()).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills([second]);
    expect(await isAbsent(first.materializedRootPath)).toBe(true);
  });

  it("repairs a broken link for a discoverable skill and records the disposition", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "repair-me");
    const link = materializedPath(workspace, skill.name);
    const missingTarget = path.join(source, "old-missing-target");
    await fs.mkdir(path.dirname(link), { recursive: true });
    await fs.symlink(missingTarget, link, "dir");
    const warn = vi.fn();
    const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

    const descriptor = (await run(materializer, workspace, [discoverable(skill)]))[0]!;
    expect(path.resolve(path.dirname(link), await fs.readlink(link))).toBe(path.resolve(skill.rootPath));
    expect(await isAbsent(missingTarget)).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("disposition='repaired'"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("previousTarget="));
    await materializer.cleanupMaterializedWorkspaceSkills([descriptor]);
  });

  it("does not claim a missing or same-source link when discovery can expose the skill", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const missingSkill = await skillFixture(source, "missing-discovered");
    const linkedSkill = await skillFixture(source, "linked-discovered");
    const linkedPath = materializedPath(workspace, linkedSkill.name);
    await fs.mkdir(path.dirname(linkedPath), { recursive: true });
    await fs.symlink(linkedSkill.rootPath, linkedPath, "dir");
    const materializer = new WorkspaceSkillMaterializer(profile);

    expect(await run(materializer, workspace, [discoverable(missingSkill), discoverable(linkedSkill)])).toEqual([]);
    expect(await isAbsent(materializedPath(workspace, missingSkill.name))).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills([]);
    expect((await fs.lstat(linkedPath)).isSymbolicLink()).toBe(true);
  });

  it("warns and skips an unresolved missing binding, and removes an unresolved broken link", async () => {
    const workspace = await tempDir("workspace-skill-workspace-");
    const brokenPath = materializedPath(workspace, "broken-unresolved");
    const brokenTarget = path.join(workspace, "not-present");
    await fs.mkdir(path.dirname(brokenPath), { recursive: true });
    await fs.symlink(brokenTarget, brokenPath, "dir");
    const warn = vi.fn();
    const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

    expect(await run(materializer, workspace, [
      { kind: "reconcile-unresolved", name: "missing-unresolved" },
      { kind: "reconcile-unresolved", name: "broken-unresolved" },
    ])).toEqual([]);
    expect(await isAbsent(brokenPath)).toBe(true);
    expect(await isAbsent(brokenTarget)).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("disposition='skipped'"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("disposition='removed-and-skipped'"));
  });

  it("uses safe unavailable-source outcomes without creating or deleting a live same-source link", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const missingSkill = await skillFixture(source, "source-missing-manifest", false);
    const linkedSkill = await skillFixture(source, "source-linked-no-manifest", false);
    const brokenSkill = await skillFixture(source, "source-broken-no-manifest", false);
    const linkedPath = materializedPath(workspace, linkedSkill.name);
    const brokenPath = materializedPath(workspace, brokenSkill.name);
    await fs.mkdir(path.dirname(linkedPath), { recursive: true });
    await fs.symlink(linkedSkill.rootPath, linkedPath, "dir");
    await fs.symlink(path.join(source, "gone-source"), brokenPath, "dir");
    const warn = vi.fn();
    const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn } });

    expect(await run(materializer, workspace, [
      expose(missingSkill), expose(linkedSkill), expose(brokenSkill),
    ])).toEqual([]);
    expect(await isAbsent(materializedPath(workspace, missingSkill.name))).toBe(true);
    expect((await fs.lstat(linkedPath)).isSymbolicLink()).toBe(true);
    expect(await isAbsent(brokenPath)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it.each(["file", "directory", "live-symlink"] as const)("rejects and preserves a %s collision", async (kind) => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "collision");
    const collisionPath = materializedPath(workspace, skill.name);
    await fs.mkdir(path.dirname(collisionPath), { recursive: true });
    if (kind === "file") await fs.writeFile(collisionPath, "owned", "utf8");
    if (kind === "directory") await fs.mkdir(collisionPath);
    if (kind === "live-symlink") {
      const other = await skillFixture(source, "other");
      await fs.symlink(other.rootPath, collisionPath, "dir");
    }
    const materializer = new WorkspaceSkillMaterializer(profile);

    await expect(run(materializer, workspace, [discoverable(skill)])).rejects.toThrow(/Workspace skill path collision/);
    expect(await isAbsent(collisionPath)).toBe(false);
    if (kind === "file") expect(await fs.readFile(collisionPath, "utf8")).toBe("owned");
  });

  it("rechecks broken-link identity and preserves a live replacement won during repair", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "repair-race");
    const replacement = await skillFixture(source, "replacement");
    const link = materializedPath(workspace, skill.name);
    await fs.mkdir(path.dirname(link), { recursive: true });
    await fs.symlink(path.join(source, "gone"), link, "dir");
    let linkLstatCalls = 0;
    const materializer = new WorkspaceSkillMaterializer(profile, { fileSystem: {
      lstat: (async (target: Parameters<typeof fs.lstat>[0]) => {
        if (path.resolve(String(target)) === path.resolve(link) && ++linkLstatCalls === 2) {
          await fs.unlink(link);
          await fs.symlink(replacement.rootPath, link, "dir");
        }
        return fs.lstat(target);
      }) as typeof fs.lstat,
    } });

    await expect(run(materializer, workspace, [expose(skill)])).rejects.toThrow(/Workspace skill path collision/);
    expect(path.resolve(path.dirname(link), await fs.readlink(link))).toBe(path.resolve(replacement.rootPath));
  });

  it("publishes releasing before cleanup, then makes a new acquisition wait and rematerialize", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "release-gate");
    const gate = deferred();
    const unlinkEntered = deferred();
    const link = materializedPath(workspace, skill.name);
    const materializer = new WorkspaceSkillMaterializer(profile, { fileSystem: {
      unlink: async (target) => {
        if (path.resolve(String(target)) === path.resolve(link)) {
          unlinkEntered.resolve();
          await gate.promise;
        }
        return fs.unlink(target);
      },
    } });
    const first = (await run(materializer, workspace, [expose(skill)]))[0]!;

    const releasePromise = materializer.cleanupMaterializedWorkspaceSkills([first]);
    await unlinkEntered.promise;
    let reacquired = false;
    const acquirePromise = run(materializer, workspace, [expose(skill)]).then((value) => {
      reacquired = true;
      return value;
    });
    expect(reacquired).toBe(false);
    gate.resolve();
    await releasePromise;
    const second = (await acquirePromise)[0]!;
    expect(second).not.toBe(first);
    expect((await fs.lstat(link)).isSymbolicLink()).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills([second]);
  });

  it("rolls back an earlier created link when a later request hits a live collision", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const created = await skillFixture(source, "batch-created");
    const colliding = await skillFixture(source, "batch-colliding");
    const liveOwner = await skillFixture(source, "live-owner");
    const collisionPath = materializedPath(workspace, colliding.name);
    await fs.mkdir(path.dirname(collisionPath), { recursive: true });
    await fs.symlink(liveOwner.rootPath, collisionPath, "dir");
    const materializer = new WorkspaceSkillMaterializer(profile);

    await expect(run(materializer, workspace, [expose(created), expose(colliding)]))
      .rejects.toThrow(/Workspace skill path collision/);
    expect(await isAbsent(materializedPath(workspace, created.name))).toBe(true);
    expect(path.resolve(path.dirname(collisionPath), await fs.readlink(collisionPath)))
      .toBe(path.resolve(liveOwner.rootPath));
  });

  it("rolls back every occurrence from a failed batch and rethrows the exact original error", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const shared = await skillFixture(source, "shared-holder");
    const failing = await skillFixture(source, "failing");
    const exactError = Object.assign(new Error("injected lstat failure"), { code: "EIO" });
    const failingPath = materializedPath(workspace, failing.name);
    const materializer = new WorkspaceSkillMaterializer(profile, { fileSystem: {
      lstat: (async (target: Parameters<typeof fs.lstat>[0]) => {
        if (path.resolve(String(target)) === path.resolve(failingPath)) throw exactError;
        return fs.lstat(target);
      }) as typeof fs.lstat,
    } });
    const preexisting = (await run(materializer, workspace, [expose(shared)]))[0]!;

    let received: unknown;
    try {
      await run(materializer, workspace, [expose(shared), expose(shared), expose(failing)]);
    } catch (error) {
      received = error;
    }
    expect(received).toBe(exactError);
    expect((await fs.lstat(preexisting.materializedRootPath)).isSymbolicLink()).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills([preexisting]);
    expect(await isAbsent(preexisting.materializedRootPath)).toBe(true);
  });

  it("attempts all rollback releases even when one cleanup fails", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const first = await skillFixture(source, "rollback-first");
    const cleanupFailure = await skillFixture(source, "rollback-cleanup-failure");
    const acquisitionFailure = await skillFixture(source, "rollback-acquisition-failure");
    const exactError = Object.assign(new Error("acquisition failed"), { code: "EIO" });
    const warn = vi.fn();
    const firstPath = materializedPath(workspace, first.name);
    const cleanupFailurePath = materializedPath(workspace, cleanupFailure.name);
    const acquisitionFailurePath = materializedPath(workspace, acquisitionFailure.name);
    const materializer = new WorkspaceSkillMaterializer(profile, { logger: { warn }, fileSystem: {
      lstat: (async (target: Parameters<typeof fs.lstat>[0]) => {
        if (path.resolve(String(target)) === path.resolve(acquisitionFailurePath)) throw exactError;
        return fs.lstat(target);
      }) as typeof fs.lstat,
      unlink: async (target) => {
        if (path.resolve(String(target)) === path.resolve(cleanupFailurePath)) throw Object.assign(new Error("cleanup failed"), { code: "EIO" });
        return fs.unlink(target);
      },
    } });

    await expect(run(materializer, workspace, [expose(first), expose(cleanupFailure), expose(acquisitionFailure)])).rejects.toBe(exactError);
    expect(await isAbsent(firstPath)).toBe(true);
    expect((await fs.lstat(cleanupFailurePath)).isSymbolicLink()).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to roll back Test workspace skill acquisition for run 'run-1'"),
      expect.any(Error),
    );
  });

  it("does not process requests when skill access is NONE", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "disabled");
    const materializer = new WorkspaceSkillMaterializer(profile);

    expect(await run(materializer, workspace, [expose(skill)], SkillAccessMode.NONE)).toEqual([]);
    expect(await isAbsent(materializedPath(workspace, skill.name))).toBe(true);
  });

  it("leaves a replacement directory untouched during guarded cleanup", async () => {
    const source = await tempDir("workspace-skill-source-");
    const workspace = await tempDir("workspace-skill-workspace-");
    const skill = await skillFixture(source, "cleanup-guard");
    const materializer = new WorkspaceSkillMaterializer(profile);
    const descriptor = (await run(materializer, workspace, [expose(skill)]))[0]!;
    await fs.unlink(descriptor.materializedRootPath);
    await fs.mkdir(descriptor.materializedRootPath);
    await fs.writeFile(path.join(descriptor.materializedRootPath, "owned.txt"), "keep", "utf8");

    await materializer.cleanupMaterializedWorkspaceSkills([descriptor]);
    expect(await fs.readFile(path.join(descriptor.materializedRootPath, "owned.txt"), "utf8")).toBe("keep");
  });
});
