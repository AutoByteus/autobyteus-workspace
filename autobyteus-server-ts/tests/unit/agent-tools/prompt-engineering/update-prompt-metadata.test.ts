import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUpdatePromptMetadataTool } from "../../../../src/agent-tools/prompt-engineering/update-prompt-metadata.js";

const mockUpdatePrompt = vi.fn();

vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
  PromptService: class PromptServiceMock {
    updatePrompt = mockUpdatePrompt;
  },
}));

describe("updatePromptMetadataTool", () => {
  beforeEach(() => {
    mockUpdatePrompt.mockReset();
  });

  it("updates prompt metadata", async () => {
    mockUpdatePrompt.mockResolvedValue({});

    const tool = registerUpdatePromptMetadataTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { prompt_id: "1", description: "new desc", is_active: false },
    );

    expect(mockUpdatePrompt).toHaveBeenCalledOnce();
    expect(mockUpdatePrompt).toHaveBeenCalledWith({
      promptId: "1",
      description: "new desc",
      suitableForModels: null,
      isActive: false,
    });
    expect(result).toContain("updated successfully");
  });

  it("throws when no metadata fields are provided", async () => {
    const tool = registerUpdatePromptMetadataTool();
    await expect(
      tool.execute({ agentId: "test-agent" } as any, { prompt_id: "1" }),
    ).rejects.toThrow("At least one metadata field");
  });

  it("propagates service errors", async () => {
    mockUpdatePrompt.mockRejectedValue(new Error("Prompt not found"));

    const tool = registerUpdatePromptMetadataTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "99", description: "update" },
      ),
    ).rejects.toThrow("Prompt not found");
  });
});
