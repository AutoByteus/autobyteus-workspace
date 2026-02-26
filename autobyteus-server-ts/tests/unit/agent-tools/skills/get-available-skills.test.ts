import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSkillService = {
  listSkills: vi.fn(),
};

vi.mock("../../../../src/skills/services/skill-service.js", () => ({
  SkillService: {
    getInstance: () => mockSkillService,
  },
}));

import { registerGetAvailableSkillsTool } from "../../../../src/agent-tools/skills/get-available-skills.js";

describe("getAvailableSkillsTool", () => {
  beforeEach(() => {
    mockSkillService.listSkills.mockReset();
  });

  it("returns a JSON list of skills", async () => {
    mockSkillService.listSkills.mockReturnValue([
      { name: "alpha", description: "Alpha skill" },
      { name: "beta", description: "Beta skill" },
    ]);

    const tool = registerGetAvailableSkillsTool();
    const result = await tool.execute({ agentId: "agent-1" } as any, {});
    const data = JSON.parse(result) as Array<{ name: string; description: string }>;

    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({ name: "alpha", description: "Alpha skill" });
    expect(data[1]).toEqual({ name: "beta", description: "Beta skill" });
  });

  it("throws when listing skills fails", async () => {
    mockSkillService.listSkills.mockImplementation(() => {
      throw new Error("boom");
    });

    const tool = registerGetAvailableSkillsTool();
    await expect(tool.execute({ agentId: "agent-1" } as any, {})).rejects.toThrow("boom");
  });
});
