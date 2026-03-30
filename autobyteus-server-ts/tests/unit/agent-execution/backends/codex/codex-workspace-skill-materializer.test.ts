import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, describe, expect, it } from "vitest";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  CodexWorkspaceSkillMaterializer,
  renderCodexWorkspaceSkillOpenAiYaml,
} from "../../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";

const tempRoots: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
};

const createSkillFixture = async (input: {
  root: string;
  name: string;
  description?: string;
  content?: string;
  includeOpenAiYaml?: boolean;
}): Promise<Skill> => {
  const skillRoot = path.join(input.root, input.name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    input.content ?? `# ${input.name}\n\nskill content`,
    "utf-8",
  );
  await mkdir(path.join(skillRoot, ".git"), { recursive: true });
  await writeFile(path.join(skillRoot, ".git", "HEAD"), "ref: refs/heads/main\n", "utf-8");
  if (input.includeOpenAiYaml) {
    await mkdir(path.join(skillRoot, "agents"), { recursive: true });
    await writeFile(path.join(skillRoot, "agents", "openai.yaml"), "interface:\n  display_name: Existing\n", "utf-8");
  }

  return new Skill({
    name: input.name,
    description: input.description ?? `description for ${input.name}`,
    content: input.content ?? `# ${input.name}\n\nskill content`,
    rootPath: skillRoot,
    fileCount: 1,
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

  it("renders a Codex OpenAI YAML definition with display name and prompt", () => {
    const skill = new Skill({
      name: "send_message_to_team",
      description: "  Team messaging helper.  ",
      content: "# Test",
      rootPath: "/tmp/example-skill",
    });

    const yaml = renderCodexWorkspaceSkillOpenAiYaml(skill);

    expect(yaml).toContain('display_name: "Send Message To Team"');
    expect(yaml).toContain('short_description: "Team messaging helper."');
    expect(yaml).toContain('default_prompt: "Use $send_message_to_team when the request matches this skill. Follow the instructions in SKILL.md."');
  });

  it("materializes configured skills into the workspace and generates agent config", async () => {
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
    expect(descriptor?.sourceRootPath).toBe(skill.rootPath);
    expect(descriptor?.materializedRootPath).toContain(path.join(workspaceRoot, ".codex", "skills"));

    const materializedSkillMd = await readFile(
      path.join(descriptor.materializedRootPath, "SKILL.md"),
      "utf-8",
    );
    expect(materializedSkillMd).toContain("Use me.");

    const marker = JSON.parse(
      await readFile(
        path.join(descriptor.materializedRootPath, ".autobyteus-runtime-skill.json"),
        "utf-8",
      ),
    ) as { version: number; skillName: string; sourceRootPath: string };
    expect(marker.version).toBe(1);
    expect(marker.skillName).toBe("example_skill");
    expect(marker.sourceRootPath).toBe(skill.rootPath);

    const yaml = await readFile(
      path.join(descriptor.materializedRootPath, "agents", "openai.yaml"),
      "utf-8",
    );
    expect(yaml).toContain('display_name: "Example Skill"');
    expect(yaml).toContain('default_prompt: "Use $example_skill');

    await expect(
      stat(path.join(descriptor.materializedRootPath, ".git", "HEAD")),
    ).rejects.toThrow();
  });

  it("reuses existing materialization entries and only removes them after the final cleanup", async () => {
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
    await expect(stat(first[0]!.materializedRootPath)).resolves.toBeTruthy();

    await materializer.cleanupMaterializedCodexWorkspaceSkills(second);
    await expect(stat(first[0]!.materializedRootPath)).rejects.toThrow();
  });

  it("preserves an existing agents/openai.yaml from the source skill bundle", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: "existing_yaml_skill",
      includeOpenAiYaml: true,
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    const yaml = await readFile(
      path.join(descriptor.materializedRootPath, "agents", "openai.yaml"),
      "utf-8",
    );
    expect(yaml).toBe("interface:\n  display_name: Existing\n");
  });

  it("caps the materialized directory name to a Codex-safe length for long skill names", async () => {
    const sourceRoot = await createTempDir("codex-skill-src-");
    const workspaceRoot = await createTempDir("codex-skill-ws-");
    const longSkillName = `very_long_skill_name_${"x".repeat(120)}`;
    const skill = await createSkillFixture({
      root: sourceRoot,
      name: longSkillName,
    });
    const materializer = new CodexWorkspaceSkillMaterializer();

    const [descriptor] = await materializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: workspaceRoot,
      configuredSkills: [skill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(path.basename(descriptor.materializedRootPath).length).toBeLessThanOrEqual(64);
    expect(path.basename(descriptor.materializedRootPath).startsWith("autobyteus-")).toBe(true);
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
