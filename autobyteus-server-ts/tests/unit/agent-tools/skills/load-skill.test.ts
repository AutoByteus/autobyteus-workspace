import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const mockSkillService = {
  getSkill: vi.fn(),
  listSkills: vi.fn(),
};

vi.mock("../../../../src/skills/services/skill-service.js", () => ({
  SkillService: {
    getInstance: () => mockSkillService,
  },
}));

import { loadSkill, registerLoadSkillTool } from "../../../../src/agent-tools/skills/load-skill.js";

const tempDirs: string[] = [];

const createSkillRoot = (): string => {
  const skillRoot = fs.mkdtempSync(path.join(os.tmpdir(), "server-load-skill-"));
  tempDirs.push(skillRoot);
  fs.writeFileSync(path.join(skillRoot, "guide.md"), "guide", "utf8");
  return skillRoot;
};

describe("server load_skill tool", () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    mockSkillService.getSkill.mockReset();
    mockSkillService.listSkills.mockReset();
  });

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads a server-managed skill by name with runtime-use path context", async () => {
    const skillRoot = createSkillRoot();
    mockSkillService.getSkill.mockReturnValue({
      name: "example-skill",
      description: "Example description",
      content: "Read [guide](guide.md).",
      rootPath: skillRoot,
    });

    const tool = registerLoadSkillTool();
    const result = await tool.execute(
      {
        agentId: "agent-1",
        config: {
          skills: ["example-skill"],
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        },
      } as any,
      { skill_name: "example-skill" },
    );

    expect(result).toContain("## Skill: example-skill");
    expect(result).toContain(`Skill Base Path: ${skillRoot}`);
    expect(result).toContain("CRITICAL: Path Resolution");
    expect(result).toContain("Skill Base Path above");
    expect(result).toContain(`[guide](${path.join(skillRoot, "guide.md")})`);
  });

  it("rejects path-like input even when it matches a server-managed skill", async () => {
    const skillRoot = createSkillRoot();

    await expect(
      loadSkill(
        {
          agentId: "agent-1",
          config: {
            skills: ["example-skill"],
            skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          },
        } as any,
        skillRoot,
      ),
    ).rejects.toThrow("cannot be loaded by path");

    expect(mockSkillService.getSkill).not.toHaveBeenCalled();
    expect(mockSkillService.listSkills).not.toHaveBeenCalled();
  });

  it("rejects unmanaged arbitrary path loading", async () => {
    mockSkillService.listSkills.mockReturnValue([]);

    await expect(
      loadSkill({ agentId: "agent-1" } as any, "/tmp/not-a-managed-skill"),
    ).rejects.toThrow("cannot be loaded by path");
  });

  it("blocks non-configured skill loads at runtime", async () => {
    await expect(
      loadSkill(
        {
          agentId: "agent-1",
          config: {
            skills: ["other-skill"],
            skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          },
        } as any,
        "example-skill",
      ),
    ).rejects.toThrow("is not configured for this agent");

    expect(mockSkillService.getSkill).not.toHaveBeenCalled();
  });

  it("blocks path loads at runtime", async () => {
    await expect(
      loadSkill(
        {
          agentId: "agent-1",
          config: {
            skills: ["example-skill"],
            skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          },
        } as any,
        "/tmp/example-skill",
      ),
    ).rejects.toThrow("cannot be loaded by path");
  });

  it("blocks all skill loads when mode is NONE", async () => {
    await expect(
      loadSkill(
        {
          agentId: "agent-1",
          config: {
            skills: ["example-skill"],
            skillAccessMode: SkillAccessMode.NONE,
          },
        } as any,
        "example-skill",
      ),
    ).rejects.toThrow("Skill access is disabled");
  });
});
