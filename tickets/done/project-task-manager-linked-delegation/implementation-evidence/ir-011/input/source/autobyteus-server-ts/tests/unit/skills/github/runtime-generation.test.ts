import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSkillMaterializer } from "../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import { fixture, writeSkill } from "./fixtures.js";

const roots: ReturnType<typeof fixture>[] = [];
afterEach(() => { vi.restoreAllMocks(); roots.splice(0).forEach(root => root.cleanup()); });

async function setup(options: ConstructorParameters<typeof WorkspaceSkillMaterializer>[1] = {}) {
  const f = fixture(); roots.push(f);
  await f.service.importGitHubSkillSource("https://github.com/acme/skills");
  const id = f.store.read()[0]!.id;
  const workspace = path.join(f.root, "workspace");
  const materializer = new WorkspaceSkillMaterializer({ runtimeLabel: "Test", workspaceSkillsRootSegments: [".codex", "skills"] },
    { resolveManagedSkill: (id, name) => f.catalog.resolveManagedSkillForMaterialization(id, name), ...options });
  const first = f.catalog.getSkill("writer")!;
  const run = (skill = f.catalog.getSkill("writer")!, kind: "expose-resolved" | "reconcile-discoverable" = "expose-resolved", policy: "fail" | "prefer_workspace" = "fail") =>
    materializer.materializeConfiguredWorkspaceSkills({ runId: "run", workingDirectory: workspace,
      requests: [{ kind, skill }], workspaceCollisionPolicy: policy });
  const update = async () => { writeSkill(f.upstream, "writer", "v2"); f.setRevision("b".repeat(40)); await f.service.updateGitHubSkillSource(id); };
  return { f, id, workspace, materializer, first, run, update };
}

