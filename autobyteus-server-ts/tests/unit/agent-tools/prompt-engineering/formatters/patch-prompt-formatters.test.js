import { describe, it, expect } from "vitest";
import { ToolOrigin, ToolCategory } from "autobyteus-ts";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { PatchPromptXmlSchemaFormatter, PatchPromptXmlExampleFormatter, } from "../../../../../src/agent-tools/prompt-engineering/formatters/patch-prompt-formatters.js";
describe("PatchPromptXmlFormatter", () => {
    const toolDef = new ToolDefinition("patch_prompt", "Patches prompts.", ToolOrigin.LOCAL, ToolCategory.PROMPT_MANAGEMENT, () => null, () => null, { customFactory: () => ({}) });
    it("schema uses standard XML structure", () => {
        const formatter = new PatchPromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain('<tool name="patch_prompt">');
        expect(schema).toContain("</tool>");
        expect(schema).toContain("<arguments>");
        expect(schema).toContain('<arg name="prompt_id"');
        expect(schema).toContain('<arg name="patch"');
    });
    it("schema includes sentinel instructions", () => {
        const formatter = new PatchPromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain("__START_PATCH__");
        expect(schema).toContain("__END_PATCH__");
        expect(schema).toContain("sentinel tags");
    });
    it("example uses standard XML structure", () => {
        const formatter = new PatchPromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain('<tool name="patch_prompt">');
        expect(example).toContain("</tool>");
        expect(example).toContain("<arguments>");
    });
    it("example includes sentinel tags", () => {
        const formatter = new PatchPromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain("__START_PATCH__");
        expect(example).toContain("__END_PATCH__");
        expect(example).toContain('<arg name="patch">');
    });
});
