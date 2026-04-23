import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  ClaudeWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/claude/claude-workspace-skill-materializer.js";

const tempDirs = new Set<string>();

const resolveLinkTarget = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const createSkillFixture = async (input: {
  rootDir: string;
  name: string;
  description?: string;
  content?: string;
}): Promise<Skill> => {
  const skillRoot = path.join(input.rootDir, input.name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    input.content ?? `---\nname: ${input.name}\ndescription: ${input.description ?? "skill"}\n---\n\nUse me.\n`,
    "utf-8",
  );
  await writeFile(path.join(skillRoot, "extra.txt"), "extra", "utf-8");
  return new Skill({
    name: input.name,
    description: input.description ?? "skill",
    content: input.content ?? "Use me.",
    rootPath: skillRoot,
  });
};

describe("ClaudeWorkspaceSkillMaterializer", () => {
  afterEach(async () => {
    await Promise.all(
      Array.from(tempDirs).map((dirPath) => rm(dirPath, { recursive: true, force: true })),
    );
    tempDirs.clear();
  });

  it("materializes configured skills into .claude/skills as symlinks and reflects source updates", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-"));
    const skillSourceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-source-"));
    tempDirs.add(workspaceRoot);
    tempDirs.add(skillSourceRoot);

    const skill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "reply_style",
    });
    const materializer = new ClaudeWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredClaudeWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(descriptor.name).toBe("reply_style");
    expect(descriptor.sourceRootPath).toBe(path.resolve(skill.rootPath));
    expect(descriptor.materializedRootPath).toBe(
      path.join(workspaceRoot, ".claude", "skills", "reply_style"),
    );
    expect((await lstat(descriptor.materializedRootPath)).isSymbolicLink()).toBe(true);
    expect(
      resolveLinkTarget(
        descriptor.materializedRootPath,
        await readlink(descriptor.materializedRootPath),
      ),
    ).toBe(path.resolve(skill.rootPath));

    expect(
      await readFile(path.join(descriptor.materializedRootPath, "SKILL.md"), "utf-8"),
    ).toContain("Use me.");

    await writeFile(path.join(skill.rootPath, "extra.txt"), "updated", "utf-8");
    expect(await readFile(path.join(descriptor.materializedRootPath, "extra.txt"), "utf-8")).toBe(
      "updated",
    );

    await expect(
      stat(path.join(descriptor.materializedRootPath, ".autobyteus-runtime-skill.json")),
    ).rejects.toThrow();
  });

  it("reuses and cleans up a materialized skill only after the last holder releases it", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-"));
    const skillSourceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-source-"));
    tempDirs.add(workspaceRoot);
    tempDirs.add(skillSourceRoot);

    const skill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "reply_style",
    });
    const materializer = new ClaudeWorkspaceSkillMaterializer();

    const first = await materializer.materializeConfiguredClaudeWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
    const second = await materializer.materializeConfiguredClaudeWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(first[0]?.materializedRootPath).toBe(second[0]?.materializedRootPath);

    await materializer.cleanupMaterializedClaudeWorkspaceSkills(first);
    expect((await lstat(second[0]!.materializedRootPath)).isSymbolicLink()).toBe(true);

    await materializer.cleanupMaterializedClaudeWorkspaceSkills(second);
    await expect(lstat(second[0]!.materializedRootPath)).rejects.toThrow();
    await expect(stat(skill.rootPath)).resolves.toBeTruthy();
  });

  it("rejects collisions when the intuitive workspace path already points somewhere else", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-"));
    const skillSourceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-source-"));
    tempDirs.add(workspaceRoot);
    tempDirs.add(skillSourceRoot);

    const skill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "reply_style",
    });
    const conflictingSkill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "different_source",
    });
    await mkdir(path.join(workspaceRoot, ".claude", "skills"), { recursive: true });
    await symlink(
      conflictingSkill.rootPath,
      path.join(workspaceRoot, ".claude", "skills", "reply_style"),
      "dir",
    );
    const materializer = new ClaudeWorkspaceSkillMaterializer();

    await expect(
      materializer.materializeConfiguredClaudeWorkspaceSkills({
        workingDirectory: workspaceRoot,
        configuredSkills: [skill],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    ).rejects.toThrow(/Workspace skill path collision/);
  });

  it("skips cleanup when the workspace path no longer matches the expected symlink", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-"));
    const skillSourceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-source-"));
    tempDirs.add(workspaceRoot);
    tempDirs.add(skillSourceRoot);

    const skill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "reply_style",
    });
    const materializer = new ClaudeWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredClaudeWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    await rm(descriptor.materializedRootPath, { recursive: true, force: true });
    await mkdir(descriptor.materializedRootPath, { recursive: true });
    await writeFile(path.join(descriptor.materializedRootPath, "SKILL.md"), "# replacement", "utf-8");

    await materializer.cleanupMaterializedClaudeWorkspaceSkills([descriptor]);
    expect((await lstat(descriptor.materializedRootPath)).isDirectory()).toBe(true);
  });

  it("returns no materialized skills when skill access is disabled", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-"));
    const skillSourceRoot = await mkdtemp(path.join(os.tmpdir(), "claude-skill-source-"));
    tempDirs.add(workspaceRoot);
    tempDirs.add(skillSourceRoot);

    const skill = await createSkillFixture({
      rootDir: skillSourceRoot,
      name: "reply_style",
    });
    const materializer = new ClaudeWorkspaceSkillMaterializer();

    const descriptors = await materializer.materializeConfiguredClaudeWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.NONE,
    });

    expect(descriptors).toEqual([]);
    await expect(stat(path.join(workspaceRoot, ".claude", "skills"))).rejects.toThrow();
  });
});
