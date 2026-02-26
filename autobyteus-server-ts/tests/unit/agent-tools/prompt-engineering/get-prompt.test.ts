import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerGetPromptTool } from "../../../../src/agent-tools/prompt-engineering/get-prompt.js";
import { Prompt } from "../../../../src/prompt-engineering/domain/models.js";

const mockGetPromptById = vi.fn();

vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
  PromptService: class PromptServiceMock {
    getPromptById = mockGetPromptById;
  },
}));

describe("getPromptTool", () => {
  beforeEach(() => {
    mockGetPromptById.mockReset();
  });

  it("returns a formatted prompt with line numbers", async () => {
    const prompt = new Prompt({
      id: "1",
      name: "Test",
      category: "Dev",
      promptContent: "Line 1\nLine 2",
      version: 1,
      isActive: true,
      parentId: null,
      suitableForModels: "gpt-4",
      description: "Desc",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetPromptById.mockResolvedValue(prompt);

    const tool = registerGetPromptTool();
    const result = await tool.execute({ agentId: "test-agent" } as any, { prompt_id: "1" });

    expect(mockGetPromptById).toHaveBeenCalledOnce();
    expect(mockGetPromptById).toHaveBeenCalledWith("1");
    expect(result).toContain("Prompt Details:");
    expect(result).toContain("- ID: 1");
    expect(result).toContain("- Name: Test");
    expect(result).toContain("- Category: Dev");
    expect(result).toContain("File: prompt_1.md");
    expect(result).toContain("```markdown");
    expect(result).toContain("1: Line 1");
    expect(result).toContain("2: Line 2");
    expect(result).toContain("patch_prompt");
  });

  it("propagates errors from the service", async () => {
    mockGetPromptById.mockRejectedValue(new Error("Not found"));

    const tool = registerGetPromptTool();
    await expect(
      tool.execute({ agentId: "test-agent" } as any, { prompt_id: "99" }),
    ).rejects.toThrow("Not found");
  });
});