describe("DS-008 source update to next same-workspace acquisition", () => {
  it.each(([false, true] as const).flatMap(retain => ([false, true] as const).flatMap(reverse =>
    (["fail", "prefer_workspace"] as const).map(policy => [retain, reverse, policy] as const))))(
    "keeps A live while B takes current generation (retain old tree=%s, B releases first=%s, policy=%s)",
    async (retainOld, releaseBFirst, policy) => {
      const s = await setup();
      const a = await s.run(undefined, "expose-resolved", policy);
      if (retainOld) vi.spyOn(s.f.repository, "cleanup").mockResolvedValue();
      await s.update();
      const b = await s.run(undefined, "expose-resolved", policy);
      expect(b.materializedSkills[0]!.sourceRootPath).not.toBe(a.materializedSkills[0]!.sourceRootPath);
      const link = b.materializedSkills[0]!.materializedRootPath;
      expect(fs.readFileSync(path.join(link, "SKILL.md"), "utf8")).toContain("v2");
      const order = releaseBFirst ? [b, a] : [a, b];
      await s.materializer.cleanupMaterializedWorkspaceSkills(order[0]!.materializedSkills);
      expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
      await s.materializer.cleanupMaterializedWorkspaceSkills(order[1]!.materializedSkills);
      expect(fs.existsSync(link)).toBe(false);
      await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
    });

  it("refreshes stale native discovery, carries occurrence holders and never transfers backwards", async () => {
    const s = await setup();
    const a = await s.run();
    await s.update();
    const [b, c] = await Promise.all([s.run(s.first, "reconcile-discoverable"), s.run(s.first)]);
    expect(b.effectiveRequests[0]?.kind).toBe("expose-resolved");
    expect(b.materializedSkills[0]!.sourceRootPath).toBe(s.f.catalog.getSkill("writer")!.rootPath);
    expect(c.materializedSkills[0]!.holderId).not.toBe(b.materializedSkills[0]!.holderId);
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
    await s.materializer.cleanupMaterializedWorkspaceSkills(b.materializedSkills);
    expect(fs.existsSync(c.materializedSkills[0]!.materializedRootPath)).toBe(true);
    await s.materializer.cleanupMaterializedWorkspaceSkills(c.materializedSkills);
    expect(fs.existsSync(c.materializedSkills[0]!.materializedRootPath)).toBe(false);
  });

  it("settles failed transfer and allows retry with old holders intact", async () => {
    let fail = false;
    const s = await setup({ syncFileSystem: { renameSync: (old, next) => {
      if (fail) throw new Error("transfer denied");
      fs.renameSync(old, next);
    } } });
    const a = await s.run(); await s.update(); fail = true;
    const attempts = await Promise.allSettled([s.run(), s.run()]);
    expect(attempts.map(a => a.status)).toEqual(["rejected", "rejected"]);
    fail = false;
    const b = await s.run();
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
    expect(fs.existsSync(b.materializedSkills[0]!.materializedRootPath)).toBe(true);
    await s.materializer.cleanupMaterializedWorkspaceSkills(b.materializedSkills);
    expect(fs.existsSync(b.materializedSkills[0]!.materializedRootPath)).toBe(false);
  });

  it("revalidates catalog after asynchronous preparation and release during transfer cannot clean B's link", async () => {
    let block = false;
    let entered!: () => void, release!: () => void;
    const waiting = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const s = await setup({ fileSystem: { stat: (async (...args: Parameters<typeof import("node:fs/promises").stat>) => {
      if (block) { entered(); await gate; }
      return fs.promises.stat(...args);
    }) as typeof fs.promises.stat } });
    const a = await s.run(); block = true;
    const starting = s.run(s.first);
    await waiting;
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
    await s.update(); release();
    const b = await starting;
    expect(b.materializedSkills[0]!.sourceRootPath).toBe(s.f.catalog.getSkill("writer")!.rootPath);
    await s.materializer.cleanupMaterializedWorkspaceSkills(b.materializedSkills);
    expect(fs.existsSync(b.materializedSkills[0]!.materializedRootPath)).toBe(false);
  });

  it("keeps genuine different-source collisions after remove/reimport while A is live", async () => {
    const s = await setup(); const a = await s.run();
    await s.f.service.removeGitHubSkillSource(s.id);
    await s.f.service.importGitHubSkillSource("https://github.com/acme/skills");
    expect(s.f.catalog.getSkill("writer")!.managedSource!.sourceId).not.toBe(s.id);
    await expect(s.run()).rejects.toThrow(/collision/);
    expect(fs.lstatSync(a.materializedSkills[0]!.materializedRootPath).isSymbolicLink()).toBe(true);
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
  });

  it("does not transfer to a renamed exact-name alias sharing the sanitized path", async () => {
    const s = await setup(); const a = await s.run();
    writeSkill(s.f.upstream, "Writer", "renamed"); s.f.setRevision("b".repeat(40));
    await s.f.service.updateGitHubSkillSource(s.id);
    const renamed = s.f.catalog.getSkill("Writer")!;
    await expect(s.run(renamed)).rejects.toThrow("collision");
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
  });

  it.each(["fail", "prefer_workspace"] as const)("preserves a user replacement under %s", async policy => {
    const s = await setup(); const a = await s.run(); await s.update();
    const link = a.materializedSkills[0]!.materializedRootPath;
    fs.unlinkSync(link); fs.mkdirSync(link); fs.writeFileSync(path.join(link, "user"), "keep");
    const result = s.materializer.materializeConfiguredWorkspaceSkills({ runId: "B", workingDirectory: s.workspace,
      requests: [{ kind: "expose-resolved", skill: s.f.catalog.getSkill("writer")! }], workspaceCollisionPolicy: policy });
    if (policy === "fail") await expect(result).rejects.toThrow("collision");
    else expect((await result).materializedSkills).toEqual([]);
    await s.materializer.cleanupMaterializedWorkspaceSkills(a.materializedSkills);
    expect(fs.readFileSync(path.join(link, "user"), "utf8")).toBe("keep");
  });
});
