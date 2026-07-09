import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillImprovementSkillPackageTreeRenderer } from "../../src/skill-improvement/services/improver-session/skill-improvement-skill-package-tree-renderer.js";

const makeSkillTarget = (rootPath: string) => ({
  skillRootPath: rootPath,
  skillMdPath: path.join(rootPath, "SKILL.md"),
});

describe("SkillImprovementSkillPackageTreeRenderer", () => {
  let tempRoot: string;
  let skillRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-improvement-package-tree-"));
    skillRoot = path.join(tempRoot, "durable-skill");
    await fs.mkdir(skillRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("renders a relative package tree with SKILL.md marked as the entry file", async () => {
    await fs.mkdir(path.join(skillRoot, "references"), { recursive: true });
    await fs.mkdir(path.join(skillRoot, "templates"), { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "references", "guide.md"), "# Guide\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "templates", "handoff.md"), "# Handoff\n", "utf-8");

    const tree = await new SkillImprovementSkillPackageTreeRenderer().render(makeSkillTarget(skillRoot));

    expect(tree).toContain(".");
    expect(tree).toContain("SKILL.md [entry]");
    expect(tree).toContain("references/");
    expect(tree).toContain("guide.md");
    expect(tree).toContain("templates/");
    expect(tree).toContain("handoff.md");
    expect(tree).not.toContain(skillRoot);
  });

  it("excludes hidden, generated, dependency, raw-trace, binary-heavy, and symlink entries", async () => {
    const outsideRoot = path.join(tempRoot, "outside");
    await fs.mkdir(path.join(skillRoot, ".cache"), { recursive: true });
    await fs.mkdir(path.join(skillRoot, "dist"), { recursive: true });
    await fs.mkdir(path.join(skillRoot, "node_modules", "pkg"), { recursive: true });
    await fs.mkdir(outsideRoot, { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, ".hidden.md"), "hidden\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "dist", "generated.md"), "generated\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "node_modules", "pkg", "index.js"), "module.exports = {};\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "diagram.png"), "not really png\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "raw_traces_active.jsonl"), "{}\n", "utf-8");
    await fs.writeFile(path.join(outsideRoot, "outside.md"), "outside\n", "utf-8");
    await fs.symlink(outsideRoot, path.join(skillRoot, "outside-link"));

    const tree = await new SkillImprovementSkillPackageTreeRenderer().render(makeSkillTarget(skillRoot));

    expect(tree).toContain("SKILL.md [entry]");
    expect(tree).not.toContain(".cache");
    expect(tree).not.toContain(".hidden.md");
    expect(tree).not.toContain("dist");
    expect(tree).not.toContain("generated.md");
    expect(tree).not.toContain("node_modules");
    expect(tree).not.toContain("diagram.png");
    expect(tree).not.toContain("raw_traces");
    expect(tree).not.toContain("outside-link");
    expect(tree).not.toContain("outside.md");
  });

  it("reports omitted entries when depth and entry caps are reached", async () => {
    await fs.mkdir(path.join(skillRoot, "references", "nested"), { recursive: true });
    await fs.writeFile(path.join(skillRoot, "SKILL.md"), "# Durable Skill\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "references", "nested", "deep.md"), "# Deep\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "a.md"), "A\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "b.md"), "B\n", "utf-8");
    await fs.writeFile(path.join(skillRoot, "c.md"), "C\n", "utf-8");

    const tree = await new SkillImprovementSkillPackageTreeRenderer({
      maxDepth: 2,
      maxEntries: 4,
    }).render(makeSkillTarget(skillRoot));

    expect(tree).toContain("SKILL.md [entry]");
    expect(tree).toContain("references/");
    expect(tree).toContain("nested/");
    expect(tree).toContain("entries omitted");
  });
});
