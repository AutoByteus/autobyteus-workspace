import { beforeEach, describe, expect, it, vi } from "vitest";
import { TreeNode } from "../../../../src/file-explorer/tree-node.js";

const mockSkillService = {
  getSkill: vi.fn(),
  getSkillFileTree: vi.fn(),
};

vi.mock("../../../../src/skills/services/skill-service.js", () => ({
  SkillService: {
    getInstance: () => mockSkillService,
  },
}));

import { getSkillContent, registerGetSkillContentTool } from "../../../../src/agent-tools/skills/get-skill-content.js";

describe("getSkillContentTool", () => {
  beforeEach(() => {
    mockSkillService.getSkill.mockReset();
    mockSkillService.getSkillFileTree.mockReset();
  });

  it("returns formatted skill content with file tree", async () => {
    mockSkillService.getSkill.mockReturnValue({
      name: "example-skill",
      description: "Example description",
      content: "Do the thing.",
      rootPath: "/tmp/example-skill",
    });

    const root = new TreeNode("example-skill");
    root.addChild(new TreeNode("SKILL.md", true));
    const srcDir = new TreeNode("src");
    srcDir.addChild(new TreeNode("index.ts", true));
    root.addChild(srcDir);

    mockSkillService.getSkillFileTree.mockResolvedValue(root);

    const tool = registerGetSkillContentTool();
    const result = await tool.execute(
      { agentId: "agent-1" } as any,
      { skill_name: "example-skill" },
    );

    expect(result).toContain("# Skill: example-skill");
    expect(result).toContain("## Description");
    expect(result).toContain("Example description");
    expect(result).toContain("## Instructions (SKILL.md)");
    expect(result).toContain("Do the thing.");
    expect(result).toContain("## File Structure");
    expect(result).toContain("example-skill/");
    expect(result).toContain("  SKILL.md");
    expect(result).toContain("  src/");
    expect(result).toContain("    index.ts");
  });

  it("throws when skill is not found", async () => {
    mockSkillService.getSkill.mockReturnValue(null);

    const tool = registerGetSkillContentTool();
    await expect(
      tool.execute({ agentId: "agent-1" } as any, { skill_name: "missing" }),
    ).rejects.toThrow("not found");
  });

  it("includes error message when file tree fails", async () => {
    mockSkillService.getSkill.mockReturnValue({
      name: "example-skill",
      description: "Example description",
      content: "Do the thing.",
      rootPath: "/tmp/example-skill",
    });
    mockSkillService.getSkillFileTree.mockRejectedValue(new Error("tree failed"));

    const tool = registerGetSkillContentTool();
    const result = await tool.execute(
      { agentId: "agent-1" } as any,
      { skill_name: "example-skill" },
    );

    expect(result).toContain("Error listing files");
    expect(result).toContain("tree failed");
  });

  it("throws when skill_name is missing", async () => {
    await expect(getSkillContent({ agentId: "agent-1" } as any, "")).rejects.toThrow(
      "required",
    );
  });
});
