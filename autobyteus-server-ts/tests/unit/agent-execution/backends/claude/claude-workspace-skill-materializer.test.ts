import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  ClaudeWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/claude/claude-workspace-skill-materializer.js";

const createSkillFixture = async (input: {
  rootDir: string;
  name: string;
  description?: string;
  content?: string;
}): Promise<Skill> => {
  const skillRoot = path.join(input.rootDir, input.name);
  await mkdir(path.join(skillRoot, ".git"), { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    input.content ?? `---\nname: ${input.name}\ndescription: ${input.description ?? "skill"}\n---\n\nUse me.\n`,
    "utf-8",
  );
  await writeFile(path.join(skillRoot, ".git", "ignored.txt"), "ignored", "utf-8");
  await writeFile(path.join(skillRoot, "extra.txt"), "extra", "utf-8");
  return new Skill({
    name: input.name,
    description: input.description ?? "skill",
    content: input.content ?? "Use me.",
    rootPath: skillRoot,
  });
};

describe("ClaudeWorkspaceSkillMaterializer", () => {
  const tempDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(
      Array.from(tempDirs).map((dirPath) => rm(dirPath, { recursive: true, force: true })),
    );
    tempDirs.clear();
  });

  it("materializes configured skills into .claude/skills and writes ownership markers", async () => {
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
    expect(descriptor.materializedRootPath).toBe(
      path.join(workspaceRoot, ".claude", "skills", "reply_style"),
    );

    const materializedSkillMd = await readFile(
      path.join(descriptor.materializedRootPath, "SKILL.md"),
      "utf-8",
    );
    expect(materializedSkillMd).toContain("Use me.");

    await expect(stat(path.join(descriptor.materializedRootPath, ".git"))).rejects.toThrow();

    const marker = JSON.parse(
      await readFile(
        path.join(descriptor.materializedRootPath, ".autobyteus-runtime-skill.json"),
        "utf-8",
      ),
    ) as { skillName: string; sourceRootPath: string };
    expect(marker.skillName).toBe("reply_style");
    expect(marker.sourceRootPath).toBe(skill.rootPath);
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
    await expect(stat(second[0]!.materializedRootPath)).resolves.toBeTruthy();

    await materializer.cleanupMaterializedClaudeWorkspaceSkills(second);
    await expect(stat(second[0]!.materializedRootPath)).rejects.toThrow();
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
