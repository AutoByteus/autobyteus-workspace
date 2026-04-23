import path from "node:path";
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
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, describe, expect, it } from "vitest";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  CodexWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";

const tempRoots: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
};

const resolveLinkTarget = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const createSkillFixture = async (input: {
  root: string;
  name: string;
  description?: string;
  content?: string;
}): Promise<Skill> => {
  const skillRoot = path.join(input.root, input.name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    input.content ?? `# ${input.name}\n\nskill content`,
    "utf-8",
  );

  return new Skill({
    name: input.name,
    description: input.description ?? `description for ${input.name}`,
    content: input.content ?? `# ${input.name}\n\nskill content`,
    rootPath: skillRoot,
    fileCount: 1,
  });
};

const createTeamSharedSymlinkSkillFixture = async (input: {
  root: string;
  name: string;
}): Promise<Skill> => {
  const teamRoot = path.join(input.root, "software-engineering-team");
  const skillRoot = path.join(teamRoot, "agents", input.name);
  const sharedRoot = path.join(teamRoot, "shared");
  await mkdir(skillRoot, { recursive: true });
  await mkdir(sharedRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    `# ${input.name}\n\nskill content`,
    "utf-8",
  );
  await writeFile(path.join(sharedRoot, "design-principles.md"), "design rules", "utf-8");
  await writeFile(path.join(sharedRoot, "common-design-practices.md"), "common rules", "utf-8");
  await symlink(
    path.join("..", "..", "shared", "design-principles.md"),
    path.join(skillRoot, "design-principles.md"),
  );
  await symlink(
    path.join("..", "..", "shared", "common-design-practices.md"),
    path.join(skillRoot, "common-design-practices.md"),
  );

  return new Skill({
    name: input.name,
    description: `description for ${input.name}`,
    content: `# ${input.name}\n\nskill content`,
    rootPath: skillRoot,
    fileCount: 3,
  });
};

describe("CodexWorkspaceSkillMaterializer", () => {
  afterEach(async () => {
    while (tempRoots.length > 0) {
      const target = tempRoots.pop();
      if (target) {
        await rm(target, { recursive: true, force: true });
      }
    }
  });

  it("materializes configured skills as intuitive workspace symlinks and reflects source updates", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "example_skill",
      content: "# Example\n\nUse me.",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(descriptor?.name).toBe("example_skill");
    expect(descriptor?.sourceRootPath).toBe(path.resolve(skill.rootPath));
    expect(descriptor?.materializedRootPath).toBe(
      path.join(workspaceRoot, ".codex", "skills", "example_skill"),
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

    await writeFile(
      path.join(skill.rootPath, "SKILL.md"),
      "# Example\n\nUse me live.",
      "utf-8",
    );
    expect(
      await readFile(path.join(descriptor.materializedRootPath, "SKILL.md"), "utf-8"),
    ).toContain("Use me live.");

    await expect(
      stat(path.join(descriptor.materializedRootPath, ".autobyteus-runtime-skill.json")),
    ).rejects.toThrow();
    await expect(
      stat(path.join(descriptor.materializedRootPath, "agents", "openai.yaml")),
    ).rejects.toThrow();
  });

  it("reuses existing materialization entries and only removes the symlink after the final cleanup", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "shared_skill",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const first = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
    const second = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(second[0]?.materializedRootPath).toBe(first[0]?.materializedRootPath);

    await materializer.cleanupMaterializedCodexWorkspaceSkills(first);
    expect((await lstat(first[0]!.materializedRootPath)).isSymbolicLink()).toBe(true);

    await materializer.cleanupMaterializedCodexWorkspaceSkills(second);
    await expect(lstat(first[0]!.materializedRootPath)).rejects.toThrow();
    await expect(stat(skill.rootPath)).resolves.toBeTruthy();
  });

  it("uses the sanitized skill name without the old hash suffix", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "Architecture Reviewer",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(path.basename(descriptor.materializedRootPath)).toBe("architecture-reviewer");
  });

  it("keeps team-shared relative symlinks working without creating a workspace shared mirror", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createTeamSharedSymlinkSkillFixture({
      root: sourceRoot,
      name: "architect-designer",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    const designPrinciplesPath = path.join(descriptor.materializedRootPath, "design-principles.md");
    const commonPracticesPath = path.join(
      descriptor.materializedRootPath,
      "common-design-practices.md",
    );
    const workspaceSharedPath = path.join(workspaceRoot, ".codex", "shared");
    const teamRoot = path.dirname(path.dirname(skill.rootPath));
    const sharedRoot = path.join(teamRoot, "shared");

    expect((await lstat(designPrinciplesPath)).isSymbolicLink()).toBe(true);
    expect((await lstat(commonPracticesPath)).isSymbolicLink()).toBe(true);
    expect(await readFile(designPrinciplesPath, "utf-8")).toBe("design rules");
    expect(await readFile(commonPracticesPath, "utf-8")).toBe("common rules");

    await writeFile(path.join(sharedRoot, "design-principles.md"), "updated design rules", "utf-8");
    expect(await readFile(designPrinciplesPath, "utf-8")).toBe("updated design rules");
    await expect(stat(workspaceSharedPath)).rejects.toThrow();
  });

  it("rejects collisions when the intuitive workspace path already points somewhere else", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "collision_skill",
    });
    const conflictingSkill = await createSkillFixture({
      root: sourceRoot,
      name: "different_source",
    });
    await mkdir(path.join(workspaceRoot, ".codex", "skills"), { recursive: true });
    await symlink(
      conflictingSkill.rootPath,
      path.join(workspaceRoot, ".codex", "skills", "collision_skill"),
      "dir",
    );
    const materializer = new CodexWorkspaceSkillMaterializer();

    await expect(
      materializer.materializeConfiguredCodexWorkspaceSkills({
        workingDirectory: workspaceRoot,
        configuredSkills: [skill],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    ).rejects.toThrow(/Workspace skill path collision/);
  });

  it("skips cleanup when the workspace path no longer matches the expected symlink", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "cleanup_guard",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    await rm(descriptor.materializedRootPath, { recursive: true, force: true });
    await mkdir(descriptor.materializedRootPath, { recursive: true });
    await writeFile(
      path.join(descriptor.materializedRootPath, "SKILL.md"),
      "# replacement",
      "utf-8",
    );

    await materializer.cleanupMaterializedCodexWorkspaceSkills([descriptor]);
    expect((await lstat(descriptor.materializedRootPath)).isDirectory()).toBe(true);
  });

  it("returns no materialized skills when skill access mode is NONE", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "hidden_skill",
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const descriptors = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.NONE,
    });

    expect(descriptors).toEqual([]);
    await expect(stat(path.join(workspaceRoot, ".codex", "skills"))).rejects.toThrow();
  });
});
