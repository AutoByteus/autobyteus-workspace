import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPatchPromptTool } from "../../../../src/agent-tools/prompt-engineering/patch-prompt.js";
import { PatchApplicationError } from "autobyteus-ts/utils/diff-utils.js";

const mockGetPromptById = vi.fn();
const mockAddNewPromptRevision = vi.fn();

vi.mock("../../../../src/prompt-engineering/services/prompt-service.js", () => ({
  PromptService: class PromptServiceMock {
    getPromptById = mockGetPromptById;
    addNewPromptRevision = mockAddNewPromptRevision;
  },
}));

describe("patchPromptTool", () => {
  beforeEach(() => {
    mockGetPromptById.mockReset();
    mockAddNewPromptRevision.mockReset();
  });

  it("applies a patch and creates a new revision", async () => {
    mockGetPromptById.mockResolvedValue({
      id: "base-123",
      promptContent: "line1\nline2\nline3\n",
    });
    mockAddNewPromptRevision.mockResolvedValue({ id: "new-456" });

    const patchContent = [
      "@@ -1,3 +1,3 @@",
      " line1",
      "-line2",
      "+line2 updated",
      " line3",
      "",
    ].join("\n");

    const tool = registerPatchPromptTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      { prompt_id: "base-123", patch: patchContent },
    );

    expect(result).toContain("Successfully patched");
    expect(result).toContain("new-456");
    expect(mockAddNewPromptRevision).toHaveBeenCalledOnce();
    const callArgs = mockAddNewPromptRevision.mock.calls[0];
    expect(callArgs[1]).toContain("line2 updated");
  });

  it("strips line numbers from patch content", async () => {
    mockGetPromptById.mockResolvedValue({
      id: "base-123",
      promptContent: "line1\nline2\nline3\n",
    });
    mockAddNewPromptRevision.mockResolvedValue({ id: "new-456" });

    const patchContent = [
      "@@ -1,3 +1,3 @@",
      " 1: line1",
      "-2: line2",
      "+2: line2 updated",
      " 3: line3",
      "",
    ].join("\n");

    const tool = registerPatchPromptTool();
    await tool.execute(
      { agentId: "test-agent" } as any,
      { prompt_id: "base-123", patch: patchContent },
    );

    expect(mockAddNewPromptRevision).toHaveBeenCalledOnce();
    const callArgs = mockAddNewPromptRevision.mock.calls[0];
    expect(callArgs[1]).toContain("line2 updated");
    expect(callArgs[1]).not.toContain("2: ");
  });

  it("throws when prompt is not found", async () => {
    mockGetPromptById.mockResolvedValue(null);

    const tool = registerPatchPromptTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "nonexistent", patch: "@@ -1 +1 @@\n-old\n+new\n" },
      ),
    ).rejects.toThrow("not found");
  });

  it("propagates patch application errors", async () => {
    mockGetPromptById.mockResolvedValue({
      id: "base-123",
      promptContent: "alpha\nbeta\ngamma\n",
    });

    const badPatch = [
      "@@ -1,3 +1,3 @@",
      " alpha",
      "-delta",
      "+theta",
      " gamma",
      "",
    ].join("\n");

    const tool = registerPatchPromptTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        { prompt_id: "base-123", patch: badPatch },
      ),
    ).rejects.toThrow(PatchApplicationError);
  });
});
