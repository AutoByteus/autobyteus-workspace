import { describe, it, expect } from "vitest";
import { ToolOrigin, ToolCategory } from "autobyteus-ts";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { UpdatePromptXmlSchemaFormatter, UpdatePromptXmlExampleFormatter, } from "../../../../../src/agent-tools/prompt-engineering/formatters/update-prompt-formatters.js";
describe("UpdatePromptXmlFormatter", () => {
    const toolDef = new ToolDefinition("update_prompt", "Updates prompts.", ToolOrigin.LOCAL, ToolCategory.PROMPT_MANAGEMENT, () => null, () => null, { customFactory: () => ({}) });
    it("schema uses standard XML structure", () => {
        const formatter = new UpdatePromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain('<tool name="update_prompt">');
        expect(schema).toContain("</tool>");
        expect(schema).toContain("<arguments>");
        expect(schema).toContain('<arg name="prompt_id"');
        expect(schema).toContain('<arg name="new_content"');
    });
    it("schema includes sentinel instructions", () => {
        const formatter = new UpdatePromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain("__START_CONTENT__");
        expect(schema).toContain("__END_CONTENT__");
    });
    it("example uses standard XML structure", () => {
        const formatter = new UpdatePromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain('<tool name="update_prompt">');
        expect(example).toContain("</tool>");
        expect(example).toContain("<arguments>");
    });
    it("example includes sentinel tags", () => {
        const formatter = new UpdatePromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain("__START_CONTENT__");
        expect(example).toContain("__END_CONTENT__");
        expect(example).toContain('<arg name="new_content">');
    });
});
