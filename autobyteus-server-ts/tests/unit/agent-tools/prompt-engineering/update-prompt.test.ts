import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUpdatePromptTool } from "../../../../src/agent-tools/prompt-engineering/update-prompt.js";
import { Prompt } from "../../../../src/prompt-engineering/domain/models.js";

const mockGetPromptById = vi.fn();
const mockAddNewPromptRevision = vi.fn();

vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
  PromptService: class PromptServiceMock {
    getPromptById = mockGetPromptById;
    addNewPromptRevision = mockAddNewPromptRevision;
  },
}));

describe("updatePromptTool", () => {
  beforeEach(() => {
    mockGetPromptById.mockReset();
    mockAddNewPromptRevision.mockReset();
  });

  it("updates a prompt by creating a new revision", async () => {
    const originalPrompt = new Prompt({
      id: "1",
      name: "Test Prompt",
      category: "Dev",
      promptContent: "Old content",
      version: 1,
      isActive: true,
      parentId: null,
      suitableForModels: "gpt-4",
      description: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newPrompt = new Prompt({
      id: "2",
      name: "Test Prompt",
      category: "Dev",
      promptContent: "New content",
      version: 2,
      isActive: false,
      parentId: "1",
      suitableForModels: "gpt-4",
      description: "Test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetPromptById.mockResolvedValue(originalPrompt);
    mockAddNewPromptRevision.mockResolvedValue(newPrompt);

    const tool = registerUpdatePromptTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { prompt_id: "1", new_content: "New content" },
    );

    expect(mockGetPromptById).toHaveBeenCalledOnce();
    expect(mockGetPromptById).toHaveBeenCalledWith("1");
    expect(mockAddNewPromptRevision).toHaveBeenCalledOnce();
    expect(mockAddNewPromptRevision).toHaveBeenCalledWith("1", "New content");
    expect(result).toContain("Successfully updated");
    expect(result).toContain("New revision ID: 2");
    expect(result).toContain("activate_prompt");
  });

  it("throws when prompt_id is missing", async () => {
    const tool = registerUpdatePromptTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "", new_content: "New content" },
      ),
    ).rejects.toThrow("prompt_id is a required");
  });

  it("throws when new_content is missing", async () => {
    const tool = registerUpdatePromptTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "1", new_content: "" },
      ),
    ).rejects.toThrow("new_content is a required");
  });

  it("propagates prompt not found errors", async () => {
    mockGetPromptById.mockRejectedValue(new Error("Prompt not found"));

    const tool = registerUpdatePromptTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "999", new_content: "New content" },
      ),
    ).rejects.toThrow("Prompt not found");
  });
});
