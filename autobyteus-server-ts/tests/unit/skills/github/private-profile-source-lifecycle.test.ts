import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeSkillProfile } from "../../../../src/agent-execution/backends/shared/runtime-skill-profile.js";
import { fixture, writeSkill } from "./fixtures.js";
const fixtures: ReturnType<typeof fixture>[] = [];
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));

describe("SR019 source publication is independent of private runtime profiles", () => {
  it.each(["claude", "codex", "grok"] as const)("%s peer-stop preserves sources; real Update/Remove retire bytes without waiting", async runtime => {
    const f = fixture(); fixtures.push(f);
    fs.writeFileSync(path.join(f.upstream, "unread-support.txt"), "v1 asset");
    await f.service.importGitHubSkillSource("https://github.com/acme/skills");
    const id = f.store.read()[0]!.id;
    const old = f.catalog.getSkill("writer")!;
    const workspace = path.join(f.root, "project"); fs.mkdirSync(workspace);
    const make = () => new RuntimeSkillProfile({ runtime, privateParent: path.join(f.data, "profiles"), workingDirectory: workspace,
      bindings: [{kind: "resolved", skill: old}], collisionPolicy: "fail", assertAccepting: () => {},
      resolveManagedSkill: (id, name) => f.catalog.resolveManagedSkillForMaterialization(id, name) });
    const a = make(), b = make(); await a.prepare(); await b.prepare();
    await a.release();
    expect(fs.readFileSync(path.join(b.exposures[0]!.linkRoot, "unread-support.txt"), "utf8")).toBe("v1 asset");
    expect(fs.existsSync(old.rootPath)).toBe(true);
    writeSkill(f.upstream, "writer", "v2"); f.setRevision("b".repeat(40));
    fs.writeFileSync(path.join(f.upstream, "unread-support.txt"), "v2 asset");
    await f.service.updateGitHubSkillSource(id);
    expect(fs.existsSync(old.rootPath)).toBe(false);
    expect(fs.lstatSync(b.exposures[0]!.linkRoot).isSymbolicLink()).toBe(true);
    const c = make(); await c.prepare(); // stale binding resolves through current catalog
    expect(c.exposures[0]!.sourceRoot).toBe(f.catalog.getSkill("writer")!.rootPath);
    expect(fs.readFileSync(path.join(c.exposures[0]!.linkRoot, "unread-support.txt"), "utf8")).toBe("v2 asset");
    await b.release(); // old wrapper close cannot delete new generation or profile
    expect(fs.existsSync(c.exposures[0]!.sourceRoot)).toBe(true);
    await f.service.removeGitHubSkillSource(id);
    expect(f.store.read()).toEqual([]);
    expect(fs.existsSync(c.exposures[0]!.sourceRoot)).toBe(false);
    expect(fs.lstatSync(c.exposures[0]!.linkRoot).isSymbolicLink()).toBe(true);
    await c.release();
    const d = make(); await d.prepare(); expect(d.exposures).toEqual([]); await d.release();
    expect(fs.readdirSync(workspace)).toEqual([]);
  });
});
