import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillWorkspace } from "../../../src/workspaces/skill-workspace.js";

const mockGetSkill = vi.fn<[{ rootPath: string } | null], [string]>();

vi.mock("../../../src/skills/services/skill-service.js", () => ({
  SkillService: class {
    getSkill(name: string) {
      return mockGetSkill(name);
    }
  },
}));

describe("SkillWorkspace", () => {
  beforeEach(() => {
    mockGetSkill.mockReset();
  });

  it("creates a workspace for an existing skill", async () => {
    const skillName = "TestSkill";
    const expectedPath = "/opt/skills/TestSkill";
    mockGetSkill.mockReturnValue({ rootPath: expectedPath });

    const workspace = await SkillWorkspace.create(skillName);

    expect(workspace.skillName).toBe(skillName);
    expect(workspace.rootPath).toBe(expectedPath);
    expect(workspace.workspaceId).toBe(`skill_ws_${skillName}`);
  });

  it("throws when the skill is not found", async () => {
    mockGetSkill.mockReturnValue(null);

    await expect(SkillWorkspace.create("MissingSkill")).rejects.toThrow(
      /SkillWorkspace creation failed for 'MissingSkill': Error: Skill 'MissingSkill' not found/,
    );
  });
});
