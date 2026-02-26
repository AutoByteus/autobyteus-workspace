import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { PromptService } from "../../../src/prompt-engineering/services/prompt-service.js";
import { registerGetPromptTool } from "../../../src/agent-tools/prompt-engineering/get-prompt.js";
import { registerPatchPromptTool } from "../../../src/agent-tools/prompt-engineering/patch-prompt.js";
describe("Prompt patching flow (tools + service)", () => {
    it("creates, reads, patches, and verifies new prompt revision", async () => {
        const promptService = new PromptService();
        const name = `PatchFlowTest-${randomUUID()}`;
        const category = "Integration";
        const originalContent = "def hello():\n    print('Hello World')\n";
        const createdPrompt = await promptService.createPrompt({
            name,
            category,
            promptContent: originalContent,
        });
        const promptId = createdPrompt.id ?? "";
        const context = { agentId: "test-agent" };
        const getTool = registerGetPromptTool();
        const retrieved = await getTool.execute(context, { prompt_id: promptId });
        expect(retrieved).toContain("Prompt Details:");
        expect(retrieved).toContain(`File: prompt_${promptId}.md`);
        expect(retrieved).toContain("1: def hello():");
        expect(retrieved).toContain("2:     print('Hello World')");
        expect(retrieved).toContain("```markdown");
        const patchContent = [
            `--- a/prompt_${promptId}.md`,
            `+++ b/prompt_${promptId}.md`,
            "@@ -1,2 +1,2 @@",
            " def hello():",
            "-    print('Hello World')",
            "+    print('Hello Universe')",
            "",
        ].join("\n");
        const patchTool = registerPatchPromptTool();
        const patchResult = await patchTool.execute(context, { prompt_id: promptId, patch: patchContent });
        expect(patchResult).toContain("Successfully patched");
        const match = /New revision ID: ([a-zA-Z0-9-]+)/.exec(patchResult);
        expect(match).toBeTruthy();
        const newRevisionId = match?.[1] ?? "";
        const freshService = new PromptService();
        const newRevision = await freshService.getPromptById(newRevisionId);
        expect(newRevision.version).toBe(2);
        expect(newRevision.isActive).toBe(false);
        expect(newRevision.promptContent.trim()).toBe("def hello():\n    print('Hello Universe')");
    });
});
