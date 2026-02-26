import { describe, it, expect } from "vitest";
import { ToolOrigin, ToolCategory } from "autobyteus-ts";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { CreatePromptXmlSchemaFormatter, CreatePromptXmlExampleFormatter, } from "../../../../../src/agent-tools/prompt-engineering/formatters/create-prompt-formatters.js";
describe("CreatePromptXmlFormatter", () => {
    const toolDef = new ToolDefinition("create_prompt", "Creates prompts.", ToolOrigin.LOCAL, ToolCategory.PROMPT_MANAGEMENT, () => null, () => null, { customFactory: () => ({}) });
    it("schema uses standard XML structure", () => {
        const formatter = new CreatePromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain('<tool name="create_prompt">');
        expect(schema).toContain("</tool>");
        expect(schema).toContain("<arguments>");
        expect(schema).toContain('<arg name="name"');
        expect(schema).toContain('<arg name="category"');
        expect(schema).toContain('<arg name="prompt_content"');
    });
    it("schema includes sentinel instructions", () => {
        const formatter = new CreatePromptXmlSchemaFormatter();
        const schema = formatter.provide(toolDef);
        expect(schema).toContain("__START_CONTENT__");
        expect(schema).toContain("__END_CONTENT__");
        expect(schema).toContain("sentinel tags");
    });
    it("example uses standard XML structure", () => {
        const formatter = new CreatePromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain('<tool name="create_prompt">');
        expect(example).toContain("</tool>");
        expect(example).toContain("<arguments>");
    });
    it("example includes sentinel tags", () => {
        const formatter = new CreatePromptXmlExampleFormatter();
        const example = formatter.provide(toolDef);
        expect(example).toContain("__START_CONTENT__");
        expect(example).toContain("__END_CONTENT__");
        expect(example).toContain('<arg name="prompt_content">');
    });
});
