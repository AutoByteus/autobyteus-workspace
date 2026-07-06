import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSkillService = {
  getSkill: vi.fn(),
};

vi.mock("../../../../src/skills/services/skill-service.js", () => ({
  SkillService: {
    getInstance: () => mockSkillService,
  },
}));

import { registerGetAvailableSkillsTool } from "../../../../src/agent-tools/skills/get-available-skills.js";

describe("getAvailableSkillsTool", () => {
  beforeEach(() => {
    mockSkillService.getSkill.mockReset();
  });

  it("returns configured skills as a JSON list", async () => {
    mockSkillService.getSkill.mockImplementation((skillName: string) =>
      skillName === "alpha" ? { name: "alpha", description: "Alpha skill" } : undefined,
    );

    const tool = registerGetAvailableSkillsTool();
    const result = await tool.execute({ agentId: "agent-1", config: { skills: ["alpha", "beta"] } } as any, {});
    const data = JSON.parse(result) as Array<{ name: string; description: string }>;

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({ name: "alpha", description: "Alpha skill" });
    expect(mockSkillService.getSkill).toHaveBeenCalledWith("alpha");
    expect(mockSkillService.getSkill).toHaveBeenCalledWith("beta");
  });

  it("returns an empty list when no skills are configured", async () => {
    const tool = registerGetAvailableSkillsTool();
    const result = await tool.execute({ agentId: "agent-1" } as any, {});

    expect(JSON.parse(result)).toEqual([]);
    expect(mockSkillService.getSkill).not.toHaveBeenCalled();
  });

  it("throws when configured skill lookup fails", async () => {
    mockSkillService.getSkill.mockImplementation(() => {
      throw new Error("boom");
    });

    const tool = registerGetAvailableSkillsTool();
    await expect(tool.execute({ agentId: "agent-1", config: { skills: ["alpha"] } } as any, {})).rejects.toThrow("boom");
  });
});
