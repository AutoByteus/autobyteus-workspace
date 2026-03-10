import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  renderCodexWorkspaceSkillOpenAiYaml,
  renderConfiguredSkillInstructionBlock,
  resolveEnabledConfiguredRuntimeSkills,
  type ResolvedRuntimeSkill,
} from "../../../src/runtime-execution/configured-runtime-skills.js";

const sampleSkill: ResolvedRuntimeSkill = {
  name: "code-review",
  description: "Review code carefully.",
  content: "Always verify edge cases before approving changes.",
  rootPath: "/skills/code-review",
  skillFilePath: "/skills/code-review/SKILL.md",
};

describe("configured-runtime-skills", () => {
  it("suppresses configured skills when access mode is NONE", () => {
    expect(
      resolveEnabledConfiguredRuntimeSkills({
        configuredSkills: [sampleSkill],
        skillAccessMode: SkillAccessMode.NONE,
      }),
    ).toEqual([]);
    expect(
      renderConfiguredSkillInstructionBlock({
        configuredSkills: [sampleSkill],
        skillAccessMode: SkillAccessMode.NONE,
      }),
    ).toBeNull();
    expect(
      renderCodexWorkspaceSkillOpenAiYaml({
        ...sampleSkill,
        description: "",
      }),
    ).toContain("default_prompt:");
  });

  it("renders a Codex openai.yaml interface block for workspace skill materialization", () => {
    expect(
      renderCodexWorkspaceSkillOpenAiYaml(sampleSkill),
    ).toBe(
      [
        "interface:",
        '  display_name: "Code Review"',
        '  short_description: "Review code carefully."',
        '  default_prompt: "Use $code-review when the request matches this skill. Follow the instructions in SKILL.md."',
      ].join("\n"),
    );
  });

  it("suppresses configured skills for Codex materialization when access mode is NONE", () => {
    expect(
      resolveEnabledConfiguredRuntimeSkills({
        configuredSkills: [sampleSkill],
        skillAccessMode: SkillAccessMode.NONE,
      }),
    ).toEqual([]);
  });

  it("renders a selected-skill instruction block with root-path guidance", () => {
    const rendered = renderConfiguredSkillInstructionBlock({
      configuredSkills: [sampleSkill],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });

    expect(rendered).toContain("## Agent Configured Skills");
    expect(rendered).toContain("Only the agent-configured skills below are available for this run.");
    expect(rendered).toContain("Root Path: `/skills/code-review`");
    expect(rendered).toContain("Always verify edge cases before approving changes.");
  });
});
