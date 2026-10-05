import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillSourceService } from "../../../../src/skills/services/skill-source-service.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { GitHubSkillSourceStore } from "../../../../src/skills/stores/github-skill-source-store.js";
import { parseGitHubSkillRepository } from "../../../../src/integrations/github/github-repository-source.js";
import { fixture, writeSkill } from "./fixtures.js";

const fixtures: ReturnType<typeof fixture>[] = [];
const setup = () => { const f = fixture(); fixtures.push(f); return f; };
const url = "https://github.com/acme/skills";
afterEach(() => { vi.restoreAllMocks(); fixtures.splice(0).forEach(f => f.cleanup()); });

describe("GitHub skill source lifecycle through its public owner", () => {
  it("imports one root skill, preserves supporting files, ignores nested skill/agent definitions and survives restart", async () => {
    const f = setup();
    writeSkill(path.join(f.upstream, "skills", "child"), "child");
    writeSkill(path.join(f.upstream, "agents", "agent", "skills", "other"), "other");
    fs.writeFileSync(path.join(f.upstream, "notes.txt"), "support");
    const result = await f.service.importGitHubSkillSource(url + ".git/");
    const row = result.sources.find(s => s.github)!;
    expect(row.skillCount).toBe(1);
    expect(f.catalog.listSkills().map(s => s.name)).toEqual(["writer"]);
    expect(fs.readFileSync(path.join(row.path, "notes.txt"), "utf8")).toBe("support");
    const restarted = new SkillService({ config: f.config, sourceStore: new GitHubSkillSourceStore(f.data) });
    expect(restarted.getSkill("writer")?.managedSource?.sourceId).toBe(row.sourceId);
    expect(fs.existsSync(path.join(f.data, "agents"))).toBe(false);
    await f.service.importGitHubSkillSource("https://www.github.com/ACME/skills");
    expect(f.downloads).toBe(1);
  });

  it("imports direct and nested skills collections with skipped-candidate diagnostics", async () => {
    const f = setup();
    fs.rmSync(path.join(f.upstream, "SKILL.md"));
    writeSkill(path.join(f.upstream, "direct"), "direct");
    writeSkill(path.join(f.upstream, "skills", "nested"), "nested");
    writeSkill(path.join(f.upstream, "skills", "skills", "deeper"), "deeper");
    writeSkill(path.join(f.upstream, "agents", "not-discovered"), "hidden");
    fs.mkdirSync(path.join(f.upstream, "bad")); fs.writeFileSync(path.join(f.upstream, "bad", "SKILL.md"), "bad");
    const result = await f.service.importGitHubSkillSource(url);
    expect(result.warnings.join(" ")).toContain("bad");
    expect(f.catalog.listSkills().map(s => s.name)).toEqual(["deeper", "direct", "nested"]);
  });

  it.each(["empty", "invalid-root", "duplicate"])("rejects %s repository without a published partial source", async kind => {
    const f = setup();
    fs.rmSync(path.join(f.upstream, "SKILL.md"));
    if (kind === "invalid-root") { fs.writeFileSync(path.join(f.upstream, "SKILL.md"), "invalid"); writeSkill(path.join(f.upstream, "child")); }
    if (kind === "duplicate") { writeSkill(path.join(f.upstream, "one")); writeSkill(path.join(f.upstream, "two")); }
    await expect(f.service.importGitHubSkillSource(url)).rejects.toThrow();
    expect(f.store.read()).toEqual([]);
    expect(f.catalog.listSkills()).toEqual([]);
  });

  it("checks metadata without downloads or file replacement and retains offline availability", async () => {
    const f = setup();
    await f.service.importGitHubSkillSource(url);
    const skill = f.catalog.getSkill("writer")!;
    fs.writeFileSync(path.join(skill.rootPath, "notes"), "local edit");
    f.setRevision("b".repeat(40));
    expect((await f.service.checkGitHubSkillSourceUpdates()).sources.find(s => s.github)?.github?.status).toBe("UPDATE_AVAILABLE");
    f.setError(new Error("offline"));
    const result = await f.service.checkGitHubSkillSourceUpdates();
    expect(result.sources.find(s => s.github)?.github?.status).toBe("CHECK_FAILED");
    expect(fs.readFileSync(path.join(skill.rootPath, "notes"), "utf8")).toBe("local edit");
    expect(f.catalog.getSkill("writer")).not.toBeNull();
    expect(f.downloads).toBe(1);
  });

  it("updates whole generations, self-excludes only old source and retains disabled names", async () => {
    const f = setup(); await f.service.importGitHubSkillSource(url);
    const id = f.store.read()[0]!.id;
    const old = f.catalog.getSkill("writer")!.rootPath;
    f.catalog.disableSkill("writer");
    fs.writeFileSync(path.join(old, "local-edit"), "discard");
    writeSkill(f.upstream, "writer", "v2"); f.setRevision("b".repeat(40));
    await f.service.updateGitHubSkillSource(id);
    const updated = f.catalog.getSkill("writer")!;
    expect(updated.content).toBe("v2"); expect(updated.isDisabled).toBe(true);
    expect(updated.rootPath).not.toBe(old); expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(path.join(updated.rootPath, "local-edit"))).toBe(false);
    fs.writeFileSync(path.join(updated.rootPath, "local-edit"), "retain if same revision");
    await f.service.updateGitHubSkillSource(id);
    expect(f.downloads).toBe(2);
    expect(fs.existsSync(path.join(updated.rootPath, "local-edit"))).toBe(true);
  });

  it("rejects conflicts as one operation, while runtime defaults remain notices", async () => {
    const f = setup();
    writeSkill(path.join(f.skills, "existing"), "writer");
    await expect(f.service.importGitHubSkillSource(url)).rejects.toThrow(/name/i);
    fs.rmSync(path.join(f.skills, "existing"), { recursive: true });
    const runtime = path.join(f.root, "runtime-default"); writeSkill(path.join(runtime, "writer"));
    f.service.addSkillSource(runtime);
    await f.service.importGitHubSkillSource(url);
    expect(f.catalog.getSkill("writer")?.managedSource).not.toBeNull();
    expect(fs.existsSync(path.join(runtime, "writer", "SKILL.md"))).toBe(true);
    const id = f.store.read()[0]!.id;
    const old = f.catalog.getSkill("writer")!.rootPath;
    writeSkill(path.join(f.skills, "another"), "conflict");
    writeSkill(f.upstream, "conflict"); f.setRevision("b".repeat(40));
    await expect(f.service.updateGitHubSkillSource(id)).rejects.toThrow(/name/i);
    expect(f.catalog.getSkill("writer")!.rootPath).toBe(old);
  });

  it("rechecks current local catalog immediately before publication after download", async () => {
    const f = setup();
    const prepare = f.repository.prepare.bind(f.repository);
    vi.spyOn(f.repository, "prepare").mockImplementation(async (...args) => {
      const candidate = await prepare(...args);
      f.catalog.createSkill("writer", "local", "concurrent");
      return candidate;
    });
    await expect(f.service.importGitHubSkillSource(url)).rejects.toThrow(/name/i);
    expect(f.store.read()).toEqual([]);
    expect(f.catalog.getSkill("writer")?.content).toBe("concurrent");
  });

  it("distinguishes pre-publication failure from committed cleanup warnings", async () => {
    const f = setup(); await f.service.importGitHubSkillSource(url);
    const id = f.store.read()[0]!.id; const old = f.catalog.getSkill("writer")!.rootPath;
    writeSkill(f.upstream, "writer", "v2"); f.setRevision("b".repeat(40));
    const write = vi.spyOn(f.store, "write").mockImplementation(() => { throw new Error("disk full"); });
    await expect(f.service.updateGitHubSkillSource(id)).rejects.toThrow("disk full");
    expect(f.catalog.getSkill("writer")!.rootPath).toBe(old);
    write.mockRestore();
    const cleanup = vi.spyOn(f.repository, "cleanup").mockRejectedValue(new Error("busy tree"));
    const result = await f.service.updateGitHubSkillSource(id);
    expect(result.warnings.join(" ")).toContain("committed");
    expect(f.catalog.getSkill("writer")!.content).toBe("v2");
    expect(fs.existsSync(old)).toBe(true);
    cleanup.mockRestore();
    await f.service.updateGitHubSkillSource(id);
    expect(fs.existsSync(old)).toBe(false);
  });

  it("retains REMOVING on deletion failure and supports restart/retry without reimport", async () => {
    const f = setup(); await f.service.importGitHubSkillSource(url);
    const id = f.store.read()[0]!.id;
    const cleanup = vi.spyOn(f.repository, "cleanup").mockRejectedValue(new Error("permission"));
    await expect(f.service.removeGitHubSkillSource(id)).rejects.toThrow("permission");
    expect(f.catalog.getSkill("writer")).toBeNull();
    expect(f.store.read()[0]?.state).toBe("REMOVING");
    await expect(f.service.importGitHubSkillSource(url)).rejects.toThrow("Removal incomplete");
    cleanup.mockRestore();
    const service = new SkillSourceService({ config: f.config, catalog: f.catalog, store: new GitHubSkillSourceStore(f.data),
      repository: f.repository, client: f.client, invalidateWorkspaces: async () => {} });
    await service.removeGitHubSkillSource(id);
    expect(f.store.read()).toEqual([]);
    expect(fs.existsSync(f.upstream)).toBe(true);
  });

  it("keeps local unlink non-destructive and blocks default/managed local mutations", async () => {
    const f = setup(); const local = path.join(f.root, "local"); writeSkill(path.join(local, "other"), "other");
    f.service.addSkillSource(local); f.service.removeSkillSource(local);
    expect(fs.existsSync(local)).toBe(true);
    expect(() => f.service.removeSkillSource(f.skills)).toThrow("default");
    await f.service.importGitHubSkillSource(url);
    expect(() => f.service.addSkillSource(f.catalog.getSkill("writer")!.rootPath)).toThrow("Managed");
  });

  it("preserves malformed registry bytes while admitting unrelated local skills", async () => {
    const f = setup(); f.store.ensureRoot();
    fs.writeFileSync(f.store.registryPath, "{bad");
    writeSkill(path.join(f.skills, "local"), "local");
    expect(f.catalog.listSkills().map(s => s.name)).toEqual(["local"]);
    expect(f.service.getRegistryError()).toContain("unavailable");
    await expect(f.service.importGitHubSkillSource(url)).rejects.toThrow();
    expect(fs.readFileSync(f.store.registryPath, "utf8")).toBe("{bad");
  });

  it("cleans interrupted unpublished imports before preparing a new source", async () => {
    const f = setup(); f.store.ensureRoot();
    const orphan = "12345678-1234-4234-8234-123456789abc";
    fs.mkdirSync(path.join(f.store.root, orphan, "generations"), { recursive: true });
    fs.mkdirSync(path.join(f.store.root, ".staging", orphan + "-attempt"), { recursive: true });
    await f.service.importGitHubSkillSource(url);
    expect(fs.existsSync(path.join(f.store.root, orphan))).toBe(false);
    expect(fs.existsSync(path.join(f.store.root, ".staging", orphan + "-attempt"))).toBe(false);
    expect(f.catalog.getSkill("writer")).not.toBeNull();
  });

  it("serializes duplicate imports and update/check/removal without stale resurrection", async () => {
    const f = setup();
    await Promise.all([f.service.importGitHubSkillSource(url), f.service.importGitHubSkillSource(url + ".git")]);
    expect(f.downloads).toBe(1);
    const id = f.store.read()[0]!.id;
    f.setRevision("b".repeat(40));
    await Promise.all([f.service.updateGitHubSkillSource(id), f.service.checkGitHubSkillSourceUpdates(), f.service.removeGitHubSkillSource(id)]);
    expect(f.store.read()).toEqual([]);
    expect(f.catalog.listSkills()).toEqual([]);
  });
});

describe("public repository root input", () => {
  it("normalizes the default HTTPS port and ordinary URL variants", () => {
    expect(parseGitHubSkillRepository("https://www.github.com:443/Acme/skills.git/").normalizedRepository).toBe("acme/skills");
  });
  it.each(["http://github.com/a/b", "https://github.com/a/b/tree/main", "https://github.com/a/b?x=y",
    "https://user@github.com/a/b", "https://github.com:444/a/b", "https://github.com/a/../b",
    "https://github.com/a/%2fb", "https://example.com/a/b", "https://github.com/a/b#x", "https://github.com/a/.."])("rejects %s", value => {
    expect(() => parseGitHubSkillRepository(value)).toThrow();
  });
});
