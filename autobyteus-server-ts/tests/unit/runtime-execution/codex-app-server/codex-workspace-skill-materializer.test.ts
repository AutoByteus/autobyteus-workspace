import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  CodexWorkspaceSkillMaterializer,
} from "../../../../src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.js";
import type { ResolvedRuntimeSkill } from "../../../../src/runtime-execution/configured-runtime-skills.js";

const tempRoots: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(directory);
  return directory;
};

const createResolvedSkill = async (options: {
  name: string;
  description: string;
  includeOpenAiConfig?: boolean;
}): Promise<ResolvedRuntimeSkill> => {
  const rootPath = await createTempDir("codex-skill-src-");
  await fs.mkdir(path.join(rootPath, "scripts"), { recursive: true });
  await fs.writeFile(
    path.join(rootPath, "SKILL.md"),
    [
      "---",
      `name: ${options.name}`,
      `description: ${options.description}`,
      "---",
      "",
      "Follow the skill instructions.",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(path.join(rootPath, "scripts", "tool.sh"), "echo tool\n", "utf-8");
  if (options.includeOpenAiConfig) {
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await fs.writeFile(
      path.join(rootPath, "agents", "openai.yaml"),
      'interface:\n  display_name: "Existing Skill"\n',
      "utf-8",
    );
  }

  return {
    name: options.name,
    description: options.description,
    content: "Follow the skill instructions.",
    rootPath,
    skillFilePath: path.join(rootPath, "SKILL.md"),
  };
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
});

describe("CodexWorkspaceSkillMaterializer", () => {
  it("materializes configured skills into workspace-local .codex/skills bundles", async () => {
    const materializer = new CodexWorkspaceSkillMaterializer();
    const workspaceRoot = await createTempDir("codex-workspace-");
    const skill = await createResolvedSkill({
      name: "code-review",
      description: "Review code carefully.",
      includeOpenAiConfig: true,
    });

    const materialized = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(materialized).toHaveLength(1);
    expect(materialized[0]?.name).toBe("code-review");
    expect(materialized[0]?.materializedRootPath).toContain(
      path.join(workspaceRoot, ".codex", "skills"),
    );
    await expect(
      fs.readFile(path.join(materialized[0]!.materializedRootPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("name: code-review");
    await expect(
      fs.readFile(
        path.join(materialized[0]!.materializedRootPath, "agents", "openai.yaml"),
        "utf-8",
      ),
    ).resolves.toContain('display_name: "Existing Skill"');
    await expect(
      fs.readFile(
        path.join(materialized[0]!.materializedRootPath, "scripts", "tool.sh"),
        "utf-8",
      ),
    ).resolves.toContain("echo tool");
  });

  it("synthesizes agents/openai.yaml when the source skill does not provide one", async () => {
    const materializer = new CodexWorkspaceSkillMaterializer();
    const workspaceRoot = await createTempDir("codex-workspace-");
    const skill = await createResolvedSkill({
      name: "plain_skill",
      description: "Plain skill without agent metadata.",
    });

    const materialized = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    await expect(
      fs.readFile(
        path.join(materialized[0]!.materializedRootPath, "agents", "openai.yaml"),
        "utf-8",
      ),
    ).resolves.toContain('default_prompt: "Use $plain_skill when the request matches this skill. Follow the instructions in SKILL.md."');
  });

  it("suppresses workspace skill materialization when access mode is NONE", async () => {
    const materializer = new CodexWorkspaceSkillMaterializer();
    const workspaceRoot = await createTempDir("codex-workspace-");
    const skill = await createResolvedSkill({
      name: "code-review",
      description: "Review code carefully.",
    });

    const materialized = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.NONE,
    });

    expect(materialized).toEqual([]);
    await expect(
      fs.stat(path.join(workspaceRoot, ".codex", "skills")),
    ).rejects.toThrow();
  });

  it("reuses the same mirrored bundle for repeated acquisitions and removes it after the final cleanup", async () => {
    const materializer = new CodexWorkspaceSkillMaterializer();
    const workspaceRoot = await createTempDir("codex-workspace-");
    const skill = await createResolvedSkill({
      name: "code-review",
      description: "Review code carefully.",
    });

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
    await expect(fs.stat(first[0]!.materializedRootPath)).resolves.toBeTruthy();

    await materializer.cleanupMaterializedCodexWorkspaceSkills(second);
    await expect(fs.stat(first[0]!.materializedRootPath)).rejects.toThrow();
  });

  it("refreshes an owned leftover bundle from the current source skill contents", async () => {
    const workspaceRoot = await createTempDir("codex-workspace-");
    const skill = await createResolvedSkill({
      name: "code-review",
      description: "Review code carefully.",
    });

    const firstMaterializer = new CodexWorkspaceSkillMaterializer();
    const first = await firstMaterializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    await fs.writeFile(
      path.join(skill.rootPath, "SKILL.md"),
      [
        "---",
        "name: code-review",
        "description: Review code carefully.",
        "---",
        "",
        "Follow the refreshed skill instructions.",
      ].join("\n"),
      "utf-8",
    );

    const secondMaterializer = new CodexWorkspaceSkillMaterializer();
    const second = await secondMaterializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(second[0]?.materializedRootPath).toBe(first[0]?.materializedRootPath);
    await expect(
      fs.readFile(path.join(second[0]!.materializedRootPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("Follow the refreshed skill instructions.");
  });
});
